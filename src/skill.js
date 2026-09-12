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
  "deep-era-research": {    description: "Research APIs/docs before using them. Use when about to call an unfamiliar library, version, or endpoint. Verify, never invent.",
    body: `# Deep-Era Research Skill

Never invent an API signature. Verify in this order:
1. **Repo first**: search_code the project — maybe it already wraps it.
2. **Official docs**: fetch_url the official docs page / changelog / README. Quote the version you read.
3. **Instant answer**: research_topic for a quick check (best-effort, may be offline).
4. **Cite**: in code comments + final proof, write WHAT you verified and WHERE (URL + version).
5. **Pin**: add the verified version to dependencies (no *, no latest).

If docs are unreachable: say so honestly, implement the smallest surface, and mark it UNVERIFIED in the proof.`,
  },
  "deep-era-serve": {    description: "Run-observe loop: start the app, probe its endpoints, watch the logs, shut down. Use after writing any runnable code. Seeing beats assuming.",
    body: `# Deep-Era Serve Skill

"It works" without running it is a lie. Prove it runs:

1. **Start**: \`deep-era serve\` — detects the start command, runs it, observes.
2. **Watch**: read the startup log tail. Any Error/Traceback/EADDRINUSE = stop, fix first.
3. **Probe**: hit the detected local URL. Non-2xx = the app is up but broken — fix the route.
4. **No URL?** The app prints nothing listenable — add a startup log line with the port, re-run.
5. **Shut down**: serve kills the process. Never leave dev servers running.
6. **Proof**: paste the probe status line (GET url -> 200) into the final report.`,
  },
  "deep-era-fleet": {    description: "Work across MANY projects at once. Use when juggling repos — see fleet health, carry lessons, never mix memories.",
    body: `# Deep-Era Fleet Skill

One agent, many repos — without mixing them up:

1. **Survey**: \`deep-era projects <parent-dir>\` — PASS/FAIL/NEVER per repo. FAILs first.
2. **Isolate**: each repo keeps its OWN memory (.deep-era/logs/memory.jsonl). Never copy memories between repos.
3. **Share lessons only**: \`deep-era remember --global <lesson>\` for truths that hold everywhere (they recall in every repo, tagged [global]).
4. **Per repo, full loop**: onboard (once) → work → check → remember. Same discipline, every repo.
5. **Report per repo**: proof blocks must name the repo. Mixed proof = rejected proof.`,
  },
  "deep-era-browse": {    description: "Verify in a REAL browser via Playwright MCP. Use after serve is green — drive pages, read console, screenshot proof.",
    body: `# Deep-Era Browse Skill

Seeing beats assuming — drive it like a user:

1. **Wire once**: \`deep-era browser\`, merge the Playwright entry into your client's MCP config.
2. **Serve first**: \`deep-era serve\` must be green (200 on probe) before opening any page.
3. **Drive**: navigate to each changed route. Click the critical path (login, submit, pay).
4. **Read console**: any console error = bug, even if the page "looks fine". Paste it into the fix.
5. **Screenshot**: capture the critical path AFTER the fix. Screenshot + probe-200 = proof.
6. **Close**: shut the browser and the dev server. Never leave processes running.`,
  },
  "deep-era-ship": {
    description: "Release gate: prove a version is shippable. Use before merge, tag, or publish. No proof, no ship.",
    body: `# Deep-Era Ship Skill

Merge/tag/publish only with proof in hand:

1. **Review**: \`deep-era review\` — the diff must be PASS. Legacy code is not your excuse, your diff is.
2. **Full audit**: \`deep-era check\` — 0 FAIL. Paste the line.
3. **Serve + browse** (if runnable): probe 200 + screenshot of the critical path.
4. **SBOM**: \`deep-era sbom\` for anything with dependencies.
5. **Timeline proof**: \`deep-era timeline\` tail showing fix → verify → PASS.
6. **Remember**: release notes as decision (what shipped, why now).

Ship message format: version | review PASS | check PASS | probe/screenshot | SBOM ok.`,
  },
};

function skillFile(name, s) {
  return `---\nname: ${name}\ndescription: ${s.description}\n---\n\n${s.body}\n`;
}

function validateSkillDir(dir) {
  // A skill = folder with SKILL.md carrying name+description frontmatter.
  // Returns {ok, name?, error?}. Rejects anything else — honestly.
  const full = path.join(dir, "SKILL.md");
  if (!fs.existsSync(full)) return { ok: false, error: "no SKILL.md in repo root" };
  let txt = "";
  try { txt = fs.readFileSync(full, "utf8"); } catch { return { ok: false, error: "SKILL.md unreadable" }; }
  const m = txt.match(/^---\s*\nname:\s*([a-z0-9-]+)\s*\ndescription:\s*(.+?)\s*\n---/);
  if (!m) return { ok: false, error: "SKILL.md frontmatter must have name: and description:" };
  if (!txt.slice(m[0].length).trim()) return { ok: false, error: "SKILL.md has no body" };
  return { ok: true, name: m[1] };
}

// Install any standard skills repo (scientific-agent-skills, anthropics/skills,
// your own): git-clone into .deep-era/skills/<name>/, validated, never blind.
function addSkill(cwd, gitUrl) {
  const { execFileSync } = require("child_process");
  const os = require("os");
  if (!/^([a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+(@[a-zA-Z0-9_./-]+)?(\/|:)[a-zA-Z0-9_./-]+(\.git)?$/.test(gitUrl) && !/^(https?|git|ssh|file):/.test(gitUrl) && !fs.existsSync(gitUrl)) {
    throw new Error(`not a git URL or local path: ${gitUrl}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-skill-"));
  const repo = tmp + "-repo";
  try {
    try {
      execFileSync("git", ["clone", "--depth", "1", gitUrl, repo], { timeout: 60000, stdio: "pipe" });
    } catch (e) {
      throw new Error(`git clone failed: ${(e.message || "").split("\n")[0]}`);
    }
    const v = validateSkillDir(repo);
    if (!v.ok) throw new Error(`not a valid skill repo: ${v.error}`);
    const dest = path.join(cwd, ".deep-era", "skills", v.name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.join(cwd, ".deep-era", "skills"), { recursive: true });
    fs.renameSync(repo, dest);
    console.log(`[deep-era] skill installed: ${v.name} (.deep-era/skills/${v.name}/)`);
    return dest;
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
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

module.exports = { runSkill, SKILL_MD, SKILLS, addSkill, validateSkillDir };
