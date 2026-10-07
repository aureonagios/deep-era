// Clean Python counterpart. Each shape resembles a fabrication and is legitimate.

import time

# Retry backoff with jitter: real, named, and waiting is the point.
def retry_request(fn, attempts=3):
    for attempt in range(attempts):
        result = fn()
        if result:
            return result
        time.sleep(0.15 * (1 + attempt))
    return None


# A yield point, not a fake measurement.
def cooperative_tick():
    time.sleep(0)


# A real write, then the message. The effect exists before it is claimed.
def add_to_vault(record):
    with open(VAULT_PATH, "a", encoding="utf8") as handle:
        handle.write(str(record) + "\n")
    print("added to vault")
    return True


# A real client that fetches the price. No inline quote anywhere.
def quote_usd(symbol):
    response = requests.get(f"https://api.example.com/price/{symbol}", timeout=2)
    response.raise_for_status()
    return response.json()["price"]


# A configurable default is configuration, not a stale quote.
DEFAULT_PRICE = 0.00
RETRY_TIMEOUT_MS = 1000
MAX_LATENCY_BUDGET = 250.0


# Real work, no marker above it.
def execute_order(payload):
    return exchange.submit(payload)