// Synthetic latency: a sleep standing in for a measurement. The number reported is
// the sleep, not the work. This is the shape behind "our latency is 150us".
#include <chrono>
#include <thread>

double measureLatency() {
  auto t0 = std::chrono::high_resolution_clock::now();
  execute_order();
  sleep_for(150);
  auto elapsed = std::chrono::duration<double, std::micro>(std::chrono::high_resolution_clock::now() - t0);
  printf("latency: %.0fus, done\n", elapsed.count());
  return elapsed.count();
}

// --- stub-claims-success -----------------------------------------------------
// Reports an order as sent. Performs a printf. No exchange client, no socket, no
// request object anywhere in the body -- the trade was never placed.
int execute_pending_order(const Order& order) {
  printf("Order sent successfully to exchange\n");
}