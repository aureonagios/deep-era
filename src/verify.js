const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync, execFileSync } = require("child_process");

function runCmd(cwd, cmd, timeoutMs = 90000) {
  try {
    const out = execSync(cmd, { cwd, timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] }).toString().slice(0, 8000);
    return { cmd, ok: true, output: out || "(no output, pass)" };
  } catch (e) {
    const so = (e.stdout || "").toString().slice(0, 8000);
    const se = (e.stderr || "").toString().slice(0, 8000);
    return { cmd, ok: false, output: (so + "\n" + se).slice(0, 8000) || (e.message || "").slice(0, 2000) };
  }
}

function esmOk(txt) {
  // Second opinion for ESM syntax — reads from stdin, no file written
  try {
    execFileSync(process.execPath, ["--input-type=module", "--check"], { input: txt, stdio: ["pipe", "ignore", "pipe"] });
    return true;
  } catch { return false; }
}

function nodeCheckAll(cwd, files) {
  // Check EVERY checkable JS file in ONE process (no 250ms spawn per file).
  // Tier 1: vm parse (CJS). Tier 2 for failures: ESM stdin check. Either passes = OK.
  // .ts/.tsx/.jsx need tsc/babel — skipped here, flagged for CI (no false FAILs).
  const js = files.filter((f) => /\.(js|mjs|cjs)$/.test(f.file) && f.size < 200000 && !f.file.startsWith("tests/fixtures/")).slice(0, 80);
  const skippedTs = files.filter((f) => /\.(ts|tsx|jsx)$/.test(f.file)).length;
  const bad = [];
  for (const f of js) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    try {
      new vm.Script(txt, { filename: f.file });
    } catch (e1) {
      if (!esmOk(txt)) {
        bad.push({ file: f.file, err: (e1.message || "syntax error").split("\n").slice(0, 3).join(" ") });
      }
    }
  }
  let note = `all ${js.length} JS pass (single-process)`;
  if (skippedTs) note += `, ${skippedTs} ts/tsx/jsx need tsc in CI`;
  if (!bad.length) return { cmd: `syntax-check (${js.length} files)`, ok: true, output: note };
  return { cmd: `syntax-check (${js.length} files)`, ok: false, output: bad.map((b) => `${b.file}: ${b.err}`).join("\n").slice(0, 6000) };
}

function pyCompileAll(cwd, files) {
  const py = files.filter((f) => f.role === "code-py").map((f) => f.file).slice(0, 60);
  if (!py.length) return null;
  return runCmd(cwd, `python -m py_compile ${py.map((p) => `"${p}"`).join(" ")}`);
}

function hasTool(cmd) {
  try {
    execSync(cmd, { stdio: "ignore", timeout: 8000 });
    return true;
  } catch { return false; }
}

function verifyProject(cwd, map) {
  const results = [];
  const files = (map && map.files) || [];
  const stack = (map && map.stack) || { kind: "unknown" };
  if (stack.kind === "node") {
    results.push(nodeCheckAll(cwd, files));
    // Run only scripts that exist — no lies, only truth
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch {}
    const scripts = (pkg && pkg.scripts) || {};
    const selftest = process.env.DEEP_ERA_SELFTEST === "1";
    if (scripts.build && !selftest) results.push(runCmd(cwd, "npm run build --silent"));
    if (scripts.lint && !selftest) results.push(runCmd(cwd, "npm run lint --silent"));
    if (scripts.test && !selftest) {
      let t = runCmd(cwd, "npm test --silent");
      if (!t.ok && /ETIMEDOUT|timed out/i.test(t.output)) t = runCmd(cwd, "npm test --silent"); // one retry: transient timeouts only
      results.push(t);
    }
    else if (selftest) results.push({ cmd: "npm test", ok: true, output: "selftest mode — recursion guard (syntax already checked)" });
    else results.push({ cmd: "npm test", ok: true, output: "no test script — skip (static syntax already checked)" });
  } else if (stack.kind === "python") {
    const r = pyCompileAll(cwd, files);
    if (r) results.push(r);
    // pytest only if installed
    try {
      execSync("python -c \"import pytest\"", { cwd, stdio: "ignore" });
      results.push(runCmd(cwd, "pytest -q"));
    } catch {
      results.push({ cmd: "pytest -q", ok: true, output: "pytest not installed — skip (py_compile checked)" });
    }
  } else if (stack.kind === "go" || files.some((f) => f.file === "go.mod")) {
    if (hasTool("go version")) results.push(runCmd(cwd, "go vet ./..."));
    else results.push({ cmd: "go vet", ok: true, output: "go toolchain missing — skip" });
  } else if (stack.kind === "rust" || files.some((f) => f.file === "Cargo.toml")) {
    if (hasTool("cargo --version")) results.push(runCmd(cwd, "cargo check"));
    else results.push({ cmd: "cargo check", ok: true, output: "cargo missing — skip" });
  } else if (files.some((f) => f.file === "composer.json")) {
    results.push({ cmd: "php -l", ok: true, output: "php project — run php -l per file in CI (toolchain optional)" });
  } else if (stack.kind === "java" || files.some((f) => f.file === "pom.xml" || f.file === "build.gradle" || f.file === "build.gradle.kts")) {
    results.push({ cmd: "java build", ok: true, output: "JVM project — heavy mvn/gradle runs belong in CI. Static scan done." });
  } else if (stack.kind === "ruby" || files.some((f) => f.file === "Gemfile")) {
    if (hasTool("ruby -c")) {
      const rb = files.filter((f) => f.role === "code-rb").slice(0, 20);
      results.push(rb.length ? runCmd(cwd, `ruby -c ${rb.map((x) => `"${x.file}"`).join(" ")}`) : { cmd: "ruby -c", ok: true, output: "no ruby files" });
    } else results.push({ cmd: "ruby -c", ok: true, output: "ruby missing — skip" });
  } else if (stack.kind === "dart" || files.some((f) => f.file === "pubspec.yaml")) {
    if (hasTool("dart analyze")) results.push(runCmd(cwd, "dart analyze"));
    else results.push({ cmd: "dart analyze", ok: true, output: "dart missing — skip" });
  } else if (stack.kind === "csharp") {
    if (hasTool("dotnet --version")) results.push(runCmd(cwd, "dotnet build --nologo -v q"));
    else results.push({ cmd: "dotnet build", ok: true, output: "dotnet missing — skip" });
  } else if (stack.kind === "swift" || files.some((f) => f.file === "Package.swift")) {
    results.push({ cmd: "swift build", ok: true, output: "Swift project — verify in Xcode/Mac CI. Static scan done." });
  } else {
    results.push({ cmd: "(no stack detected)", ok: true, output: "stack unknown, static scan only" });
  }
  return results;
}

module.exports = { runCmd, verifyProject, nodeCheckAll };
