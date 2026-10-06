// Self-update that actually works: the package was never published to npm, so the
// old `update` command checked registry.npmjs.org, got a 404, and reported
// "unreadable" forever. Meanwhile a 4-month-stale global install kept running with no
// word to anyone. The source of truth is the GitHub repo itself, so that is what gets
// checked: package.json on main, compared numerically, cached for 24h.
//
// RULES this module obeys (and tests enforce):
// - Never slow down a gate. `check` reads the cache only — no network, ever.
// - Never install anything silently. `--apply` is an explicit user decision.
// - Never mislabel a failure. Every fetch failure reports its ACTUAL reason
//   (DNS, timeout, HTTP status, rate-limit, bad body) — never a guessed blanket
//   like "offline?". A vague message once sent a user theorizing about private
//   repos and auth tokens for what was a sandboxed no-network box.
// - The cache lives in the home dir (machine scope), not the project.
// - DEEP_ERA_UPDATE_URL overrides the source (tests, mirrors). Default is GitHub.
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

function sourceUrl() {
  return process.env.DEEP_ERA_UPDATE_URL || GITHUB_PKG_URL;
}

function fetchLatestVersion(timeoutMs) {
  // Resolves { version } on success or { error } on failure, where error is one of:
  // dns (name does not resolve — truly offline or sandboxed), timeout (no answer in
  // time), http-<status> (server answered with an error), rate-limited (GitHub 403/429
  // with an exhausted quota — public repo, no token involved), parse (body is not a
  // package.json with a version). Never rejects, never throws, never guesses.
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const url = sourceUrl();
    const lib = url.startsWith("http://") ? require("http") : https;
    let req;
    try {
      req = lib.get(url, { timeout: timeoutMs || CHECK_TIMEOUT_MS }, (res) => {
        if (res.statusCode === 403 || res.statusCode === 429) {
          const remaining = res.headers && res.headers["x-ratelimit-remaining"];
          res.resume();
          if (String(remaining) === "0" || res.statusCode === 429) return finish({ error: "rate-limited" });
          return finish({ error: "http-" + res.statusCode });
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return finish({ error: "http-" + res.statusCode });
        }
        let body = "";
        res.on("data", (c) => { body += c; if (body.length > 20000) { try { req.destroy(); } catch {} finish({ error: "parse" }); } });
        res.on("end", () => {
          try {
            const v = JSON.parse(body).version;
            if (typeof v === "string" && /^\d+\.\d+\.\d+/.test(v)) return finish({ version: v });
            finish({ error: "parse" });
          } catch { finish({ error: "parse" }); }
        });
      });
    } catch { finish({ error: "dns" }); return; }
    req.on("timeout", () => { try { req.destroy(); } catch {} finish({ error: "timeout" }); });
    req.on("error", (e) => {
      const code = (e && e.code) || "";
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") return finish({ error: "dns" });
      if (code === "ECONNREFUSED") return finish({ error: "refused" });
      if (code === "EHOSTUNREACH" || code === "ENETUNREACH" || code === "ENETDOWN") return finish({ error: "offline" });
      finish({ error: code ? String(code).toLowerCase() : "timeout" });
    });
  });
}

// Live check with cache write-through. Returns {latest} or {latest: null, reason}.
// Resolves — never rejects, never throws.
async function checkForUpdate(home, timeoutMs) {
  const r = await fetchLatestVersion(timeoutMs);
  if (r.version) writeCache(home, r.version);
  return r.version ? { latest: r.version } : { latest: null, reason: r.error };
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
  const r = await checkForUpdate(o.homeDir || homeDir(), o.timeoutMs);
  if (!r.latest) {
    console.log(`[deep-era] ${describeFailure(r.reason)} — staying on ${cur}.`);
    return { current: cur, latest: null };
  }
  if (compareVersions(cur, r.latest) >= 0) {
    console.log(`[deep-era] up to date (${cur}).`);
    return { current: cur, latest: r.latest };
  }
  console.log(`[deep-era] update available: ${cur} -> ${r.latest}.`);
  if (o.apply) applyUpdate();
  else console.log(`Run: deep-era update --apply`);
  return { current: cur, latest: r.latest };
}

// One honest sentence per failure mode. "Registry unreadable (offline?)" used to
// cover all of these and sent at least one user theorizing about private repos and
// auth tokens for what was a sandboxed no-network box.
function describeFailure(reason) {
  switch (reason) {
    case "dns": return "offline (DNS lookup failed — no network path from here)";
    case "timeout": return "no answer in time (offline or very slow network)";
    case "refused": return "connection refused (blocked egress or proxy)";
    case "offline": return "offline (host unreachable from here)";
    case "rate-limited": return "GitHub rate-limited this IP (public repo — no token needed, no token involved). Retry in an hour";
    case "parse": return "GitHub answered, but the body was not a package.json with a version";
    default:
      if (reason && reason.startsWith("http-")) return `GitHub answered HTTP ${reason.slice(5)}`;
      return `check failed (${reason || "unknown"})`;
  }
}

module.exports = {
  currentVersion, compareVersions, readCache, writeCache,
  fetchLatestVersion, checkForUpdate, stalenessNotice,
  buildApplyCommand, applyUpdate, runUpdate, cacheFile, CACHE_TTL_MS,
};
