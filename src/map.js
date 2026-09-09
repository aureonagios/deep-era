const fs = require("fs");
const path = require("path");

const SKIP = new Set(["node_modules", ".git", ".deep-era", "dist", "build", ".next", "__pycache__", ".venv", "venv"]);
const MAX_FILES = 500;

function scan(cwd, dir = "", out = []) {
  const full = path.join(cwd, dir);
  let entries = [];
  try {
    entries = fs.readdirSync(full, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (out.length >= MAX_FILES) break;
    if (e.name.startsWith(".") && e.name !== ".env.example") {
      if (![".env.example"].includes(e.name) && e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
      }
    }
    if (SKIP.has(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      scan(cwd, rel, out);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      let role = "other";
      if ([".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".json"].includes(ext) && e.name.endsWith(".json") && ["package.json", "tsconfig.json"].includes(e.name)) role = "config";
      else if ([".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs"].includes(ext)) role = "code-js";
      else if (ext === ".py") role = "code-py";
      else if (ext === ".go") role = "code-go";
      else if (ext === ".rs") role = "code-rs";
      else if (ext === ".java") role = "code-java";
      else if (ext === ".php") role = "code-php";
      else if (ext === ".rb") role = "code-rb";
      else if (ext === ".cs") role = "code-cs";
      else if (ext === ".dart") role = "code-dart";
      else if (ext === ".swift") role = "code-swift";
      else if (ext === ".kt" || ext === ".kts") role = "code-kt";
      else if ([".json", ".yml", ".yaml", ".toml"].includes(ext)) role = "config";
      else if ([".md"].includes(ext)) role = "doc";
      else if ([".html", ".css"].includes(ext)) role = "frontend";
      else if (ext === ".sql") role = "code-sql";
      let size = 0;
      try { size = fs.statSync(path.join(cwd, rel)).size; } catch {}
      out.push({ file: rel.replace(/\\/g, "/"), role, size });
    }
  }
  return out;
}

function stripComments(rel, txt) {
  if (/\.(js|ts|tsx|jsx|mjs|cjs)$/.test(rel)) {
    return txt.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }
  if (/\.py$/.test(rel)) return txt.replace(/^[ \t]*#.*$/gm, "");
  return txt;
}

function parseImports(cwd, rel) {
  if (!/\.(js|ts|tsx|jsx|mjs|cjs|py|go|rs|java|php|rb|dart|swift|kt)$/.test(rel)) return [];
  let txt = "";
  try { txt = fs.readFileSync(path.join(cwd, rel), "utf8").slice(0, 30000); } catch { return []; }
  txt = stripComments(rel, txt);
  const out = new Set();
  const jsRe = /(?:require\(["']([^"']+)["']\)|from\s+["']([^"']+)["']|import\s+[^"']*["']([^"']+)["'])/g;
  const pyRe = /(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/g;
  const goRe = /import\s+(?:\(\s*([^)]+)\s*\)|["']([^"']+)["'])/g;
  const useRe = /^\s*(?:use|include|require(?:_once)?)\s+["']([^"']+)["']/gm;
  const isJs = /\.(js|ts|tsx|jsx|mjs|cjs)$/.test(rel);
  const isPy = /\.py$/.test(rel);
  const isGo = /\.go$/.test(rel);
  const isPhpRb = /\.(php|rb)$/.test(rel);
  const keep = (d) => d && !/[$*]/.test(d); // skip template placeholders/globs
  let m;
  if (isJs) while ((m = jsRe.exec(txt))) {
    const dep = m[1] || m[2] || m[3];
    if (dep && dep.startsWith(".") && keep(dep)) out.add(normDep(rel, dep));
  }
  if (isPy) while ((m = pyRe.exec(txt))) {
    const dep = (m[1] || m[2] || "").replace(/\./g, "/");
    if (dep && keep(dep)) out.add(dep);
  }
  if (isGo) while ((m = goRe.exec(txt))) {
    const block = m[1] || m[2] || "";
    for (const q of block.matchAll(/["']([^"']+)["']/g)) {
      if (q[1].startsWith(".") && keep(q[1])) out.add(normDep(rel, q[1]));
    }
  }
  if (isPhpRb) while ((m = useRe.exec(txt))) {
    if (m[1].startsWith(".") && keep(m[1])) out.add(normDep(rel, m[1]));
  }
  return [...out].slice(0, 20);
}

function normDep(rel, dep) {
  const base = path.posix.dirname(rel.replace(/\\/g, "/"));
  const joined = path.posix.normalize(path.posix.join(base, dep));
  for (const ext of ["", ".js", ".ts", "/index.js", ".py"]) {
    const cand = (joined + ext).replace(/^\.\//, "");
    // Existence is checked by the caller; return a best guess here
    if (!ext) continue;
    return cand;
  }
  return joined;
}
function detectStack(cwd, files) {
  const names = new Set(files.map((f) => f.file));
  const has = (n) => names.has(n);
  if (has("package.json")) {
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch {}
    return {
      kind: "node",
      run: pkg.scripts && pkg.scripts.start ? "npm start" : null,
      build: pkg.scripts && pkg.scripts.build ? "npm run build" : null,
      test: pkg.scripts && pkg.scripts.test ? "npm test" : null,
    };
  }
  if (has("requirements.txt") || has("pyproject.toml") || has("main.py") || has("app.py")) {
    return { kind: "python", run: has("main.py") ? "python main.py" : has("app.py") ? "python app.py" : null, build: null, test: "pytest -q" };
  }
  if (has("go.mod")) return { kind: "go", run: null, build: "go build ./...", test: "go test ./..." };
  if (has("Cargo.toml")) return { kind: "rust", run: null, build: "cargo check", test: "cargo test" };
  if (has("composer.json")) return { kind: "php", run: null, build: null, test: null };
  if (has("pom.xml") || has("build.gradle") || has("build.gradle.kts")) return { kind: "java", run: null, build: null, test: null };
  if (has("Gemfile")) return { kind: "ruby", run: null, build: null, test: null };
  if (has("pubspec.yaml")) return { kind: "dart", run: null, build: null, test: null };
  if (has("Package.swift")) return { kind: "swift", run: null, build: null, test: null };
  const csproj = files.some((f) => f.file.endsWith(".csproj") || f.file.endsWith(".sln"));
  if (csproj) return { kind: "csharp", run: null, build: "dotnet build", test: "dotnet test" };
  return { kind: "unknown", run: null, build: null, test: null };
}

function buildMap(cwd) {
  const files = scan(cwd);
  const stack = detectStack(cwd, files);
  const byName = new Map(files.map((f) => [f.file, f]));
  for (const f of files) {
    if (f.role.startsWith("code")) {
      f.imports = parseImports(cwd, f.file).filter((d) => byName.has(d) || byName.has(d.replace(/^\.\//, "")));
    } else f.imports = [];
    f.importedBy = [];
  }
  for (const f of files) {
    for (const d of (f.imports || [])) {
      const key = byName.has(d) ? d : d.replace(/^\.\//, "");
      if (byName.has(key)) byName.get(key).importedBy.push(f.file);
    }
  }
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    stack,
    counts: { total: files.length },
    files: files.slice(0, MAX_FILES),
  };
}

module.exports = { buildMap, scan, detectStack, parseImports };
