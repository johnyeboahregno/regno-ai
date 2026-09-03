# Fix: SSH key rejected with "error in libcrypto: unsupported" (missing trailing newline)

**Date:** 2026-09-03

## Symptom

Architect provisioning failed at the first SSH step, with the same message as the
CRLF bug but the key had no `\r` characters and was otherwise a perfectly valid
unencrypted OpenSSH ed25519 private key:

```
ssh exited 255: Load key "/tmp/regno-ssh-olANhn/key": error in libcrypto: unsupported
root@213.32.7.227: Permission denied (publickey).
```

## Root cause

The pasted key ended **without a trailing newline** after
`-----END OPENSSH PRIVATE KEY-----`. OpenSSH's PEM parser reads the file line by
line; when the final END line is not newline-terminated, it is not recognised,
so OpenSSH's native parser never sees a complete block and falls back to
libcrypto — which does not understand the `OPENSSH PRIVATE KEY` format, hence the
misleading `error in libcrypto: unsupported`. The key is then not loaded, so the
connection fails with `Permission denied (publickey)`.

Keys pasted from a textarea/browser frequently lose the trailing newline, which
is why this is easy to hit even after the CRLF fix landed.

Reproduced on the Mothership against the stored vault key:

```bash
# stored key, no trailing newline (fails)
ssh-keygen -y -f key_wrapped          # -> Load key: error in libcrypto: unsupported

# same key + trailing newline (works)
printf '\n' >> key && ssh-keygen -y -f key   # -> ssh-ed25519 AAAA… regno-devops
```

Line-wrapping width of the base64 body is irrelevant — the trigger is the
missing final newline.

## Fix

Normalise at two boundaries:

1. **Write boundary** — `packages/provision/src/provision.ts` (`sshExec`), right
   before the key is written to the temp file. This is the safety net: it also
   rescues keys already stored without a trailing newline, so a re-`Launch`
   succeeds without re-pasting.

   ```ts
   writeFileSync(keyPath, auth.privateKey.replace(/\r/g, '').trim() + '\n');
   ```

2. **Save boundary** — `apps/mothership/src/lib/architects/ArchitectWizard.svelte`
   (`buildSecrets`), so new keys are stored with a guaranteed trailing newline.

   ```ts
   const sshKey = form.sshAuth === 'key' ? (form.sshKey || '').replace(/\r/g, '').trim() : '';
   set('SSH_KEY', sshKey ? `${sshKey}\n` : '');
   ```

## Rollout

Rebuild + redeploy the mothership `execution` worker (it copies `packages/` into
the image), then click **Launch** on the Architect. Re-pasting the key is not
required — the existing stored key is normalised at write time.

## See also

- `SSH_KEY_CRLF_FIX.md` — the first root cause of the same error message (CRLF
  line endings), fixed the previous day.
