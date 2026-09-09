const fs = require("fs");
const path = require("path");

function deepDir(cwd) {
  return path.join(cwd, ".deep-era");
}
function ensureDeepDir(cwd) {
  const d = deepDir(cwd);
  fs.mkdirSync(d, { recursive: true });
  fs.mkdirSync(path.join(d, "logs"), { recursive: true });
  return d;
}
function logStep(cwd, msg) {
  const d = ensureDeepDir(cwd);
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(d, "logs", "steps.log"), line);
}
function writeJson(cwd, name, obj) {
  const d = ensureDeepDir(cwd);
  fs.writeFileSync(path.join(d, name), JSON.stringify(obj, null, 2));
}
function readJson(cwd, name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(deepDir(cwd), name), "utf8"));
  } catch {
    return fallback;
  }
}

module.exports = { deepDir, ensureDeepDir, logStep, writeJson, readJson };
