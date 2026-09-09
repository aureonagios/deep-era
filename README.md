# AI Deep Era v0.21.0 — give the blind AI developer eyes

Universal layer that makes **any AI agent** (Cursor, Copilot, Antigravity, Windsurf, OpenCode, Claude Code, Gemini CLI, Codex, JetBrains Junie, Roo, Kilo, Trae, Zed, Cline, Continue + more) deep + safe + transparent. Any language (JS/TS/Python/Go/Rust/Java/PHP/Ruby/Dart/C#/Swift), any project. Zero dependencies, offline-first.

**Language law:** the user may speak ANY language — all code, comments, identifiers and logs the AI writes are ENGLISH ONLY (enforced by `audit_work`).

## 5-minute quickstart (1 command does it all)
```bash
npx deep-era onboard     # rules + 25 IDEs + CI gate + skill
npx deep-era check       # 30s audit: PASS = accept, FAIL = send back to the AI
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
| `init` | map + AGENTS.md + rules (25+ IDEs) |
| `check [--json]` | 1-command audit: verify+security+guard+deps |
| `doctor [--sarif]` | full scan + ERROR-REPORT.md (+ SARIF) |
| `heal` | end-to-end: snapshot + safe-fix + re-check |
| `demo` | self-proof: catch planted bugs live |
| `recall <q>` / `remember <k> <text>` | project memory — forget nothing |
| `context <q>` | token saver: relevant files only |
| `fix` | safe auto-fix (snapshots first) |
| `snapshot` / `snapshots` / `diff <id>` / `restore <id>` | backup, browse, compare, rollback |
| `watch` | re-run check on every file change |
| `costs` | AI spend so far (tokens + $ estimate) |
| `rules` | checklist pack for this stack |
| `graph` | ARCHITECTURE.md from real imports (Mermaid) |
| `timeline` | project history from logs (one screen) |
| `skill` | SKILL.md for the skills ecosystem |
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
10 tools: `plan_task`, `log_step`, `recall`, `remember`, `get_context`, `verify_work`, `security_check`, `snapshot`, `safe_fix`, `audit_work`. Per-client files: `setup-ide` → `.deep-era/ide/SETUP.md`.

## Demo
`DEMO.md` — 5-minute video script. Or run `deep-era demo` and watch 4 traps get caught.

## Self-proof (v0.21.0, just ran)
- `npm test` → 37 unit + 6 CLI = **43 green**
- `check` → verify 2/2, 0 security/guard/deps → PASS
- `mcp tools/list` → 10 tools ok
- `npm publish --dry-run` → 28 files, clean
