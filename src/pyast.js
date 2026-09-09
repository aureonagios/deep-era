const { execFileSync } = require("child_process");

// Python AST scan: uses the SYSTEM python's stdlib `ast` — zero npm deps,
// full precision (no regex false positives). Skips silently without python.
const VISITOR = `
class V(ast.NodeVisitor):
    def __init__(self):
        self.out = []
    def visit_Call(self, node):
        n = node.func
        name = ""
        if isinstance(n, ast.Name): name = n.id
        elif isinstance(n, ast.Attribute):
            v = n.value
            mod = v.id if isinstance(v, ast.Name) else (v.attr if isinstance(v, ast.Attribute) else "")
            name = (mod, n.attr)
        if name in SUSPECT:
            self.out.append({"rule": "py-eval-exec", "sev": "high", "line": node.lineno, "msg": f"{name}() on dynamic code — injection risk"})
        if name in SHELL:
            dotted = f"{name[0]}.{name[1]}" if isinstance(name, tuple) else name
            self.out.append({"rule": "py-shell", "sev": "high", "line": node.lineno, "msg": f"{dotted}() shell call — verify arguments are static"})
        self.generic_visit(node)
`;

const SINGLE = `
import ast, sys, json
SUSPECT = {"eval", "exec", "compile"}
SHELL = {("os", "system"), ("os", "popen"), ("subprocess", "call"), ("subprocess", "run"), ("subprocess", "Popen")}
${VISITOR}
path = sys.argv[1]
try:
    tree = ast.parse(open(path, encoding="utf-8").read())
except SyntaxError as e:
    print(json.dumps([{"rule": "py-syntax", "sev": "high", "line": e.lineno or 0, "msg": f"Python syntax error: {e.msg}"}]))
    sys.exit(0)
except Exception:
    sys.exit(0)
v = V()
v.visit(tree)
print(json.dumps(v.out))
`;

const BATCH = `
import ast, sys, json
SUSPECT = {"eval", "exec", "compile"}
SHELL = {("os", "system"), ("os", "popen"), ("subprocess", "call"), ("subprocess", "run"), ("subprocess", "Popen")}
${VISITOR}
OUT = {}
for path in sys.argv[1:]:
    try:
        tree = ast.parse(open(path, encoding="utf-8").read())
    except SyntaxError as e:
        OUT[path] = [{"rule": "py-syntax", "sev": "high", "line": e.lineno or 0, "msg": f"Python syntax error: {e.msg}"}]
        continue
    except Exception:
        continue
    v = V()
    v.visit(tree)
    OUT[path] = v.out
print(json.dumps(OUT))
`;

function astScanPython(file) {
  try {
    const raw = execFileSync("python", ["-c", SINGLE, file], { timeout: 15000, stdio: ["ignore", "pipe", "pipe"] }).toString();
    return JSON.parse(raw || "[]");
  } catch {
    return null; // no python — caller falls back to regex-only scan
  }
}

// ONE python process for all files — 60 files cost one spawn, not sixty.
function astScanMany(files) {
  if (!files.length) return {};
  try {
    const raw = execFileSync("python", ["-c", BATCH, ...files.slice(0, 80)], { timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }).toString();
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

module.exports = { astScanPython, astScanMany };
