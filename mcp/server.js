// MCP server v0.6 — 10 tools, zero deps. Works with any MCP-capable IDE/agent.
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const { buildMap } = require("../src/map");
const { verifyProject } = require("../src/verify");
const { securityScan } = require("../src/security");
const { guardScan } = require("../src/guard");
const { getRelevant, readSnippets } = require("../src/context");
const { createSnapshot, restoreSnapshot } = require("../src/snapshot");
const { remember, recall } = require("../src/memory");
const { logStep, readJson } = require("../src/logger");

const TOOLS = [
  { name: "plan_task", description: "Plan first, show it to the user. Blind work is forbidden.", inputSchema: { type: "object", properties: { goal: { type: "string" }, steps: { type: "array", items: { type: "string" } } }, required: ["goal"] } },
  { name: "log_step", description: "Log every important step to the transparency log.", inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } },
  { name: "recall", description: "Project memory: recall past chats/decisions/fixes. MANDATORY at task start — forget nothing, budget-capped.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "remember", description: "Project memory: save what matters (kind=chat|decision|fix|error|note). Set global=true for a lesson EVERY project recalls. MANDATORY at task end.", inputSchema: { type: "object", properties: { kind: { type: "string" }, text: { type: "string" }, global: { type: "boolean" } }, required: ["text"] } },
  { name: "get_context", description: "Token saver: never read the whole codebase. Query and get only relevant files + imports.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
  { name: "verify_work", description: "Terminal truth: run syntax (all files) + build + tests.", inputSchema: { type: "object", properties: {} } },
  { name: "security_check", description: "Scan for secrets / dangerous code / dependency leaks.", inputSchema: { type: "object", properties: {} } },
  { name: "snapshot", description: "Backup first, restore on breakage. action=create|restore, id required for restore.", inputSchema: { type: "object", properties: { action: { type: "string" }, id: { type: "string" }, label: { type: "string" } } } },
  { name: "safe_fix", description: "SAFE auto-fix: gitignore guard + map refresh. Never touches code logic, snapshots first.", inputSchema: { type: "object", properties: {} } },
  { name: "audit_work", description: "GENERIC audit: dummy-proof + injection + missing tests + non-English code. Audit any AI work, any project.", inputSchema: { type: "object", properties: {} } },
  { name: "review_changes", description: "Scoped review: audit ONLY git-changed files. Judge the diff, not legacy code.", inputSchema: { type: "object", properties: {} } },
  { name: "search_code", description: "Ranked code search: find files by name + content + import hubs. Returns top files with hit counts.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "fetch_url", description: "Fetch a docs/API URL to capped text (stdlib, offline-safe). Use to verify APIs against official docs — never invent them.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "research_topic", description: "Best-effort instant-answer research (no key). Degrades honestly offline — then ask user for a docs URL.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
];

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function errReply(id, msg) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: msg } }) + "\n");
}

async function runMcp() {
  const cwd = process.cwd();
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (chunk) => {
    buf += chunk;
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      const { id, method, params } = msg;
      try {
        if (method === "initialize") {
          reply(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "deep-era", version: "0.30.0" } });
        } else if (method === "notifications/initialized") {
        } else if (method === "tools/list") {
          reply(id, { tools: TOOLS });
        } else if (method === "tools/call") {
          const name = params && params.name;
          const args = (params && params.arguments) || {};
          if (name === "plan_task") {
            logStep(cwd, `plan: ${args.goal} | steps=${(args.steps || []).join(" > ").slice(0, 500)}`);
            reply(id, { content: [{ type: "text", text: `Plan logged: ${args.goal}. Now fetch relevant files via get_context — blind scanning is forbidden.` }] });
          } else if (name === "log_step") {
            logStep(cwd, args.message || "(empty)");
            reply(id, { content: [{ type: "text", text: "Logged. The user sees this step in .deep-era/logs/steps.log." }] });
          } else if (name === "recall") {
            const r = recall(cwd, args.query || "");
            const { logSpend } = require("../src/spend");
            logSpend(cwd, "recall", r.chars);
            reply(id, { content: [{ type: "text", text: r.entries.length ? JSON.stringify(r, null, 2).slice(0, 6000) : "Memory empty — first task. remember at the end is mandatory." }] });
          } else if (name === "remember") {
            if (args.global) {
              const { rememberGlobal } = require("../src/memory");
              const e = rememberGlobal(args.text || "");
              reply(id, { content: [{ type: "text", text: `Global lesson saved — every project will recall it.` }] });
            } else {
              const e = remember(cwd, args.kind || "note", args.text || "");
              reply(id, { content: [{ type: "text", text: `Remembered [${e.kind}]: ${e.text.slice(0, 200)}` }] });
            }
          } else if (name === "get_context") {
            let map = readJson(cwd, "map.json", null);
            if (!map) map = buildMap(cwd);
            const rel = getRelevant(cwd, map, args.query || "", Math.min(args.limit || 8, 20));
            const pack = readSnippets(cwd, rel);
            logStep(cwd, `context: "${(args.query || "").slice(0, 80)}" -> ${rel.length} files, ${pack.chars} chars`);
            const { logSpend: logSpend2 } = require("../src/spend");
            logSpend2(cwd, "get_context", pack.chars);
            reply(id, { content: [{ type: "text", text: JSON.stringify({ files: rel.map((r) => r.file), chars: pack.chars, snippets: pack.snippets }, null, 2).slice(0, 12000) }] });
          } else if (name === "verify_work") {
            let map = readJson(cwd, "map.json", null);
            if (!map) map = buildMap(cwd);
            const res = verifyProject(cwd, map);
            const fails = res.filter((r) => !r.ok).length;
            logStep(cwd, `verify: ${res.length - fails}/${res.length} pass`);
            reply(id, { content: [{ type: "text", text: JSON.stringify(res, null, 2).slice(0, 8000) }] });
          } else if (name === "security_check") {
            let map = readJson(cwd, "map.json", null);
            if (!map) map = buildMap(cwd);
            const findings = securityScan(cwd, map.files);
            logStep(cwd, `security: ${findings.length} findings`);
            reply(id, { content: [{ type: "text", text: findings.length ? JSON.stringify(findings, null, 2).slice(0, 8000) : "Clean. No secrets or dangers found." }] });
          } else if (name === "snapshot") {
            if ((args.action || "create") === "restore") {
              const r = restoreSnapshot(cwd, args.id);
              logStep(cwd, `snapshot restore: ${r.id} (${r.restored} files)`);
              reply(id, { content: [{ type: "text", text: `Restored ${r.restored} files from ${r.id}` }] });
            } else {
              const s = createSnapshot(cwd, args.label || "mcp");
              logStep(cwd, `snapshot create: ${s.id} (${s.files} files)`);
              reply(id, { content: [{ type: "text", text: `Snapshot ${s.id} (${s.files} files). Restore it if anything breaks.` }] });
            }
          } else if (name === "safe_fix") {
            const { safeFix } = require("../src/fix");
            const actions = await safeFix(cwd);
            reply(id, { content: [{ type: "text", text: `Safe fix done:\n- ${actions.join("\n- ")}` }] });
          } else if (name === "review_changes") {
            const { buildMap: bm2 } = require("../src/map");
            const { verifyProject: vp2 } = require("../src/verify");
            const { securityScan: ss2 } = require("../src/security");
            const { guardScan: gs2 } = require("../src/guard");
            const { changedFiles } = require("../src/review");
            const changed = changedFiles(cwd);
            if (changed === null) {
              reply(id, { content: [{ type: "text", text: "Not a git repo — use verify_work + security_check + audit_work instead." }] });
            } else if (!changed.length) {
              reply(id, { content: [{ type: "text", text: "Working tree clean — nothing to review." }] });
            } else {
              let map2 = readJson(cwd, "map.json", null);
              if (!map2) map2 = bm2(cwd);
              const names2 = new Set(changed);
              const res = vp2(cwd, { ...map2, files: map2.files.filter((f) => names2.has(f.file)) });
              const findings = [...ss2(cwd, map2.files), ...gs2(cwd, map2.files)].filter((x) => names2.has(x.file));
              logStep(cwd, `review: ${changed.length} files, ${findings.length} findings`);
              reply(id, { content: [{ type: "text", text: JSON.stringify({ changed, verify: res, findings }, null, 2).slice(0, 8000) }] });
            }
          } else if (name === "audit_work") {
            let map = readJson(cwd, "map.json", null);
            if (!map) map = buildMap(cwd);
            const { auditDeps, auditOsv } = require("../src/deps");
            const findings = [...guardScan(cwd, map.files), ...auditDeps(cwd), ...(await Promise.resolve(auditOsv(cwd)).catch(() => []))];
            logStep(cwd, `audit: ${findings.length} findings`);
            reply(id, { content: [{ type: "text", text: findings.length ? JSON.stringify(findings, null, 2).slice(0, 8000) : "Clean. No dummy proof, injection, missing tests, or non-English code." }] });
          } else if (name === "search_code") {
            let smap = readJson(cwd, "map.json", null);
            if (!smap) smap = buildMap(cwd);
            const { getRelevant: gr } = require("../src/context");
            const srel = gr(cwd, smap, args.query || "", 12);
            const fs2 = require("fs");
            const path2 = require("path");
            const stoks = (args.query || "").toLowerCase().split(/[^a-z0-9_./-]+/).filter((t) => t.length > 2);
            const ranked = srel.map((f) => {
              let hits = 0;
              try {
                const txt = fs2.readFileSync(path2.join(cwd, f.file), "utf8").slice(0, 20000).toLowerCase();
                for (const t of stoks) if (txt.includes(t)) hits++;
              } catch {}
              return { file: f.file, hits, usedBy: (f.importedBy || []).length };
            }).sort((a, b) => b.hits - a.hits);
            logStep(cwd, `search: "${(args.query || "").slice(0, 60)}" -> ${ranked.length} files`);
            reply(id, { content: [{ type: "text", text: JSON.stringify(ranked, null, 2).slice(0, 6000) }] });
          } else if (name === "fetch_url") {
            const { fetchText } = require("../src/net");
            const r = await fetchText(args.url || "");
            logStep(cwd, `fetch: ${(args.url || "").slice(0, 80)} -> ${r.ok ? r.text.length + " chars" : "FAILED " + r.error}`);
            reply(id, { content: [{ type: "text", text: r.ok ? r.text.slice(0, 6000) : `Fetch failed honestly: ${r.error}` }] });
          } else if (name === "research_topic") {
            const { instantAnswer } = require("../src/net");
            const r = await instantAnswer(args.query || "");
            logStep(cwd, `research: "${(args.query || "").slice(0, 60)}" -> ${r.ok ? "answered" : r.error}`);
            reply(id, { content: [{ type: "text", text: r.ok ? `${r.text}\n\n(Source: ${r.source})` : r.error }] });
          } else {
            errReply(id, `unknown tool: ${name}`);
          }
        } else {
          errReply(id, `unknown method: ${method}`);
        }
      } catch (e) {
        errReply(id, e.message || "mcp error");
      }
    }
  });
}

module.exports = { runMcp };
