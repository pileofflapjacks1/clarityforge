/**
 * Personal heuristic & bias layer.
 *
 * Remembers paper-trading decisions together with the cognitive snapshot
 * at fill time, then offers gentle, non-judgmental notes when the current
 * state + proposed action diverges from the user’s higher-quality history.
 *
 * Research toy. Not a performance coach. Not financial advice.
 */

import type {
  CognitiveState,
  DecisionRecord,
  HeuristicInsight,
  HeuristicWarning,
  OrderDraft,
  QualityBand,
} from "@/lib/types";
import { fillMarkPnl } from "@/lib/trading/engine";
import { mean } from "@/lib/utils";

const EVAL_AFTER_MS = 30_000;

export function recordDecision(
  records: DecisionRecord[],
  rec: DecisionRecord,
): DecisionRecord[] {
  return [rec, ...records].slice(0, 400);
}

export function evaluatePending(
  records: DecisionRecord[],
  quotes: Record<string, { price: number }>,
  now: number,
): DecisionRecord[] {
  return records.map((r) => {
    if (r.outcome) return r;
    if (now - r.t < EVAL_AFTER_MS) return r;
    const mark = quotes[r.symbol]?.price;
    if (mark == null) return r;
    const pnl = fillMarkPnl(r.side, r.fillPrice, r.qty, mark);
    const notional = r.fillPrice * r.qty;
    const pnlPct = notional === 0 ? 0 : (pnl / notional) * 100;
    return {
      ...r,
      outcome: {
        evaluatedAt: now,
        mark,
        pnl,
        pnlPct,
        successful: pnl > 0,
      },
    };
  });
}

export function buildInsights(records: DecisionRecord[]): HeuristicInsight[] {
  const done = records.filter((r) => r.outcome);
  if (done.length < 4) {
    return [
      {
        id: "warmup",
        severity: "info",
        title: "Still gathering a personal baseline",
        body: "After a handful of paper fills, ClarityForge will note when you have historically been more settled. Nothing here is a judgment — just memory.",
      },
    ];
  }

  const insights: HeuristicInsight[] = [];
  const hiEng = done.filter((r) => r.state.engagement > 70 && r.state.fatigue < 40);
  const other = done.filter((r) => !(r.state.engagement > 70 && r.state.fatigue < 40));
  const hiRate = successRate(hiEng);
  const otherRate = successRate(other);
  if (hiEng.length >= 3 && other.length >= 3 && hiRate - otherRate >= 0.12) {
    insights.push({
      id: "eng-fatigue",
      severity: "nudge",
      title: "You have been steadier when engaged and unfatigued",
      body: `Paper outcomes were more often positive when Engagement was above 70 and Fatigue below 40 (${pct(hiRate)} vs ${pct(otherRate)} otherwise). That is a personal pattern, not a rule.`,
    });
  }

  const lowStress = done.filter((r) => r.state.arousal >= 22 && r.state.arousal <= 55);
  const highStress = done.filter((r) => r.state.arousal > 70);
  if (lowStress.length >= 3 && highStress.length >= 2) {
    const a = successRate(lowStress);
    const b = successRate(highStress);
    if (a - b >= 0.1) {
      insights.push({
        id: "arousal",
        severity: "nudge",
        title: "Mid-range arousal has coincided with cleaner outcomes",
        body: `When arousal sat in a moderate band, paper results were ${pct(a)} positive vs ${pct(b)} when arousal was high. Consider extra space when you feel keyed up.`,
      });
    }
  }

  const highQ = done.filter((r) => r.qualityBand === "high");
  const poorQ = done.filter((r) => r.qualityBand === "low" || r.qualityBand === "caution");
  if (highQ.length >= 3 && poorQ.length >= 2) {
    const a = successRate(highQ);
    const b = successRate(poorQ);
    if (a - b >= 0.1) {
      insights.push({
        id: "quality-band",
        severity: "nudge",
        title: "High Decision Quality has lined up with better paper results",
        body: `${pct(a)} of High-quality fills were later positive, versus ${pct(b)} when quality was Low or Caution. Friction on those later days is there on purpose.`,
      });
    }
  }

  const avgPnl = mean(done.map((r) => r.outcome?.pnl ?? 0));
  insights.push({
    id: "sample",
    severity: "info",
    title: `${done.length} evaluated paper decisions`,
    body: `Average mark-to-market after ~30s has been ${avgPnl >= 0 ? "+" : "−"}$${Math.abs(avgPnl).toFixed(2)}. This is a short-horizon toy metric, not performance reporting.`,
  });

  return insights.slice(0, 4);
}

export function divergenceWarning(
  state: CognitiveState,
  draft: Pick<OrderDraft, "qty" | "type" | "side">,
  records: DecisionRecord[],
  typicalQty: number,
): HeuristicWarning {
  const done = records.filter((r) => r.outcome);
  if (done.length < 5) {
    return { active: false, title: "", body: "" };
  }

  const good = done.filter((r) => r.outcome?.successful);
  const poor = done.filter((r) => r.outcome && !r.outcome.successful);
  if (good.length < 3) {
    return { active: false, title: "", body: "" };
  }

  const goodEng = mean(good.map((r) => r.state.engagement));
  const goodFat = mean(good.map((r) => r.state.fatigue));
  const poorEng = poor.length ? mean(poor.map((r) => r.state.engagement)) : goodEng;
  const poorFat = poor.length ? mean(poor.map((r) => r.state.fatigue)) : goodFat;

  const towardPoor =
    Math.abs(state.engagement - poorEng) + Math.abs(state.fatigue - poorFat) <
    Math.abs(state.engagement - goodEng) + Math.abs(state.fatigue - goodFat);

  const large = typicalQty > 0 && draft.qty >= typicalQty * 1.6;
  const market = draft.type === "market";

  if (towardPoor && (large || market) && (state.engagement < goodEng - 12 || state.fatigue > goodFat + 12)) {
    return {
      active: true,
      title: "This setup is unlike your higher-quality history",
      body: `In your paper record, cleaner outcomes clustered around Engagement ~${Math.round(goodEng)} and Fatigue ~${Math.round(goodFat)}. Right now those reads are ${Math.round(state.engagement)} / ${Math.round(state.fatigue)}. No judgment — just a pause to check the intent.`,
    };
  }

  return { active: false, title: "", body: "" };
}

export function typicalQty(records: DecisionRecord[]): number {
  const qs = records.map((r) => r.qty);
  if (qs.length === 0) return 0;
  return mean(qs);
}

function successRate(rows: DecisionRecord[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.outcome?.successful).length / rows.length;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function snapshotForFill(
  id: string,
  t: number,
  symbol: string,
  side: DecisionRecord["side"],
  qty: number,
  fillPrice: number,
  state: CognitiveState,
  qualityBand: QualityBand,
): DecisionRecord {
  return { id, t, symbol, side, qty, fillPrice, state, qualityBand };
}
