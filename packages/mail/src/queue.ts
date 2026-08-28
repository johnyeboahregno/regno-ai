/**
 * Queued notification service — mirrors regno.ai's queuedNotificationService
 * (sendEmailNotification etc.) backed by the BullMQ 'notifications' queue.
 */
import { Queue } from 'bullmq';
import { getRedis } from '@regno/db';
import { Queues } from '@regno/shared';

export interface EmailJob {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export function enqueueEmail(email: EmailJob) {
  const q = new Queue(Queues.NOTIFICATIONS, { connection: getRedis() });
  return q.add('send-email', email);
}

export async function sendEmailNotification(email: EmailJob) {
  return enqueueEmail(email);
}
