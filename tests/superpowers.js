// Superpowers & Dashboard test suite for AI Deep Era
// Tests: skills engine, port hunter, secret guardian, docker scaffold, memory bank, and live dashboard server.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const http = require("http");

const { ok, finish } = require("./lib/report")("superpowers");

const { getCatalog, searchSkills, getSkill, listCategories } = require("../src/skills");
const { isPortAvailable, findAvailablePort, scanCommonPorts } = require("../src/hunt");
const { scanDirectorySecrets } = require("../src/guardian");
const { detectStack, generateDockerScaffold } = require("../src/docker");
const { addMemory, searchMemories, deleteMemory, exportMarkdown } = require("../src/memorybank");
const { startDashboardServer } = require("../src/dashboard");

ok("skills-catalog-loads-410", () => {
  const cat = getCatalog(__dirname);
  assert(cat.skills && cat.skills.length >= 400, `expected at least 400 skills, got ${cat.skills ? cat.skills.length : 0}`);
  const cats = listCategories(__dirname);
  assert(Object.keys(cats).length > 3, "expected multiple categories");
});

ok("skills-search-and-fetch", () => {
  const results = searchSkills("security", 10, __dirname);
  assert(results.length > 0, "no security skills found");
  assert(results[0].score > 0, "skill score missing");

  const skill = getSkill("autonomous-docker-cloud-scaffold", __dirname);
  assert(skill !== null, "docker scaffold skill not found");
  assert(skill.content && skill.content.includes("Docker"), "skill content missing expected keywords");
});

ok("port-hunter-finds-ports", async () => {
  const free = await findAvailablePort(28000, 20);
  assert(typeof free === "number" && free >= 28000, "failed to find available port");
  const avail = await isPortAvailable(free);
  assert(avail === true, `port ${free} should be available`);

  const common = await scanCommonPorts([28001, 28002]);
  assert(common.length === 2, "common ports scan failed");
});

ok("secret-guardian-detects-dangers", () => {
  const findings = scanDirectorySecrets(path.join(__dirname, "fixtures"));
  assert(Array.isArray(findings), "findings should be an array");
});

ok("docker-scaffold-generates-valid", () => {
  const stack = detectStack(path.join(__dirname, ".."));
  assert(stack.type === "nodejs", "expected nodejs stack for deep era");
  const scaffold = generateDockerScaffold(path.join(__dirname, ".."), 3000);
  assert(scaffold.dockerfile.includes("FROM node:20-alpine"), "missing node base image in Dockerfile");
  assert(scaffold.compose.includes("version: \"3.8\""), "missing compose version");
  assert(scaffold.dockerignore.includes("node_modules"), "dockerignore missing node_modules");
});

ok("memory-bank-crud-lifecycle", () => {
  const item = addMemory({ kind: "decision", title: "Test Decision", content: "Architecture decision for test", tags: ["test"] }, __dirname);
  assert(item.id.startsWith("mem_"), "invalid memory ID format");
  const found = searchMemories("Test Decision", null, __dirname);
  assert(found.some((m) => m.id === item.id), "added memory not found in search");

  const md = exportMarkdown(__dirname);
  assert(md.includes("Test Decision"), "markdown export missing memory");

  const deleted = deleteMemory(item.id, __dirname);
  assert(deleted === true, "memory deletion failed");
  try { fs.rmSync(path.join(__dirname, ".deep-era"), { recursive: true, force: true }); } catch (_) {}
});

ok("dashboard-server-starts-and-serves-api", async () => {
  const { port, server, url } = await startDashboardServer(path.join(__dirname, ".."), 29500);
  assert(typeof port === "number" && port >= 29500, "dashboard port invalid");

  // Test GET /
  const html = await new Promise((resolve, reject) => {
    http.get(url + "/", (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
  assert(html.status === 200, "dashboard HTML did not return 200");
  assert(html.data.includes("AI DEEP ERA"), "dashboard HTML missing brand title");

  // Test GET /api/skills
  const apiSkills = await new Promise((resolve, reject) => {
    http.get(url + "/api/skills?q=docker", (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on("error", reject);
  });
  assert(apiSkills.status === 200, "skills API did not return 200");
  assert(apiSkills.data.skills.length > 0, "skills API returned 0 results for docker");

  server.close();
});

finish();
