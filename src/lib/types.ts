/**
 * ClarityForge — shared types.
 *
 * Research / simulation only. Not a medical device. Not implant firmware.
 * Not affiliated with Neuralink. Not a brokerage. Not financial advice.
 * All neural data is synthetic or mock. Paper trading only — no live orders.
 */

/** Suite-compatible stream tags. */
export type StreamSource = "synthetic" | "adapter";

/**
 * Cognitive channels produced by the mock engine (all 0–100).
 *
 * FUTURE BCI: replace these four scalars with decoded features from a
 * NeuralBridge / headset adapter. Keep the same names so Decision Quality
 * and the heuristic layer do not change.
 */
export interface CognitiveState {
  t: number;
  /** Attentional engagement / focus proxy. */
  engagement: number;
  /** Accumulated tiredness; rises slowly over a session. */
  fatigue: number;
  /** Emotional arousal / stress. Mid-range is typically healthier than extremes. */
  arousal: number;
  /** Calibrated confidence (not raw decoder confidence). */
  confidence: number;
  /** Sudden distribution-shift score 0–100. */
  anomalyScore: number;
}

export type QualityBand = "high" | "medium" | "low" | "caution";

export interface DecisionQuality {
  t: number;
  score: number;
  band: QualityBand;
  explanation: string;
  reasons: string[];
  /** Extra confirmation steps required before an order can submit. */
  confirmSteps: number;
  /** Gentle delay (ms) applied before the first confirm is armed. */
  frictionMs: number;
  /** True when Hard Freeze or a safety gate blocks all order intent. */
  blocked: boolean;
  blockReason?: string;
}

export type NeuralInjection =
  | "none"
  | "high_engagement"
  | "fatigue"
  | "stress"
  | "calm"
  | "overconfident"
  | "underconfident"
  | "anomaly";

export type ConfirmationStrictness = "relaxed" | "standard" | "strict";

export type ThemeMode = "dark" | "light";

export interface Thresholds {
  /** Fatigue at/above this adds Caution + throttle. */
  fatigueHigh: number;
  /** Arousal at/above this adds Caution + throttle. */
  arousalHigh: number;
  /** Arousal at/below this is treated as under-aroused (not ideal). */
  arousalLow: number;
  /** Engagement below this weakens quality. */
  engagementLow: number;
  /** Per-tick jump that flags an anomaly. */
  anomalyDelta: number;
  /** Score cutoffs (inclusive lower bounds). */
  highMin: number;
  mediumMin: number;
  lowMin: number;
}

export interface Settings {
  thresholds: Thresholds;
  strictness: ConfirmationStrictness;
  /** Symbols enabled in the paper universe. */
  enabledSymbols: string[];
  theme: ThemeMode;
  startingCash: number;
  neuralHz: number;
  marketMs: number;
}

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type TimeInForce = "day" | "gtc" | "ioc";
export type OrderStatus =
  | "pending"
  | "open"
  | "filled"
  | "cancelled"
  | "rejected"
  | "blocked";

export type AssetKind = "equity" | "etf" | "crypto";

export interface SymbolSpec {
  symbol: string;
  name: string;
  kind: AssetKind;
  /** Seed mid used when a simulation is created / reset. */
  basePrice: number;
  /** Per-second vol scale (research toy, not calibrated). */
  volatility: number;
  /** Slight drift per second. */
  drift: number;
  lotSize: number;
  tickSize: number;
  minQty: number;
  maxQty: number;
}

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  changePct: number;
  t: number;
}

export interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderDraft {
  symbol: string;
  side: Side;
  qty: number;
  type: OrderType;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  tif: TimeInForce;
}

export interface Order extends OrderDraft {
  id: string;
  createdAt: number;
  status: OrderStatus;
  rejectReason?: string;
  fillPrice?: number;
  filledAt?: number;
  cognitiveSnapshot: CognitiveState;
  quality: DecisionQuality;
  confirmationSteps: number;
  parentId?: string;
  role?: "primary" | "stop_loss" | "take_profit";
}

export interface Fill {
  id: string;
  orderId: string;
  t: number;
  symbol: string;
  side: Side;
  qty: number;
  price: number;
  cognitiveSnapshot: CognitiveState;
  qualityBand: QualityBand;
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface Portfolio {
  cash: number;
  startingCash: number;
  positions: Position[];
  realizedPnl: number;
}

export interface DecisionRecord {
  id: string;
  t: number;
  symbol: string;
  side: Side;
  qty: number;
  fillPrice: number;
  state: CognitiveState;
  qualityBand: QualityBand;
  outcome?: {
    evaluatedAt: number;
    mark: number;
    pnl: number;
    pnlPct: number;
    successful: boolean;
  };
}

export interface HeuristicInsight {
  id: string;
  severity: "info" | "nudge" | "watch";
  title: string;
  body: string;
}

export interface HeuristicWarning {
  active: boolean;
  title: string;
  body: string;
}

export interface SessionLogEntry {
  t: number;
  kind: "system" | "neural" | "quality" | "order" | "safety" | "heuristic";
  message: string;
  data?: Record<string, unknown>;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  fatigueHigh: 70,
  arousalHigh: 72,
  arousalLow: 18,
  engagementLow: 40,
  anomalyDelta: 32,
  highMin: 72,
  mediumMin: 54,
  lowMin: 36,
};

export const DEFAULT_ENABLED_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "GOOGL",
  "SPY",
  "QQQ",
  "BTC-USD",
  "ETH-USD",
];

export const DEFAULT_SETTINGS: Settings = {
  thresholds: DEFAULT_THRESHOLDS,
  strictness: "standard",
  enabledSymbols: [...DEFAULT_ENABLED_SYMBOLS],
  theme: "dark",
  startingCash: 100_000,
  neuralHz: 4,
  marketMs: 1000,
};

export const STARTING_COGNITIVE: CognitiveState = {
  t: 0,
  engagement: 68,
  fatigue: 22,
  arousal: 38,
  confidence: 62,
  anomalyScore: 6,
};
