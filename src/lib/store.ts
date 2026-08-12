/**
 * ClarityForge Zustand store — neural tick, paper market, orders, safety.
 * Client-side only. No brokerage. No real neural hardware.
 *
 * FUTURE BCI: call `ingestCognitive(state)` from the NeuralBridge adapter
 * instead of (or in addition to) the synthetic generator tick.
 */

"use client";

import { create } from "zustand";
import type {
  CognitiveState,
  DecisionQuality,
  DecisionRecord,
  Fill,
  HeuristicInsight,
  HeuristicWarning,
  NeuralInjection,
  Order,
  OrderDraft,
  Portfolio,
  QualityBand,
  Quote,
  SessionLogEntry,
  Settings,
  Candle,
} from "@/lib/types";
import { DEFAULT_SETTINGS, STARTING_COGNITIVE } from "@/lib/types";
import { SyntheticCognitiveGenerator } from "@/lib/neural/generator";
import type { CognitiveChannel } from "@/lib/neural/generator";
import { evaluateDecisionQuality } from "@/lib/neural/decision-quality";
import { seedBook, tickBook, type MarketBook } from "@/lib/trading/market";
import { specsFor } from "@/lib/trading/symbols";
import {
  cancelOrder,
  createTradingState,
  markToMarket,
  matchOpenOrders,
  submitOrder,
  unrealizedPnl,
  type TradingState,
} from "@/lib/trading/engine";
import {
  buildInsights,
  divergenceWarning,
  evaluatePending,
  recordDecision,
  snapshotForFill,
  typicalQty,
} from "@/lib/heuristics/memory";
import {
  clearAllLocalData,
  loadOnboardingComplete,
  loadSession,
  loadSettings,
  parseImport,
  saveOnboardingComplete,
  saveSession,
  saveSettings,
  serializeExport,
  STORAGE_VERSION,
  type PersistedSession,
} from "@/lib/persist/storage";

const MAX_STATE_HISTORY = 240;
const MAX_LOG = 180;

export interface ConfirmRequest {
  draft: OrderDraft;
  quality: DecisionQuality;
  warning: HeuristicWarning;
  step: number;
  armedAt: number;
}

export interface ForgeStore {
  hydrated: boolean;
  running: boolean;
  onboardingComplete: boolean;

  settings: Settings;
  cognitive: CognitiveState;
  quality: DecisionQuality;
  injection: NeuralInjection;
  overrides: Partial<Record<CognitiveChannel, number>>;
  frozen: boolean;
  freezeReason: string;

  quotes: Record<string, Quote>;
  candles: Record<string, Candle[]>;
  selectedSymbol: string;

  portfolio: Portfolio;
  orders: Order[];
  fills: Fill[];
  decisions: DecisionRecord[];
  insights: HeuristicInsight[];
  lastWarning: HeuristicWarning;

  history: CognitiveState[];
  log: SessionLogEntry[];

  confirm: ConfirmRequest | null;

  _gen: SyntheticCognitiveGenerator | null;
  _book: MarketBook | null;
  _neuralTimer: ReturnType<typeof setInterval> | null;
  _marketTimer: ReturnType<typeof setInterval> | null;
  _persistTimer: ReturnType<typeof setTimeout> | null;

  hydrate: () => void;
  start: () => void;
  stop: () => void;
  ingestCognitive: (state: CognitiveState) => void;
  setInjection: (i: NeuralInjection) => void;
  setOverride: (channel: CognitiveChannel, value: number | null) => void;
  impulse: (channel: CognitiveChannel, delta: number) => void;
  freeze: (reason?: string) => void;
  unfreeze: () => void;
  selectSymbol: (symbol: string) => void;
  requestSubmit: (draft: OrderDraft) => void;
  advanceConfirm: () => void;
  cancelConfirm: () => void;
  cancelOpenOrder: (id: string) => void;
  resetSimulation: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
  updateThresholds: (partial: Partial<Settings["thresholds"]>) => void;
  completeOnboarding: () => void;
  reopenOnboarding: () => void;
  exportSession: () => string;
  importSession: (text: string) => boolean;
  resetAllData: () => void;
  pushLog: (entry: Omit<SessionLogEntry, "t"> & { t?: number }) => void;
}

function emptyWarning(): HeuristicWarning {
  return { active: false, title: "", body: "" };
}

function initialQuality(state: CognitiveState, settings: Settings, frozen: boolean): DecisionQuality {
  return evaluateDecisionQuality({
    state,
    thresholds: settings.thresholds,
    strictness: settings.strictness,
    frozen,
  });
}

function persistNow(get: () => ForgeStore): void {
  const s = get();
  const session: PersistedSession = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    settings: s.settings,
    onboardingComplete: s.onboardingComplete,
    frozen: s.frozen,
    trading: {
      portfolio: s.portfolio,
      orders: s.orders,
      fills: s.fills,
    },
    decisions: s.decisions,
    log: s.log.slice(0, 80),
  };
  saveSession(session);
  saveSettings(s.settings);
}

function schedulePersist(set: (fn: (s: ForgeStore) => Partial<ForgeStore>) => void, get: () => ForgeStore): void {
  const existing = get()._persistTimer;
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => persistNow(get), 800);
  set(() => ({ _persistTimer: timer }));
}

export const useForgeStore = create<ForgeStore>((set, get) => ({
  hydrated: false,
  running: false,
  onboardingComplete: true,

  settings: DEFAULT_SETTINGS,
  cognitive: { ...STARTING_COGNITIVE, t: Date.now() },
  quality: initialQuality({ ...STARTING_COGNITIVE, t: Date.now() }, DEFAULT_SETTINGS, false),
  injection: "none",
  overrides: {},
  frozen: false,
  freezeReason: "Hard Freeze is on. Order intent is disabled.",

  quotes: {},
  candles: {},
  selectedSymbol: "AAPL",

  portfolio: createTradingState(DEFAULT_SETTINGS.startingCash).portfolio,
  orders: [],
  fills: [],
  decisions: [],
  insights: buildInsights([]),
  lastWarning: emptyWarning(),

  history: [],
  log: [],

  confirm: null,

  _gen: null,
  _book: null,
  _neuralTimer: null,
  _marketTimer: null,
  _persistTimer: null,

  hydrate: () => {
    if (get().hydrated) return;
    const settings = loadSettings();
    const onboardingComplete = loadOnboardingComplete();
    const saved = loadSession();
    const specs = specsFor(settings.enabledSymbols);
    const book = seedBook(specs);
    const gen = new SyntheticCognitiveGenerator();

    const trading = saved?.trading ?? createTradingState(settings.startingCash);
    const frozen = saved?.frozen ?? false;
    const cognitive = { ...STARTING_COGNITIVE, t: Date.now() };
    const selected =
      settings.enabledSymbols.includes(saved ? get().selectedSymbol : "AAPL")
        ? get().selectedSymbol
        : settings.enabledSymbols[0] ?? "AAPL";

    set({
      hydrated: true,
      settings,
      onboardingComplete,
      frozen,
      portfolio: trading.portfolio,
      orders: trading.orders,
      fills: trading.fills,
      decisions: saved?.decisions ?? [],
      insights: buildInsights(saved?.decisions ?? []),
      log: saved?.log ?? [
        {
          t: Date.now(),
          kind: "system",
          message: "ClarityForge session ready. Simulator mode. All data stays in this browser.",
        },
      ],
      quotes: book.quotes,
      candles: book.candles,
      selectedSymbol: settings.enabledSymbols.includes("AAPL")
        ? "AAPL"
        : settings.enabledSymbols[0] ?? "AAPL",
      _gen: gen,
      _book: book,
      cognitive,
      quality: initialQuality(cognitive, settings, frozen),
    });

    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", settings.theme === "light");
      document.documentElement.classList.toggle("dark", settings.theme !== "light");
    }
    void selected;
  },

  start: () => {
    const s = get();
    if (s.running) return;
    if (!s.hydrated) get().hydrate();

    const neuralMs = Math.round(1000 / Math.max(1, get().settings.neuralHz));
    const marketMs = get().settings.marketMs;

    const neuralTimer = setInterval(() => {
      const cur = get();
      const gen = cur._gen ?? new SyntheticCognitiveGenerator();
      if (!cur._gen) set({ _gen: gen });
      const next = gen.next(Date.now(), cur.settings.thresholds);
      get().ingestCognitive(next);
    }, neuralMs);

    const marketTimer = setInterval(() => {
      const cur = get();
      const specs = specsFor(cur.settings.enabledSymbols);
      const book = tickBook(cur._book ?? seedBook(specs), specs, Date.now());
      let trading: TradingState = {
        portfolio: cur.portfolio,
        orders: cur.orders,
        fills: cur.fills,
      };
      const seenFillIds = new Set(cur.fills.map((f) => f.id));
      trading = matchOpenOrders(trading, book.quotes, Date.now());
      let decisions = recordNewPrimaryFills(cur.decisions, trading, seenFillIds);
      decisions = evaluatePending(decisions, book.quotes, Date.now());
      set({
        _book: book,
        quotes: book.quotes,
        candles: book.candles,
        portfolio: trading.portfolio,
        orders: trading.orders,
        fills: trading.fills,
        decisions,
        insights: buildInsights(decisions),
      });
      schedulePersist(set, get);
    }, marketMs);

    set({ running: true, _neuralTimer: neuralTimer, _marketTimer: marketTimer });
    get().pushLog({ kind: "system", message: "Live simulation started." });
  },

  stop: () => {
    const s = get();
    if (s._neuralTimer) clearInterval(s._neuralTimer);
    if (s._marketTimer) clearInterval(s._marketTimer);
    if (s._persistTimer) clearTimeout(s._persistTimer);
    persistNow(get);
    set({ running: false, _neuralTimer: null, _marketTimer: null });
  },

  ingestCognitive: (state) => {
    const cur = get();
    const quality = evaluateDecisionQuality({
      state,
      thresholds: cur.settings.thresholds,
      strictness: cur.settings.strictness,
      frozen: cur.frozen,
      freezeReason: cur.freezeReason,
    });
    const history = [...cur.history, state];
    if (history.length > MAX_STATE_HISTORY) history.splice(0, history.length - MAX_STATE_HISTORY);

    if (state.anomalyScore >= 70 && cur.cognitive.anomalyScore < 70) {
      get().pushLog({
        kind: "safety",
        message: "Anomaly: a sudden cognitive-state jump was detected. Extra caution is on.",
      });
    }

    set({ cognitive: state, quality, history });
  },

  setInjection: (injection) => {
    const gen = get()._gen;
    gen?.setInjection(injection);
    set({ injection });
    get().pushLog({ kind: "neural", message: `Injection set to ${injection.replace(/_/g, " ")}.` });
  },

  setOverride: (channel, value) => {
    get()._gen?.setOverride(channel, value);
    const overrides = { ...get().overrides };
    if (value == null) delete overrides[channel];
    else overrides[channel] = value;
    set({ overrides });
  },

  impulse: (channel, delta) => {
    get()._gen?.impulse(channel, delta);
    get().pushLog({
      kind: "neural",
      message: `Injected ${delta > 0 ? "+" : ""}${delta} into ${channel}.`,
    });
  },

  freeze: (reason) => {
    set({
      frozen: true,
      freezeReason: reason ?? "Hard Freeze is on. Order intent is disabled.",
      confirm: null,
    });
    const cur = get();
    set({
      quality: evaluateDecisionQuality({
        state: cur.cognitive,
        thresholds: cur.settings.thresholds,
        strictness: cur.settings.strictness,
        frozen: true,
        freezeReason: reason ?? "Hard Freeze is on. Order intent is disabled.",
      }),
    });
    get().pushLog({ kind: "safety", message: "Hard Freeze engaged. All order intent is disabled." });
    schedulePersist(set, get);
  },

  unfreeze: () => {
    set({ frozen: false });
    const cur = get();
    set({
      quality: evaluateDecisionQuality({
        state: cur.cognitive,
        thresholds: cur.settings.thresholds,
        strictness: cur.settings.strictness,
        frozen: false,
      }),
    });
    get().pushLog({ kind: "safety", message: "Hard Freeze released. Order intent is available again." });
    schedulePersist(set, get);
  },

  selectSymbol: (symbol) => set({ selectedSymbol: symbol }),

  requestSubmit: (draft) => {
    const cur = get();
    const quality = evaluateDecisionQuality({
      state: cur.cognitive,
      thresholds: cur.settings.thresholds,
      strictness: cur.settings.strictness,
      frozen: cur.frozen,
      freezeReason: cur.freezeReason,
    });
    if (quality.blocked) {
      get().pushLog({
        kind: "safety",
        message: quality.blockReason ?? "Order blocked.",
      });
      return;
    }
    const warning = divergenceWarning(
      cur.cognitive,
      draft,
      cur.decisions,
      typicalQty(cur.decisions.filter((d) => d.symbol === draft.symbol)),
    );
    set({
      confirm: {
        draft,
        quality,
        warning,
        step: 1,
        armedAt: Date.now() + quality.frictionMs,
      },
      lastWarning: warning,
    });
  },

  advanceConfirm: () => {
    const cur = get();
    const confirm = cur.confirm;
    if (!confirm) return;
    if (Date.now() < confirm.armedAt) return;
    if (cur.frozen) {
      set({ confirm: null });
      return;
    }
    const needed = confirm.quality.confirmSteps;
    if (confirm.step < needed) {
      set({
        confirm: {
          ...confirm,
          step: confirm.step + 1,
          armedAt: Date.now() + Math.min(600, confirm.quality.frictionMs / 2),
        },
      });
      return;
    }

    const trading: TradingState = {
      portfolio: cur.portfolio,
      orders: cur.orders,
      fills: cur.fills,
    };
    const result = submitOrder(trading, confirm.draft, {
      now: Date.now(),
      quotes: cur.quotes,
      cognitive: cur.cognitive,
      quality: confirm.quality,
      confirmationSteps: needed,
      frozen: cur.frozen,
    });

    let decisions = cur.decisions;
    if (result.order.status === "filled" && result.order.fillPrice != null) {
      decisions = recordDecision(
        decisions,
        snapshotForFill(
          result.order.id,
          result.order.filledAt ?? Date.now(),
          result.order.symbol,
          result.order.side,
          result.order.qty,
          result.order.fillPrice,
          cur.cognitive,
          confirm.quality.band,
        ),
      );
    }

    set({
      portfolio: result.state.portfolio,
      orders: result.state.orders,
      fills: result.state.fills,
      decisions,
      insights: buildInsights(decisions),
      confirm: null,
    });
    get().pushLog({
      kind: "order",
      message: describeOrderResult(result.order),
      data: { id: result.order.id, status: result.order.status },
    });
    schedulePersist(set, get);
  },

  cancelConfirm: () => set({ confirm: null }),

  cancelOpenOrder: (id) => {
    const cur = get();
    const next = cancelOrder(
      { portfolio: cur.portfolio, orders: cur.orders, fills: cur.fills },
      id,
      Date.now(),
    );
    set({ orders: next.orders });
    get().pushLog({ kind: "order", message: `Cancelled order ${id}.` });
    schedulePersist(set, get);
  },

  resetSimulation: () => {
    const cur = get();
    const specs = specsFor(cur.settings.enabledSymbols);
    const book = seedBook(specs);
    const trading = createTradingState(cur.settings.startingCash);
    cur._gen?.reset();
    set({
      _book: book,
      quotes: book.quotes,
      candles: book.candles,
      portfolio: trading.portfolio,
      orders: [],
      fills: [],
      decisions: [],
      insights: buildInsights([]),
      confirm: null,
      selectedSymbol: cur.settings.enabledSymbols[0] ?? "AAPL",
    });
    get().pushLog({ kind: "system", message: "Paper simulation reset. Cash restored. History cleared." });
    schedulePersist(set, get);
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    if (partial.thresholds) {
      settings.thresholds = { ...get().settings.thresholds, ...partial.thresholds };
    }
    set({ settings });
    saveSettings(settings);
    if (partial.theme && typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", partial.theme === "light");
      document.documentElement.classList.toggle("dark", partial.theme !== "light");
    }
    if (partial.enabledSymbols) {
      const specs = specsFor(settings.enabledSymbols);
      const book = seedBook(specs, Date.now());
      // Keep existing quotes for symbols that remain.
      const merged = { ...book };
      const prev = get()._book;
      if (prev) {
        for (const sym of settings.enabledSymbols) {
          if (prev.quotes[sym]) merged.quotes[sym] = prev.quotes[sym];
          if (prev.candles[sym]) merged.candles[sym] = prev.candles[sym];
        }
      }
      const selected = settings.enabledSymbols.includes(get().selectedSymbol)
        ? get().selectedSymbol
        : settings.enabledSymbols[0] ?? "AAPL";
      set({ _book: merged, quotes: merged.quotes, candles: merged.candles, selectedSymbol: selected });
    }
    const cur = get();
    set({
      quality: evaluateDecisionQuality({
        state: cur.cognitive,
        thresholds: settings.thresholds,
        strictness: settings.strictness,
        frozen: cur.frozen,
        freezeReason: cur.freezeReason,
      }),
    });
    schedulePersist(set, get);
  },

  updateThresholds: (partial) => {
    get().updateSettings({ thresholds: { ...get().settings.thresholds, ...partial } });
  },

  completeOnboarding: () => {
    set({ onboardingComplete: true });
    saveOnboardingComplete(true);
  },

  reopenOnboarding: () => set({ onboardingComplete: false }),

  exportSession: () => {
    const s = get();
    return serializeExport({
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      settings: s.settings,
      onboardingComplete: s.onboardingComplete,
      frozen: s.frozen,
      trading: { portfolio: s.portfolio, orders: s.orders, fills: s.fills },
      decisions: s.decisions,
      log: s.log,
    });
  },

  importSession: (text) => {
    const parsed = parseImport(text);
    if (!parsed) return false;
    const specs = specsFor(parsed.settings.enabledSymbols);
    const book = seedBook(specs);
    const selected = parsed.settings.enabledSymbols.includes(get().selectedSymbol)
      ? get().selectedSymbol
      : parsed.settings.enabledSymbols[0] ?? "AAPL";
    set({
      settings: parsed.settings,
      onboardingComplete: parsed.onboardingComplete,
      frozen: parsed.frozen,
      portfolio: parsed.trading.portfolio,
      orders: parsed.trading.orders,
      fills: parsed.trading.fills,
      decisions: parsed.decisions,
      insights: buildInsights(parsed.decisions),
      log: parsed.log,
      quotes: book.quotes,
      candles: book.candles,
      selectedSymbol: selected,
      confirm: null,
    });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", parsed.settings.theme === "light");
      document.documentElement.classList.toggle("dark", parsed.settings.theme !== "light");
    }
    saveSettings(parsed.settings);
    saveOnboardingComplete(parsed.onboardingComplete);
    schedulePersist(set, get);
    get().pushLog({ kind: "system", message: "Session imported from file. Still local only." });
    return true;
  },

  resetAllData: () => {
    get().stop();
    clearAllLocalData();
    const settings = DEFAULT_SETTINGS;
    const book = seedBook(specsFor(settings.enabledSymbols));
    const trading = createTradingState(settings.startingCash);
    const gen = new SyntheticCognitiveGenerator();
    const cognitive = { ...STARTING_COGNITIVE, t: Date.now() };
    set({
      settings,
      onboardingComplete: false,
      frozen: false,
      cognitive,
      quality: initialQuality(cognitive, settings, false),
      injection: "none",
      overrides: {},
      quotes: book.quotes,
      candles: book.candles,
      selectedSymbol: "AAPL",
      portfolio: trading.portfolio,
      orders: [],
      fills: [],
      decisions: [],
      insights: buildInsights([]),
      lastWarning: emptyWarning(),
      history: [],
      log: [
        {
          t: Date.now(),
          kind: "system",
          message: "All local data cleared. Fresh simulator session.",
        },
      ],
      confirm: null,
      _gen: gen,
      _book: book,
    });
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    get().start();
  },

  pushLog: (entry) => {
    const item: SessionLogEntry = { t: entry.t ?? Date.now(), kind: entry.kind, message: entry.message, data: entry.data };
    set({ log: [item, ...get().log].slice(0, MAX_LOG) });
  },
}));

function recordNewPrimaryFills(
  decisions: DecisionRecord[],
  trading: TradingState,
  seenFillIds: Set<string>,
): DecisionRecord[] {
  let next = decisions;
  for (const fill of trading.fills) {
    if (seenFillIds.has(fill.id)) continue;
    const order = trading.orders.find((o) => o.id === fill.orderId);
    if (order && order.role !== "primary") continue;
    next = recordDecision(
      next,
      snapshotForFill(
        fill.orderId,
        fill.t,
        fill.symbol,
        fill.side,
        fill.qty,
        fill.price,
        fill.cognitiveSnapshot,
        fill.qualityBand,
      ),
    );
  }
  return next;
}

function describeOrderResult(order: Order): string {
  if (order.status === "filled") {
    return `Filled ${order.side.toUpperCase()} ${order.qty} ${order.symbol} @ ${order.fillPrice?.toFixed(2)}.`;
  }
  if (order.status === "open") {
    return `Resting ${order.type} ${order.side.toUpperCase()} ${order.qty} ${order.symbol}.`;
  }
  if (order.status === "blocked") {
    return order.rejectReason ?? "Order blocked by safety gate.";
  }
  if (order.status === "rejected") {
    return order.rejectReason ?? "Order rejected.";
  }
  return `Order ${order.status}.`;
}

export function selectEquity(s: ForgeStore): number {
  return markToMarket(s.portfolio, s.quotes);
}

export function selectUnrealized(s: ForgeStore): number {
  return unrealizedPnl(s.portfolio, s.quotes);
}

export function selectBand(s: ForgeStore): QualityBand {
  return s.quality.band;
}
