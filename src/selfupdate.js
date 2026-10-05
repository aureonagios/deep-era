// Self-update that actually works: the package was never published to npm, so the
// old `update` command checked registry.npmjs.org, got a 404, and reported
// "unreadable" forever. Meanwhile a 4-month-stale global install kept running with no
// word to anyone. The source of truth is the GitHub repo itself, so that is what gets
// checked: package.json on main, compared numerically, cached for 24h.
//
// RULES this module obeys (and tests enforce):
// - Never slow down a gate. `check` reads the cache only — no network, ever.
// - Never install anything silently. `--apply` is an explicit user decision.
// - Never lie offline. No network means "unknown", reported as such, exit 0.
// - The cache lives in the home dir (machine scope), not the project.
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const REPO = "aureonagios/deep-era";
const GITHUB_PKG_URL = `https://raw.githubusercontent.com/${REPO}/main/package.json`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CHECK_TIMEOUT_MS = 5000;

function homeDir() {
  return process.env.DEEP_ERA_HOME || os.homedir();
}

function cacheFile(home) {
  return path.join(home || homeDir(), ".deep-era", "update-check.json");
}

function currentVersion() {
  try {
    return require("../package.json").version;
  } catch { return "0.0.0"; }
}

// Numeric per segment: 0.9.0 < 0.10.0, and "0.53.0-x" never beats "0.53.0".
function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b || "0").split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function readCache(home) {
  try {
    return JSON.parse(fs.readFileSync(cacheFile(home), "utf8"));
  } catch { return null; }
}

function writeCache(home, latest) {
  try {
    const f = cacheFile(home);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ checkedAt: new Date().toISOString(), latest }));
  } catch {}
}

function fetchLatestVersion(timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    let req;
    try {
      req = https.get(GITHUB_PKG_URL, { timeout: timeoutMs || CHECK_TIMEOUT_MS }, (res) => {
        let body = "";
        res.on("data", (c) => { body += c; if (body.length > 20000) { try { req.destroy(); } catch {} finish(null); } });
        res.on("end", () => {
          try {
            const v = JSON.parse(body).version;
            finish(typeof v === "string" && /^\d+\.\d+\.\d+/.test(v) ? v : null);
          } catch { finish(null); }
        });
      });
    } catch { finish(null); return; }
    req.on("timeout", () => { try { req.destroy(); } catch {} finish(null); });
    req.on("error", () => finish(null));
  });
}

// Live check with cache write-through. Returns {latest} or {latest: null, offline: true}.
// Resolves — never rejects, never throws.
async function checkForUpdate(home, timeoutMs) {
  const latest = await fetchLatestVersion(timeoutMs);
  if (latest) writeCache(home, latest);
  return latest ? { latest } : { latest: null, offline: true };
}

// The one-liner shown inside other commands. Cache-only when asked (the `check`
// gate must never touch the network); otherwise one quick live attempt when the
// cache is stale or missing. Null = say nothing.
async function stalenessNotice(home, timeoutMs, cacheOnly) {
  const cur = currentVersion();
  const cached = readCache(home);
  const fresh = cached && cached.latest && (Date.now() - Date.parse(cached.checkedAt || 0)) < CACHE_TTL_MS;
  const latest = fresh ? cached.latest : (cacheOnly ? null : (await checkForUpdate(home, timeoutMs)).latest);
  if (!latest) return null;
  if (compareVersions(cur, latest) < 0) {
    return `update available: ${cur} -> ${latest}. Run: deep-era update --apply`;
  }
  return null;
}

function buildApplyCommand() {
  // One command, no prompts: reinstall the global package from the repo.
  return { cmd: "npm", args: ["i", "-g", `github:${REPO}`] };
}

function applyUpdate() {
  const { cmd, args } = buildApplyCommand();
  console.log(`[deep-era] updating from github:${REPO} ...`);
  try {
    execSync(`${cmd} ${args.map((a) => `"${a}"`).join(" ")}`, { stdio: "inherit", timeout: 180000 });
    console.log(`[deep-era] update done. Verify: deep-era help`);
    return true;
  } catch (e) {
    console.log(`[deep-era] update failed (${(e && e.message || "error").split("\n")[0]}). Try by hand: npm i -g github:${REPO}`);
    return false;
  }
}

async function runUpdate(opts) {
  const o = opts || {};
  const cur = currentVersion();
  console.log(`[deep-era] installed: ${cur}. Checking github:${REPO} ...`);
  const { latest, offline } = await checkForUpdate(o.homeDir || homeDir(), o.timeoutMs);
  if (!latest) {
    console.log(`[deep-era] registry unreadable (offline?) — staying on ${cur}.`);
    return { current: cur, latest: null };
  }
  if (compareVersions(cur, latest) >= 0) {
    console.log(`[deep-era] up to date (${cur}).`);
    return { current: cur, latest };
  }
  console.log(`[deep-era] update available: ${cur} -> ${latest}.`);
  if (o.apply) applyUpdate();
  else console.log(`Run: deep-era update --apply`);
  return { current: cur, latest };
}

module.exports = {
  currentVersion, compareVersions, readCache, writeCache,
  fetchLatestVersion, checkForUpdate, stalenessNotice,
  buildApplyCommand, applyUpdate, runUpdate, cacheFile, CACHE_TTL_MS,
};
