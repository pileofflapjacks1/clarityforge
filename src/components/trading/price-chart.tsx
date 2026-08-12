"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useForgeStore } from "@/lib/store";
import { specsFor } from "@/lib/trading/symbols";
import { formatMoney, formatPct } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketPane() {
  const selected = useForgeStore((s) => s.selectedSymbol);
  const selectSymbol = useForgeStore((s) => s.selectSymbol);
  const enabled = useForgeStore((s) => s.settings.enabledSymbols);
  const quotes = useForgeStore((s) => s.quotes);
  const candles = useForgeStore((s) => s.candles);
  const specs = useMemo(() => specsFor(enabled), [enabled]);
  const quote = quotes[selected];
  const series = candles[selected] ?? [];
  const [ready, setReady] = useState(true);

  const data = series.map((c) => ({
    t: c.t,
    price: c.close,
    volume: c.volume,
  }));

  return (
    <Card className="flex min-h-[22rem] flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {specs.map((s) => {
          const q = quotes[s.symbol];
          const active = s.symbol === selected;
          const up = (q?.change ?? 0) >= 0;
          return (
            <Button
              key={s.symbol}
              size="sm"
              variant={active ? "default" : "secondary"}
              aria-pressed={active}
              onClick={() => selectSymbol(s.symbol)}
              className="font-mono"
            >
              {s.symbol}
              <span className={cn("text-[10px] font-normal", up ? "text-ok" : "text-danger")}>
                {q ? formatPct(q.changePct, 1) : ""}
              </span>
            </Button>
          );
        })}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="forge-label">{quote?.symbol ?? selected}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {quote ? formatMoney(quote.price, quote.price >= 1000 ? 0 : 2) : "—"}
          </p>
        </div>
        {quote ? (
          <div className="text-right font-mono text-xs text-muted">
            <div>
              bid {formatMoney(quote.bid)} · ask {formatMoney(quote.ask)}
            </div>
            <div className={quote.change >= 0 ? "text-ok" : "text-danger"}>
              {formatMoney(quote.change)} ({formatPct(quote.changePct)}) vs seed
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Waiting for the paper tape…</p>
        )}
      </div>
      <div className="min-h-[14rem] flex-1" onAnimationEnd={() => setReady(true)}>
        {data.length < 2 || !ready ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted">
            Building a paper tape…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis
                domain={["auto", "auto"]}
                width={64}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(v: number) => (v >= 1000 ? v.toFixed(0) : v.toFixed(2))}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleTimeString()}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--accent)"
                fill="url(#px)"
                strokeWidth={1.6}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Simulated random walk. Not a live quote. Volume is decorative.
      </p>
    </Card>
  );
}
