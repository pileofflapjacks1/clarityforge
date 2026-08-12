/**
 * Mock neural-state engine.
 *
 * Continuously synthesizes Engagement, Fatigue, Arousal, and Calibrated
 * Confidence. Used so the rest of ClarityForge can be built and demoed
 * without hardware.
 *
 * FUTURE BCI INTEGRATION
 * ----------------------
 * Replace `SyntheticCognitiveGenerator.next()` with decoded features
 * from a real stream:
 *   - NeuralBridge WS / BroadcastChannel (see `src/lib/adapter/neurabridge-stub.ts`)
 *   - Headset SDK → feature extractor → the four 0–100 channels
 * Keep `CognitiveState` stable so Decision Quality, safety gates, and
 * the heuristic layer do not need to change.
 *
 * Research simulation only. Not real neural data. Not a medical device.
 */

import type { CognitiveState, NeuralInjection, Thresholds } from "@/lib/types";
import { STARTING_COGNITIVE } from "@/lib/types";
import { clamp, ema, gaussian } from "@/lib/utils";

export type CognitiveChannel = "engagement" | "fatigue" | "arousal" | "confidence";

export interface GeneratorConfig {
  seed?: number;
  injection?: NeuralInjection;
  overrides?: Partial<Record<CognitiveChannel, number>>;
}

const CHANNELS: CognitiveChannel[] = ["engagement", "fatigue", "arousal", "confidence"];

const INJECTION_TARGETS: Record<
  Exclude<NeuralInjection, "none" | "anomaly">,
  Partial<Record<CognitiveChannel, number>>
> = {
  high_engagement: { engagement: 88, fatigue: 16, arousal: 42, confidence: 70 },
  fatigue: { engagement: 38, fatigue: 84, arousal: 30, confidence: 44 },
  stress: { engagement: 55, fatigue: 40, arousal: 88, confidence: 48 },
  calm: { engagement: 52, fatigue: 28, arousal: 12, confidence: 50 },
  overconfident: { engagement: 62, fatigue: 30, arousal: 55, confidence: 94 },
  underconfident: { engagement: 48, fatigue: 36, arousal: 50, confidence: 18 },
};

const RESTING: Record<CognitiveChannel, number> = {
  engagement: 68,
  fatigue: 22,
  arousal: 38,
  confidence: 62,
};

export class SyntheticCognitiveGenerator {
  private state: CognitiveState;
  private published: CognitiveState;
  private t0: number;
  private lastT: number;
  private injection: NeuralInjection;
  private overrides: Partial<Record<CognitiveChannel, number>>;
  private rand: () => number;
  private sessionMinutes = 0;

  constructor(config: GeneratorConfig = {}, now = Date.now()) {
    this.state = { ...STARTING_COGNITIVE, t: now };
    this.published = { ...this.state };
    this.t0 = now;
    this.lastT = now;
    this.injection = config.injection ?? "none";
    this.overrides = { ...(config.overrides ?? {}) };
    this.rand = config.seed != null ? seeded(config.seed) : Math.random;
  }

  setInjection(injection: NeuralInjection): void {
    this.injection = injection;
  }

  getInjection(): NeuralInjection {
    return this.injection;
  }

  /** Pin a channel for testing. Pass `null` to release. */
  setOverride(channel: CognitiveChannel, value: number | null): void {
    if (value == null) {
      delete this.overrides[channel];
      return;
    }
    this.overrides[channel] = clamp(value, 0, 100);
  }

  getOverrides(): Partial<Record<CognitiveChannel, number>> {
    return { ...this.overrides };
  }

  /** Instant impulse — useful for anomaly / “inject state” tests. */
  impulse(channel: CognitiveChannel, delta: number): void {
    this.state[channel] = clamp(this.state[channel] + delta, 0, 100);
  }

  getState(): CognitiveState {
    return this.state;
  }

  reset(now = Date.now()): CognitiveState {
    this.t0 = now;
    this.lastT = now;
    this.sessionMinutes = 0;
    this.state = { ...STARTING_COGNITIVE, t: now };
    this.published = { ...this.state };
    return this.state;
  }

  /**
   * Advance the generator to `now` and return the new state.
   * Call from the app tick (default 4 Hz).
   */
  next(now = Date.now(), thresholds?: Pick<Thresholds, "anomalyDelta">): CognitiveState {
    const dt = Math.min(2, Math.max(0.05, (now - this.lastT) / 1000));
    this.lastT = now;
    this.sessionMinutes = Math.max(0, (now - this.t0) / 60000);

    const prev = { ...this.published };
    const targets = this.effectiveTargets();

    let engagement = stepOu(this.state.engagement, targets.engagement, 0.55, 5.5, dt, this.rand);
    let fatigue = stepOu(this.state.fatigue, targets.fatigue, 0.22, 3.2, dt, this.rand);
    let arousal = stepOu(this.state.arousal, targets.arousal, 0.45, 6.4, dt, this.rand);
    let confidence = stepOu(this.state.confidence, targets.confidence, 0.4, 5.2, dt, this.rand);

    if (fatigue > 55) {
      engagement = clamp(engagement - (fatigue - 55) * 0.01 * dt, 0, 100);
    }

    if (this.injection === "anomaly") {
      engagement = clamp(engagement + (this.rand() - 0.5) * 70, 0, 100);
      arousal = clamp(arousal + (this.rand() - 0.5) * 80, 0, 100);
      confidence = clamp(this.rand() * 100, 0, 100);
      fatigue = clamp(fatigue + (this.rand() - 0.4) * 25, 0, 100);
    }

    engagement = applyOverride(engagement, this.overrides.engagement);
    fatigue = applyOverride(fatigue, this.overrides.fatigue);
    arousal = applyOverride(arousal, this.overrides.arousal);
    confidence = applyOverride(confidence, this.overrides.confidence);

    const delta = Math.max(
      Math.abs(engagement - prev.engagement),
      Math.abs(fatigue - prev.fatigue),
      Math.abs(arousal - prev.arousal),
      Math.abs(confidence - prev.confidence),
    );
    const cutoff = thresholds?.anomalyDelta ?? 32;
    const spike = delta >= cutoff ? delta : 0;
    const anomalyScore = clamp(
      ema(prev.anomalyScore, spike > 0 ? Math.min(100, spike * 2.2) : 8, 0.35),
      0,
      100,
    );

    this.state = {
      t: now,
      engagement: clamp(engagement, 0, 100),
      fatigue: clamp(fatigue, 0, 100),
      arousal: clamp(arousal, 0, 100),
      confidence: clamp(confidence, 0, 100),
      anomalyScore,
    };
    this.published = { ...this.state };
    return this.state;
  }

  private effectiveTargets(): Record<CognitiveChannel, number> {
    const inj = this.injection;
    const extra = inj !== "none" && inj !== "anomaly" ? INJECTION_TARGETS[inj] : {};
    return {
      engagement: extra.engagement ?? RESTING.engagement,
      // Drift the resting target, not the per-tick increment — otherwise
      // dF/dt ∝ minutes and fatigue pegs Caution in a few minutes.
      fatigue: extra.fatigue ?? clamp(RESTING.fatigue + this.sessionMinutes * 1.5, 0, 85),
      arousal: extra.arousal ?? RESTING.arousal,
      confidence: extra.confidence ?? RESTING.confidence,
    };
  }
}

function applyOverride(generated: number, override: number | undefined): number {
  if (override == null) return generated;
  return generated * 0.15 + override * 0.85;
}

function stepOu(
  current: number,
  mu: number,
  theta: number,
  sigma: number,
  dt: number,
  rand: () => number,
): number {
  const z = gaussian(rand);
  return current + theta * (mu - current) * dt + sigma * Math.sqrt(dt) * z;
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function injectionTargets(
  injection: NeuralInjection,
): Partial<Record<CognitiveChannel, number>> {
  if (injection === "none" || injection === "anomaly") return {};
  return INJECTION_TARGETS[injection];
}

export function listChannels(): CognitiveChannel[] {
  return [...CHANNELS];
}
