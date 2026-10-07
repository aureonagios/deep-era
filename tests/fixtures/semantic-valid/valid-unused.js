// Valid patterns that a naive unused-local detector must NOT flag. Each shape here
// was proven to produce a false accusation before the rule shipped:
//   - used only inside a template interpolation   (`${sp.tokens}`)
//   - exported through module.exports / ESM export
//   - destructured declarations, where counting is a guess
//   - a name that shadows nothing but appears as a property, not a binding
//   - a variable that is written and read in a LATER statement (not dead, just late)
// deep-era must report ZERO unused-local findings on this file.
const path = require("path");

const { buildMap } = require("./map");
const { verifyProject } = require("./verify");

const configRoot = process.env.DEEP_ERA_HOME || path.join(__dirname, "..");

function report(cwd) {
  const sp = verifyProject(cwd, buildMap(cwd));
  console.log(`[report] ${sp.length} checks, cost ${sp.length * 2} cents`);
  return sp;
}

function totals(items) {
  let sum = 0;
  for (const item of items) sum += item.value;
  const label = "total";
  return `${label}: ${sum}`;   // label used only in a template interpolation
}

module.exports = { report, totals, configRoot };