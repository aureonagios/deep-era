# AI Deep Era v0.21.0 — give the blind AI developer eyes

Universal layer that makes **any AI agent** (Cursor, Copilot, Antigravity, Windsurf, OpenCode, Claude Code...) deep + safe + transparent. Any language (JS/TS/Python/Go/Rust/Java/PHP/Ruby/Dart/C#/Swift), any project.

**Language law:** the user may speak ANY language — all code, comments, identifiers and logs the AI writes are ENGLISH ONLY (enforced by `audit_work`).

## 5-minute quickstart (1 command does it all)
```bash
npx deep-era onboard     # rules + 25 IDEs + CI gate + skill
node bin/cli.js check    # 30s audit: PASS = accept, FAIL = send back to the AI
```

## AI ko ye 1 prompt do
```
AGENTS.md parho aur uske rules follow karo. Kaam se pehle snapshot lo,
get_context se relevant files lo, har step log_step me likho, akhir me
verify_work + security_check + audit_work chalao. Output ke baghair
"ho gaya" mat bolo. Proof do: file+line, test result, error+fix.
```

## Commands (sab IDE terminal me, koi frontend nahi)
| Command | Kaam |
|---|---|
| `init` | map + AGENTS.md + rules (50+ IDEs) |
| `check` | 1-command audit: verify+security+guard+deps |
| `doctor` | full scan + ERROR-REPORT.md |
| `recall <q>` / `remember <kind> <text>` | project memory — koi chat na bhule |
| `context <q>` | token-bachat: sirf relevant files |
| `fix` | safe auto-fix (snapshot pehle) |
| `snapshot` / `restore` | backup + rollback |
| `rules` | checklist pack for this stack |
| `graph` | ARCHITECTURE.md from real imports (Mermaid) |
| `timeline` | project history from logs (one screen) |
| `demo` | self-proof: catch planted bugs live |
| `heal` | end-to-end: snapshot + safe-fix + re-check |
| `costs` | AI spend so far (tokens + $ estimate) |
| `snapshots` / `diff <id>` | what the AI touched since backup |
| `watch` | re-run check on every file change |
| `skill` | SKILL.md for the skills ecosystem |
| `ci` | GitHub Action gate (check on every PR) |
| `perf [dir]` | engine speed table (ms) |
| `onboard` | one shot: init + setup-ide |
| `setup-ide` | 5 IDE ke MCP configs |
| `mcp` | 10 MCP tools (stdio) |

## MCP (har agent se connect)
```json
{
  "mcpServers": {
    "deep-era": { "command": "node", "args": ["/full/path/to/deep-era/bin/cli.js", "mcp"] }
  }
}
```
10 tools: `plan_task`, `log_step`, `recall`, `remember`, `get_context`, `verify_work`, `security_check`, `snapshot`, `safe_fix`, `audit_work`

## Demo
`DEMO.md` dekho — 5-minute video script (andha AI vs Deep-Era AI).

## Self-proof (v0.21.0, just ran)
- `npm test` → 37 unit + 6 CLI = **43 green**
- `check` → verify 2/2, 0 security/guard/deps → PASS
- `mcp tools/list` → 10 tools ok
- `npm publish --dry-run` → 19 files, clean

