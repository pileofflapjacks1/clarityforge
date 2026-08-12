/**
 * Decision Quality — combines the four cognitive channels into one
 * calm, inspectable status used to add friction (never to auto-trade).
 *
 * Research heuristic only. Not a medical score. Not a trading signal.
 */

import type {
  CognitiveState,
  ConfirmationStrictness,
  DecisionQuality,
  QualityBand,
  Thresholds,
} from "@/lib/types";
import { DEFAULT_THRESHOLDS } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function arousalFitness(arousal: number, peak = 38): number {
  return clamp(100 - 1.65 * Math.abs(arousal - peak), 0, 100);
}

export function qualityScore(state: CognitiveState): number {
  const fit = arousalFitness(state.arousal);
  return clamp(
    0.3 * state.engagement +
      0.28 * (100 - state.fatigue) +
      0.22 * fit +
      0.2 * state.confidence,
    0,
    100,
  );
}

export function bandFromScore(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): QualityBand {
  if (score >= thresholds.highMin) return "high";
  if (score >= thresholds.mediumMin) return "medium";
  if (score >= thresholds.lowMin) return "low";
  return "caution";
}

export function confirmStepsFor(
  band: QualityBand,
  strictness: ConfirmationStrictness,
): number {
  if (band === "high") return strictness === "strict" ? 2 : 1;
  if (band === "medium") return strictness === "relaxed" ? 1 : 2;
  if (band === "low") return strictness === "relaxed" ? 2 : 3;
  return 3;
}

export function frictionMsFor(band: QualityBand, strictness: ConfirmationStrictness): number {
  const base = band === "high" ? 0 : band === "medium" ? 700 : band === "low" ? 1500 : 2300;
  if (strictness === "relaxed") return Math.round(base * 0.5);
  if (strictness === "strict") return Math.round(base * 1.35);
  return base;
}

export interface QualityInput {
  state: CognitiveState;
  thresholds?: Thresholds;
  strictness?: ConfirmationStrictness;
  frozen?: boolean;
  freezeReason?: string;
}

export function evaluateDecisionQuality(input: QualityInput): DecisionQuality {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const strictness = input.strictness ?? "standard";
  const state = input.state;
  const reasons: string[] = [];

  const raw = qualityScore(state);
  let band = bandFromScore(raw, thresholds);
  const blocked = Boolean(input.frozen);
  const blockReason = input.frozen ? (input.freezeReason ?? "Hard Freeze is on. Order intent is disabled.") : undefined;

  if (state.fatigue >= thresholds.fatigueHigh) {
    reasons.push(`Fatigue is elevated (${Math.round(state.fatigue)}). Extra confirmation is on.`);
    if (band === "high" || band === "medium") band = "low";
  }
  if (state.arousal >= thresholds.arousalHigh) {
    reasons.push(`Emotional arousal is high (${Math.round(state.arousal)}). Slowing the path to submit.`);
    band = "caution";
  }
  if (state.arousal <= thresholds.arousalLow) {
    reasons.push("Arousal is very low — alertness may be under-recruited.");
    if (band === "high") band = "medium";
  }
  if (state.engagement < thresholds.engagementLow) {
    reasons.push(`Engagement is low (${Math.round(state.engagement)}).`);
    if (band === "high") band = "medium";
  }
  if (state.anomalyScore >= 55) {
    reasons.push("A sudden state change was detected. Treating this as Caution.");
    band = "caution";
  }
  if (state.confidence >= 88 && state.engagement < 55) {
    reasons.push("Confidence is high while engagement is not — possible overconfidence.");
    if (band === "high") band = "medium";
  }

  if (band === "high" && reasons.length === 0) {
    reasons.push("Engagement, fatigue, arousal, and confidence are in a settled range.");
  } else if (band === "medium" && reasons.length === 0) {
    reasons.push("Mixed signals — a second look is inexpensive.");
  } else if (band === "low" && reasons.length === 0) {
    reasons.push("Several channels are off their high-quality range.");
  } else if (band === "caution" && reasons.length === 0) {
    reasons.push("Conditions call for a pause before any order intent.");
  }

  const explanation = explain(band, raw, reasons);

  return {
    t: state.t,
    score: Math.round(raw * 10) / 10,
    band,
    explanation,
    reasons,
    confirmSteps: blocked ? 0 : confirmStepsFor(band, strictness),
    frictionMs: blocked ? 0 : frictionMsFor(band, strictness),
    blocked,
    blockReason,
  };
}

function explain(band: QualityBand, score: number, reasons: string[]): string {
  const head =
    band === "high"
      ? `Decision Quality is High (${Math.round(score)}).`
      : band === "medium"
        ? `Decision Quality is Medium (${Math.round(score)}).`
        : band === "low"
          ? `Decision Quality is Low (${Math.round(score)}).`
          : `Decision Quality is Caution (${Math.round(score)}).`;
  return `${head} ${reasons[0] ?? ""}`.trim();
}

export const QUALITY_LABEL: Record<QualityBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  caution: "Caution",
};
