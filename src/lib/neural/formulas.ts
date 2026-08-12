/**
 * Documented estimation formulas (research heuristics only).
 *
 * These are intentionally simple and inspectable — not clinical models
 * and not trading signals. All outputs are unitless research proxies.
 */

export const FORMULA_DOCS = {
  engagement: {
    name: "Engagement",
    formula:
      "engagement = clamp(OU(μ≈68, σ≈6) + inject + sessionDrift)",
    notes:
      "Mean-reverting synthetic channel. In a live adapter this would be a decoded focus / engagement feature, not raw EEG.",
  },
  fatigue: {
    name: "Fatigue",
    formula:
      "fatigue = OU(μ = 22 + 1.5*sessionMinutes, σ≈3); μ capped at 85",
    notes:
      "Slow accumulator so the demo can show degradation over a sitting. Not a medical fatigue index.",
  },
  arousal: {
    name: "Emotional arousal / stress",
    formula:
      "arousal = clamp(OU(μ≈38, σ≈7) + stressInject)",
    notes:
      "Mid-range is treated as alert-but-settled. Extremes (very low or very high) reduce Decision Quality.",
  },
  confidence: {
    name: "Calibrated confidence",
    formula:
      "confidence = clamp(OU(μ≈62, σ≈6) − 0.15*(arousal−50)_+ − overconfidenceInject)",
    notes:
      "Intended as a calibrated (not raw) confidence proxy. Overconfidence injection raises the number while Decision Quality still penalizes mismatch.",
  },
  arousalFitness: {
    name: "Arousal fitness (inverted-U)",
    formula:
      "fitness = 100 − 1.65 * |arousal − 38|   (clamped 0–100)",
    notes:
      "Yerkes-Dodson-inspired research toy: moderate arousal supports quality; both flat and panicked states score worse.",
  },
  decisionQuality: {
    name: "Decision Quality score",
    formula:
      "score = 0.30*engagement + 0.28*(100−fatigue) + 0.22*arousalFitness + 0.20*confidence",
    notes:
      "Then banded High / Medium / Low. Forced to Caution on freeze, high fatigue, high arousal, or anomaly. Not a recommendation to trade.",
  },
  anomaly: {
    name: "Anomaly score",
    formula:
      "if max(|Δengagement|, |Δfatigue|, |Δarousal|, |Δconfidence|) ≥ anomalyDelta → spike; score = EMA of spike magnitude",
    notes:
      "Catches sudden extreme state changes (e.g. a decoder glitch or an injected shock). Research only.",
  },
} as const;

export type FormulaKey = keyof typeof FORMULA_DOCS;
