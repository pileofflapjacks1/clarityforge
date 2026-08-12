"use client";

import { useForgeStore } from "@/lib/store";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CognitiveState } from "@/lib/types";

interface GaugeProps {
  label: string;
  value: number;
  hint: string;
  invert?: boolean;
}

function tone(value: number, invert?: boolean): string {
  const v = invert ? 100 - value : value;
  if (v >= 70) return "var(--ok)";
  if (v >= 40) return "var(--accent)";
  return "var(--danger)";
}

export function MiniGauge({ label, value, hint, invert }: GaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = tone(pct, invert);
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="forge-label">{label}</div>
      <div
        className="relative h-[4.5rem] w-[4.5rem]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${Math.round(pct)} percent`}
      >
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-semibold tabular-nums">{Math.round(pct)}</span>
        </div>
      </div>
      <p className="text-center text-[11px] text-muted">{hint}</p>
    </div>
  );
}

export function CognitiveStatePanel() {
  const state = useForgeStore((s) => s.cognitive);
  return <CognitiveGauges state={state} />;
}

export function CognitiveGauges({ state }: { state: CognitiveState }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cognitive state</CardTitle>
          <CardDescription>Synthetic channels · always on</CardDescription>
        </div>
      </CardHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
        <MiniGauge label="Engagement" value={state.engagement} hint="Attention / focus" />
        <MiniGauge label="Fatigue" value={state.fatigue} hint="Accumulates slowly" invert />
        <MiniGauge label="Arousal" value={state.arousal} hint="Stress / activation" invert />
        <MiniGauge label="Confidence" value={state.confidence} hint="Calibrated, not raw" />
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Anomaly {Math.round(state.anomalyScore)} · mock stream only. A later BCI
        adapter would feed these four numbers.
      </p>
    </Card>
  );
}
