// Perf benchmark — stopwatch truth, no claims. Measures each engine in ms
// plus token-proxy (chars sent to AI). Run: node tests/perf.js
process.env.DEEP_ERA_SELFTEST = "1";
const fs = require("fs");
const path = require("path");
const os = require("os");

const { buildMap } = require("../src/map");
const { guardScan } = require("../src/guard");
const { securityScan } = require("../src/security");
const { verifyProject } = require("../src/verify");
const { getRelevant, readSnippets } = require("../src/context");
const { recall, remember } = require("../src/memory");

function timed(name, fn) {
  const t0 = process.hrtime.bigint();
  const out = fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { name, ms, out };
}

function makeBigProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-perf-"));
  const langs = [".js", ".py", ".go", ".rs", ".java"];
  for (let i = 0; i < 300; i++) {
    const ext = langs[i % langs.length];
    const sub = i % 10 === 0 ? "nested/deep/" : "";
    fs.mkdirSync(path.join(dir, "src", sub), { recursive: true });
    let body = "";
    if (ext === ".js") body = `const m${i} = require("./mod${i - 1}");\nmodule.exports = async function handler${i}(req) {\n  const total = req.items.reduce((s, x) => s + x.price, 0);\n  return { id: ${i}, total };\n};\n`;
    else if (ext === ".py") body = `from . import mod${i - 1}\ndef handler${i}(items):\n    total = sum(x["price"] for x in items)\n    return {"id": ${i}, "total": total}\n`;
    else if (ext === ".go") body = `package handlers\nfunc Handler${i}(total int) int {\n    tax := total * 18 / 100\n    return total + tax\n}\n`;
    else if (ext === ".rs") body = `pub fn handler${i}(total: i32) -> i32 {\n    let tax = total * 18 / 100;\n    total + tax\n}\n`;
    else body = `public class Handler${i} {\n    public int calc(int total) {\n        int tax = total * 18 / 100;\n        return total + tax;\n    }\n}\n`;
    fs.writeFileSync(path.join(dir, "src", sub, `mod${i}${ext}`), body);
  }
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "perf", dependencies: { leftpad: "*" } }));
  return dir;
}

async function main() {
  const rows = [];
  const own = path.resolve(__dirname, "..");
  const ownMap = buildMap(own);
  rows.push(timed(`map (${ownMap.counts.total} files)`, () => buildMap(own)));
  rows.push(timed("guardScan + dupScan", () => guardScan(own, ownMap.files)));
  rows.push(timed("securityScan", () => securityScan(own, ownMap.files)));
  rows.push(timed("verifyProject", () => verifyProject(own, ownMap)));
  const rel = getRelevant(own, ownMap, "mcp server tools", 8);
  const ctx = timed("get_context + snippets", () => readSnippets(own, rel));
  rows.push(ctx);

  // Memory with 200 entries
  const memDir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-mem-"));
  for (let i = 0; i < 200; i++) remember(memDir, i % 10 === 0 ? "decision" : "chat", `entry ${i} about handler pipeline and verify loop ${i}`);
  rows.push(timed("recall (200 entries)", () => recall(memDir, "handler pipeline")));

  // Big project scaling
  const big = makeBigProject();
  const t0 = process.hrtime.bigint();
  const bigMap = buildMap(big);
  const t1 = process.hrtime.bigint();
  guardScan(big, bigMap.files);
  const t2 = process.hrtime.bigint();
  securityScan(big, bigMap.files);
  const t3 = process.hrtime.bigint();
  const bigRel = getRelevant(big, bigMap, "handler calc total", 8);
  const pack = readSnippets(big, bigRel);
  const t4 = process.hrtime.bigint();
  const M = (a, b) => Number(b - a) / 1e6;
  rows.push({ name: `BIG map (300 files)`, ms: M(t0, t1) });
  rows.push({ name: `BIG guard+dup`, ms: M(t1, t2) });
  rows.push({ name: `BIG security`, ms: M(t2, t3) });
  rows.push({ name: `BIG context`, ms: M(t3, t4) });

  console.log("\n=== DEEP-ERA PERF (ms) ===");
  for (const r of rows) console.log(`${r.ms.toFixed(1).padStart(9)} ms  ${r.name}`);
  console.log(`\nToken-proxy: full 300-file project ~${(300 * 3500).toLocaleString()} chars vs get_context ${pack.chars.toLocaleString()} chars = ${(100 - (pack.chars / (300 * 3500)) * 100).toFixed(1)}% less sent to AI`);
  fs.writeFileSync(path.join(__dirname, "perf-result.json"), JSON.stringify({ at: new Date().toISOString(), rows: rows.map((r) => ({ name: r.name, ms: +r.ms.toFixed(1) })), contextChars: pack.chars }, null, 2));
}

main();
