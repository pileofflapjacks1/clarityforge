import { describe, expect, it } from "vitest";
import type { DecisionRecord } from "@/lib/types";
import { STARTING_COGNITIVE } from "@/lib/types";
import { buildInsights, divergenceWarning, evaluatePending } from "./memory";

function rec(partial: Partial<DecisionRecord> & Pick<DecisionRecord, "id">): DecisionRecord {
  return {
    t: 1,
    symbol: "AAPL",
    side: "buy",
    qty: 10,
    fillPrice: 100,
    state: { ...STARTING_COGNITIVE, t: 1, engagement: 80, fatigue: 20 },
    qualityBand: "high",
    ...partial,
  };
}

describe("heuristic memory", () => {
  it("evaluates pending decisions after 30s", () => {
    const rows = [rec({ id: "a", t: 1 })];
    const next = evaluatePending(rows, { AAPL: { price: 110 } }, 31_000);
    expect(next[0].outcome?.successful).toBe(true);
    expect(next[0].outcome?.pnl).toBe(100);
  });

  it("asks for more samples before claiming a pattern", () => {
    const insights = buildInsights([rec({ id: "a" })]);
    expect(insights[0]?.id).toBe("warmup");
  });

  it("flags divergence from a high-quality history", () => {
    const records: DecisionRecord[] = [];
    for (let i = 0; i < 6; i++) {
      records.push(
        rec({
          id: `g${i}`,
          qty: 10,
          state: { ...STARTING_COGNITIVE, t: 1, engagement: 82, fatigue: 18 },
          outcome: { evaluatedAt: 2, mark: 105, pnl: 50, pnlPct: 5, successful: true },
        }),
      );
    }
    for (let i = 0; i < 4; i++) {
      records.push(
        rec({
          id: `p${i}`,
          qty: 10,
          state: { ...STARTING_COGNITIVE, t: 1, engagement: 30, fatigue: 80 },
          qualityBand: "caution",
          outcome: { evaluatedAt: 2, mark: 90, pnl: -80, pnlPct: -8, successful: false },
        }),
      );
    }
    const warn = divergenceWarning(
      { ...STARTING_COGNITIVE, t: 3, engagement: 28, fatigue: 82, arousal: 80, confidence: 40, anomalyScore: 20 },
      { qty: 20, type: "market", side: "buy" },
      records,
      10,
    );
    expect(warn.active).toBe(true);
  });
});
