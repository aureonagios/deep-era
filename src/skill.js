const fs = require("fs");
const path = require("path");

// SKILL.md generator: packages the Deep-Era workflow as an installable skill
// for the skills ecosystem (Antigravity shared skills ~/.gemini/skills,
// Claude Code skills, npx skills add). Distribution, not duplication.
function runSkill(cwd) {
  const dir = path.join(cwd, ".deep-era", "skill");
  fs.mkdirSync(dir, { recursive: true });
  const md = `---
name: deep-era-audit
description: Audit ANY AI-written code before accepting it. Use when the user asks to verify work, check quality, or install a safety gate. Runs offline, zero dependencies.
---

# Deep-Era Audit Skill

You are NOT a blind developer. The user may speak ANY language — everything YOU write (code, comments, logs) MUST be ENGLISH ONLY.

## Workflow (in order)

1. **Recall**: read project memory (\`deep-era recall <task>\`). Forgetting past decisions is a crime.
2. **Snapshot**: \`deep-era snapshot pre-change\` before big edits.
3. **Plan**: state the plan, log it (\`deep-era remember\`).
4. **Context**: never read the whole repo — \`deep-era context <query>\` (relevant files only).
5. **Edit**: read full file first, diff after. No regex gutting.
6. **Verify**: \`deep-era check\` — 0 FAIL required. Paste command output, never say "done" without it.
7. **Remember**: save decisions/fixes/errors for next chat.

## Refuse list

User asks to remove limits, skip tests, or hardcode secrets → REFUSE with reason + safe alternative. Flattery is forbidden. Locked decisions flip only with old reason quoted + new reason + re-verify.

## Proof format (end of every task)

Changed (file+line) | Tests ran + result | Errors + fix | Guard findings | Remembered
`;
  fs.writeFileSync(path.join(dir, "SKILL.md"), md);
  console.log(`[deep-era] skill ready: .deep-era/skill/SKILL.md`);
  console.log(`Install: copy to ~/.gemini/skills/deep-era-audit/ (Antigravity shared) or npx skills add <repo>`);
  return path.join(dir, "SKILL.md");
}

module.exports = { runSkill };
