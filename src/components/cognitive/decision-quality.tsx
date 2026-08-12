"use client";

import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { QUALITY_LABEL } from "@/lib/neural/decision-quality";
import { Card } from "@/components/ui/card";
import type { QualityBand } from "@/lib/types";

const COLORS: Record<QualityBand, string> = {
  high: "var(--ok)",
  medium: "var(--accent)",
  low: "var(--low)",
  caution: "var(--caution)",
};

export function DecisionQualityPanel() {
  const quality = useForgeStore((s) => s.quality);
  const frozen = useForgeStore((s) => s.frozen);
  const color = frozen ? "var(--danger)" : COLORS[quality.band];

  return (
    <Card className="relative overflow-hidden">
      <div className="forge-label">Decision quality</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <motion.div
          key={frozen ? "frozen" : quality.band}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <p className="text-3xl font-semibold tracking-tight" style={{ color }}>
            {frozen ? "Frozen" : QUALITY_LABEL[quality.band]}
          </p>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted">
            score {quality.score.toFixed(1)}
          </p>
        </motion.div>
        <QualityMeter score={quality.score} color={color} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{quality.explanation}</p>
      {quality.reasons.length > 1 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
          {quality.reasons.slice(1).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      {!frozen && quality.band !== "high" ? (
        <p className="mt-3 text-xs text-muted">
          Submitting an order will take {quality.confirmSteps} confirmation
          {quality.confirmSteps === 1 ? "" : "s"}
          {quality.frictionMs ? ` and a brief pause (${Math.round(quality.frictionMs / 100) / 10}s)` : ""}.
        </p>
      ) : null}
    </Card>
  );
}

function QualityMeter({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="h-16 w-3 overflow-hidden rounded-full bg-panel-2"
      role="meter"
      aria-label="Decision quality score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="w-full rounded-full"
        style={{ height: `${pct}%`, marginTop: `${100 - pct}%`, background: color }}
      />
    </div>
  );
}
