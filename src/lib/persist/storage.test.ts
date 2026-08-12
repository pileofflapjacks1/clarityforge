import { describe, expect, it } from "vitest";
import { parseImport } from "./storage";

const valid = {
  settings: { theme: "dark" },
  trading: {
    portfolio: {
      cash: 90_000,
      startingCash: 100_000,
      realizedPnl: 12.5,
      positions: [],
    },
    orders: [],
    fills: [],
  },
  decisions: [],
  log: [],
};

describe("parseImport", () => {
  it("accepts a well-formed session", () => {
    const parsed = parseImport(JSON.stringify(valid));
    expect(parsed).not.toBeNull();
    expect(parsed?.trading.portfolio.cash).toBe(90_000);
  });

  it("rejects a thin object that would crash the desk", () => {
    expect(parseImport(JSON.stringify({ settings: {}, trading: {} }))).toBeNull();
    expect(parseImport("{}")).toBeNull();
    expect(parseImport("not json")).toBeNull();
  });

  it("rejects a portfolio missing numeric cash", () => {
    const bad = {
      ...valid,
      trading: {
        ...valid.trading,
        portfolio: { startingCash: 100_000, realizedPnl: 0, positions: [] },
      },
    };
    expect(parseImport(JSON.stringify(bad))).toBeNull();
  });
});
