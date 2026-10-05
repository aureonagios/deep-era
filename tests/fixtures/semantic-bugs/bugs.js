// Semantic bug fixture for deep-era tests. Every construct here is a real defect that
// an AI writes and that a human reviewer catches in seconds. Nothing in this file is
// imported by the engine under test; it exists to be scanned.
async function saveRecord(rec) {
  return db.collection("records").doc(rec.id).set(rec.data)
    .then(() => rec.id)
    .catch(() => { });            // rejection dropped, chain reports success
}

async function syncAll(items) {
  fetch("/api/sync", { method: "POST", body: JSON.stringify(items) });  // never awaited
  return items.length;
}

function isValid(user) {
  if (true) {                     // validation never runs
    return true;
  }
  return false;
}

const CACHE = null;
if (CACHE === CACHE) {            // always true
  // dead code
}

module.exports = { saveRecord, syncAll, isValid };
