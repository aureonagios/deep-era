# AI Deep Era — Benchmarks (measured, not claimed)

How to reproduce: `node tests/perf.js` (writes `tests/perf-result.json`).
Machine: Windows, Node 22. No server, no cloud, no cache tricks.
Last run: v0.19.0 (see History).

## Own repo (41 files) — milliseconds

| Engine | Time |
|---|---|
| map (scan + import graph) | ~16 ms |
| guard + duplication scan | ~50 ms |
| security (regex + entropy + Python AST batch) | ~17 ms |
| verify (two-tier syntax + scripts) | ~13 ms |
| get_context + snippets | ~1 ms |
| recall (200 memory entries, TF-IDF + synonyms) | ~8 ms |
| **Full `check`** | **~0.1 s** |

History: verify was 4392 ms (one node process per file) → 12 ms single-process two-tier (354x).
Python AST was 14.7 s for 60 files (one process per file) → batched single process.

## 300-file synthetic project (JS/Python/Go/Rust/Java)

| Engine | Time (range over runs) |
|---|---|
| map | 0.4-4 s |
| guard + dup | 0.5-8.9 s (worst case: near-identical files; capped at 60 files) |
| security | 0.2-3.9 s |
| context | 5-45 ms |

## Token-proxy (chars that would reach the AI)

Full 300-file feed: ~1,050,000 chars. `get_context`: 974 chars. **~99.9% less.**
(Memory recall adds max 4000 chars. Proxy, not exact tokens — model-dependent.)

## Honest limits (all resolved or stated)

- ~~Dup-scan bounds input silently~~ → resolved v0.20: `dup-sampled` note names the sample (for example a 60-of-300 split).
- ~~Python AST degrades silently~~ → resolved v0.20: `ast-unavailable` note when no system python.
- Token-proxy is chars, not tokens. Spend uses chars/4, labeled estimate.
