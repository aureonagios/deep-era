// MCP protocol tests — spawn the real server over stdio, speak JSON-RPC,
// call ALL 10 tools. If the wire format breaks, this suite screams.
process.env.DEEP_ERA_SELFTEST = "1";
const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");

const CLI = path.join(__dirname, "..", "bin", "cli.js");
const fs = require("fs");
const os = require("os");
let pass = 0;
const pending = [];
function ok(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      pending.push(r.then(() => { pass++; console.log(`PASS ${name}`); }).catch((e) => { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }));
    } else { pass++; console.log(`PASS ${name}`); }
  } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

function sandbox() {
  // NEVER run state-mutating tools in the real repo — tests polluted it once (14 junk snapshots).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-mcp-"));
  fs.writeFileSync(path.join(tmp, "handler.js"), "module.exports = async function handler(req) {\n  return { ok: true };\n};\n");
  return tmp;
}

function session(cwd) {
  const child = spawn(process.execPath, [CLI, "mcp"], { cwd, env: { ...process.env, DEEP_ERA_SELFTEST: "1" } });
  let buf = "";
  const waiters = new Map();
  let id = 0;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (c) => {
    buf += c;
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line);
        if (waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
      } catch {}
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    waiters.set(myId, resolve);
    setTimeout(() => { if (waiters.has(myId)) { waiters.delete(myId); reject(new Error(`timeout on ${method}`)); } }, 60000);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
  });
  const stop = () => child.kill();
  return { send, stop };
}

ok("mcp-initialize-and-list", async () => {
  const s = session(sandbox());
  const init = await s.send("initialize", {});
  assert(init.result.serverInfo.name === "deep-era", "wrong server");
  const list = await s.send("tools/list", {});
  assert(list.result.tools.length === 14, `expected 14 tools, got ${list.result.tools.length}`);
  s.stop();
});

ok("mcp-memory-roundtrip", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  const w = await s.send("tools/call", { name: "remember", arguments: { kind: "note", text: "mcp wire test note" } });
  assert(w.result.content[0].text.includes("Remembered"), "remember broke on wire");
  const r = await s.send("tools/call", { name: "recall", arguments: { query: "wire test" } });
  assert(r.result.content[0].text.includes("wire test"), "recall broke on wire");
  s.stop();
});

ok("mcp-plan-log-context", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  const p = await s.send("tools/call", { name: "plan_task", arguments: { goal: "wire goal", steps: ["a"] } });
  assert(p.result.content[0].text.includes("wire goal"), "plan broke");
  const l = await s.send("tools/call", { name: "log_step", arguments: { message: "wire step" } });
  assert(l.result.content[0].text.includes("Logged"), "log broke");
  const c = await s.send("tools/call", { name: "get_context", arguments: { query: "handler" } });
  assert(c.result.content[0].text.includes("handler.js"), "context broke");
  s.stop();
});

ok("mcp-verify-security-audit", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  for (const tool of ["verify_work", "security_check", "audit_work"]) {
    const r = await s.send("tools/call", { name: tool, arguments: {} });
    assert(r.result && r.result.content && r.result.content[0].text.length > 0, `${tool} empty`);
  }
  s.stop();
});

ok("mcp-snapshot-safefix", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  const snap = await s.send("tools/call", { name: "snapshot", arguments: { action: "create", label: "mcp-test" } });
  assert(snap.result.content[0].text.includes("Snapshot"), "snapshot broke");
  const fix = await s.send("tools/call", { name: "safe_fix", arguments: {} });
  assert(fix.result.content[0].text.includes("Safe fix done"), "safe_fix broke");
  s.stop();
});

ok("mcp-search-code", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  const r = await s.send("tools/call", { name: "search_code", arguments: { query: "handler" } });
  assert(r.result.content[0].text.includes("handler.js"), "search_code broke");
  s.stop();
});

ok("mcp-fetch-research", async () => {
  const http = require("http");
  const srv = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body><h1>Wire Docs</h1></body></html>");
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const s = session(sandbox());
  await s.send("initialize", {});
  const f = await s.send("tools/call", { name: "fetch_url", arguments: { url: `http://127.0.0.1:${port}/x` } });
  assert(f.result.content[0].text.includes("Wire Docs"), "fetch_url broke on wire");
  const bad = await s.send("tools/call", { name: "fetch_url", arguments: { url: "gopher://x" } });
  assert(bad.result.content[0].text.includes("honestly"), "fetch failure dishonest");
  s.stop();
  srv.close();
});

ok("mcp-unknown-tool-errors", async () => {
  const s = session(sandbox());
  await s.send("initialize", {});
  const r = await s.send("tools/call", { name: "nope", arguments: {} });
  assert(r.error && /unknown tool/.test(r.error.message), "unknown tool not rejected");
  s.stop();
});

Promise.all(pending).then(() => console.log(`\n${pass} MCP tests passed`));

// Safety net: a failed assert must never hang the suite on a stray child process.
setTimeout(() => {
  console.log("(force exit — stray MCP server processes killed)");
  process.exit(process.exitCode || 0);
}, 120000).unref();
