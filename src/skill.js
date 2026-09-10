const fs = require("fs");
const path = require("path");

// Skill pack: 3 installable skills for the skills ecosystem
// (Antigravity ~/.gemini/skills, Claude Code skills, npx skills add).
const SKILLS = {
  "deep-era-audit": {
    description: "Audit ANY AI-written code before accepting it. Use when asked to verify work or check quality. Offline, zero dependencies.",
    body: `# Deep-Era Audit Skill

You are NOT a blind developer. The user may speak ANY language — everything YOU write (code, comments, logs) MUST be ENGLISH ONLY.

1. **Recall** project memory first — forgetting past decisions is a failure.
2. **Snapshot** before big edits. **Plan** via plan_task. **Context** via get_context (never the whole repo).
3. **Verify** with verify_work + security_check + audit_work — ALL must pass.
4. **Remember** decisions/fixes/errors. **Refuse** unsafe orders (explain + safe alternative).

Proof format: Changed (file+line) | Tests + result | Errors + fix | Guard findings | Remembered`,
  },
  "deep-era-fix": {
    description: "Fix a failing audit safely. Use when deep-era check/doctor FAILs. Snapshot-first healing loop, never blind edits.",
    body: `# Deep-Era Fix Skill

1. **Snapshot** first (\`deep-era snapshot pre-fix\`) — every fix must be reversible.
2. **Read the failure**: run \`deep-era doctor\`, read ERROR-REPORT.md top to bottom.
3. **Fix ONE thing at a time**, smallest diff that turns the FAIL green.
4. **Re-run** \`deep-era check\` after each fix. Still red? Read again, don't guess.
5. **Remember** the fix (what broke, why, how fixed) so no agent repeats it.
6. If a fix needs a locked decision flipped: quote old reason + new reason + re-verify.

Never: batch 5 fixes at once, edit without reading, claim done without pasting output.`,
  },
  "deep-era-review": {
    description: "Review a git diff before commit. Use when code changed and needs a scoped verdict. Judges the diff, not legacy code.",
    body: `# Deep-Era Review Skill

1. Run \`deep-era review\` (or review_changes tool) — audits ONLY git-changed files.
2. Read every finding. Critical/high = block the commit, no exceptions.
3. Verify the diff compiles/passes: scoped syntax + project test command.
4. Verdict format: files changed | findings (rule+line) | PASS (safe to commit) or FAIL (fix list).
5. PASS with mediums/lows? Mention them, don't block. Clean tree = kind review.`,
  },
};

function skillFile(name, s) {
  return `---\nname: ${name}\ndescription: ${s.description}\n---\n\n${s.body}\n`;
}

function runSkill(cwd) {
  const out = [];
  for (const [name, s] of Object.entries(SKILLS)) {
    const dir = path.join(cwd, ".deep-era", "skills", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), skillFile(name, s));
    out.push(path.join(dir, "SKILL.md"));
  }
  // Legacy single-skill path (back-compat for older installs)
  fs.mkdirSync(path.join(cwd, ".deep-era", "skill"), { recursive: true });
  fs.writeFileSync(path.join(cwd, ".deep-era", "skill", "SKILL.md"), skillFile("deep-era-audit", SKILLS["deep-era-audit"]));
  console.log(`[deep-era] skill pack ready: ${Object.keys(SKILLS).join(", ")} (.deep-era/skills/)`);
  console.log(`Install: copy a skill dir to ~/.gemini/skills/ (Antigravity shared) or npx skills add <repo>`);
  return out;
}

const SKILL_MD = skillFile("deep-era-audit", SKILLS["deep-era-audit"]);

module.exports = { runSkill, SKILL_MD, SKILLS };
