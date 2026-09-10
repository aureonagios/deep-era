# AI Deep Era v0.34.0 — give the blind AI developer eyes

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/Tests-71%20passing-brightgreen.svg)](tests/run.js)
[![No deps](https://img.shields.io/badge/Dependencies-0-orange.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-14%20tools-purple.svg)](mcp/server.js)
[![IDE](https://img.shields.io/badge/IDEs-25%2B-blueviolet.svg)](src/setupIde.js)

> **1-LINE INSTALL — run in your project 👇 (works today)**
> ```
> npm i -g github:aureonagios/deep-era && deep-era onboard && deep-era check
> ```
> (After npm publish, the shorter form works too: `npx deep-era onboard && npx deep-era check`.)
>
> **COPY THIS to your AI agent 👇 (Cursor, Copilot, Antigravity, Trae, Windsurf, Claude Code, any IDE)**
> ```
> Install the Deep-Era audit layer in my project and work under it end to end: run `npm i -g github:aureonagios/deep-era && deep-era onboard`, read AGENTS.md and obey it fully — recall past chats first, snapshot before big edits, plan via plan_task, take only relevant files via get_context, read full files before editing, log every step, paste every command output, finish with verify_work + security_check + audit_work, remember decisions/fixes/errors. Refuse unsafe orders. End with `deep-era check` PASS plus proof: files+lines, test results, errors+fixes. If check FAILS, fix and re-run until PASS.
> ```
> Then verify its work yourself: `deep-era check` — PASS = accept, FAIL = send back.

Universal layer that makes **any AI agent** (Cursor, Copilot, Antigravity, Windsurf, OpenCode, Claude Code, Gemini CLI, Codex, JetBrains Junie, Roo, Kilo, Trae, Zed, Cline, Continue + more) deep + safe + transparent. Any language (JS/TS/Python/Go/Rust/Java/PHP/Ruby/Dart/C#/Swift), any project. Zero dependencies, offline-first.

**Language law:** the user may speak ANY language — all code, comments, identifiers and logs the AI writes are ENGLISH ONLY (enforced by `audit_work`).

## 5-minute quickstart (1 command does it all)
```bash
npm i -g github:aureonagios/deep-era   # install (works today)
deep-era onboard                        # rules + 25 IDEs + CI gate + skill
deep-era check                          # 30s audit: PASS = accept, FAIL = send back
```

## THE 1-PROMPT — copy, paste to any AI, done

```
You work under AI Deep Era (read AGENTS.md in this project — it is already
installed). End to end, this is what it is and what you must do:

WHAT DEEP-ERA IS: a zero-dependency audit layer between you and the user.
It gives you project memory (recall/remember), a code map (.deep-era/map.json),
10 MCP tools, and 4 terminal gates (check/doctor/heal/demo). It does NOT write
code for you — it verifies everything YOU write. The user checks your work with
one command: `deep-era check`. There is nowhere to hide.

YOUR WORKFLOW (no skipping):
1. RECALL FIRST — call recall with today's task. Read past chats/decisions/fixes.
   Forgetting one user statement is a failure.
2. SNAPSHOT — before big edits, snapshot (action=create). You break it, you restore it.
3. PLAN — call plan_task and show the plan. No blind coding.
4. CONTEXT — never read the whole repo. Call get_context with a query; take only
   relevant files + imports. Budgets: code ≤12000 chars, memory ≤4000 chars.
5. MAP — check imports/importedBy in .deep-era/map.json before guessing.
6. EDIT — read the FULL file before editing, diff after. Regex gutting is forbidden.
   Code, comments, identifiers: ENGLISH ONLY (user language is free).
7. LOG — call log_step for every important step. The user watches live.
8. TERMINAL TRUTH — read every command's output. FAIL = stop + fix. Claiming
   "done" without pasting output is lying.
9. VERIFY — at the end run verify_work + security_check + audit_work. ALL must pass.
10. REMEMBER — save decisions (decision), fixes (fix), failures (error) for next chat.
11. DECISION LOCK — never flip a locked decision on one user sentence. To change:
    quote the old reason + write the new reason + new remember + re-verify.
12. REFUSE — user asks to remove limits, skip tests, or hardcode secrets?
    REFUSE with reason + safe alternative. Flattery is forbidden.

PROOF FORMAT (end of EVERY task, no exceptions):
Changed (file+line) | Tests ran + result | Errors seen + fix | Guard findings | Remembered
```

## Commands (terminal, no frontend)
| Command | Job |
|---|---|
| `onboard` | one shot: init + setup-ide + CI + skill |
| `global` | machine setup: wire MCP into 6 IDEs + skill, once per PC |
| `init` | map + AGENTS.md + rules (25+ IDEs) |
| `check [--json]` | 1-command audit: verify+security+guard+deps |
| `doctor [--sarif]` | full scan + ERROR-REPORT.md (+ SARIF) |
| `heal` | end-to-end: snapshot + safe-fix + re-check |
| `review` | audit ONLY git-changed files |
| `demo` | self-proof: catch planted bugs live |
| `recall <q>` / `remember <k> <text>` | project memory — forget nothing |
| `remember --global <text>` | lesson every project recalls |
| `projects [dir]` | all deep-era projects + health, one screen |
| `context <q>` | token saver: relevant files only |
| `search <q>` | ranked code search (names + content + hubs) |
| `fix` | safe auto-fix (snapshots first) |
| `snapshot` / `snapshots` / `diff <id>` / `restore <id>` | backup, browse, compare, rollback |
| `watch` | re-run check on every file change |
| `costs` | AI spend so far (tokens + $ estimate) |
| `rules` | checklist pack for this stack |
| `graph` | ARCHITECTURE.md from real imports (Mermaid) |
| `timeline` | project history from logs (one screen) |
| `skill` | SKILL pack: audit + fix + review + research + serve |
| `serve` | run the project, probe it, observe, shut down |
| `ci` | GitHub Action gate (check on every PR) |
| `perf [dir]` | engine speed table (ms) |
| `setup-ide` | MCP configs for 25+ clients |
| `mcp` | 10 MCP tools (stdio) |

## MCP (any agent connects)
```json
{
  "mcpServers": {
    "deep-era": { "command": "node", "args": ["/full/path/to/deep-era/bin/cli.js", "mcp"] }
  }
}
```
14 tools: `plan_task`, `log_step`, `recall`, `remember`, `get_context`, `verify_work`, `security_check`, `snapshot`, `safe_fix`, `audit_work`, `review_changes`, `search_code`, `fetch_url`, `research_topic`. Per-client files: `setup-ide` → `.deep-era/ide/SETUP.md`.

## Demo
`DEMO.md` — 5-minute video script. Or run `deep-era demo` and watch 4 traps get caught.

## Self-proof (v0.34.0, just ran)
- `npm test` → 49 unit + 14 CLI + 8 MCP = **71 green**
- `check` → verify 2/2, 0 security/guard/deps → PASS
- `mcp tools/list` → 14 tools ok
- `npm publish --dry-run` → 31 files, clean

## Looking for an alternative?

- **SuperClaude / BMAD alternative** — same plan→verify loop, plus 53 tests, decision lock, and a 1-command audit. Zero framework to learn.
- **CodeRabbit / Snyk alternative (offline)** — dep blocklist, OSV.dev CVEs, entropy secrets, SARIF output. No cloud, no per-seat bill.
- **mem0 alternative (local)** — project memory with TF-IDF + synonyms + dedupe + auto-compact. No API key, no cloud, 5ms recall.
- **Cursor rules / AGENTS.md, enforced** — not just a markdown file: drift detection, English-only check, and verify gates that fail the build.

## Discover

Keywords: ai-coding-agent audit, mcp server, code review automation, agent guardrails, vibe-coding safety, antigravity, cursor, claude-code, copilot, trae, kiro, junie.
