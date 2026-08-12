"use client";

import { useMemo } from "react";
import { useForgeStore } from "@/lib/store";
import { formatMoney, formatQty, formatTime } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/ui/badge";

export function OpenOrdersPanel() {
  const allOrders = useForgeStore((s) => s.orders);
  const cancel = useForgeStore((s) => s.cancelOpenOrder);
  const orders = useMemo(
    () => allOrders.filter((o) => o.status === "open"),
    [allOrders],
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Open orders</CardTitle>
          <CardDescription>Resting paper tickets</CardDescription>
        </div>
      </CardHeader>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">No resting orders.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
              <div>
                <div className="font-mono">
                  {o.side.toUpperCase()} {formatQty(o.qty)} {o.symbol}
                  {o.limitPrice ? ` @ ${formatMoney(o.limitPrice)}` : ""}
                </div>
                <div className="text-muted">
                  {o.role === "primary" ? o.type : o.role?.replace(/_/g, " ")} · {o.tif}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cancel(o.id)}>
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FillsPanel({ limit = 8 }: { limit?: number }) {
  const allFills = useForgeStore((s) => s.fills);
  const fills = useMemo(() => allFills.slice(0, limit), [allFills, limit]);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent fills</CardTitle>
          <CardDescription>With the cognitive snapshot at submit</CardDescription>
        </div>
      </CardHeader>
      {fills.length === 0 ? (
        <p className="text-sm text-muted">No fills yet.</p>
      ) : (
        <ul className="space-y-2">
          {fills.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-mono">
                  {formatTime(f.t)} · {f.side.toUpperCase()} {formatQty(f.qty)} {f.symbol} @ {formatMoney(f.price, f.price >= 1000 ? 0 : 2)}
                </div>
              </div>
              <QualityBadge band={f.qualityBand} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
