# AI Deep Era v0.50.0 — give the blind AI developer eyes

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/Tests-119%20passing-brightgreen.svg)](tests/run.js)
[![No deps](https://img.shields.io/badge/Dependencies-0-orange.svg)](package.json)
[![Skills](https://img.shields.io/badge/Skills-410%20vault-blue.svg)](.agents/skills/)
[![MCP](https://img.shields.io/badge/MCP-16%20tools-purple.svg)](mcp/server.js)
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

```
You work under AI Deep Era (read AGENTS.md in this project — it is already
installed). End to end, this is what it is and what you must do:

WHAT DEEP-ERA IS: a zero-dependency audit layer between you and the user.
It gives you project memory (recall/remember), a code map (.deep-era/map.json),
16 MCP tools, and 4 terminal gates (check/doctor/heal/demo). It does NOT write
code for you — it routes you to the right files BEFORE you start, then verifies
everything you write. The user checks your work with one command: `deep-era check`.
There is nowhere to hide.

YOUR WORKFLOW (no skipping):
0. GUIDE FIRST — call guide_task with what you are about to do. It returns the exact
   files to read, the files that must never be touched, the callers that will break,
   this project's locked decisions, and the order of work. Guessing the location is
   where slop starts. If it says it cannot route, SEARCH by content — do not guess.
1. RECALL FIRST — call recall with today's task. Read past chats/decisions/fixes.
   Forgetting one user statement is a failure.
2. SNAPSHOT — before big edits, snapshot (action=create). You break it, you restore it.
3. PLAN — call plan_task and show the plan. No blind coding.
4. CONTEXT — never read the whole repo. Call get_context with a query; take only
   relevant files + imports. Budgets: code â‰¤12000 chars, memory â‰¤4000 chars.
5. MAP — check imports/importedBy in .deep-era/map.json before guessing.
6. EDIT — read the FULL file before editing, diff after. Regex gutting is forbidden.
   Code, comments, identifiers: ENGLISH ONLY (user language is free).
7. LOG — call log_step for every important step. The user watches live.
8. TERMINAL TRUTH — read every command's output. FAIL = stop + fix. Claiming
   "done" without pasting output is lying.
9. VERIFY — at the end run verify_work + security_check + audit_work. ALL must pass.
   audit_work now also reads the code: swallowed errors, floating promises, dead
   branches, and tests that cannot fail are FAILURES, not style notes.
10. REMEMBER — save decisions (decision), fixes (fix), failures (error) for next chat.
11. DECISION LOCK — never flip a locked decision on one user sentence. To change:
    quote the old reason + write the new reason + new remember + re-verify.
12. REFUSE — user asks to remove limits, skip tests, or hardcode secrets?
    REFUSE with reason + safe alternative. Flattery is forbidden.

PROOF FORMAT (end of EVERY task, no exceptions):
Changed (file+line) | Tests ran + result | Errors seen + fix | Guard findings | Remembered
```

## What v0.47 adds: it reads the code, not just the syntax

v0.46 could prove a file *parses*. It could not prove the code inside it is *sane*.
Three bugs that an AI writes constantly passed every v0.46 gate:

```ts
// Every one of these was reported as PASS by v0.46.
const x: number = ;                    // TypeScript never parsed at all
return db.doc(id).set(data).catch(() => {});   // rejection dropped, caller told "saved"
fetch("/api/sync", { method: "POST" });        // never awaited, never handled
function isValid(u) { if (true) return true; } // validation that never validates
assert.ok(true);                        // a test that cannot fail
```

`deep-era check` now fails on all five. Two new engines, still zero dependencies:

| Engine | What it proves | Rules |
|---|---|---|
| `src/tsparse.js` | TypeScript / TSX / JSX actually parse | balanced and correctly nested brackets, terminated strings / templates / comments, dangling operators. Reports the exact `line:col`. It does **not** type-check, and says so. |
| `src/semantics.js` | The code does what it appears to do | `swallowed-exception`, `floating-promise`, `dead-branch`, `tautological-test`, `empty-test`, `always-passing-suite` |

Measured on the bug fixtures: **9 findings where v0.46 produced 0**, and **0 false
positives on this repository** (which is deliberately defensive on every optional
read, so it is the hardest available false-positive test). Both directions are
asserted in `tests/run.js`.

**Honest limits, stated up front.** `semantics.js` reports only what cannot be
intentional. Distinguishing "this author deliberately tolerates a failure" from
"the AI forgot to handle it" needs type information and intent that a regex cannot
recover, so best-effort wrappers and defensive degradation are deliberately *not*
reported. An earlier draft flagged 65 findings on this repo; all 65 were false. A
linter that cries wolf is worse than no linter, so the rule was narrowed until every
remaining finding was real.

## v0.49: it finds the code nobody wants to maintain

Ask any developer what is wrong with AI-written code and the answer is never "it does
not compile". It is this, said almost verbatim in the most-upvoted thread on the topic:

> *"the code that is generated is usually humongous... huge amounts of types and
> indirection and functions, calling functions and doing all sorts of nonsense which
> can be done manually, much simpler with fewer lines of code"*
>
> *"It's also hard to tell them not to use AI because **the code does work**."*

That second line is the whole problem. The code runs, so every existing gate passes —
and then somebody spends days untangling it:

> *"increasing my per-hour rate until I'm comfortable spending hundreds of hours
> unspaghettifying code"*

`src/slop.js` detects the structural habits that make code expensive to own:

| Rule | Catches | Severity |
|---|---|---|
| `slop-passthrough` | `function a(x) { return b(x); }` — a layer that adds a name and a stack frame, not behaviour. 3+ in a file means renames cost two edits | medium |
| `slop-dead-code` | A function no caller in the repository ever reaches. Still costs reading, maintenance, and reviewer attention | medium |
| `slop-indirection` | `const config = settings;` — a variable renamed to another name so the reader translates twice | low |
| `slop-chain` | `wrap(clean(transform(read(raw))))` — call levels with nothing in between, forcing the reader to hold the whole nest in their head | low |

**This is not a style linter.** Prettier and ESLint own formatting; duplicating them
would only produce noise. These are the four structural tells that distinguish
"written by a machine that did not have to maintain it" from code a person chose.

### It found slop in its own author

The honest part: run against this repository, the first version of this file reported
**14 findings, all false** — `let closed = false`, `let dirty = false`. Those declare
state, they do not alias anything. After the literal guard it reported **3, all real**,
and all three were genuine slop that I had written myself an hour earlier:

- `const dir = targetDir;` in `bin/cli.js` — an alias for no reason
- `const lineStart = offset;` in `src/semantics.js` — read exactly once
- `const start = offset;` in the same file — same thing

All three are fixed. The tool is now clean on the codebase that wrote it, and every
rule has a test asserting **both** directions, because a linter that cries wolf is
worse than no linter.

## v0.48: it tells the agent WHERE to work, before it writes a line

v0.47 could tell you your code was wrong. **It could not stop your agent from
starting wrong.** `get_context` ranked files by filename substring, so an agent asked
to "add rate limiting to the API" got whichever file happened to contain the word
`api` — often a test or a config. It then guessed, edited the wrong place, and shipped
slop. Guessing the location is where slop actually starts.

`deep-era guide "<what you are about to do>"` — and the MCP tool `guide_task`, which
an agent should call first — answers before any edit:

```
$ deep-era guide "fix the broken link checker in deep era"
TASK CLASS: bugfix
WHY IT MATTERS: Read the failing test FIRST and make it fail before changing anything...

READ FIRST — this repo's own rules (obey them over your defaults):
  - AGENTS.md
  - ARCHITECTURE.md

LIKELY TOUCH — read these before writing anything:
  - src/links.js  (code-js)  [name~"link"]

ALSO AFFECTED — these import what you are about to change:
  - bin/cli.js  (imports src/fix.js — check it still works)
  - src/doctor.js  (imports src/links.js — check it still works)

DO NOT EDIT without an explicit instruction:
  - (^|\/)(node_modules|vendor|\.venv|venv)\/  — third-party code, not yours
  - package-lock\.json$|...  — lockfile, regenerated by the package manager
  - (^|\/)tests?\/fixtures?\/  — fixture, holds deliberately broken input

LOCKED DECISIONS in this project — violating these is a failure:
  - RATE LIMIT locked at 100/min. Reason: infra cost ceiling, user approved

FAILED BEFORE in this project — do not repeat:
  - deploy failed twice: missing STRIPE_KEY env var

ORDER OF WORK (do not reorder):
  1. reproduce   2. locate   3. fix   4. prove
```

Six things it gets right that nothing else does:

1. **Routes by subject, not by verb.** "fix the reactor" does not send the agent to
   `src/fix.js`. Verbs like *fix*, *add*, *update* are stripped before matching.
2. **Says "search" instead of guessing.** For a task with no name match, it returns
   nothing and tells the agent to search by content. Inventing six plausible files is
   worse than admitting it does not know.
3. **Knows your project's own rules.** `AGENTS.md`, `CONTRIBUTING.md`, `.cursorrules`,
   the eslint/prettier config that actually exists. Local convention beats the agent's
   training data.
4. **Protects the files you never meant to touch.** Vendored code, build output,
   lockfiles, minified bundles, and deep-era's own fixtures.
5. **Surfaces locked decisions.** The agent cannot contradict a decision you approved
   three sessions ago because it never read that session.
6. **Names the callers.** Changing a hub without checking its importers is the most
   common way a "small fix" breaks something unrelated.

### The independent-verification point

Every tool in this category has the same hole, and the sharpest comment on Hacker News
about it was: *"You cannot have AI doing code generation and code review together.
Never both."*

**Deep-era contains no AI.** It is static analysis, zero dependencies, ~100 ms. The
same binary catches the same bugs whether a human, Cursor, Claude, or GPT wrote the
code. That is the whole point: it is the part of your pipeline that is not the model.

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
| `memory-bank` | Structured persistent project memory bank with markdown export |
| `prune` | keep newest 5 snapshots, delete the rot |
| `serve` | run the project, probe it, observe, shut down |
| `ci` | GitHub Action gate (check on every PR) |
| `perf [dir]` | engine speed table (ms) |
| `browser` | Playwright MCP bridge for browser-driven verify |
| `sbom` | CycloneDX SBOM of direct deps |
| `update` | check registry for a newer release |
| `setup-ide` | MCP configs for 25+ clients |
| `mcp` | 16 MCP tools (stdio) |

## MCP (any agent connects)
```json
{
  "mcpServers": {
    "deep-era": { "command": "node", "args": ["/full/path/to/deep-era/bin/cli.js", "mcp"] }
  }
}
```
16 tools: `guide_task`, `plan_task`, `log_step`, `recall`, `remember`, `get_context`, `verify_work`, `security_check`, `snapshot`, `safe_fix`, `audit_work`, `review_changes`, `search_code`, `fetch_url`, `research_topic`, `spend_report`. Per-client files: `setup-ide` â†’ `.deep-era/ide/SETUP.md`.

## Demo
`DEMO.md` — 5-minute video script. Or run `deep-era demo` and watch 4 traps get caught.

## Self-proof (v0.50.0, just ran)
- `npm test` â†’ 73 unit + 28 CLI + 11 MCP + 7 superpowers = **119 green (100% PASS)**
- `deep-era start` on a real 7-file Express app â†’ **10 findings, all verified correct**, in one command
- SARIF: 10/10 results carry line numbers, so GitHub renders them inline on the PR diff
- Slop engine: 4 rules, **0 false positives** on this repo, catches the over-engineering fixture
- Link checker: **0 findings** (3 false positives fixed at the source)
- `check` â†’ verify 2/2, 0 security/guard/slop â†’ PASS
- `mcp tools/list` â†’ 16 tools ok
- `npm publish --dry-run` â†’ 102.5 kB, 49 files, clean

## Looking for an alternative?

- **SuperClaude / BMAD alternative** — same planâ†’verify loop, plus 53 tests, decision lock, and a 1-command audit. Zero framework to learn.
- **CodeRabbit / Snyk alternative (offline)** — dep blocklist, OSV.dev CVEs, entropy secrets, SARIF output. No cloud, no per-seat bill.
- **Semgrep / CodeQL alternative (offline)** — reads the code, not just the syntax: swallowed exceptions, floating promises, dead branches, and tests that cannot fail. Zero deps, milliseconds, no query language to learn.
- **"Un-spaghettify" cost reducer** — finds the passthrough layers, dead code, and pointless indirection that make AI-written code expensive to own. Catches the complaint that syntax checkers structurally cannot.
- **mem0 alternative (local)** — project memory with TF-IDF + synonyms + dedupe + auto-compact. No API key, no cloud, 5ms recall.
- **Cursor rules / AGENTS.md, enforced** — not just a markdown file: drift detection, English-only check, and verify gates that fail the build.

## Discover

Keywords: ai-coding-agent audit, mcp server, code review automation, agent guardrails, vibe-coding safety, antigravity, cursor, claude-code, copilot, trae, kiro, junie.
