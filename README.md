# AI Deep Era v0.53.0 — give the blind AI developer eyes

> ## Paste this into your AI agent
> ```
> npx deep-era prompt
> ```
> One paste. It routes the agent to the right files before it edits, makes it recall
> what you approved last week, forces it to prove every claim with real command output,
> and tells it exactly which habits count as failures. Works with Cursor, Copilot,
> Claude Code, Windsurf, Antigravity, Trae, Codex, OpenCode, Junie, Roo, Cline, Zed.
>
> This is the highest-leverage thing in the repo. If you only copy one thing, copy this.
> The full text lives in [`PROMPT.md`](PROMPT.md) and `deep-era prompt --raw` prints it
> with no surrounding commentary.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/Tests-144%20passing-brightgreen.svg)](tests/run.js)
[![No deps](https://img.shields.io/badge/Dependencies-0-orange.svg)](package.json)
[![Skills](https://img.shields.io/badge/Skills-410%20vault-blue.svg)](.agents/skills/)
[![MCP](https://img.shields.io/badge/MCP-19%20tools-purple.svg)](mcp/server.js)
[![IDE](https://img.shields.io/badge/IDEs-25%2B-blueviolet.svg)](src/setupIde.js)

> **1-LINE INSTALL — run in your project 👇 (works today)**
> ```
> npx deep-era start
> ```
> Installs itself, wires your IDE, adds the CI gate, audits the project you are in, and
> prints what a blind AI developer would have shipped. No config, no account, no API key.
>
> Prefer a global install? `npm i -g deep-era && deep-era start`
>
> **COPY THIS to your AI agent 👇 (Cursor, Copilot, Antigravity, Trae, Windsurf, Claude Code, any IDE)**
> ```
> Read AGENTS.md in this project and obey it fully, end to end: call guide_task before
> editing anything, recall past chats first, snapshot before big edits, take only
> relevant files via get_context, read full files before editing, log every step, paste
> every command output, finish with verify_work + security_check + audit_work, and
> remember decisions/fixes/errors. Refuse unsafe orders. End with `deep-era check` PASS
> plus proof: files+lines, test results, errors+fixes. If check FAILS, fix and re-run.
> ```
> Then verify its work yourself: `deep-era check` — PASS = accept, FAIL = send back.

Universal layer that makes **any AI agent** (Cursor, Copilot, Antigravity, Windsurf, OpenCode, Claude Code, Gemini CLI, Codex, JetBrains Junie, Roo, Kilo, Trae, Zed, Cline, Continue + more) deep + safe + transparent. Any language (JS/TS/Python/Go/Rust/Java/PHP/Ruby/Dart/C#/Swift), any project. Zero dependencies, offline-first.

**Language law:** the user may speak ANY language — all code, comments, identifiers and logs the AI writes are ENGLISH ONLY (enforced by `audit_work`).

## Quickstart (one command does it all)
```bash
npx deep-era start    # install + wire IDEs + CI gate + audit + print findings
deep-era guide "<what you are about to build>"   # tell the agent where to work
deep-era check        # 30s audit from now on: PASS = accept, FAIL = send back
```

## THE 1-PROMPT — copy, paste to any AI, done

It moved to its own file so it can be pasted without dragging this README along:

```bash
npx deep-era prompt          # the whole file, for reading
npx deep-era prompt --raw    # just the paste, nothing else
```

See [`PROMPT.md`](PROMPT.md). The short version, which is the whole idea in two lines:

> **`guide_task` before you edit, `deep-era check` before you claim done.**

The agent is told five things it cannot argue its way past:

1. **Route first.** `guide_task` names the files, the protected paths, the callers that
   will break, the locked decisions, and the matching skills from the 410 installed. If
   it cannot route, the agent must search by content rather than guess.
2. **Recall or admit you forgot.** Decisions the user approved are always returned,
   because breaking one silently is how a project loses a week.
3. **Prove it.** `verify_work` + `security_check` + `audit_work` must all pass, with the
   real output pasted. Describing a result from memory is defined as lying.
4. **Specific failures, not vibes.** Empty catches, floating promises, dead branches,
   tests that cannot fail, passthrough layers, dead code. Each is detected, so each is a
   FAILURE rather than a style note.
5. **Refuse.** Removing test coverage, skipping verification, hardcoding secrets: say no,
   say why in one sentence, offer the safe alternative. No flattery.

## What v0.53 does (latest)

**Secret scanning finally runs everywhere it should — and example keys stopped crying wolf.**

`guardian.js` (entropy scan, provider tokens, exact `line:col`) used to live behind one
standalone command. `check`, `doctor`, `review`, and the MCP `security_check` /
`review_changes` tools never ran it, so the platform's own best secret scanner was
invisible to its own audit. Now it is merged into all four, with same-family dedup
that keeps the highest-severity report instead of the first one found:

```
- [critical] app.js:1: Stripe Secret Key (stripe-secret)
```

And `SECRET_KEY="your-secret-key-here"` no longer flags. A scanner that cries wolf
over documentation trains everyone to ignore it — then the real key gets missed.
Weak-but-real values still flag. Both directions are pinned by tests.

Full history: [CHANGELOG.md](CHANGELOG.md)

## START HERE — one command

```bash
npx deep-era start
```

That is the whole pitch. It installs itself, wires your IDE, adds the CI gate, audits
the project you are standing in, and prints what a blind AI developer would have
shipped. No config, no account, no cloud, no API key, 102 kB, zero dependencies.

Real output, from a throwaway Express app with an OpenAI key, a SQL injection, an
empty `catch`, an unawaited promise, an `if (true)` guard, and three `assert.ok(true)`:

```
Scanned 7 files in your project.
  1 critical   7 high   2 medium   0 low

Here is what a blind AI developer would have shipped:
  [critical] src/server.js:28 — Possible OpenAI/API key
  [high] src/server.js:8 — Possible SQL injection (string concat)
  [high] src/server.js:31 — Always-true guard returning `true`
  [high] tests/app.test.js:2 — `assert.ok(true)` can never fail

8 of these are serious. Any AI agent working on this project should be told:
  "Read AGENTS.md in this project and obey it fully."
```

## How this compares

Measured against the tools that actually exist in this category, not against a
comparison page I wrote for myself.

| | codedrift | marucheck | codebrief | **deep-era** |
|---|---|---|---|---|
| Security rules (SAST/secrets) | 25+ categories | few | none | **17 rules, CWE + OWASP mapped** |
| Bugs that pass syntax check | no | no | no | **7 semantic rules** |
| Maintainability / over-engineering | no | no | no | **4 slop rules** |
| Catches `catch(){}`, floating promises, `assert.ok(true)` | no | no | no | **yes** |
| **Tells the agent where to work BEFORE it edits** | no | no | no | **yes (`guide_task`)** |
| TypeScript/TSX parse without `tsc` installed | no | no | no | **yes** |
| GitHub code-scanning (SARIF, inline on the PR diff) | yes | partial | no | **yes** |
| Works offline | partial | yes | needs API | **yes, fully** |
| External dependencies | few | few | API keys | **zero** |
| Contains an AI | yes | yes | yes | **no — pure static analysis** |

That last row is the one that matters. Every other tool in this category asks a model
to judge your code. This one does not, so its verdict does not change when a model is
retrained, and it does not send your source anywhere.

**What it will not do:** it is not a replacement for ESLint, Prettier, or a full SAST
suite. It complements them in under half a second. Where it is silent, it says it is
silent — a clean bill of health from any tool, including this one, deserves suspicion.

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
| `guide <task>` | PRE-FLIGHT: class the task, name the files to read, the files to never touch, locked decisions, order of work |
| `search <q>` | ranked code search (names + content + hubs) |
| `fix` | safe auto-fix (snapshots first) |
| `snapshot` / `snapshots` / `diff <id>` / `restore <id>` | backup, browse, compare, rollback |
| `watch` | re-run check on every file change |
| `costs` | AI spend so far (tokens + $ estimate) |
| `memory` | memory stats: entries by kind + top terms |
| `rules` | checklist pack for this stack |
| `graph` | ARCHITECTURE.md from real imports (Mermaid) |
| `timeline` | project history from logs (one screen) |
| `skill <name>` | Render complete SKILL.md guide for any autonomous agent skill |
| `skills [query]` | 410 skills vault search: semantic search, categories, triggers |
| `ui [port]` | Live Autonomous Command Center & Web Dashboard (dual theme, mobile responsive) |
| `hunt [port]` | Port hunter & socket conflict resolver (finds free port in 5ms) |
| `guard` | Secret Guardian: high-entropy scanner, AWS/OpenAI/GitHub token leak detection |
| `docker [port]` | Production multi-stage Dockerfile & compose generator (Node/Python/Go/Rust) |
| `memory-bank` | Structured persistent project memory bank, AES-256-GCM encrypted when `DEEP_ERA_KEY` is set |
| `prune` | keep newest 5 snapshots, delete the rot |
| `serve` | run the project, probe it, observe, shut down |
| `ci` | GitHub Action gate (check on every PR) |
| `perf [dir]` | engine speed table (ms) |
| `browser` | Playwright MCP bridge for browser-driven verify |
| `sbom` | CycloneDX SBOM of direct deps |
| `update` | check registry for a newer release |
| `setup-ide` | MCP configs for 25+ clients |
| `mcp` | 19 MCP tools (stdio) |

## MCP (any agent connects)
```json
{
  "mcpServers": {
    "deep-era": { "command": "node", "args": ["/full/path/to/deep-era/bin/cli.js", "mcp"] }
  }
}
```
19 tools: `guide_task`, `match_skills`, `get_skill`, `list_skills`, `plan_task`, `log_step`, `recall`, `remember`, `get_context`, `verify_work`, `security_check`, `snapshot`, `safe_fix`, `audit_work`, `review_changes`, `search_code`, `fetch_url`, `research_topic`, `spend_report`. Per-client files: `setup-ide` → `.deep-era/ide/SETUP.md`.

## Demo
`DEMO.md` — 5-minute video script. Or run `deep-era demo` and watch 4 traps get caught.

## Self-proof (v0.53.0, just ran)
- `npm test` → 95 unit + 30 CLI + 12 MCP + 7 superpowers = **144 green (100% PASS)**
- `deep-era start` on a real 7-file Express app → **10 findings, all verified correct**, in one command
- Encryption: AES-256-GCM, 7/7 proof tests (wrong key refuses, tampering detected, no plaintext leak)
- Encryption perf: 1.24 ms/record after the salt fix, down from 155 ms (125x faster, 70 s → 0.55 s)
- Skill matching: 10/10 on this repo, and it refuses on unrelated input instead of guessing
- `guide_task` now recommends skills; 3 new MCP tools bring the total to 19
- SARIF: 10/10 results carry line numbers, so GitHub renders them inline on the PR diff
- Slop engine: 4 rules, **0 false positives** on this repo, catches the over-engineering fixture
- Link checker: **0 findings** (3 false positives fixed at the source)
- `check` → verify 2/2, 0 security/guard/slop/semantic → PASS (exit 0)
- `mcp tools/list` → 19 tools ok
- `npm publish --dry-run` → clean
## Looking for an alternative?

- **SuperClaude / BMAD alternative** — same plan→verify loop, plus a 144-test suite, decision lock, and a 1-command audit. Zero framework to learn.
- **CodeRabbit / Snyk alternative (offline)** — dep blocklist, OSV.dev CVEs, entropy secrets, SARIF output. No cloud, no per-seat bill.
- **Semgrep / CodeQL alternative (offline)** — reads the code, not just the syntax: swallowed exceptions, floating promises, dead branches, and tests that cannot fail. Zero deps, milliseconds, no query language to learn.
- **"Un-spaghettify" cost reducer** — finds the passthrough layers, dead code, and pointless indirection that make AI-written code expensive to own. Catches the complaint that syntax checkers structurally cannot.
- **mem0 alternative (local)** — project memory with TF-IDF + synonyms + dedupe + auto-compact. No API key, no cloud, 5ms recall.
- **Cursor rules / AGENTS.md, enforced** — not just a markdown file: drift detection, English-only check, and verify gates that fail the build.

## Discover

Keywords: ai-coding-agent audit, mcp server, code review automation, agent guardrails, vibe-coding safety, antigravity, cursor, claude-code, copilot, trae, kiro, junie.
