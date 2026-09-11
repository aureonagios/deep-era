// Dependency audit — offline-first, every stack. Skips on network failure, never lies.
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

function auditNode(cwd) {
  const out = [];
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch { return out; }
  const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
  out.push(...auditBlocklist(deps, "package.json"));
  for (const [name, ver] of Object.entries(deps)) {
    if (ver === "*" || ver === "latest" || ver === "") {
      out.push({ file: "package.json", rule: "dep-unpinned", sev: "medium", msg: `${name}@${ver} — pin the version or something else installs tomorrow.` });
    }
    if (/^https?:\/\//.test(ver) && !/#[a-f0-9]{7,}/.test(ver)) {
      out.push({ file: "package.json", rule: "dep-tarball", sev: "medium", msg: `${name} tarball without commit hash — lock it.` });
    }
  }
  if (Object.keys(deps).length > 150) {
    out.push({ file: "package.json", rule: "dep-bloat", sev: "low", msg: `${Object.keys(deps).length} deps — large attack surface. Are all needed?` });
  }
  // npm audit: best-effort, 20s timeout, failure = skip (no lies on offline CI)
  try {
    const raw = execSync("npm audit --json", { cwd, timeout: 20000, stdio: ["ignore", "pipe", "pipe"] }).toString();
    const j = JSON.parse(raw);
    const vulns = (j.metadata && j.metadata.vulnerabilities) || {};
    const crit = (vulns.critical || 0) + (vulns.high || 0);
    if (crit > 0) out.push({ file: "package.json", rule: "npm-audit", sev: "high", msg: `npm audit: ${crit} critical/high. Run npm audit fix.` });
  } catch { /* offline or error — skip */ }
  return out;
}

// Known-hijacked / malware versions. Offline core of a CVE DB — no network needed.
// Sources: event-stream (2018), ua-parser-js (2021), colors/faker (2022), node-ipc (2022).
const BAD_PKGS = [
  { name: "event-stream", bad: ["3.3.6"], why: "hijacked 2018 — steals bitcoin keys" },
  { name: "flatmap-stream", bad: ["*"], why: "event-stream malware payload" },
  { name: "ua-parser-js", bad: ["0.7.29", "0.8.0", "1.0.0"], why: "hijacked 2021 — malware" },
  { name: "colors", bad: ["1.4.44-liberty", "1.4.1-liberty", "1.4.44"], why: "sabotaged release loop" },
  { name: "faker", bad: ["6.6.6"], why: "sabotaged release" },
  { name: "node-ipc", bad: ["10.1.1", "10.1.2"], why: "protestware wipes files" },
  { name: "left-pad", bad: ["*"], why: "unpublished 2016, broke the internet — never depend on it" },
];

function auditBlocklist(deps, file) {
  const out = [];
  for (const b of BAD_PKGS) {
    const ver = deps[b.name];
    if (ver === undefined) continue;
    if (b.bad.includes("*") || b.bad.some((v) => ver.includes(v))) {
      out.push({ file, rule: "dep-blocklist", sev: "critical", msg: `${b.name}@${ver} BLOCKED — ${b.why}. Remove now.` });
    }
  }
  return out;
}

function auditPython(cwd) {
  const out = [];
  const req = path.join(cwd, "requirements.txt");
  if (fs.existsSync(req)) {
    const lines = fs.readFileSync(req, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    const unpinned = lines.filter((l) => !/==/.test(l));
    if (unpinned.length) {
      out.push({ file: "requirements.txt", rule: "dep-unpinned", sev: "medium", msg: `${unpinned.length} unpinned deps (${unpinned.slice(0, 3).join(", ")}) — pin with ==.` });
    }
  }
  return out;
}

function auditDeps(cwd) {
  return [...auditNode(cwd), ...auditPython(cwd)];
}

// License compliance: GPL/AGPL deps contaminate commercial codebases.
// Best-effort online (npm registry, cached 30 days), silent offline.
// Only flags RECIPROCAL licenses (GPL/AGPL) as high; unknown = low note.
function licCachePath(cwd) {
  return path.join(cwd, ".deep-era", "license-cache.json");
}

function readLicCache(cwd) {
  try {
    const j = JSON.parse(fs.readFileSync(licCachePath(cwd), "utf8"));
    if (Date.now() - j.at > 30 * 864e5) return {};
    return j.data || {};
  } catch { return {}; }
}

function npmLicense(name) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = require("child_process").execFile("npm", ["view", name, "license", "--json"], { timeout: 8000 });
    } catch { return resolve(null); }
    let out = "";
    proc.stdout.on("data", (c) => { out += c; });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      try {
        const v = JSON.parse(out);
        resolve(typeof v === "string" ? v : null);
      } catch { resolve(null); }
    });
    setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 9000);
  });
}

async function auditLicenses(cwd) {
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch { return []; }
  const names = Object.keys(Object.assign({}, pkg.dependencies));
  if (!names.length) return [];
  const cache = readLicCache(cwd);
  const out = [];
  let dirty = false;
  for (const name of names.slice(0, 25)) {
    let lic = cache[name];
    if (lic === undefined) {
      lic = await npmLicense(name);
      if (lic) { cache[name] = lic; dirty = true; }
      else continue; // offline or unknown — silent, honest skip
    }
    if (/GPL|AGPL/i.test(lic)) {
      out.push({ file: "package.json", rule: "license-gpl", sev: "high", msg: `${name} is ${lic} — reciprocal license contaminates commercial code. Replace or get legal review.` });
    }
  }
  if (dirty) {
    try {
      fs.mkdirSync(path.join(cwd, ".deep-era"), { recursive: true });
      fs.writeFileSync(licCachePath(cwd), JSON.stringify({ at: Date.now(), data: cache }));
    } catch {}
  }
  return out;
}

// Real CVE data from OSV.dev (Google's open vuln DB) — online best-effort,
// 7-day disk cache, silent offline. No key, no account, zero deps.
function osvCachePath(cwd) {
  return path.join(cwd, ".deep-era", "osv-cache.json");
}

function readOsvCache(cwd) {
  try {
    const j = JSON.parse(fs.readFileSync(osvCachePath(cwd), "utf8"));
    if (Date.now() - j.at > 7 * 864e5) return {};
    return j.data || {};
  } catch { return {}; }
}

// First fixed version across affected ranges — turns a CVE report into an upgrade order.
function fixedIn(vuln) {
  try {
    for (const a of (vuln.affected || [])) {
      for (const r of (a.ranges || [])) {
        for (const e of (r.events || [])) {
          if (e.fixed) return e.fixed;
        }
      }
    }
  } catch {}
  return null;
}

function auditOsv(cwd) {
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch { return []; }
  const deps = Object.assign({}, pkg.dependencies);
  const pinned = Object.entries(deps).filter(([, v]) => /^\d+\.\d+\.\d+/.test((v || "").replace(/^[~^>=<\s]+/, "")));
  if (!pinned.length) return [];
  const cache = readOsvCache(cwd);
  const fresh = [], results = [];
  for (const [name, ver] of pinned.slice(0, 30)) {
    const clean = ver.replace(/^[~^>=<\s]+/, "");
    const key = `${name}@${clean}`;
    if (cache[key] && cache[key].vulns !== undefined) {
      if (cache[key].vulns.length) results.push(...cache[key].vulns);
    } else fresh.push([name, clean, key]);
  }
  if (!fresh.length) return results;
  const payload = JSON.stringify({ queries: fresh.map(([name, version]) => ({ package: { name, ecosystem: "npm" }, version })) });
  return new Promise((resolve) => {
    const req = https.request("https://api.osv.dev/v1/querybatch", { method: "POST", headers: { "Content-Type": "application/json" }, timeout: 12000 }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; if (body.length > 500000) req.destroy(); });
      res.on("end", () => {
        try {
          const j = JSON.parse(body);
          const store = readOsvCache(cwd);
          (j.results || []).forEach((r, i) => {
            const vulns = (r.vulns || []).slice(0, 3).map((v) => {
              const fixed = fixedIn(v);
              return {
                file: "package.json", rule: "osv-cve", sev: "high",
                msg: `${fresh[i][0]}@${fresh[i][1]}: ${v.id} ${(v.summary || "").slice(0, 80)}${fixed ? ` — upgrade to >=${fixed}` : ""}`,
              };
            });
            store[fresh[i][2]] = { vulns };
            results.push(...vulns);
          });
          try {
            fs.mkdirSync(path.join(cwd, ".deep-era"), { recursive: true });
            fs.writeFileSync(osvCachePath(cwd), JSON.stringify({ at: Date.now(), data: store }));
          } catch {}
        } catch {}
        resolve(results);
      });
    });
    req.on("timeout", () => { req.destroy(); resolve(results); });
    req.on("error", () => resolve(results));
    req.write(payload);
    req.end();
  });
}

module.exports = { auditDeps, auditOsv, fixedIn, auditLicenses };
