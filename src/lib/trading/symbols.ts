import type { SymbolSpec } from "@/lib/types";
import { DEFAULT_ENABLED_SYMBOLS } from "@/lib/types";

/**
 * Paper-trading universe. Prices are illustrative seeds, not live quotes.
 * No brokerage connection in the MVP.
 */
export const SYMBOL_UNIVERSE: SymbolSpec[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    kind: "equity",
    basePrice: 228.4,
    volatility: 0.011,
    drift: 0.00002,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 250,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    kind: "equity",
    basePrice: 421.15,
    volatility: 0.01,
    drift: 0.00002,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 200,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    kind: "equity",
    basePrice: 132.8,
    volatility: 0.018,
    drift: 0.00003,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 300,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    kind: "equity",
    basePrice: 248.6,
    volatility: 0.022,
    drift: 0,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 200,
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    kind: "equity",
    basePrice: 196.25,
    volatility: 0.013,
    drift: 0.00002,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 200,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    kind: "equity",
    basePrice: 178.9,
    volatility: 0.012,
    drift: 0.00002,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 200,
  },
  {
    symbol: "SPY",
    name: "S&P 500 ETF",
    kind: "etf",
    basePrice: 582.4,
    volatility: 0.007,
    drift: 0.000015,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 150,
  },
  {
    symbol: "QQQ",
    name: "Nasdaq 100 ETF",
    kind: "etf",
    basePrice: 508.75,
    volatility: 0.009,
    drift: 0.000018,
    lotSize: 1,
    tickSize: 0.01,
    minQty: 1,
    maxQty: 150,
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    kind: "crypto",
    basePrice: 94_850,
    volatility: 0.028,
    drift: 0.00001,
    lotSize: 0.001,
    tickSize: 1,
    minQty: 0.001,
    maxQty: 2,
  },
  {
    symbol: "ETH-USD",
    name: "Ethereum",
    kind: "crypto",
    basePrice: 3420,
    volatility: 0.03,
    drift: 0.00001,
    lotSize: 0.01,
    tickSize: 0.1,
    minQty: 0.01,
    maxQty: 20,
  },
];

export function getSpec(symbol: string): SymbolSpec | undefined {
  return SYMBOL_UNIVERSE.find((s) => s.symbol === symbol);
}

export function specsFor(enabled: string[] = DEFAULT_ENABLED_SYMBOLS): SymbolSpec[] {
  const set = new Set(enabled);
  return SYMBOL_UNIVERSE.filter((s) => set.has(s.symbol));
}
