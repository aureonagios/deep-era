# ERROR-REPORT.md (AI Deep Era Doctor)

Generated: 2026-09-09T09:14:29.962Z
Stack: node | Files: 42

## 1. Terminal / build truth
### `syntax-check (27 files)` => PASS
```
all 27 JS pass (single-process)
```

### `npm test --silent` => PASS
```
PASS map-builds-with-imports
PASS security-runs-deep
PASS context-saves-tokens
PASS verify-deep-all-files
PASS snapshot-create-restore
PASS init-creates-agents-md
[deep-era] init ok -> C:\Users\Mustafa\AppData\Local\Temp\deep-era-EJ6Xoq
  - AGENTS.md (universal rules, 50+ IDEs)
  - .deep-era/map.json (2 files, stack=unknown)
  - .deep-era/RULES.md + logs/
Next: deep-era doctor  (full health check)
PASS guard-generic-no-trading
PASS fixture-demo-caught
PASS memory-no-chat-forgotten
PASS english-only-code-enforced
PASS memory-dedupe-saves-tokens
PASS duplication-caught-offline
PASS verify-fast-two-tier
PASS stack-packs-cover-all
[deep-era] CI gate created: .github/workflows/deep-era.yml
Every push/PR will now run: deep-era check
PASS ci-gate-generator
PASS sarif-output-valid
PASS dep-blocklist-critical
PASS sinks-and-entropy-caught
PASS py-ast-precision
PASS recall-tfidf-ranks-rare-first
PASS ide-22-clients-valid
[deep-era] ARCHITECTURE.md: 2 modules, 1 edges (renders on GitHub)
PASS graph-from-real-imports
[deep-era] timeline (1 events):
  2026-01-01T00:00 [step] init ok: 2 files
PASS timeline-reads-logs
[deep-era demo] planted 4 traps in C:\Users\Mustafa\AppData\Local\Temp\deep-era-demo-Y54Clv (SQL injection, new Function, hijacked dep, dummy stats)
[deep-era demo] caught 5 critical/high in 3987ms:
  ! [high] app.js: Possible SQL injection (string concat) (sql-concat)
  ! [high] app.js: new Function(string) — code from string, injection risk (new-function)
  ! [critical] app.js: String-concatenated SQL — parameterized queries are mandatory. (sql-injection)
  ! [high] REPORT.md: e.g. + 9x% claim looks like example numbers. Paste real command output. (dummy-stats)
  ! [critical] package.json: event-stream@3.3.6 BLOCKED — hijacked 2018 — steals bitcoin keys. Remove now. (dep-blocklist)
[deep-era demo] verdict: CAUGHT — a blind AI would ship this
PASS allowlist-suppression
PASS snapshot-diff-tracks-ai
PASS recall-synonym-finds-bug
[deep-era] skill ready: .deep-era/skill
```

## 2. Security findings (0)
None. Clean.


## 2b. Guard / audit (0)
None. Clean.


## 2c. Dependency audit (0)
None. Clean.


## 3. File map (top 50)
- .github/workflows/deep-era.yml (config, 268b)
- .gitignore (other, 40b)
- .npmignore (other, 46b)
- AGENTS.md (doc, 2954b)
- ARCHITECTURE.md (doc, 2177b)
- BENCH.md (doc, 1601b)
- bin/cli.js (code-js, 13647b)
- DEMO.md (doc, 1411b)
- ERROR-REPORT.md (doc, 4023b)
- LICENSE (other, 72b)
- mcp/server.js (code-js, 8466b)
- package.json (config, 603b)
- README.md (doc, 2675b)
- src/ci.js (code-js, 989b)
- src/context.js (code-js, 2044b)
- src/demo.js (code-js, 2459b)
- src/deps.js (code-js, 6221b)
- src/doctor.js (code-js, 4164b)
- src/fix.js (code-js, 1655b)
- src/graph.js (code-js, 1996b)
- src/guard.js (code-js, 7563b)
- src/init.js (code-js, 3992b)
- src/logger.js (code-js, 856b)
- src/map.js (code-js, 6838b)
- src/memory.js (code-js, 6314b)
- src/pyast.js (code-js, 2924b)
- src/sarif.js (code-js, 1239b)
- src/security.js (code-js, 6106b)
- src/setupIde.js (code-js, 8601b)
- src/skill.js (code-js, 2008b)
- src/snapshot.js (code-js, 4273b)
- src/spend.js (code-js, 1335b)
- src/stacks.js (code-js, 1495b)
- src/timeline.js (code-js, 1481b)
- src/verify.js (code-js, 6398b)
- tests/cli.js (code-js, 3655b)
- tests/fixtures/bad-project/app.js (code-js, 190b)
- tests/fixtures/bad-project/package.json (config, 76b)
- tests/fixtures/bad-project/REPORT.md (doc, 115b)
- tests/perf-result.json (config, 710b)
- tests/perf.js (code-js, 4386b)
- tests/run.js (code-js, 18923b)

## 4. Fix order for the AI
All clean. Nothing to fix.

## 5. Progress vs last run
Fixed since last run (1): dummy-stats@BENCH.md
Newly broken (0): —
