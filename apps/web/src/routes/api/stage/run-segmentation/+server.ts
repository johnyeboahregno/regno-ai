// POST /api/stage/run-segmentation — execute the full customer-segmentation
// orchestration: enqueue a Cortex Flow run (MAESTRO) whose agent pulls the
// seeded Mongo data via the dataSourceQuery tool (FLUX data retrieval), performs
// RFM segmentation, and writes a report. CORTEX stores the outcome as wisdom;
// SENTINEL records latency/cost/activity automatically.
import { json } from '@sveltejs/kit';
import { enqueueOrchestrate } from '@regno/flow';
import { resolveLlmSettingsForPrompt } from '@regno/db';
import { requireSession } from '@regno/auth';

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    collection?: string;
    settings?: Record<string, unknown>;
  };
  const collection = String(body.collection ?? 'test_customers').trim() || 'test_customers';

  const prompt = [
    `Analyze the MongoDB collection "${collection}" and produce a customer segmentation report.`,
    `Use the dataSourceQuery tool with store:"mongo" and collection:"${collection}" to fetch the data.`,
    `Compute RFM segments from lastPurchaseDate (recency), totalPurchases (frequency) and totalSpent (monetary):`,
    `Champions, Loyal Customers, Potential Loyalists, At Risk, and Lost.`,
    `Report each segment's size and average totalSpent, plus the overall distribution.`,
  ].join(' ');

  const llm = await resolveLlmSettingsForPrompt(prompt, body.settings ?? {});
  const job = await enqueueOrchestrate({
    prompt,
    settings: {
      ...body.settings,
      provider: llm.provider,
      model: llm.model,
      fallback: llm.fallback,
      llmContext: llm.llmContext,
    },
  });

  return json({ ok: true, jobId: String(job.id), executionId: String(job.id), collection });
}
