import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS, STARTING_COGNITIVE } from "@/lib/types";
import {
  arousalFitness,
  confirmStepsFor,
  evaluateDecisionQuality,
  qualityScore,
} from "./decision-quality";

describe("decision quality", () => {
  it("scores mid-range arousal higher than extremes", () => {
    expect(arousalFitness(38)).toBeGreaterThan(arousalFitness(90));
    expect(arousalFitness(38)).toBeGreaterThan(arousalFitness(5));
  });

  it("rates a settled state as High under default thresholds", () => {
    const q = evaluateDecisionQuality({
      state: { ...STARTING_COGNITIVE, t: 1, engagement: 80, fatigue: 18, arousal: 36, confidence: 70, anomalyScore: 5 },
    });
    expect(q.band).toBe("high");
    expect(q.blocked).toBe(false);
    expect(q.confirmSteps).toBe(1);
  });

  it("forces Caution on high arousal and freeze", () => {
    const stressed = evaluateDecisionQuality({
      state: { ...STARTING_COGNITIVE, t: 1, arousal: 90, anomalyScore: 10 },
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(stressed.band).toBe("caution");
    expect(stressed.confirmSteps).toBe(3);

    const frozen = evaluateDecisionQuality({
      state: { ...STARTING_COGNITIVE, t: 1 },
      frozen: true,
    });
    expect(frozen.blocked).toBe(true);
    expect(frozen.confirmSteps).toBe(0);
  });

  it("adds steps as quality and strictness worsen", () => {
    expect(confirmStepsFor("high", "standard")).toBe(1);
    expect(confirmStepsFor("high", "strict")).toBe(2);
    expect(confirmStepsFor("low", "standard")).toBe(3);
    expect(confirmStepsFor("caution", "relaxed")).toBe(3);
  });

  it("quality score is bounded", () => {
    const s = qualityScore({
      t: 1,
      engagement: 0,
      fatigue: 100,
      arousal: 100,
      confidence: 0,
      anomalyScore: 0,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
