# Email / Notifications

> Status: stable · Last updated: 2026-08-28

## What it is

Outbound email via SMTP through a BullMQ `notifications` queue + worker, with an `email-send`
agent tool and a Health-page test sender.

## Why

Mirror regno.ai's `NotificationWorker` + `queuedNotificationService` (docs/infrastructure).

## How it works

```
POST /api/test/email (or emailSend tool / enqueueEmail)
  → BullMQ 'notifications' queue
  → notifications worker (execution server)
  → nodemailer → SMTP (mail.postale.io:587 STARTTLS)
```

## Files involved

- `packages/mail/src/{smtp,queue}.ts`
- `apps/execution/src/workers/notifications.ts`
- `apps/web/src/routes/api/test/email/+server.ts`
- `packages/flow/src/tools.ts` (`emailSend`)

## Env

```
SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_ENCRYPTION (tls|ssl),
SMTP_FROM_EMAIL, SMTP_FROM_NAME
```

## Reproduce / verify

```bash
curl -X POST http://localhost:3000/api/test/email \
  -H 'Content-Type: application/json' -b 'regno_session=...' \
  -d '{"to":"you@example.com"}'
```
