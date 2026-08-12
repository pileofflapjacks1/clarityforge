"use client";

import { useMemo, useState } from "react";
import { useForgeStore } from "@/lib/store";
import { getSpec } from "@/lib/trading/symbols";
import { formatMoney, roundTo } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OrderType, Side, TimeInForce } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Intent-native order construction.
 *
 * Sliders and discrete confirms are stand-ins for future neural intent
 * vectors (velocity_2d → qty/price; class_label / switch_binary → side,
 * type, confirm). See `src/lib/adapter/neurabridge-stub.ts`.
 */
export function OrderConstruction() {
  const symbol = useForgeStore((s) => s.selectedSymbol);
  const quote = useForgeStore((s) => s.quotes[s.selectedSymbol]);
  const quality = useForgeStore((s) => s.quality);
  const frozen = useForgeStore((s) => s.frozen);
  const requestSubmit = useForgeStore((s) => s.requestSubmit);
  const lastWarning = useForgeStore((s) => s.lastWarning);
  const spec = getSpec(symbol);

  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [tif, setTif] = useState<TimeInForce>("day");
  const [qty, setQty] = useState(spec?.kind === "crypto" ? spec.minQty * 10 : 10);
  const [limitOffset, setLimitOffset] = useState(0);
  const [useStop, setUseStop] = useState(false);
  const [useTp, setUseTp] = useState(false);
  const [stopPct, setStopPct] = useState(2);
  const [tpPct, setTpPct] = useState(3);

  const px = quote?.price ?? spec?.basePrice ?? 0;
  const tick = spec?.tickSize ?? 0.01;
  const limitPrice = roundTo(px * (1 + limitOffset / 100), tick);
  const stopLoss = useStop
    ? roundTo(px * (side === "buy" ? 1 - stopPct / 100 : 1 + stopPct / 100), tick)
    : undefined;
  const takeProfit = useTp
    ? roundTo(px * (side === "buy" ? 1 + tpPct / 100 : 1 - tpPct / 100), tick)
    : undefined;

  const notional = useMemo(() => qty * (type === "limit" ? limitPrice : px), [qty, type, limitPrice, px]);

  if (!spec) {
    return (
      <Card>
        <p className="text-sm text-muted">No symbol selected.</p>
      </Card>
    );
  }

  function submit() {
    requestSubmit({
      symbol,
      side,
      qty,
      type,
      limitPrice: type === "limit" ? limitPrice : undefined,
      stopLoss,
      takeProfit,
      tif,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Intent order</CardTitle>
          <CardDescription>
            Continuous controls now; neural vectors later. Nothing submits without confirm.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Side</Label>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Button size="sm" variant={side === "buy" ? "ok" : "secondary"} onClick={() => setSide("buy")} aria-pressed={side === "buy"}>
              Buy
            </Button>
            <Button size="sm" variant={side === "sell" ? "danger" : "secondary"} onClick={() => setSide("sell")} aria-pressed={side === "sell"}>
              Sell
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="order-type">Order type</Label>
          <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
            <SelectTrigger id="order-type" className="mt-1" aria-label="Order type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between">
          <Label htmlFor="qty">Quantity</Label>
          <span className="font-mono text-xs tabular-nums">{qty}</span>
        </div>
        <Slider
          id="qty"
          min={spec.minQty}
          max={spec.maxQty}
          step={spec.lotSize}
          value={[qty]}
          onValueChange={([v]) => setQty(v)}
          aria-label="Quantity"
        />
      </div>

      {type === "limit" ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between">
            <Label htmlFor="limit">Limit vs last (%)</Label>
            <span className="font-mono text-xs tabular-nums">
              {limitOffset.toFixed(2)}% · {formatMoney(limitPrice, px >= 1000 ? 0 : 2)}
            </span>
          </div>
          <Slider
            id="limit"
            min={-3}
            max={3}
            step={0.05}
            value={[limitOffset]}
            onValueChange={([v]) => setLimitOffset(v)}
            aria-label="Limit offset percent"
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sl">Stop loss</Label>
            <Switch id="sl" checked={useStop} onCheckedChange={setUseStop} />
          </div>
          {useStop ? (
            <div className="mt-2">
              <Slider min={0.5} max={8} step={0.1} value={[stopPct]} onValueChange={([v]) => setStopPct(v)} aria-label="Stop loss percent" />
              <p className="mt-1 font-mono text-xs text-muted">
                {stopPct.toFixed(1)}% · {stopLoss != null ? formatMoney(stopLoss, px >= 1000 ? 0 : 2) : "—"}
              </p>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="tp">Take profit</Label>
            <Switch id="tp" checked={useTp} onCheckedChange={setUseTp} />
          </div>
          {useTp ? (
            <div className="mt-2">
              <Slider min={0.5} max={12} step={0.1} value={[tpPct]} onValueChange={([v]) => setTpPct(v)} aria-label="Take profit percent" />
              <p className="mt-1 font-mono text-xs text-muted">
                {tpPct.toFixed(1)}% · {takeProfit != null ? formatMoney(takeProfit, px >= 1000 ? 0 : 2) : "—"}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="tif">Time in force</Label>
        <Select value={tif} onValueChange={(v) => setTif(v as TimeInForce)}>
          <SelectTrigger id="tif" className="mt-1" aria-label="Time in force">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="gtc">GTC</SelectItem>
            <SelectItem value="ioc">IOC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel-2 px-3 py-2">
        <div className="text-sm">
          <span className="text-muted">Notional </span>
          <span className="font-mono tabular-nums">{formatMoney(notional)}</span>
        </div>
        <Button onClick={submit} disabled={frozen || quality.blocked} variant={side === "buy" ? "ok" : "danger"}>
          {frozen ? "Frozen" : `Review ${side} ${symbol}`}
        </Button>
      </div>
      {quality.band !== "high" && !frozen ? (
        <p className="mt-2 text-xs text-muted">
          Decision Quality is {quality.band}. This review will be multi-step.
        </p>
      ) : null}
      {lastWarning.active ? (
        <p className="mt-2 text-xs text-caution">{lastWarning.body}</p>
      ) : null}
      <ConfirmDialog />
    </Card>
  );
}

export function NumericField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1 font-mono"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
