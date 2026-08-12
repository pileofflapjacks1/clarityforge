import { describe, expect, it } from "vitest";
import { STARTING_COGNITIVE } from "@/lib/types";
import { evaluateDecisionQuality } from "@/lib/neural/decision-quality";
import { createTradingState, fillMarkPnl, markToMarket, matchOpenOrders, submitOrder } from "./engine";

const quality = evaluateDecisionQuality({
  state: { ...STARTING_COGNITIVE, t: 1, engagement: 80, fatigue: 15, arousal: 35, confidence: 70 },
});

const quotes = {
  AAPL: {
    symbol: "AAPL",
    price: 200,
    bid: 199.95,
    ask: 200.05,
    volume: 1000,
    change: 0,
    changePct: 0,
    t: 1,
  },
};

function ctx(frozen = false) {
  return {
    now: 1_700_000_000_000,
    quotes,
    cognitive: { ...STARTING_COGNITIVE, t: 1 },
    quality,
    confirmationSteps: 1,
    frozen,
  };
}

describe("paper trading engine", () => {
  it("fills a market buy and reduces cash", () => {
    const state = createTradingState(10_000);
    const result = submitOrder(
      state,
      { symbol: "AAPL", side: "buy", qty: 10, type: "market", tif: "day" },
      ctx(),
    );
    expect(result.order.status).toBe("filled");
    expect(result.state.portfolio.cash).toBeLessThan(10_000);
    expect(result.state.portfolio.positions[0]?.qty).toBe(10);
    expect(result.state.fills).toHaveLength(1);
  });

  it("rejects a buy when cash is insufficient", () => {
    const state = createTradingState(50);
    const result = submitOrder(
      state,
      { symbol: "AAPL", side: "buy", qty: 10, type: "market", tif: "day" },
      ctx(),
    );
    expect(result.order.status).toBe("rejected");
    expect(result.state.portfolio.cash).toBe(50);
  });

  it("blocks orders when frozen", () => {
    const state = createTradingState(10_000);
    const result = submitOrder(
      state,
      { symbol: "AAPL", side: "buy", qty: 1, type: "market", tif: "day" },
      ctx(true),
    );
    expect(result.order.status).toBe("blocked");
  });

  it("realizes pnl when closing a long", () => {
    let state = createTradingState(10_000);
    const buy = submitOrder(
      state,
      { symbol: "AAPL", side: "buy", qty: 10, type: "market", tif: "day" },
      ctx(),
    );
    state = buy.state;
    const fillPx = buy.order.fillPrice ?? 200;
    const sellQuotes = {
      AAPL: { ...quotes.AAPL, price: fillPx + 5, bid: fillPx + 4.95, ask: fillPx + 5.05 },
    };
    const sell = submitOrder(
      state,
      { symbol: "AAPL", side: "sell", qty: 10, type: "market", tif: "day" },
      { ...ctx(), quotes: sellQuotes },
    );
    expect(sell.state.portfolio.positions).toHaveLength(0);
    expect(sell.state.portfolio.realizedPnl).toBeGreaterThan(0);
  });

  it("marks equity including open positions", () => {
    const state = createTradingState(10_000);
    const bought = submitOrder(
      state,
      { symbol: "AAPL", side: "buy", qty: 10, type: "market", tif: "day" },
      ctx(),
    );
    const equity = markToMarket(bought.state.portfolio, quotes);
    expect(equity).toBeGreaterThan(0);
    expect(equity).toBeLessThan(10_000 + 100);
  });

  it("computes directional mark pnl", () => {
    expect(fillMarkPnl("buy", 100, 2, 110)).toBe(20);
    expect(fillMarkPnl("sell", 100, 2, 90)).toBe(20);
    expect(fillMarkPnl("buy", 100, 2, 90)).toBe(-20);
  });

  it("cancels a non-marketable IOC instead of filling", () => {
    const result = submitOrder(
      createTradingState(10_000),
      { symbol: "AAPL", side: "buy", qty: 10, type: "limit", limitPrice: 190, tif: "ioc" },
      ctx(),
    );
    expect(result.order.status).toBe("cancelled");
    expect(result.state.fills).toHaveLength(0);
    expect(result.state.portfolio.cash).toBe(10_000);
  });

  it("fills a marketable buy limit at the ask, not the worse limit", () => {
    const result = submitOrder(
      createTradingState(10_000),
      { symbol: "AAPL", side: "buy", qty: 10, type: "limit", limitPrice: 210, tif: "day" },
      ctx(),
    );
    expect(result.order.status).toBe("filled");
    expect(result.order.fillPrice).toBe(quotes.AAPL.ask);
  });

  it("cancels the sibling bracket when take-profit fills", () => {
    const bought = submitOrder(
      createTradingState(10_000),
      {
        symbol: "AAPL",
        side: "buy",
        qty: 10,
        type: "market",
        tif: "day",
        stopLoss: 180,
        takeProfit: 220,
      },
      ctx(),
    );
    expect(bought.order.status).toBe("filled");
    const open = bought.state.orders.filter((o) => o.status === "open");
    expect(open.map((o) => o.role).sort()).toEqual(["stop_loss", "take_profit"]);

    const gap = {
      AAPL: { ...quotes.AAPL, price: 221, bid: 220.95, ask: 221.05 },
    };
    const after = matchOpenOrders(bought.state, gap, 1_700_000_001_000);
    const tp = after.orders.find((o) => o.role === "take_profit");
    const sl = after.orders.find((o) => o.role === "stop_loss");
    expect(tp?.status).toBe("filled");
    expect(sl?.status).toBe("cancelled");
    expect(after.portfolio.positions).toHaveLength(0);
  });
});
