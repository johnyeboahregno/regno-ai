# Fix: SSH key rejected with "error in libcrypto: unsupported"

**Date:** 2026-09-02

## Symptom

Architect provisioning failed at the very first SSH step:

```
ssh exited 255: Load key "/tmp/regno-ssh-*/key": error in libcrypto: unsupported
ubuntu@213.32.7.227: Permission denied (publickey).
```

The Architect status showed `error` with that message, and no command ever
reached the target machine.

## Root cause

The SSH private key was stored with **Windows CRLF line endings** (`\r\n`)
instead of Unix LF (`\n`). OpenSSH rejects the OpenSSH private-key format when
the base64 body contains stray `\r` characters, then falls back to libcrypto's
PEM parser, which does not understand `OPENSSH PRIVATE KEY` — hence the
misleading `error in libcrypto: unsupported`.

Reproduced locally:

```bash
sed 's/$/\r/' ~/.ssh/id_ed25519 > key.crlf
ssh-keygen -y -f key.crlf   # -> Load key "...": error in libcrypto: unsupported
ssh-keygen -y -f ~/.ssh/id_ed25519   # -> works fine
```

Keys pasted from a Windows terminal / clipboard frequently arrive with `\r\n`.

## Fix

Normalise line endings (strip all `\r`) at two boundaries:

1. **Use boundary** — `packages/provision/src/provision.ts` (`sshExec`), right
   before the key is written to the temp file. This is the safety net: it also
   rescues keys that were already stored with CRLF, so a re-`Launch` succeeds
   without re-pasting.

   ```ts
   writeFileSync(keyPath, auth.privateKey.replace(/\r/g, ''));
   ```

2. **Save boundary** — `apps/web/src/lib/architects/ArchitectWizard.svelte`
   (`buildSecrets`), so new keys are stored clean.

   ```ts
   set('SSH_KEY', form.sshAuth === 'key' ? (form.sshKey || '').replace(/\r/g, '') : '');
   ```

## Rollout

Rebuild + redeploy the mothership `execution` worker (it copies `packages/`
into the image), then click **Launch** on the Architect. Re-pasting the key is
not required — the existing stored key is normalised at write time.

## See also

- `SSH_KEY_TRAILING_NEWLINE_FIX.md` — the same error message can also be caused
  by a **missing trailing newline** after `-----END OPENSSH PRIVATE KEY-----`,
  even when the key has no `\r` and is otherwise valid. Fixed the next day.
