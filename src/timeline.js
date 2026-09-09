const fs = require("fs");
const path = require("path");

// Timeline: whole project history from existing logs — init, plans, fixes, doctor runs.
// Proof that work happened, in one terminal screen. No new data collected.
function runTimeline(cwd) {
  const lines = [];
  try {
    const log = fs.readFileSync(path.join(cwd, ".deep-era", "logs", "steps.log"), "utf8").split("\n").filter(Boolean);
    for (const l of log.slice(-30)) {
      const m = l.match(/^\[(.*?)\]\s*(.*)$/);
      if (m) lines.push({ at: m[1].slice(0, 16), kind: "step", text: m[2].slice(0, 130) });
    }
  } catch {}
  try {
    const mem = fs.readFileSync(path.join(cwd, ".deep-era", "logs", "memory.jsonl"), "utf8").split("\n").filter(Boolean);
    for (const l of mem.slice(-15)) {
      try {
        const e = JSON.parse(l);
        lines.push({ at: (e.at || "").slice(0, 16), kind: e.kind, text: (e.text || "").slice(0, 120) });
      } catch {}
    }
  } catch {}
  try {
    const last = JSON.parse(fs.readFileSync(path.join(cwd, ".deep-era", "last-doctor.json"), "utf8"));
    lines.push({ at: (last.at || "").slice(0, 16), kind: "doctor", text: `FAILs=${last.failed} sec=${last.security} guard=${last.guard} deps=${last.deps}` });
  } catch {}
  lines.sort((a, b) => (a.at < b.at ? -1 : 1));
  console.log(`[deep-era] timeline (${lines.length} events):`);
  for (const e of lines.slice(-25)) console.log(`  ${e.at} [${e.kind}] ${e.text}`);
  return lines;
}

module.exports = { runTimeline };
