---
name: deep-era-fix
description: Fix a failing audit safely. Use when deep-era check/doctor FAILs. Snapshot-first healing loop, never blind edits.
---

# Deep-Era Fix Skill

1. **Snapshot** first (`deep-era snapshot pre-fix`) — every fix must be reversible.
2. **Read the failure**: run `deep-era doctor`, read ERROR-REPORT.md top to bottom.
3. **Fix ONE thing at a time**, smallest diff that turns the FAIL green.
4. **Re-run** `deep-era check` after each fix. Still red? Read again, don't guess.
5. **Remember** the fix (what broke, why, how fixed) so no agent repeats it.
6. If a fix needs a locked decision flipped: quote old reason + new reason + re-verify.

Never: batch 5 fixes at once, edit without reading, claim done without pasting output.
