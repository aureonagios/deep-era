// TypeScript clean counterpart: the configured-price shape, done correctly.
interface FeedConfig {
  readonly symbol: string;
  readonly timeoutMs: number;
}

// A price read from config, never inlined. Configuration is how a real system
// carries a reference value without freezing it into the binary.
const DEFAULT_QUOTE: Record<string, number> = {
  BTC: 0,
  ETH: 0,
};

const rateLimitPerMinute = 600;
const cacheTtlMs = 250.0;
// Numbers that are counts, ports and limits, not quotes. They are four-digit-plus and
// have decimals, which is exactly the shape the hardcoded-quote rule looks for -- and
// exactly why the rule requires a price-shaped NAME before it accuses.
const maxRetries = 1500.0;
const orderTimeoutSeconds = 30.25;
const p95LatencyBudgetMs = 250.75;
const workerPoolSize = 4096.5;

export function quoteFor(config: FeedConfig, feed: PriceFeed): number {
  return feed.latest(config.symbol);
}