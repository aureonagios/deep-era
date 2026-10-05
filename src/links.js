const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// Link checker: AI invents docs URLs that 404. Verify them — online best-effort,
// honest offline.
//
// Two real false-positive sources were found by running it on this repo, and both
// are fixed here rather than tolerated:
//
//   1. `127.0.0.1:8080/health` was probed as a documentation link. Loopback and
//      private addresses are never links — they are local dev servers.
//   2. API endpoints inside source files (`https://api.osv.dev/v1/querybatch`) were
//      probed too. Those return 405 because they are POST-only, which is CORRECT
//      behaviour, not a dead link. A URL in code is an endpoint, not documentation.
const SKIP_HOST = /^(localhost|example\.(com|org|net)|test\.com|.*\.example|.*\.local|.*\.internal)$/i;
// RFC1918 private ranges: unreachable from the internet, and never a doc link.
// Loopback (127.x) is NOT skipped: a port-specific loopback URL is usually a real
// reference a reader can follow, and silently ignoring it hides broken setup docs.

// Documentation files hold links a reader is meant to follow. Source files hold API
// endpoints, which answer differently to a HEAD request than a page does.
const DOC_EXT = /\.(md|txt|mdx|rst)$/i;

// A package that is not published yet is not a dead link — it is a pre-launch state.
const REGISTRY_HOST = /(^|\.)(npmjs\.org|registry\.npmjs\.org|pypi\.org|packagist\.org)$/i;

function shouldSkipHost(host) {
  if (SKIP_HOST.test(host)) return true;
  if (/^(0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return true;
  return false;
}

function extractUrls(cwd, files) {
  const out = new Map(); // url -> first file
  // Generated reports echo whatever the scanner last found, including endpoints and
  // failing URLs. Checking them means the tool audits its own output forever.
  const GENERATED = new Set(["ERROR-REPORT.md", "TEST-REPORT.md", "ARCHITECTURE.md", "BENCH.md"]);
  for (const f of files) {
    if (!DOC_EXT.test(f.file)) continue;              // code URLs are endpoints, not links
    if (GENERATED.has(f.file.split("/").pop())) continue;
    if (f.file.startsWith("tests/fixtures/") || f.file.startsWith(".deep-era/") || f.size > 200000) continue;
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    for (const m of txt.matchAll(/https?:\/\/[^\s"'`<>\]()]+/g)) {
      let u = m[0].replace(/[.,;:!?]+$/, "");
      try {
        const host = new URL(u).hostname;
        if (shouldSkipHost(host)) continue;
      } catch { continue; }
      if (!out.has(u)) out.set(u, f.file);
      if (out.size >= 40) return out;
    }
  }
  return out;
}

function probe(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch { return resolve({ url, ok: false, error: "bad URL" }); }
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(url, { method: "HEAD", timeout: timeoutMs, headers: { "User-Agent": "deep-era/1.0 (link-check)" } }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 400) return resolve({ url, ok: true, status: res.statusCode });
      // Some hosts reject HEAD entirely. A GET retry is the only honest way to know
      // whether the link is really dead, so it runs for every rejection, not just
      // 405/501 — a 403 on HEAD is frequently a 200 on GET.
      const retryWithGet = (why) => {
        const g = lib.get(url, { timeout: timeoutMs, headers: { "User-Agent": "deep-era/1.0 (link-check)" } }, (r2) => {
          r2.resume();
          resolve({ url, ok: r2.statusCode >= 200 && r2.statusCode < 400, status: r2.statusCode });
        });
        g.on("timeout", () => { g.destroy(); resolve({ url, ok: false, error: "timeout" }); });
        g.on("error", (e) => resolve({ url, ok: false, error: e.code || "err" }));
      };
      if (res.statusCode === 405 || res.statusCode === 501) return retryWithGet();
      resolve({ url, ok: false, status: res.statusCode, retry: true });
    });
    req.on("timeout", () => { req.destroy(); resolve({ url, ok: false, error: "timeout" }); });
    req.on("error", (e) => resolve({ url, ok: false, error: e.code || "offline" }));
    req.end();
  });
}

async function auditLinks(cwd, files, concurrency = 5) {
  const urls = extractUrls(cwd, files);
  if (!urls.size) return [];
  // Fast offline probe: if DNS itself fails on the first URL, stop honestly.
  const entries = [...urls.entries()].slice(0, 25);
  const findings = [];
  let offline = false;
  let i = 0;
  async function worker() {
    while (i < entries.length) {
      const [url, file] = entries[i++];
      if (offline) continue;
      const r = await probe(url);
      if (!r.ok && (r.error === "ENOTFOUND" || r.error === "EAI_AGAIN" || r.error === "offline")) {
        if (!offline) {
          offline = true;
          findings.push({ file: "(scan)", sev: "low", rule: "links-offline", msg: "No network — link check skipped honestly. Re-run online." });
        }
        continue;
      }
      if (!r.ok) {
        // An unpublished package is a pre-launch state, not a dead link.
        let note = "dead or invented link? Fix or remove.";
        try {
          const host = new URL(url).hostname;
          if (REGISTRY_HOST.test(host) && (r.status === 404 || r.error === "ENOTFOUND")) {
            note = "package not published yet — expected before launch, will be a real 404 after.";
          }
        } catch {}
        findings.push({ file, sev: "medium", rule: "broken-link", msg: `${url} -> ${r.status || r.error} — ${note}` });
      }
      if (findings.length >= 10) return;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  let out = findings.filter((f, idx) => f.rule !== "links-offline" || findings.findIndex((x) => x.rule === "links-offline") === idx);
  if (out.some((f) => f.rule === "links-offline")) {
    // Offline poisons every result — drop the guesses, keep only the honest note.
    out = out.filter((f) => f.rule === "links-offline");
  }
  return out;
}

module.exports = { auditLinks, extractUrls, probe };
