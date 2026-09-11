---
name: deep-era-research
description: Research APIs/docs before using them. Use when about to call an unfamiliar library, version, or endpoint. Verify, never invent.
---

# Deep-Era Research Skill

Never invent an API signature. Verify in this order:
1. **Repo first**: search_code the project — maybe it already wraps it.
2. **Official docs**: fetch_url the official docs page / changelog / README. Quote the version you read.
3. **Instant answer**: research_topic for a quick check (best-effort, may be offline).
4. **Cite**: in code comments + final proof, write WHAT you verified and WHERE (URL + version).
5. **Pin**: add the verified version to dependencies (no *, no latest).

If docs are unreachable: say so honestly, implement the smallest surface, and mark it UNVERIFIED in the proof.
