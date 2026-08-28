/**
 * Realtime server — SSE streaming (services/realtime :3002 in deploy.md).
 *
 * Subscribes to Redis pub/sub and fans events out to browser clients,
 * mirroring the docs' /api/events/subscribe + SSE pipeline.
 */
import express from 'express';
import { getRedis } from '@regno/db';

const app = express();
const redis = getRedis();
const PORT = Number(process.env.PORT ?? 3002);
const CHANNEL = 'regno:events';

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  const onMessage = (channel: string, message: string) => {
    if (channel === CHANNEL) {
      res.write(`data: ${message}\n\n`);
    }
  };

  redis.subscribe(CHANNEL, (err) => {
    if (err) console.error('[realtime] subscribe error', err);
  });
  redis.on('message', onMessage);

  req.on('close', () => {
    redis.off('message', onMessage);
    redis.unsubscribe(CHANNEL);
    console.log('[realtime] client disconnected');
  });
});

app.listen(PORT, () => {
  console.log(`[realtime] SSE server listening on :${PORT}`);
});
