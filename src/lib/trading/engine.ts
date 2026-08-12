/**
 * Paper-trading matching engine.
 *
 * Simulator only. No brokerage, no live routing, no real money.
 */

import type {
  CognitiveState,
  DecisionQuality,
  Fill,
  Order,
  OrderDraft,
  Portfolio,
  Position,
  Quote,
  SymbolSpec,
} from "@/lib/types";
import { roundTo, uid } from "@/lib/utils";
import { getSpec } from "./symbols";

export interface TradingState {
  portfolio: Portfolio;
  orders: Order[];
  fills: Fill[];
}

export function createTradingState(startingCash: number): TradingState {
  return {
    portfolio: {
      cash: startingCash,
      startingCash,
      positions: [],
      realizedPnl: 0,
    },
    orders: [],
    fills: [],
  };
}

export interface SubmitContext {
  now: number;
  quotes: Record<string, Quote>;
  cognitive: CognitiveState;
  quality: DecisionQuality;
  confirmationSteps: number;
  frozen: boolean;
}

export interface SubmitResult {
  state: TradingState;
  order: Order;
}

export function submitOrder(
  state: TradingState,
  draft: OrderDraft,
  ctx: SubmitContext,
): SubmitResult {
  const spec = getSpec(draft.symbol);
  const order = baseOrder(draft, ctx);

  if (ctx.frozen || ctx.quality.blocked) {
    order.status = "blocked";
    order.rejectReason = ctx.quality.blockReason ?? "Order intent is frozen.";
    return { state: appendOrder(state, order), order };
  }
  if (!spec) {
    order.status = "rejected";
    order.rejectReason = `Unknown symbol ${draft.symbol}.`;
    return { state: appendOrder(state, order), order };
  }
  if (!Number.isFinite(draft.qty) || draft.qty < spec.minQty) {
    order.status = "rejected";
    order.rejectReason = `Quantity below minimum (${spec.minQty}).`;
    return { state: appendOrder(state, order), order };
  }
  if (draft.qty > spec.maxQty) {
    order.status = "rejected";
    order.rejectReason = `Quantity above maximum (${spec.maxQty}).`;
    return { state: appendOrder(state, order), order };
  }
  if (draft.type === "limit" && !(draft.limitPrice && draft.limitPrice > 0)) {
    order.status = "rejected";
    order.rejectReason = "Limit orders need a limit price.";
    return { state: appendOrder(state, order), order };
  }

  const quote = ctx.quotes[draft.symbol];
  if (!quote) {
    order.status = "rejected";
    order.rejectReason = "No quote available.";
    return { state: appendOrder(state, order), order };
  }

  if (draft.type === "market") {
    return tryFill(state, order, spec, quote, ctx);
  }

  if (limitCrosses(order, quote)) {
    return tryFill(state, order, spec, quote, ctx);
  }

  if (draft.tif === "ioc") {
    order.status = "cancelled";
    order.rejectReason = "IOC not marketable.";
    return { state: appendOrder(state, order), order };
  }

  order.status = "open";
  return { state: appendOrder(state, order), order };
}

export function cancelOrder(state: TradingState, id: string, now: number): TradingState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === id && (o.status === "open" || o.status === "pending")
        ? { ...o, status: "cancelled" as const, filledAt: now }
        : o,
    ),
  };
}

export function matchOpenOrders(
  state: TradingState,
  quotes: Record<string, Quote>,
  now: number,
): TradingState {
  let next = state;
  for (const order of state.orders) {
    if (order.status !== "open") continue;
    const quote = quotes[order.symbol];
    const spec = getSpec(order.symbol);
    if (!quote || !spec) continue;

    if (order.tif === "day" && now - order.createdAt > 4 * 60 * 60 * 1000) {
      next = {
        ...next,
        orders: next.orders.map((o) => (o.id === order.id ? { ...o, status: "cancelled" as const } : o)),
      };
      continue;
    }

    const shouldFill =
      order.role === "stop_loss"
        ? stopHits(order, quote)
        : order.role === "take_profit"
          ? takeHits(order, quote)
          : order.type === "limit"
            ? limitCrosses(order, quote)
            : true;

    if (shouldFill) {
      const ctx: SubmitContext = {
        now,
        quotes,
        cognitive: order.cognitiveSnapshot,
        quality: order.quality,
        confirmationSteps: order.confirmationSteps,
        frozen: false,
      };
      const current = next.orders.find((o) => o.id === order.id);
      if (!current || current.status !== "open") continue;
      const result = tryFill(next, current, spec, quote, ctx, false);
      next = result.state;
    }
  }
  return next;
}

export function markToMarket(portfolio: Portfolio, quotes: Record<string, Quote>): number {
  let equity = portfolio.cash;
  for (const pos of portfolio.positions) {
    const px = quotes[pos.symbol]?.price ?? pos.avgPrice;
    equity += pos.qty * px;
  }
  return equity;
}

export function unrealizedPnl(portfolio: Portfolio, quotes: Record<string, Quote>): number {
  let pnl = 0;
  for (const pos of portfolio.positions) {
    const px = quotes[pos.symbol]?.price ?? pos.avgPrice;
    pnl += (px - pos.avgPrice) * pos.qty;
  }
  return pnl;
}

function tryFill(
  state: TradingState,
  order: Order,
  spec: SymbolSpec,
  quote: Quote,
  ctx: SubmitContext,
  appendIfNew = true,
): SubmitResult {
  const fillPrice = Math.max(spec.tickSize, fillPx(order, quote, spec));

  const notional = fillPrice * order.qty;
  const portfolio = clonePortfolio(state.portfolio);

  if (order.side === "buy" && portfolio.cash < notional) {
    const rejected: Order = {
      ...order,
      status: "rejected",
      rejectReason: "Insufficient cash for this paper order.",
    };
    return { state: upsertOrder(state, rejected, appendIfNew), order: rejected };
  }

  applyFill(portfolio, order.side, order.symbol, order.qty, fillPrice);

  const filled: Order = {
    ...order,
    status: "filled",
    fillPrice,
    filledAt: ctx.now,
  };
  const fill: Fill = {
    id: uid("fill"),
    orderId: order.id,
    t: ctx.now,
    symbol: order.symbol,
    side: order.side,
    qty: order.qty,
    price: fillPrice,
    cognitiveSnapshot: order.cognitiveSnapshot,
    qualityBand: order.quality.band,
  };

  const orders = upsertOrder({ ...state, portfolio, fills: [fill, ...state.fills] }, filled, appendIfNew).orders;
  let nextState: TradingState = {
    portfolio,
    orders,
    fills: [fill, ...state.fills].slice(0, 400),
  };

  if (order.role === "primary") {
    nextState = attachBrackets(nextState, filled, ctx);
  } else {
    nextState = cancelSiblingBrackets(nextState, filled, ctx.now);
  }

  return { state: nextState, order: filled };
}

function fillPx(order: Order, quote: Quote, spec: SymbolSpec): number {
  if (order.type === "limit" && order.limitPrice && order.limitPrice > 0) {
    const improved =
      order.side === "buy"
        ? Math.min(order.limitPrice, quote.ask)
        : Math.max(order.limitPrice, quote.bid);
    return roundTo(improved, spec.tickSize);
  }
  const raw = order.side === "buy" ? quote.ask : quote.bid;
  return roundTo(raw, spec.tickSize);
}

function cancelSiblingBrackets(state: TradingState, filled: Order, now: number): TradingState {
  if (!filled.parentId) return state;
  if (filled.role !== "stop_loss" && filled.role !== "take_profit") return state;
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.parentId === filled.parentId && o.id !== filled.id && o.status === "open"
        ? { ...o, status: "cancelled" as const, filledAt: now }
        : o,
    ),
  };
}

function attachBrackets(state: TradingState, parent: Order, ctx: SubmitContext): TradingState {
  if (parent.status !== "filled" || parent.fillPrice == null) return state;
  const children: Order[] = [];
  if (parent.stopLoss && parent.stopLoss > 0) {
    children.push({
      ...baseOrder(
        {
          symbol: parent.symbol,
          side: parent.side === "buy" ? "sell" : "buy",
          qty: parent.qty,
          type: "limit",
          limitPrice: parent.stopLoss,
          tif: "gtc",
        },
        ctx,
      ),
      parentId: parent.id,
      role: "stop_loss",
      status: "open",
    });
  }
  if (parent.takeProfit && parent.takeProfit > 0) {
    children.push({
      ...baseOrder(
        {
          symbol: parent.symbol,
          side: parent.side === "buy" ? "sell" : "buy",
          qty: parent.qty,
          type: "limit",
          limitPrice: parent.takeProfit,
          tif: "gtc",
        },
        ctx,
      ),
      parentId: parent.id,
      role: "take_profit",
      status: "open",
    });
  }
  if (children.length === 0) return state;
  return { ...state, orders: [...children, ...state.orders] };
}

function applyFill(portfolio: Portfolio, side: "buy" | "sell", symbol: string, qty: number, price: number): void {
  const signed = side === "buy" ? qty : -qty;
  const existing = portfolio.positions.find((p) => p.symbol === symbol);
  const currentQty = existing?.qty ?? 0;
  const currentAvg = existing?.avgPrice ?? price;

  if (side === "buy") {
    portfolio.cash -= price * qty;
  } else {
    portfolio.cash += price * qty;
  }

  const newQty = currentQty + signed;
  const closedQty = closingQuantity(currentQty, signed);
  if (closedQty !== 0) {
    const direction = currentQty > 0 ? 1 : -1;
    portfolio.realizedPnl += (price - currentAvg) * closedQty * direction;
  }

  if (newQty === 0) {
    portfolio.positions = portfolio.positions.filter((p) => p.symbol !== symbol);
    return;
  }

  let avg = currentAvg;
  if (currentQty === 0 || Math.sign(currentQty) === Math.sign(signed)) {
    const absOld = Math.abs(currentQty);
    const absAdd = Math.abs(signed);
    avg = (currentAvg * absOld + price * absAdd) / (absOld + absAdd);
  } else if (Math.sign(currentQty) !== Math.sign(newQty)) {
    avg = price;
  }

  const next: Position = { symbol, qty: newQty, avgPrice: avg };
  if (existing) {
    portfolio.positions = portfolio.positions.map((p) => (p.symbol === symbol ? next : p));
  } else {
    portfolio.positions = [...portfolio.positions, next];
  }
}

function closingQuantity(currentQty: number, signedDelta: number): number {
  if (currentQty === 0) return 0;
  if (Math.sign(currentQty) === Math.sign(signedDelta)) return 0;
  return Math.min(Math.abs(currentQty), Math.abs(signedDelta));
}

function limitCrosses(order: Order, quote: Quote): boolean {
  if (!order.limitPrice) return false;
  if (order.side === "buy") return quote.ask <= order.limitPrice;
  return quote.bid >= order.limitPrice;
}

function stopHits(order: Order, quote: Quote): boolean {
  if (!order.limitPrice) return false;
  if (order.side === "sell") return quote.bid <= order.limitPrice;
  return quote.ask >= order.limitPrice;
}

function takeHits(order: Order, quote: Quote): boolean {
  return limitCrosses(order, quote);
}

function baseOrder(draft: OrderDraft, ctx: SubmitContext): Order {
  return {
    ...draft,
    id: uid("ord"),
    createdAt: ctx.now,
    status: "pending",
    cognitiveSnapshot: ctx.cognitive,
    quality: ctx.quality,
    confirmationSteps: ctx.confirmationSteps,
    role: "primary",
  };
}

function appendOrder(state: TradingState, order: Order): TradingState {
  return { ...state, orders: [order, ...state.orders].slice(0, 400) };
}

function upsertOrder(state: TradingState, order: Order, appendIfNew: boolean): TradingState {
  const exists = state.orders.some((o) => o.id === order.id);
  if (exists) {
    return { ...state, orders: state.orders.map((o) => (o.id === order.id ? order : o)) };
  }
  if (appendIfNew) return appendOrder(state, order);
  return { ...state, orders: [order, ...state.orders] };
}

function clonePortfolio(p: Portfolio): Portfolio {
  return {
    cash: p.cash,
    startingCash: p.startingCash,
    realizedPnl: p.realizedPnl,
    positions: p.positions.map((x) => ({ ...x })),
  };
}

/** Used by heuristics — mark of a fill after some time. */
export function fillMarkPnl(side: "buy" | "sell", fillPrice: number, qty: number, mark: number): number {
  const dir = side === "buy" ? 1 : -1;
  return (mark - fillPrice) * qty * dir;
}
