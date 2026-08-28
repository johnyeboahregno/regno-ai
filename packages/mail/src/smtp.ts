/**
 * SMTP mail sender — nodemailer transport configured from env.
 * Mirrors regno.ai's NotificationWorker (SMTP/API outbound mail).
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_ENCRYPTION (tls|ssl),
 *      SMTP_FROM_EMAIL, SMTP_FROM_NAME
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const encryption = (process.env.SMTP_ENCRYPTION ?? 'tls').toLowerCase();
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port,
      secure: encryption === 'ssl', // 465 → ssl; 587 → tls (STARTTLS)
      auth: process.env.SMTP_USERNAME
        ? { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD ?? '' }
        : undefined,
      requireTLS: encryption === 'tls',
    });
  }
  return transporter;
}

export async function sendMail(mail: MailOptions): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USERNAME ?? 'no-reply@localhost';
  const fromName = process.env.SMTP_FROM_NAME ?? 'Regno';
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
