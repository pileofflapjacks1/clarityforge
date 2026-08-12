/**
 * Simulated market: geometric random walk + light jump noise.
 * Not a real feed. Not suitable for research on real prices.
 */

import type { Candle, Quote, SymbolSpec } from "@/lib/types";
import { gaussian, roundTo } from "@/lib/utils";

const MAX_CANDLES = 240;

export interface MarketBook {
  quotes: Record<string, Quote>;
  candles: Record<string, Candle[]>;
}

export function seedBook(specs: SymbolSpec[], now = Date.now()): MarketBook {
  const quotes: Record<string, Quote> = {};
  const candles: Record<string, Candle[]> = {};
  for (const spec of specs) {
    quotes[spec.symbol] = quoteFromPrice(spec, spec.basePrice, spec.basePrice, now, 0);
    candles[spec.symbol] = seedHistory(spec, now);
  }
  return { quotes, candles };
}

export function tickBook(
  book: MarketBook,
  specs: SymbolSpec[],
  now: number,
  rand: () => number = Math.random,
): MarketBook {
  const quotes = { ...book.quotes };
  const candles = { ...book.candles };
  for (const spec of specs) {
    const prev = quotes[spec.symbol] ?? quoteFromPrice(spec, spec.basePrice, spec.basePrice, now, 0);
    const nextPrice = stepPrice(spec, prev.price, rand);
    const volume = Math.max(1, Math.round((800 + rand() * 4200) * (spec.kind === "crypto" ? 0.15 : 1)));
    quotes[spec.symbol] = quoteFromPrice(spec, nextPrice, spec.basePrice, now, volume);

    const series = candles[spec.symbol] ? [...candles[spec.symbol]] : [];
    const last = series[series.length - 1];
    // One candle per tick keeps the chart alive without a wall-clock bucket.
    if (!last || now - last.t >= 1000) {
      series.push({
        t: now,
        open: last ? last.close : nextPrice,
        high: Math.max(last?.close ?? nextPrice, nextPrice),
        low: Math.min(last?.close ?? nextPrice, nextPrice),
        close: nextPrice,
        volume,
      });
      if (series.length > MAX_CANDLES) series.splice(0, series.length - MAX_CANDLES);
      candles[spec.symbol] = series;
    }
  }
  return { quotes, candles };
}

function stepPrice(spec: SymbolSpec, price: number, rand: () => number): number {
  const z = gaussian(rand);
  const jump = rand() < 0.015 ? (rand() - 0.5) * spec.volatility * 8 : 0;
  const next = price * Math.exp(spec.drift - 0.5 * spec.volatility ** 2 + spec.volatility * z + jump);
  return Math.max(spec.tickSize, roundTo(next, spec.tickSize));
}

function quoteFromPrice(
  spec: SymbolSpec,
  price: number,
  baseline: number,
  t: number,
  volume: number,
): Quote {
  const spread = Math.max(spec.tickSize, roundTo(price * 0.00025, spec.tickSize));
  const change = price - baseline;
  return {
    symbol: spec.symbol,
    price,
    bid: roundTo(price - spread / 2, spec.tickSize),
    ask: roundTo(price + spread / 2, spec.tickSize),
    volume,
    change,
    changePct: baseline === 0 ? 0 : (change / baseline) * 100,
    t,
  };
}

function seedHistory(spec: SymbolSpec, now: number): Candle[] {
  const out: Candle[] = [];
  let p = spec.basePrice;
  const rand = Math.random;
  for (let i = 180; i >= 0; i--) {
    p = stepPrice(spec, p, rand);
    const prev = out[out.length - 1];
    out.push({
      t: now - i * 1000,
      open: prev ? prev.close : spec.basePrice,
      high: Math.max(prev?.close ?? p, p),
      low: Math.min(prev?.close ?? p, p),
      close: p,
      volume: Math.round(1000 + rand() * 3000),
    });
  }
  return out;
}
