# AI Deep Era — Benchmarks (measured, not claimed)

How to reproduce: `node tests/perf.js` (writes `tests/perf-result.json`).
Machine: Windows, Node 22. No server, no cloud, no cache tricks.
Last run: v0.49.0 (see History).

## Slop detection (v0.49, new)

Measured on this repo with the real file map, not claimed from docs.

| Input | Findings | Verdict |
|---|---|---|
| `tests/fixtures/slop-bad` (deliberately over-engineered) | 4 — 3× `slop-passthrough`, 1× `slop-chain` | correct |
| `tests/fixtures/slop-clean` (legitimate code) | 0 | correct |
| This repository, 95 files | **0** | correct |

The false-positive history is recorded because it is the real cost of adding a
judgement-based linter: the first version reported **14 findings on this repo, all
false** (`let closed = false`, `let dirty = false` — those declare state, they do not
alias a variable). Adding the literal guard cut it to **3, all real**, and those 3 were
genuine slop in code I had written earlier the same session:

| File | Finding |
|---|---|
| `bin/cli.js` | `const dir = targetDir;` — an alias for no reason |
| `src/semantics.js` | `const start = offset;` — read exactly once |
| `src/semantics.js` | `const lineStart = offset;` — same thing |

All three are fixed. Both directions are pinned by tests
(`slop-no-false-positives-on-repo`, `slop-does-not-flag-literal-initialisers`).

## Link-checker false positives (v0.49, fixed)

The link checker reported 3 findings on this repository that were all wrong. All three
are fixed at the source rather than suppressed:

| False positive | Cause | Fix |
|---|---|---|
| `http://127.0.0.1 -> ECONNREFUSED` | loopback treated as a documentation link | RFC1918 and placeholder hosts skipped; port-specific loopback still checked, because that is usually a real reference |
| `https://api.osv.dev/v1/querybatch -> 405` | API endpoint inside source treated as a doc link | only documentation files are scanned; a URL in code is an endpoint, and 405 on a POST-only route is correct behaviour |
| `https://registry.npmjs.org/deep-era/latest -> 404` | package not published yet | reported distinctly as a pre-launch state, not a dead link |

Generated reports (`ERROR-REPORT.md`, `TEST-REPORT.md`, `ARCHITECTURE.md`, `BENCH.md`)
are also excluded, because they echo whatever the scanner last found — otherwise the
tool audits its own output forever.

Result: **0 findings** on this repository, live.

## Routing accuracy (v0.48, new)

Measured on this repo with the real file map, not claimed from docs.

| Task given to `guide_task` | Files it named | Correct? |
|---|---|---|
| `fix the broken link checker in deep era` | `src/links.js` | yes |
| `add rate limiting to the mcp server` | `mcp/server.js` | yes |
| `refactor the memory module to be faster` | `src/memory.js`, `src/memorybank.js`, `tools/memory_bank.py` | yes |
| `add a dark mode toggle to the dashboard` | `src/dashboard.js` | yes |
| `fix the submarine reactor` | **none** — falls back to "search by content" | correct refusal |

Two failure modes are pinned by tests because both were real bugs found by probing:
a generic verb used to hijack routing (`fix` matched `src/fix.js` regardless of the
subject), and test fixtures used to appear in the "you will edit this" list while the
same tool printed "never touch fixtures".

## Own repo (95 files) — measured, not estimated

| Engine | Time |
|---|---|
| map (scan + import graph) | ~35 ms |
| guard + duplication scan | ~126 ms |
| security (regex + entropy + Python AST batch) | ~140 ms |
| verify (JS two-tier + TS structural + scripts) | ~24 ms |
| semantic (swallow / promise / branch / test) | ~104 ms |
| tsparse TS/TSX/JSX | ~0.1 ms (no TS files here) |
| guidance (classify + route + blockers) | ~120 ms |
| slop (passthrough / dead code / indirection / chains) | ~90 ms |
| get_context + snippets | ~2 ms |
| recall (200 memory entries, TF-IDF + synonyms) | ~11 ms |
| **Full `check`** | **~0.4 s engines (+ project test-suite time)** |

History: verify was 4392 ms (one node process per file) → 12 ms single-process two-tier (354x).
Python AST was 14.7 s for 60 files (one process per file) → batched single process.

## Detection: what v0.47 catches that v0.46 passed

Measured with the engine run directly against the fixtures, not asserted from docs.

| Bug class | v0.46 | v0.47 |
|---|---|---|
| Unparseable TypeScript (`.ts`) | 0 findings (skipped entirely) | FAIL with `line:col` |
| Empty `.catch()` dropping a rejection | 0 findings | high |
| Unawaited promise in an async function | 0 findings | medium |
| `if (true)` / `x === x` dead branch | 0 findings | medium/high |
| `assert.ok(true)` that cannot fail | 0 findings | high |
| Test file with no assertions | 0 findings | medium |

False-positive control: this repository is deliberately defensive (every optional
read is guarded by a `try`/`catch`), which makes it the hardest available test. An
early draft of `semantics.js` produced **65 findings here, all false**. The final
engine produces **0**. Every rule in `tests/run.js` asserts both directions, because
a linter that cries wolf is worse than no linter.

## 300-file synthetic project (JS/Python/Go/Rust/Java)

| Engine | Time (range over runs) |
|---|---|
| map | 0.3-4 s |
| guard + dup | 0.4-3 s typical (60-file + 20k-window caps) |
| security | 0.3-1.6 s typical (batched Python AST) |
| semantic — new | ~9 ms (bounded: 400 files max) |
| context | 4-45 ms |

## Token-proxy (chars that would reach the AI)

Full 300-file feed: ~1,050,000 chars. `get_context`: 974 chars. **~99.9% less.**
(Memory recall adds max 4000 chars. Proxy, not exact tokens — model-dependent.)

## Honest limits (all resolved or stated)

- ~~Dup-scan bounds input silently~~ → resolved v0.20: `dup-sampled` note names the sample (for example a 60-of-300 split).
- ~~Python AST degrades silently~~ → resolved v0.20: `ast-unavailable` note when no system python.
- ~~TypeScript is never parsed~~ → resolved v0.47: `tsparse` verifies TS/TSX/JSX structure and reports `line:col`. Types still need `tsc`; the report says so instead of implying full validation.
- `swallowed-exception` reports only the empty `.catch()` case. Intent cannot be recovered statically, so deliberate best-effort wrappers are not reported. Stated in the module header.
- Token-proxy is chars, not tokens. Spend uses chars/4, labeled estimate.
