# ERROR-REPORT.md (AI Deep Era Doctor)

Generated: 2026-09-10T07:49:53.587Z
Stack: node | Files: 50

## 1. Terminal / build truth
### `syntax-check (31 files)` => PASS
```
all 31 JS pass (single-process)
```

### `npm test --silent` => PASS
```
PASS map-builds-with-imports
PASS security-runs-deep
PASS context-saves-tokens
PASS verify-deep-all-files
PASS snapshot-create-restore
PASS init-creates-agents-md
[deep-era] init ok -> C:\Users\Mustafa\AppData\Local\Temp\deep-era-jP6Ekt
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
[deep-era demo] planted 4 traps in C:\Users\Mustafa\AppData\Local\Temp\deep-era-demo-9hcilk (SQL injection, new Function, hijacked dep, dummy stats)
[deep-era demo] caught 5 critical/high in 3181ms:
  ! [high] app.js: Possible SQL injection (string concat) (sql-concat)
  ! [high] app.js: new Function(string) — code from string, injection risk (new-function)
  ! [critical] app.js: String-concatenated SQL — parameterized queries are mandatory. (sql-injection)
  ! [high] REPORT.md: e.g. + 9x% claim looks like example numbers. Paste real command output. (dummy-stats)
  ! [critical] package.json: event-stream@3.3.6 BLOCKED — hijacked 2018 — steals bitcoin keys. Remove now. (dep-blocklist)
[deep-era demo] verdict: CAUGHT — a blind AI would ship this
PASS allowlist-suppression
PASS snapshot-diff-tracks-ai
PASS recall-synonym-finds-bug
[deep-era] skill pack ready: deep-era-a
```

## 2. Security findings (0)
None. Clean.


## 2b. Guard / audit (0)
None. Clean.


## 2c. Dependency audit (0)
None. Clean.


## 3. File map (top 50)
- .github/FUNDING.yml (config, 20b)
- .github/ISSUE_TEMPLATE/bug_report.md (doc, 336b)
- .github/ISSUE_TEMPLATE/feature_request.md (doc, 291b)
- .github/PULL_REQUEST_TEMPLATE.md (doc, 239b)
- .github/workflows/deep-era.yml (config, 279b)
- .gitignore (other, 107b)
- .npmignore (other, 50b)
- AGENTS.md (doc, 2954b)
- ARCHITECTURE.md (doc, 2246b)
- BENCH.md (doc, 1641b)
- bin/cli.js (code-js, 16185b)
- DEMO.md (doc, 1451b)
- ERROR-REPORT.md (doc, 4243b)
- LICENSE (other, 73b)
- mcp/server.js (code-js, 11935b)
- package.json (config, 650b)
- README.md (doc, 7446b)
- src/ci.js (code-js, 1020b)
- src/context.js (code-js, 2100b)
- src/demo.js (code-js, 2506b)
- src/deps.js (code-js, 6860b)
- src/doctor.js (code-js, 4232b)
- src/fix.js (code-js, 1701b)
- src/global.js (code-js, 3199b)
- src/graph.js (code-js, 2035b)
- src/guard.js (code-js, 9357b)
- src/init.js (code-js, 4049b)
- src/logger.js (code-js, 886b)
- src/map.js (code-js, 7055b)
- src/memory.js (code-js, 8099b)
- src/projects.js (code-js, 1722b)
- src/pyast.js (code-js, 3007b)
- src/review.js (code-js, 2473b)
- src/sarif.js (code-js, 1279b)
- src/security.js (code-js, 6220b)
- src/setupIde.js (code-js, 8662b)
- src/skill.js (code-js, 3452b)
- src/snapshot.js (code-js, 4395b)
- src/spend.js (code-js, 1372b)
- src/stacks.js (code-js, 1519b)
- src/timeline.js (code-js, 1515b)
- src/verify.js (code-js, 6621b)
- tests/cli.js (code-js, 7036b)
- tests/fixtures/bad-project/app.js (code-js, 195b)
- tests/fixtures/bad-project/package.json (config, 77b)
- tests/fixtures/bad-project/REPORT.md (doc, 120b)
- tests/mcp.js (code-js, 5400b)
- tests/perf-result.json (config, 710b)
- tests/perf.js (code-js, 4468b)
- tests/run.js (code-js, 22696b)

## 4. Fix order for the AI
All clean. Nothing to fix.

## 5. Progress vs last run
First audited run — baseline locked.
