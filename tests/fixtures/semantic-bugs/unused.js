// Unused-local fixture. Every binding here is assigned and never read again --
// the "written but never used" defect an AI leaves behind when it changes its
// mind mid-edit. Nothing in this file is imported; it exists to be scanned.

function pricingFor(cart) {
  const discountRate = 0.1;          // replaced by the tier table below, never read
  const total = cart.reduce((n, item) => n + item.price, 0);
  return total;
}

function auditTrail(events) {
  const severity = events.length;     // computed, then forgotten
  const summary = `${events.length} events`;
  return summary;
}

function unusedScaffolding() {
  const draft = "wip";
  const buffer = new Array(10);
  return "done";                      // neither draft nor buffer ever read
}

module.exports = { pricingFor, auditTrail, unusedScaffolding };