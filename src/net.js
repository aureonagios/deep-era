const http = require("http");
const https = require("https");

// Honest networking: stdlib only, timeouts everywhere, degradation stated.
// fetchText: GET any URL, strip to readable text, cap size. Works for docs,
// READMEs, changelogs — anything over http(s).
function fetchText(rawUrl, timeoutMs = 15000, maxChars = 20000) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(rawUrl);
      if (!["http:", "https:"].includes(url.protocol)) return resolve({ ok: false, error: "only http(s) URLs" });
    } catch {
      return resolve({ ok: false, error: "bad URL" });
    }
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(rawUrl, { timeout: timeoutMs, headers: { "User-Agent": "deep-era/1.0 (docs-fetch)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        try {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          return resolve(fetchText(next, timeoutMs, maxChars));
        } catch {
          return resolve({ ok: false, error: `redirect failed (${res.statusCode})` });
        }
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, error: `HTTP ${res.statusCode}` });
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        body += c;
        if (body.length > 500000) { req.destroy(); resolve({ ok: false, error: "page too large" }); }
      });
      res.on("end", () => resolve({ ok: true, text: extractText(body, maxChars), url: rawUrl }));
    });
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
    req.on("error", (e) => resolve({ ok: false, error: e.code || e.message }));
  });
}

function extractText(html, maxChars) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return t.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, maxChars);
}

// DuckDuckGo Instant Answers: free, no key. Limited (abstracts, not web index)
// — stated honestly. Best-effort: offline returns ok:false, never throws.
async function instantAnswer(query, timeoutMs = 12000) {
  const r = await fetchText(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, timeoutMs, 8000);
  if (!r.ok) return { ok: false, error: `search unavailable (${r.error}) — paste a docs URL to fetch_url instead` };
  try {
    const j = JSON.parse(r.text);
    const parts = [j.AbstractText, j.Answer].filter(Boolean);
    for (const t of (j.RelatedTopics || []).slice(0, 5)) {
      if (typeof t.Text === "string" && t.Text) parts.push(t.Text);
    }
    const text = parts.join("\n\n").slice(0, 4000);
    if (!text) return { ok: false, error: "no instant answer — paste a docs URL to fetch_url instead" };
    return { ok: true, text, source: j.AbstractURL || "api.duckduckgo.com" };
  } catch {
    return { ok: false, error: "unparseable answer — paste a docs URL to fetch_url instead" };
  }
}

module.exports = { fetchText, extractText, instantAnswer };
