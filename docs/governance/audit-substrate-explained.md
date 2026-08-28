# The Regno Audit Substrate — Explained (the no-jargon guide)

*What it is, why it matters, how it fits health / finance / government / other — and how we proved it on CMS.*

---

## In one sentence

> A **flight recorder for your software**: it quietly records everything people do, makes those records
> **impossible to alter without it showing**, and can **prove on demand** — to a regulator, an auditor, or a
> court — exactly who did what, when, and that nothing has been tampered with.

---

## The problem it solves

Almost every system keeps a "log". But ask three hard questions and most logs fall over:

1. **Can someone with admin rights edit or delete the log?** Usually *yes*. So it isn't proof — it's a note.
2. **Can you actually answer a question with it?** "Show me everything user X did to record Y last March."
   Usually it's a grep through gigabytes nobody can read.
3. **Does it map to what your regulator is asking for?** Auditors don't ask "show me your logs" — they ask
   "prove control 11.10(e)." A raw log doesn't answer that.

In regulated industries — health, finance, government — **the inability to prove these things is a deal-breaker.**
It's the difference between winning a contract and being shown the door.

The Regno Audit Substrate is built to answer all three with a confident *yes*.

---

## What we built (plain English)

Think of it as **five layers**, like a chain of custody for a piece of evidence:

1. **Capture** — a lightweight recorder sits behind the app and notes every meaningful action: someone logged
   in, opened a page, applied a filter, ran a report, exported a file, created a record, edited a field, signed
   something. *Crucially, it never slows the app down* — it jots the note and moves on; a background worker
   files it away.

2. **A tamper-evident vault** — each record is sealed and **cryptographically chained to the one before it**
   (like a wax seal that also locks to its neighbour). Change one record, or remove one, and the chain visibly
   **breaks at exactly that point**. Each day's records roll up into a single "fingerprint" we can publish.
   You can't quietly rewrite history.

3. **A control map** — *this is the commercial magic.* Every kind of action is pre-mapped to the **specific
   regulatory control it proves.** So when an assessor says "show me your evidence for FDA Part 11 §11.10(e)",
   the system already knows that "create / edit / delete record" events *are* that evidence, and produces them.

4. **An evidence engine** — one click turns the vault + the control map into a **proof pack**: "here is
   everything that happened to record CR5690, who did it, when, signed by whom, and a certificate that none of
   it was altered."

5. **Domain packs** — the whole thing is **horizontal**. A new industry isn't a rebuild — it's a *pack*: a list
   of what to record and which rules it maps to. **CMS is pack #1.** A hospital system or a trading desk is
   just another pack on the same engine.

> The headline: most audit logs are **a diary anyone can edit**. Ours is a **sealed, searchable,
> self-proving evidence locker that already speaks your regulator's language.**

---

## Why it's a big deal

- **Tamper-evident, not just "secure".** We don't just say "trust us, we protect the log." We can mathematically
  *prove* it wasn't changed — even against our own administrators.
- **It speaks regulator.** It maps itself to the framework you're being assessed against, so audits become a
  query, not a six-week fire drill.
- **It's AI-interrogable.** Ask it in plain English — *"how many people used the system today?"*, *"who deleted
  files last week?"* — and it answers, and can write the story of a user's session for you.
- **It sees through impersonation.** When a supervisor "acts as" another user, the audit records *both* the real
  person and the role they were acting as. No hiding behind a shared or borrowed identity.
- **It's invisible to the app.** Zero performance impact is a design rule, not an aspiration — capture is
  fire-and-forget; if the recorder is busy, the app never waits.

---

## How it fits each vertical

Different industries demand proof of *different* things. Same engine, different pack.

### 🏥 Health & pharma — *our first lighthouse*
**What they demand:** *"Prove who did what, that it was signed by the right person, and that the record hasn't
been altered."*
**The rules:** **FDA 21 CFR Part 11** (electronic records & signatures — the audit-trail rulebook for anything
touching clinical/regulated data), **HIPAA** (patient-data access & disclosure logging), plus HITRUST / GxP.
**What we prove:** a secure, time-stamped, computer-generated audit trail of every create/edit/delete;
signatures bound to records and to the signer; access limited to authorised people, with *attempted-but-denied*
access logged too. *This is exactly the Part 11 evidence an FDA assessor asks for — already mapped.*

### 💷 Finance
**What they demand:** *"Prove records are immutable and were kept — no back-dating, no quiet deletion."*
**The rules:** **SEC Rule 17a-4** (records must be **WORM** — *write once, read many*; literally un-editable for
years), **SOX**, MiFID II, FINRA, PCI-DSS.
**What we prove:** the hash-chain plus a **write-once cold store** and an external time-stamp means a record is
*provably* unchanged and was created when it claims. **Segregation-of-duties** breaches (the same person created
*and* approved something) surface automatically — a classic finance control.

### 🏛️ Government & defence
**What they demand:** *"Prove access was controlled and the audit is complete — nothing was hidden."*
**The rules:** **NIST 800-53** (the "AU" audit family), **FedRAMP**, **CMMC**.
**What we prove:** who could access what, every denied attempt, and — because of the numbered, sealed chain —
that **no events are missing** ("auditing the auditor"). Data can be **pinned to a region** for residency rules.

### 🌐 Everyone else
Cross-cutting rules apply everywhere: **GDPR** ("records of processing", and the right to be forgotten — we can
**crypto-shred** the content while *keeping the seal*, so privacy and tamper-proof coexist), **ISO 27001**,
**SOC 2**. New industry, same engine — write the pack, map the controls.

---

## How we applied it to CMS (and why that matters)

CMS (the Change Management System) is the **first real pack** — the proof that this isn't a slide, it's working
software.

**What CMS now records** (the moment we wire the capture points): a user logging in; navigating Summary →
Tasks → Changes; filtering to "suspended"; opening Reports; running a portfolio report; paging to page 10;
exporting; and — at the **persistence boundary** (whenever the system saves, small or large) — creating a CR,
editing the title, adding a change owner, attaching or deleting a file, firing a gate decision, signing off.
Every entry stamped with **user + timestamp**, linked to the real record (we **link, never copy** — the change
data already lives in CMS).

**A concrete example.** Ask *"what did Jon do on 1 Jan 2026?"* and you get a readable timeline:
> *09:02 logged in · 09:03 opened Summary · 09:04 filtered to Suspended · 09:07 ran the Portfolio report ·
> 09:09 paged to 10 · 09:10 exported · 09:21 created CR5712 · 09:24 added a change owner · 09:31 signed off.*

**Why this matters:**
- It's the **demo that wins the room** — a regulator's "prove it" becomes a click, on a system they recognise.
- It exercises the **hard parts** (alias-aware identity, persistence-boundary capture, control mapping) on real
  data, so when we walk into a hospital or a bank, the engine is *battle-tested*, not theoretical.
- It turns CMS itself into a **more defensible product** — change management with cryptographic proof of every
  decision is a feature DCC's own regulators will value.

---

## The path to regulator-grade — a timeline

Hardening isn't a switch you flip; it's a journey where **each stage unlocks a stronger claim**. Here's how we
get from "working foundation" to "a regulator's gold standard," and exactly **what we do** at each step.
*Each stage is independently valuable — stop at any point and you still have a stronger system than most
regulated incumbents.*

**Stage 0 — Foundation** ✅ *(here now)*
- **What we do:** the recorder, the tamper-evident vault (time-series, one silo per service), the non-blocking
  writer, the Part 11 + HIPAA control map, the secure ingest, the role-locked read.
- **Unlocks:** capture and answer "who did what, when" — privately, to developers only.

**Stage 1 — Turn it on for CMS** *(finish P1)*
- **What we do:** build the `/admin/audit` screens (today · timeline · live control-coverage · session replay)
  and wire CMS's capture points — the journey *and* every save (create / edit / sign / file / gate) **plus
  denied access**. Move the audit store to a **separate, write-only database account** so the app can record
  but **cannot delete** its own audit; enforce append-only.
- **Unlocks:** the timeline becomes real, and the app *physically can't tamper with its own evidence.* First
  demoable proof.

**Stage 2 — Make it cryptographically provable** *(P2)*
- **What we do:** seal the *material* events (creates, deletes, signatures, approvals) into the **hash-chain**,
  each day rolled into a published **fingerprint**; put the sealing **master key in a KMS / HSM** with rotation;
  add the **integrity panel** (one click: *"verify nothing was altered"*) and **gap detection** (*"prove no
  events were hidden"*).
- **Unlocks:** mathematical, admin-proof tamper-evidence + completeness — the heart of **FDA Part 11
  §11.10(e)** and **NIST AU**.

**Stage 3 — Make it durable & immutable** *(P2 → P3)*
- **What we do:** move capture onto a **durable background queue** (survives a crash with no loss); add
  **tiered storage** (recent = fast, old = compressed) with a **WORM cold tier** (write-once, e.g. S3 Object
  Lock); immutable backups; a trusted (NTP-synced) clock.
- **Unlocks:** records that *physically cannot be edited* for years — the **SEC 17a-4** finance requirement —
  and zero data loss.

**Stage 4 — Make it independently verifiable** *(P3)*
- **What we do:** **anchor** each daily fingerprint to an external authority (trusted timestamp / ledger); ship
  **one-click evidence packs** (a verifiable bundle for a record, control, or period); **meta-audit** (log who
  *views* the audit); **pin data to a region** per tenant.
- **Unlocks:** proof a third party can verify *without trusting us* — the gold standard for regulators and
  courts.

**Stage 5 — Make it brilliant** *(P3)*
- **What we do:** **ask-in-English** Q&A + auto-written session stories (via Cortex Flow); **anomaly /
  insider-threat** detection; **crypto-shred** erasure (delete content, keep the seal) for **GDPR**.
- **Unlocks:** audit that *explains itself*, *warns* you, and honours privacy law without breaking proof.

> Throughout, the whole audit is **locked to an `audit` role**, given to developers first — only trusted eyes
> see it. And nothing in Stage 0 is wired into the live app, so there is **zero risk** to CMS today.

| Stage | The hardening move | The regulator claim it earns |
|---|---|---|
| 1 | App can't delete its own audit (write-only DB account) | basic integrity / separation of duties |
| 2 | Hash-chain seal + KMS/HSM key + integrity panel | **Part 11 §11.10(e)**, **NIST AU** — provable, complete |
| 3 | WORM cold storage + durable queue | **SEC 17a-4** — immutable, retained |
| 4 | External anchoring + evidence packs | court-grade, independently verifiable |
| 5 | AI Q&A + crypto-shred | explainable + **GDPR**-compliant |

---

## Mini-glossary (for the rest of us)

- **Audit trail** — the recorded history of who did what, when.
- **Tamper-evident** — you can't change it without it being obvious (like a broken seal on a pill bottle).
- **Hash-chain** — each record is locked to the previous one; altering any record breaks the chain visibly.
- **Merkle root** — a single daily "fingerprint" summarising all that day's records; publish it and the day is
  frozen.
- **WORM** — *Write Once, Read Many*: storage that physically cannot be edited or deleted for a set period
  (a finance/SEC requirement).
- **FDA 21 CFR Part 11** — the US rulebook for electronic records & signatures in regulated health/pharma.
- **HIPAA** — US health-data privacy & security law (who can see/share patient data).
- **NIST 800-53 / FedRAMP** — US government security-control catalogues.
- **Segregation of duties** — no single person should both create *and* approve the same thing.
- **Crypto-shred** — delete the *content* of a record but keep its seal, so you honour "right to be forgotten"
  without breaking the proof chain.
- **Domain pack** — the per-industry configuration (what to record + which rules it maps to) that turns the one
  engine into a health system, a finance system, a government system…

---

*Companion technical design: `doc/governance/audit-service.md`. Tracked in the TODO registry as REGNO-AUDIT.*
