"use client";

import { useEffect, useState } from "react";
import { useForgeStore } from "@/lib/store";
import { formatMoney, formatQty } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/ui/badge";

export function ConfirmDialog() {
  const confirm = useForgeStore((s) => s.confirm);
  const advance = useForgeStore((s) => s.advanceConfirm);
  const cancel = useForgeStore((s) => s.cancelConfirm);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!confirm) return;
    const id = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(id);
  }, [confirm]);

  const waiting = confirm ? now < confirm.armedAt : false;
  const remain = confirm ? Math.max(0, confirm.armedAt - now) : 0;
  const needed = confirm?.quality.confirmSteps ?? 1;
  const last = confirm ? confirm.step >= needed : false;

  return (
    <Dialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open) cancel(); }}>
      <DialogContent aria-describedby="confirm-desc">
        <DialogHeader>
          <DialogTitle>Confirm paper order</DialogTitle>
          <DialogDescription id="confirm-desc">
            {confirm
              ? `Step ${Math.min(confirm.step, needed)} of ${needed}. Paper trading only.`
              : "Review the order."}
          </DialogDescription>
        </DialogHeader>
        {confirm ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-base">
                {confirm.draft.side.toUpperCase()} {formatQty(confirm.draft.qty)} {confirm.draft.symbol}
              </span>
              <QualityBadge band={confirm.quality.band} />
            </div>
            <ul className="space-y-1 text-muted">
              <li>Type {confirm.draft.type}{confirm.draft.limitPrice ? ` @ ${formatMoney(confirm.draft.limitPrice)}` : ""}</li>
              <li>Time in force {confirm.draft.tif.toUpperCase()}</li>
              {confirm.draft.stopLoss ? <li>Stop {formatMoney(confirm.draft.stopLoss)}</li> : null}
              {confirm.draft.takeProfit ? <li>Take profit {formatMoney(confirm.draft.takeProfit)}</li> : null}
            </ul>
            <p className="leading-relaxed">{confirm.quality.explanation}</p>
            {confirm.warning.active ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--caution)_45%,var(--border))] bg-[var(--caution-dim)] px-3 py-2 text-sm">
                <p className="font-semibold">{confirm.warning.title}</p>
                <p className="mt-1 text-muted">{confirm.warning.body}</p>
              </div>
            ) : null}
            {confirm.quality.band === "caution" || confirm.quality.band === "low" ? (
              <p className="text-xs text-muted">
                This extra step exists because Decision Quality is not High. You can still
                cancel. Nothing here is advice to trade.
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
              <Button onClick={advance} disabled={waiting}>
                {waiting
                  ? `Wait ${(remain / 1000).toFixed(1)}s`
                  : last
                    ? "Submit paper order"
                    : "Continue"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
