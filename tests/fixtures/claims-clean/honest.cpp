// The honest counterpart to claims-bad/. Every construct here LOOKS like one of the
// five fabrications and is legitimate. claims.js must report NOTHING on this file.
//
// This half matters more than detection. A scanner that flags a retry backoff, a
// CLI status line, or a config default trains everyone to ignore it -- and then the
// real fabrication in the next file gets through. Written after measured false
// accusations, one exemption at a time.
#include <chrono>
#include <thread>

// A retry backoff: waiting IS the work here, and it is named for what it is.
double retry_after_backoff() {
  sleep_for(150);
  return 0;
}

// A poll interval: the loop genuinely does nothing until the next tick.
void poll_until_ready() {
  while (!ready()) {
    sleep_for(50);
  }
}

// Timing the real operation, with no sleep anywhere in the measurement window.
double measure_real_latency() {
  auto t0 = std::chrono::high_resolution_clock::now();
  execute_order();
  auto elapsed = std::chrono::duration<double, std::micro>(std::chrono::high_resolution_clock::now() - t0);
  return elapsed.count();
}

// A status line in a CLI: reports what happened, and it did happen. Not a persistent
// effect being claimed, so it is outside the rule.
void report_result(int code) {
  if (code == 0) {
    std::cout << "order executed" << std::endl;
  }
}

// The real write, doing the work the stub only claimed.
bool add_to_vault(const Record& record) {
  if (!vault.insert(record)) return false;
  std::cout << "added to vault" << std::endl;
  return true;
}

// A completion word in a comment is prose, not a claim. The rule reads code, and the
// claim must be an executable line.
int not_finished_yet() {
  // TODO: this comment mentions a completion word but the code does not claim one
  return vault.size();
}