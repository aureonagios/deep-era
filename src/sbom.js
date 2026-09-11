const fs = require("fs");
const path = require("path");

// SBOM (CycloneDX 1.5, JSON): machine-readable ingredient list of the project.
// Enterprises demand it (US Executive Order 14028, SOC2 evidence). Offline, zero-dep.
// Honest scope: declares direct deps from manifests (no transitive resolution —
// that needs an install; stated in the file).
function collectComponents(cwd) {
  const components = [];
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    for (const [name, ver] of Object.entries(Object.assign({}, pkg.dependencies))) {
      components.push({ type: "library", name, version: String(ver), scope: "required", "bom-ref": `npm:${name}@${ver}` });
    }
    for (const [name, ver] of Object.entries(Object.assign({}, pkg.devDependencies))) {
      components.push({ type: "library", name, version: String(ver), scope: "optional", "bom-ref": `npm:${name}@${ver}` });
    }
  } catch {}
  try {
    for (const line of fs.readFileSync(path.join(cwd, "requirements.txt"), "utf8").split("\n")) {
      const m = line.trim().match(/^([A-Za-z0-9_.-]+)==(.+)$/);
      if (m) components.push({ type: "library", name: m[1], version: m[2], scope: "required", "bom-ref": `pypi:${m[1]}@${m[2]}` });
    }
  } catch {}
  return components;
}

function runSbom(cwd) {
  let name = "unknown", version = "0.0.0";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    name = pkg.name || name;
    version = pkg.version || version;
  } catch {}
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: "deep-era", name: "deep-era", version: require("../package.json").version }],
      comment: "Direct deps from manifests only — no transitive resolution (needs install).",
    },
    components: collectComponents(cwd),
  };
  const full = path.join(cwd, ".deep-era", "sbom.json");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(sbom, null, 2));
  console.log(`[deep-era] SBOM: ${sbom.components.length} direct components -> .deep-era/sbom.json (CycloneDX 1.5)`);
  return sbom;
}

module.exports = { runSbom, collectComponents };
