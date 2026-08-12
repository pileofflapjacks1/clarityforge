import { describe, expect, it } from "vitest";
import { SyntheticCognitiveGenerator } from "./generator";

describe("SyntheticCognitiveGenerator", () => {
  it("keeps all channels in 0–100", () => {
    const gen = new SyntheticCognitiveGenerator({ seed: 7 });
    let t = 1_700_000_000_000;
    for (let i = 0; i < 200; i++) {
      t += 250;
      const s = gen.next(t);
      for (const key of ["engagement", "fatigue", "arousal", "confidence", "anomalyScore"] as const) {
        expect(s[key]).toBeGreaterThanOrEqual(0);
        expect(s[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("moves toward a fatigue injection", () => {
    const t0 = 1_700_000_000_000;
    const gen = new SyntheticCognitiveGenerator({ seed: 3, injection: "fatigue" }, t0);
    let t = t0;
    let last = gen.getState();
    for (let i = 0; i < 40; i++) {
      t += 250;
      last = gen.next(t);
    }
    expect(last.fatigue).toBeGreaterThan(50);
  });

  it("honors a manual override", () => {
    const gen = new SyntheticCognitiveGenerator({ seed: 1 });
    gen.setOverride("engagement", 91);
    const s = gen.next(1_700_000_000_250);
    expect(s.engagement).toBeGreaterThan(80);
  });

  it("does not peg fatigue after a 10 minute sitting", () => {
    const t0 = 1_700_000_000_000;
    const gen = new SyntheticCognitiveGenerator({ seed: 11 }, t0);
    let last = gen.getState();
    const end = t0 + 10 * 60 * 1000;
    for (let t = t0 + 250; t <= end; t += 1000) {
      last = gen.next(t);
    }
    expect(last.fatigue).toBeLessThan(70);
    expect(last.fatigue).toBeGreaterThan(20);
  });

  it("impulse can create an anomaly spike", () => {
    const t0 = 1_700_000_000_000;
    const gen = new SyntheticCognitiveGenerator({ seed: 9 }, t0);
    gen.next(t0, { anomalyDelta: 20 });
    gen.impulse("arousal", 70);
    const s = gen.next(t0 + 250, { anomalyDelta: 20 });
    expect(s.anomalyScore).toBeGreaterThan(30);
  });
});
