# The other three fabrications, in Python shape.

# --- stub-claims-success -----------------------------------------------------
# Reports a write. Nothing is stored anywhere -- the body writes nothing, saves
# nothing and sends nothing. The function has one statement and it is a print.
# This comment deliberately names the words a naive effect-scan looks for, because
# the scanner must read code, not prose.
def add_to_vault(record):
    print("Successfully added to Vault")


# --- hardcoded-market-data ---------------------------------------------------
# A quote-shaped constant in a trading path. If this ever reaches an order, real
# money moves at a number that was true on some arbitrary day.
CURRENT_BTC_PRICE = 65000.00
last_tick = 64892.50


def quote_usd():
    return CURRENT_BTC_PRICE


# --- marker-pretending-done ---------------------------------------------------
# Unfinished work sitting directly above a completion claim.
def execute_order():
    # TODO: implement the real exchange call
    return {"status": "executed", "implementation": "complete"}