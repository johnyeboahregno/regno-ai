# Anthropic Reference Corpus — `doc/anthropic/`

Grounding corpus of **current, influential** Anthropic material, pulled 2026-07-10 to
inform Zero-Trust + agent-quality enhancements to regno.ai. Curated, **supersession-aware**
(later thinking that overrides earlier is flagged), every item tied to a live source.

> **Read-first for the gap analysis:** [`doc/governance/zero-trust-agents.md`](../governance/zero-trust-agents.md)
> maps this corpus onto concrete regno.ai work (registry ticket `ZT-*`).

## What's on disk

| Path | What | Committed? |
|---|---|---|
| `Claude-eBook-Zero-Trust-for-AI-Agents-05182026.pdf` | The seed ebook (36pp). Security framework: Foundation/Enterprise/Advanced tiers, 8-phase impl workflow, defensive ops. | ✅ |
| `research/*.md` | 6 influential engineering/research essays (converted HTML→md). | ✅ |
| `docs/*.md` | 16 canonical platform docs (byte-faithful `.md` from `platform.claude.com`). | ✅ |
| `_index/llms.txt` | Machine index of the **entire** docs site (1,877 EN pages). | ✅ |
| `_index/llms-full.txt` | **Complete docs dump** (86 MB / 3.2 M lines) — the "grab ALL" archive. | ❌ gitignored (local) |
| `_index/html2md.py` | The stdlib HTML→md converter used for the essays. | ✅ |
| `cookbooks/anthropic-cookbook/` | Full cookbook repo clone (356 MB) — runnable notebooks incl. `claude_agent_sdk`, `extended_thinking`, `evals`. | ❌ gitignored (local) |
| `courses/` | Anthropic `courses` repo clone (202 MB). | ❌ gitignored (local) |

Heavy clones + the 86 MB dump are **kept local, not committed** (see repo `.gitignore`). To
refresh: `git -C cookbooks/anthropic-cookbook pull` / re-run the `curl` in this file's history.

## Curated READ-FIRST set (with supersession notes)

### Research / engineering essays (`research/`)
| File | Published | Why it matters | Supersession |
|---|---|---|---|
| `building-effective-agents.md` | 2024-12-19 | Canonical: workflows vs agents; **simple composable patterns > frameworks**; prompt-chaining, routing, orchestrator-workers, evaluator-optimizer. | Still canonical. Its agent *definition* is **refined** by context-engineering ("LLMs autonomously using tools in a loop"). |
| `effective-context-engineering.md` | 2025-09-29 | **Supersedes the "prompt engineering" framing.** Context = finite attention budget ("context rot"); smallest high-signal token set; just-in-time retrieval; compaction; structured note-taking; sub-agents for long horizons. | **Latest thinking** on context. Overrides "stuff every edge case / all data into the prompt". |
| `writing-tools-for-agents.md` | 2025-09-11 | Tools are a contract between deterministic systems and **non-deterministic agents**. Few high-impact tools > many wrappers; namespacing; return high-signal context (resolve UUIDs→names); token-efficient responses; evaluation-driven tool design. | Latest thinking on tool design. Pairs with context-engineering. |
| `building-agents-claude-agent-sdk.md` | 2025 | The **Claude Agent SDK** (renamed from "Claude Code SDK") — gather-context / take-action / verify-work loop; the agent harness productised. | **Renames & supersedes** older "Claude Code SDK" naming. |
| `claude-code-best-practices.md` | 2025 | Agent-harness patterns: CLAUDE.md, permissions/allowlist, headless, multi-agent, subagents. Mirrors the ebook's Claude Code "Pro-tips". | Current. |
| `constitutional-classifiers.md` | 2025 | The research behind the ebook's input/output guard claims (**blocked 95% of jailbreaks**, minimal over-refusal). | Current. |

### Canonical platform docs (`docs/`)
- **Tool use** — `agents-and-tools_tool-use_overview.md`, `..._implement-tool-use.md` (definitions, `tool_choice`, parallel tools, fine-grained streaming).
- **Memory & context** — `..._memory-tool.md`, `build-with-claude_context-editing.md` (tool-result clearing), `..._context-windows.md`, `managed-agents_memory.md`.
- **MCP** — `agents-and-tools_mcp-connector.md` (remote MCP, OAuth, tool-use).
- **Skills** — `agents-and-tools_agent-skills_overview.md`, `managed-agents_skills.md`, `managed-agents_agent-setup.md`.
- **Reasoning / perf** — `build-with-claude_extended-thinking.md` (⚠ adaptive/effort on 4.x — see below), `..._prompt-caching.md`, `..._citations.md`.
- **Zero-Trust-relevant** — `managed-agents_permission-policies.md` (deny-by-default, allow/ask/deny), `managed-agents_self-hosted-sandboxes-security.md` (sandbox security model).
- **Prompting** — `build-with-claude_prompt-engineering_overview.md` (index; deep sub-pages now largely folded into context-engineering).

## Known supersessions to respect (the "later theory" filter the user asked for)
1. **Prompt engineering → context engineering** (2025-09). Curate the *whole* context state, not just the prompt; treat context as a finite attention budget.
2. **"Claude Code SDK" → "Claude Agent SDK"** (renamed). Use the Agent SDK naming/loop.
3. **Extended thinking on 4.x** — `thinking.type.enabled` is rejected by Opus 4.8+; use `type:'adaptive'` + `output_config.effort`. (We already hit this — see MEMORY `adaptive-thinking-api`.)
4. **Agent definition** — "LLMs autonomously using tools in a loop" (context-engineering) refines the workflow/agent split in building-effective-agents.
5. **Tool design** — prefer few high-impact, namespaced, token-efficient tools over 1:1 API wrappers.
