// /api/pipelines/run/[executionId]/events — SSE stream of node progress.
import { requireSession } from '@regno/auth';
import { subscribe, isExecutionDone, getExecutionEvents } from '$lib/pipeline/executor.js';

export async function GET({ params, cookies, request }) {
  const user = await requireSession(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { executionId } = params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* client gone */
        }
      };

      const unsub = subscribe(executionId, send);

      // Already finished? subscribe() replayed buffered events — close now.
      if (isExecutionDone(executionId)) {
        send('execution_done', { executionId });
        controller.close();
        unsub();
        return;
      }

      const done = () => {
        send('execution_done', { executionId });
        clearInterval(keepAlive);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Close when the run emits its terminal event.
      const finishListener = (event: string) => {
        if (event === 'execution_completed' || event === 'execution_failed') done();
      };
      subscribe(executionId, finishListener);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          /* ignore */
        }
      }, 15000);

      const onAbort = () => {
        clearInterval(keepAlive);
        unsub();
      };
      request.signal.addEventListener('abort', onAbort, { once: true });
    },
    cancel() {
      /* cleanup handled by abort */
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// keep TS happy about unused import for consumers
export const __events = getExecutionEvents;
