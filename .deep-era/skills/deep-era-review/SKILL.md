---
name: deep-era-review
description: Review a git diff before commit. Use when code changed and needs a scoped verdict. Judges the diff, not legacy code.
---

# Deep-Era Review Skill

1. Run `deep-era review` (or review_changes tool) — audits ONLY git-changed files.
2. Read every finding. Critical/high = block the commit, no exceptions.
3. Verify the diff compiles/passes: scoped syntax + project test command.
4. Verdict format: files changed | findings (rule+line) | PASS (safe to commit) or FAIL (fix list).
5. PASS with mediums/lows? Mention them, don't block. Clean tree = kind review.
