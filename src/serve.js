const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

// Run-observe loop: start the project, watch its output, probe its HTTP
// endpoints, then shut it down cleanly. The agent SEES the app run —
// no more "it should work" without ever starting it.
function detectRun(cwd) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    if (pkg.scripts && pkg.scripts.start) return { cmd: "npm", args: ["start", "--silent"] };
    if (pkg.scripts && pkg.scripts.dev) return { cmd: "npm", args: ["run", "dev", "--silent"] };
  } catch {}
  for (const f of ["main.py", "app.py", "server.py"]) {
    if (fs.existsSync(path.join(cwd, f))) return { cmd: "python", args: [f] };
  }
  if (fs.existsSync(path.join(cwd, "server.js"))) return { cmd: "node", args: ["server.js"] };
  if (fs.existsSync(path.join(cwd, "index.js"))) return { cmd: "node", args: ["index.js"] };
  return null;
}

function findUrls(text) {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s"'`]+/g)) out.add(m[0].replace(/[.,;]+$/, ""));
  for (const m of text.matchAll(/(?:localhost|127\.0\.0\.1):(\d{2,5})/g)) {
    out.add(`http://127.0.0.1:${m[1]}/`);
  }
  for (const m of text.matchAll(/(?:port|PORT)\s*[:=]?\s*(\d{2,5})/g)) {
    out.add(`http://127.0.0.1:${m[1]}/`);
  }
  return [...out].slice(0, 5);
}

function probe(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        res.resume();
        resolve({ url, status: res.statusCode });
      });
      req.on("timeout", () => { req.destroy(); resolve({ url, status: "timeout" }); });
      req.on("error", (e) => resolve({ url, status: `unreachable (${e.code || "err"})` }));
    } catch (e) {
      resolve({ url, status: `unreachable (${e.message})` });
    }
  });
}

function spotErrors(log) {
  const hits = [];
  for (const re of [/EADDRINUSE.*$/m, /Error:.*$/m, /Traceback[\s\S]{0,200}/, /SyntaxError.*$/m, /Cannot find module.*$/m, /MODULE_NOT_FOUND.*$/m]) {
    const m = log.match(re);
    if (m) hits.push(m[0].slice(0, 200));
  }
  return [...new Set(hits)].slice(0, 5);
}

async function runServe(cwd, observeMs = 12000) {
  const run = detectRun(cwd);
  if (!run) {
    console.log("[deep-era] serve: no start command found (no start/dev script, main.py, server.js). Nothing to run — honest stop.");
    return { ran: false };
  }
  console.log(`[deep-era] serve: starting \`${run.cmd} ${run.args.join(" ")}\` (observing ${observeMs / 1000}s)...`);
  // shell:true only for npm (needs .cmd resolution); direct binaries are killed reliably without it.
  const useShell = process.platform === "win32" && run.cmd === "npm";
  const child = spawn(run.cmd, run.args, { cwd, shell: useShell, timeout: observeMs + 10000 });
  let log = "";
  child.stdout.on("data", (c) => { log += c.toString().slice(0, 30000); log = log.slice(-30000); });
  child.stderr.on("data", (c) => { log += c.toString().slice(0, 30000); log = log.slice(-30000); });
  const exited = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), observeMs);
    child.on("exit", (code) => { clearTimeout(t); resolve(code); });
    child.on("error", () => { clearTimeout(t); resolve("spawn-error"); });
  });
  const urls = findUrls(log);
  const probes = [];
  for (const u of urls) {
    if (u.startsWith("http://127.0.0.1") || u.startsWith("http://localhost")) probes.push(await probe(u));
  }
  try { child.kill("SIGTERM"); } catch {}
  try { if (child.exitCode === null) child.kill("SIGKILL"); } catch {}
  const errors = spotErrors(log);
  console.log(`[deep-era] serve: ${exited === false ? "still running after observe window (killed)" : `exited (${exited})`}`);
  console.log(`[deep-era] serve: startup log tail:\n${log.slice(-1500) || "(no output)"}`);
  if (probes.length) probes.forEach((p) => console.log(`[deep-era] serve: GET ${p.url} -> ${p.status}`));
  else console.log(`[deep-era] serve: no local URL detected in output — could not probe.`);
  if (errors.length) errors.forEach((e) => console.log(`[deep-era] serve: ERROR SPOTTED: ${e}`));
  else console.log(`[deep-era] serve: no startup errors spotted.`);
  return { ran: true, exited, urls, probes, errors, logTail: log.slice(-1500) };
}

module.exports = { runServe, detectRun, findUrls, probe };
