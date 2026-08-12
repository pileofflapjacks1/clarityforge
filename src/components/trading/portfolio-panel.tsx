"use client";

import { useForgeStore, selectEquity, selectUnrealized } from "@/lib/store";
import { formatMoney, formatPct, formatQty } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortfolioPanel() {
  const portfolio = useForgeStore((s) => s.portfolio);
  const quotes = useForgeStore((s) => s.quotes);
  const equity = useForgeStore(selectEquity);
  const unreal = useForgeStore(selectUnrealized);
  const reset = useForgeStore((s) => s.resetSimulation);
  const totalPnl = portfolio.realizedPnl + unreal;
  const totalPct = portfolio.startingCash === 0 ? 0 : (totalPnl / portfolio.startingCash) * 100;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Portfolio</CardTitle>
          <CardDescription>Paper account · local only</CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={reset}>
          Reset sim
        </Button>
      </CardHeader>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Equity" value={formatMoney(equity)} />
        <Stat label="Cash" value={formatMoney(portfolio.cash)} />
        <Stat
          label="Unrealized"
          value={formatMoney(unreal)}
          tone={unreal >= 0 ? "ok" : "danger"}
        />
        <Stat
          label="Realized"
          value={formatMoney(portfolio.realizedPnl)}
          tone={portfolio.realizedPnl >= 0 ? "ok" : "danger"}
        />
      </div>
      <p className={cn("mt-3 font-mono text-sm tabular-nums", totalPnl >= 0 ? "text-ok" : "text-danger")}>
        Session P&amp;L {formatMoney(totalPnl)} ({formatPct(totalPct)})
      </p>
      <div className="mt-3">
        <p className="forge-label mb-2">Positions</p>
        {portfolio.positions.length === 0 ? (
          <p className="text-sm text-muted">No open positions. The desk is quiet.</p>
        ) : (
          <ul className="space-y-1.5">
            {portfolio.positions.map((p) => {
              const mark = quotes[p.symbol]?.price ?? p.avgPrice;
              const pnl = (mark - p.avgPrice) * p.qty;
              return (
                <li key={p.symbol} className="flex items-center justify-between rounded-md bg-background/50 px-2 py-1.5 font-mono text-xs">
                  <span>
                    {p.symbol} · {formatQty(p.qty)} @ {formatMoney(p.avgPrice, mark >= 1000 ? 0 : 2)}
                  </span>
                  <span className={pnl >= 0 ? "text-ok" : "text-danger"}>{formatMoney(pnl)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-2.5 py-2">
      <div className="forge-label">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm tabular-nums", tone === "ok" && "text-ok", tone === "danger" && "text-danger")}>
        {value}
      </div>
    </div>
  );
}
