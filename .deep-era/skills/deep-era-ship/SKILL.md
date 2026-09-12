---
name: deep-era-ship
description: Release gate: prove a version is shippable. Use before merge, tag, or publish. No proof, no ship.
---

# Deep-Era Ship Skill

Merge/tag/publish only with proof in hand:

1. **Review**: `deep-era review` — the diff must be PASS. Legacy code is not your excuse, your diff is.
2. **Full audit**: `deep-era check` — 0 FAIL. Paste the line.
3. **Serve + browse** (if runnable): probe 200 + screenshot of the critical path.
4. **SBOM**: `deep-era sbom` for anything with dependencies.
5. **Timeline proof**: `deep-era timeline` tail showing fix → verify → PASS.
6. **Remember**: release notes as decision (what shipped, why now).

Ship message format: version | review PASS | check PASS | probe/screenshot | SBOM ok.
