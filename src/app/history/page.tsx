"use client";

import { useForgeStore } from "@/lib/store";
import { formatDateTime, formatMoney, formatQty } from "@/lib/utils";
import { QualityBadge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  const orders = useForgeStore((s) => s.orders);
  const decisions = useForgeStore((s) => s.decisions);
  const log = useForgeStore((s) => s.log);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Paper tickets and the cognitive snapshot attached to each fill. Stored only in this browser.
        </p>
      </div>

      <Card className="overflow-x-auto">
        <CardHeader>
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </div>
        </CardHeader>
        {orders.length === 0 ? (
          <Empty text="No orders yet. Construct one from the desk." />
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="pb-2 pr-3">Time</th>
                <th className="pb-2 pr-3">Ticket</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Quality</th>
                <th className="pb-2">Fill</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 pr-3 font-mono text-xs">{formatDateTime(o.createdAt)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {o.side.toUpperCase()} {formatQty(o.qty)} {o.symbol} · {o.type}
                  </td>
                  <td className="py-2 pr-3">{o.status}{o.rejectReason ? ` — ${o.rejectReason}` : ""}</td>
                  <td className="py-2 pr-3">
                    <QualityBadge band={o.quality.band} />
                  </td>
                  <td className="py-2 font-mono text-xs">
                    {o.fillPrice != null ? formatMoney(o.fillPrice, o.fillPrice >= 1000 ? 0 : 2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <CardHeader>
          <div>
            <CardTitle>Heuristic decisions</CardTitle>
            <CardDescription>~30s mark-to-market after each primary fill</CardDescription>
          </div>
        </CardHeader>
        {decisions.length === 0 ? (
          <Empty text="Fills will appear here with their state snapshot." />
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">Fill</th>
                <th className="pb-2 pr-3">E / F / A / C</th>
                <th className="pb-2 pr-3">Quality</th>
                <th className="pb-2">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2 pr-3 font-mono text-xs">{formatDateTime(d.t)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {d.side.toUpperCase()} {formatQty(d.qty)} {d.symbol} @ {formatMoney(d.fillPrice)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">
                    {Math.round(d.state.engagement)} / {Math.round(d.state.fatigue)} /{" "}
                    {Math.round(d.state.arousal)} / {Math.round(d.state.confidence)}
                  </td>
                  <td className="py-2 pr-3">
                    <QualityBadge band={d.qualityBand} />
                  </td>
                  <td className="py-2 text-xs">
                    {d.outcome
                      ? `${d.outcome.successful ? "Positive" : "Negative"} · ${formatMoney(d.outcome.pnl)}`
                      : "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Event log</CardTitle>
            <CardDescription>Safety, neural, and order notes</CardDescription>
          </div>
        </CardHeader>
        {log.length === 0 ? (
          <Empty text="The log is empty." />
        ) : (
          <ul className="max-h-[24rem] space-y-1.5 overflow-auto text-xs">
            {log.map((e, i) => (
              <li key={`${e.t}-${i}`}>
                <span className="font-mono text-muted">{formatDateTime(e.t)}</span>{" "}
                <span className="text-accent">{e.kind}</span> — {e.message}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}
