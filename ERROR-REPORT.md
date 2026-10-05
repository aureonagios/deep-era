# ERROR-REPORT.md (AI Deep Era Doctor)

Generated: 2026-10-05T10:53:02.977Z
Stack: node | Files: 99

## 1. Terminal / build truth
### `syntax-check (51 JS + 0 TS/JSX)` => PASS
```
all 51 JS pass (single-process)
```

### `npm test --silent` => PASS
```
PASS map-builds-with-imports
PASS security-runs-deep
PASS context-saves-tokens
PASS verify-deep-all-files
PASS snapshot-create-restore
PASS snapshot-restore-removes-new-files
PASS init-creates-agents-md
[deep-era] init ok -> C:\Users\Mustafa\AppData\Local\Temp\deep-era-VsnoHY
  - AGENTS.md (universal rules, 25+ IDEs)
  - .deep-era/map.json (2 files, stack=unknown)
  - .deep-era/RULES.md + logs/
Next: deep-era doctor  (full health check)
PASS guard-generic-no-trading
PASS fixture-demo-caught
PASS semantic-catches-ai-bugs
PASS semantic-no-false-positives-on-repo
PASS semantic-respects-guard-patterns
PASS tsparse-valid-typescript-passes
PASS tsparse-catches-broken-typescript
PASS verify-fails-on-broken-typescript
PASS slop-catches-ai-over-engineering
PASS slop-no-false-positives-on-clean-code
PASS slop-no-false-positives-on-repo
PASS slop-does-not-flag-literal-initialisers
PASS guidance-classifies-task
PASS guidance-routes-to-right-file
PASS guidance-never-points-at-fixtures
PASS guidance-says-stop-when-it-cannot-route
PASS guidance-surfaces-locked-decisions
PASS guidance-forbids-generated-and-lockfiles
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
[deep-era demo] planted 4 traps in C:\Users\Mustafa\AppData\Local\Temp\deep-era-demo-mSrYAH (SQL injection, new Function, hijacked dep, dummy stats)
[deep-era demo] caught 5 critical/high in 9ms:
  ! [high] app.js: Po
```

## 2. Security findings (0)
None. Clean.

## 2b. Guard / audit (0)
None. Clean.


## 2b2. Semantic bugs (0)
None. No swallowed errors, floating promises, dead branches, or fake tests.


## 2b3. Slop / over-engineering (0)
None. No passthrough layers, dead code, or pointless indirection.


## 2c. Dependency audit (0)
None. Clean.


## 2d. Link check (0)
None. Clean.


## 3. File map (top 50)
- .agents/catalog.json (config, 502509b)
- .agents/router.py (code-py, 1483b)
- .agents/rules/agi-self-correction-verification.md (doc, 1899b)
- .agents/rules/autonomous-skills.md (doc, 22878b)
- .deep-eraignore (other, 85b)
- .github/FUNDING.yml (config, 20b)
- .github/ISSUE_TEMPLATE/bug_report.md (doc, 336b)
- .github/ISSUE_TEMPLATE/feature_request.md (doc, 291b)
- .github/PULL_REQUEST_TEMPLATE.md (doc, 239b)
- .github/workflows/deep-era.yml (config, 279b)
- .gitignore (other, 125b)
- .npmignore (other, 50b)
- AGENTS.md (doc, 5191b)
- ARCHITECTURE.md (doc, 2246b)
- BENCH.md (doc, 6539b)
- bin/cli.js (code-js, 33149b)
- DEMO.md (doc, 1451b)
- ERROR-REPORT.md (doc, 4484b)
- install.ps1 (other, 690b)
- install.sh (other, 631b)
- LICENSE (other, 73b)
- llms.txt (other, 2184b)
- mcp/server.js (code-js, 15474b)
- package.json (config, 703b)
- README.md (doc, 20288b)
- SECURITY.md (doc, 1305b)
- src/browser.js (code-js, 1970b)
- src/ci.js (code-js, 1874b)
- src/context.js (code-js, 2100b)
- src/cwe.js (code-js, 2019b)
- src/dashboard.js (code-js, 30438b)
- src/demo.js (code-js, 2506b)
- src/deps.js (code-js, 9377b)
- src/docker.js (code-js, 4522b)
- src/doctor.js (code-js, 6145b)
- src/fix.js (code-js, 1701b)
- src/global.js (code-js, 3199b)
- src/graph.js (code-js, 2971b)
- src/guard.js (code-js, 14306b)
- src/guardian.js (code-js, 3400b)
- src/guidance.js (code-js, 15085b)
- src/hook.js (code-js, 1826b)
- src/hunt.js (code-js, 2737b)
- src/init.js (code-js, 6321b)
- src/links.js (code-js, 6418b)
- src/logger.js (code-js, 886b)
- src/map.js (code-js, 7924b)
- src/memory.js (code-js, 10416b)
- src/memorybank.js (code-js, 2983b)
- src/net.js (code-js, 3331b)

## 4. Fix order for the AI
All clean. Nothing to fix.

## 5. Progress vs last run
First audited run — baseline locked.
