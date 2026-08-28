/**
 * Notifications worker — consumes the BullMQ 'notifications' queue and sends
 * email via SMTP (mirrors regno.ai's NotificationWorker).
 */
import { Worker, type ConnectionOptions } from 'bullmq';
import { Queues } from '@regno/shared';
import { sendMail } from '@regno/mail';
import type Redis from 'ioredis';

export function startNotificationsWorker(connection: ConnectionOptions | Redis) {
  const worker = new Worker(
    Queues.NOTIFICATIONS,
    async (job) => {
      const { to, subject, text, html } = (job.data ?? {}) as {
        to?: string;
        subject?: string;
        text?: string;
        html?: string;
      };
      if (!to || !subject) throw new Error('email job requires to + subject');
      await sendMail({ to, subject, text, html });
    },
    { connection, concurrency: 5 },
  );

  worker.on('completed', (job) => console.log('[notifications] sent', job.id));
  worker.on('failed', (job, err) => console.error('[notifications] failed', job?.id, err.message));
  return worker;
}
