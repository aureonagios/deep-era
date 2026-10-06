# ERROR-REPORT.md (AI Deep Era Doctor)

Generated: 2026-10-06T13:17:20.129Z
Stack: node | Files: 108

## 1. Terminal / build truth
### `syntax-check (55 JS + 0 TS/JSX)` => PASS
```
all 55 JS pass (single-process)
```

### `npm test --silent` => PASS
```
PASS map-builds-with-imports
PASS security-runs-deep
PASS guardian-skips-placeholders
PASS guardian-catches-real-secrets
PASS guardian-merge-keeps-worst-finding
PASS context-saves-tokens
PASS verify-deep-all-files
PASS snapshot-create-restore
PASS snapshot-restore-removes-new-files
PASS init-creates-agents-md
[deep-era] init ok -> C:\Users\Mustafa\AppData\Local\Temp\deep-era-wWALGX
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
PASS prompt-file-exists-and-is-complete
PASS prompt-names-only-tools-that-exist
PASS prompt-states-the-real-limits
PASS prompt-covers-the-detected-failures
PASS prompt-steers-agents-off-the-broken-registry-path
PASS readme-install-is-honest
PASS cli-prompt-prints-clean-copy
PASS skills-catalog-has-triggers
PASS skills-match-the-right-skill
PASS skills-handles-shorthand
PASS skills-refuse-instead-of-guessing
PASS skills-no-duplicate-suggestions
PASS guide-task-recommends-skills
PASS mcp-skill-tools-are-exposed
PASS skillindex-audit-finds-gaps
PASS skillindex-audit-clean-catalog-passes
PASS skillindex-parses-both-frontmatter-styles
PASS skillindex-normalizes-crlf
PASS skillindex-derives-triggers
PASS skillindex-collection-install
PASS skillindex-reindex-merges-and-discovers
PASS skillindex-cache-refreshes-on-reindex
PASS skills-prefix-ratio-guard
PASS skills-idf-downweights-common-words
PASS skillindex-audit-two-tier-rescue
PASS crypt-roundtrip-and-leaks-nothing
PASS crypt-rejects-wrong-key-and-detects-tampering
PASS crypt-fresh-iv-per-record
PASS crypt-refuses-weak-passphrase
PASS memory-bank-encrypts-at-rest
PASS memory-bank-plaintext-mode-still-works
PA
```

## 2. Security findings (0)
None. Clean.

## 2b. Guard / audit (1)
- [low] (scan): Dup-scan sampled 60/61 files — huge repos are sampled, not fully scanned. (dup-sampled)

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
- .gitignore (other, 524b)
- .npmignore (other, 50b)
- AGENTS.md (doc, 5206b)
- ARCHITECTURE.md (doc, 2321b)
- BENCH.md (doc, 6541b)
- bin/cli.js (code-js, 38976b)
- CHANGELOG.md (doc, 18066b)
- DEMO.md (doc, 1451b)
- ERROR-REPORT.md (doc, 4547b)
- install.ps1 (other, 690b)
- install.sh (other, 631b)
- LICENSE (other, 73b)
- llms.txt (other, 2184b)
- mcp/server.js (code-js, 18083b)
- package.json (config, 1245b)
- PROMPT.md (doc, 9955b)
- README.md (doc, 14418b)
- SECURITY.md (doc, 1305b)
- src/browser.js (code-js, 1970b)
- src/ci.js (code-js, 1874b)
- src/context.js (code-js, 2100b)
- src/crypt.js (code-js, 7234b)
- src/cwe.js (code-js, 2019b)
- src/dashboard.js (code-js, 30438b)
- src/demo.js (code-js, 2506b)
- src/deps.js (code-js, 9377b)
- src/docker.js (code-js, 4522b)
- src/doctor.js (code-js, 6513b)
- src/fix.js (code-js, 1701b)
- src/global.js (code-js, 3199b)
- src/graph.js (code-js, 2971b)
- src/guard.js (code-js, 15837b)
- src/guardian.js (code-js, 6973b)
- src/guidance.js (code-js, 15893b)
- src/hook.js (code-js, 1826b)
- src/hunt.js (code-js, 2737b)
- src/ide.js (code-js, 12571b)
- src/init.js (code-js, 6336b)
- src/links.js (code-js, 6415b)
- src/logger.js (code-js, 886b)

## 4. Fix order for the AI
1. Fix findings above
2. Then re-run doctor

## 5. Progress vs last run
Fixed since last run (1): rm-rf@tests/run.js
Newly broken (1): dup-sampled@(scan)
