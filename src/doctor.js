const fs = require("fs");
const path = require("path");
const { buildMap } = require("./map");
const { verifyProject } = require("./verify");
const { securityScan } = require("./security");
const { guardScan } = require("./guard");
const { auditDeps, auditOsv } = require("./deps");
const { ensureDeepDir, writeJson, logStep } = require("./logger");

async function runDoctor(cwd) {
  ensureDeepDir(cwd);
  const map = buildMap(cwd);
  writeJson(cwd, "map.json", map);

  const verify = verifyProject(cwd, map);
  const security = securityScan(cwd, map.files);
  const guard = guardScan(cwd, map.files);
  const deps = [...auditDeps(cwd), ...(await Promise.resolve(auditOsv(cwd)).catch(() => []))];
  const allFindings = [...security, ...guard, ...deps];

  const failed = verify.filter((v) => !v.ok);
  const bad = allFindings.filter((g) => g.sev === "critical" || g.sev === "high");

  // Run-over-run diff: progress proof. Fixed what was broken? Broke what was clean?
  const sig = (x) => `${x.rule || x.cmd}@${x.file || ""}`;
  const now = new Set([...failed.map(sig), ...allFindings.map(sig)]);
  let prev = { sigs: [] };
  try { prev = JSON.parse(fs.readFileSync(path.join(cwd, ".deep-era", "last-doctor.json"), "utf8")); } catch {}
  const before = new Set(prev.sigs || []);
  const fixed = [...before].filter((s) => !now.has(s));
  const broken = [...now].filter((s) => !before.has(s));
  const progress = fixed.length || broken.length
    ? `\n## 5. Progress vs last run\nFixed since last run (${fixed.length}): ${fixed.slice(0, 10).join(", ") || "—"}\nNewly broken (${broken.length}): ${broken.slice(0, 10).join(", ") || "—"}\n`
    : `\n## 5. Progress vs last run\nFirst audited run — baseline locked.\n`;
  const report = `# ERROR-REPORT.md (AI Deep Era Doctor)\n\n` +
    `Generated: ${new Date().toISOString()}\nStack: ${map.stack.kind} | Files: ${map.counts.total}${map.counts.truncated ? " (TRUNCATED at 2000 — add .deep-eraignore for generated dirs)" : ""}\n\n` +
    `## 1. Terminal / build truth\n` +
    (verify.length ? verify.map((v) => `### \`${v.cmd}\` => ${v.ok ? "PASS" : "FAIL"}\n\`\`\`\n${v.output.slice(0, 2000)}\n\`\`\`\n`).join("\n") : "No checks.\n") +
    `\n## 2. Security findings (${security.length})\n` +
    (security.length ? security.map((s) => `- [${s.sev}] ${s.file}: ${s.msg} (${s.rule})`).join("\n") : "None. Clean.\n") +
    `\n\n## 2b. Guard / audit (${guard.length})\n` +
    (guard.length ? guard.map((g) => `- [${g.sev}] ${g.file}: ${g.msg} (${g.rule})`).join("\n") : "None. Clean.\n") +
    `\n\n## 2c. Dependency audit (${deps.length})\n` +
    (deps.length ? deps.map((g) => `- [${g.sev}] ${g.file}: ${g.msg} (${g.rule})`).join("\n") : "None. Clean.\n") +
    `\n\n## 3. File map (top 50)\n` +
    map.files.slice(0, 50).map((f) => `- ${f.file} (${f.role}, ${f.size}b)`).join("\n") +
    `\n\n## 4. Fix order for the AI\n` +
    (failed.length ? `1. Fix FAILed commands first (read output above)\n2. Then fix security critical/high\n3. Then re-run \`deep-era doctor\`\n`
      : allFindings.length ? `1. Fix findings above\n2. Then re-run doctor\n` : `All clean. Nothing to fix.\n`) +
    progress;

  fs.writeFileSync(path.join(cwd, ".deep-era", "ERROR-REPORT.md"), report);
  fs.writeFileSync(path.join(cwd, "ERROR-REPORT.md"), report);
  writeJson(cwd, "last-doctor.json", { at: new Date().toISOString(), failed: failed.length, security: security.length, guard: guard.length, deps: deps.length, sigs: [...now], fixed: fixed.length, broken: broken.length });
  logStep(cwd, `doctor: ${failed.length} fails, ${security.length} security, ${guard.length} guard, ${deps.length} deps, fixed ${fixed.length}, broken ${broken.length}`);

  console.log(`[deep-era] doctor done: ${failed.length} FAIL, ${security.length} security, ${guard.length} guard, ${deps.length} deps`);
  console.log(`  progress: ${fixed.length} fixed, ${broken.length} newly broken`);
  console.log(`  -> ERROR-REPORT.md`);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ result: failed.length || bad.length ? "FAIL" : "PASS", failed: failed.length, security: security.length, guard: guard.length, deps: deps.length, fixed: fixed.length, broken: broken.length }));
  }
  if (process.argv.includes("--sarif")) {
    const { writeSarif } = require("./sarif");
    const sarifPath = writeSarif(cwd, allFindings);
    console.log(`  -> ${sarifPath} (upload to GitHub code-scanning)`);
  }
  if (failed.length || bad.length) process.exitCode = 1;
}

module.exports = { runDoctor };
