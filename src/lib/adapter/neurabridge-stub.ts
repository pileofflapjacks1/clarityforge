/**
 * Neurabridge-compatible cognitive / intent adapter stub.
 *
 * Documents the expected API shape for a later soft integration with
 * NeuralBridge / NeuraShell. Does not require those packages at runtime.
 *
 * Suite intent vocabulary (preferred):
 *   velocity_2d | class_label | switch_binary | synthetic
 *
 * ClarityForge additionally expects an optional cognitive-state frame
 * so Decision Quality can run on decoded features instead of the mock
 * generator.
 *
 * FUTURE BCI: wire BroadcastChannel / WS here, then call
 * `useForgeStore.getState().ingestCognitive(frame)` from the adapter.
 */

import type { CognitiveState } from "@/lib/types";
import { clamp } from "@/lib/utils";

export type SuiteIntentEvent =
  | { type: "velocity_2d"; vx: number; vy: number; t: number }
  | { type: "class_label"; label: string; confidence: number; t: number }
  | { type: "switch_binary"; index: number; active: boolean; t: number }
  | { type: "synthetic"; name: string; t: number };

/** Optional decoded cognitive frame from a future NeuralBridge plugin. */
export interface CognitiveFrame {
  t: number;
  engagement?: number;
  fatigue?: number;
  arousal?: number;
  confidence?: number;
  /** Alternate names some decoders use. */
  focus?: number;
  stress?: number;
}

export interface CognitiveAdapter {
  readonly id: string;
  readonly description: string;
  start(onFrame: (state: CognitiveState) => void): void;
  stop(): void;
}

export function frameToCognitive(frame: CognitiveFrame, fallback: CognitiveState): CognitiveState {
  const engagement = clamp(frame.engagement ?? frame.focus ?? fallback.engagement, 0, 100);
  const fatigue = clamp(frame.fatigue ?? fallback.fatigue, 0, 100);
  const arousal = clamp(frame.arousal ?? frame.stress ?? fallback.arousal, 0, 100);
  const confidence = clamp(frame.confidence ?? fallback.confidence, 0, 100);
  return {
    t: frame.t || Date.now(),
    engagement,
    fatigue,
    arousal,
    confidence,
    anomalyScore: fallback.anomalyScore,
  };
}

/**
 * Map discrete suite intents onto order-construction affordances.
 * MVP does not actuate these — it only documents the mapping.
 */
export function suiteEventToOrderHint(ev: SuiteIntentEvent): string {
  switch (ev.type) {
    case "velocity_2d":
      return "Map vx → quantity / price slider; vy reserved.";
    case "class_label":
      return `Map class "${ev.label}" → side / type / confirm.`;
    case "switch_binary":
      return ev.active ? "Binary switch → advance confirmation step." : "Switch idle.";
    case "synthetic":
      return `Synthetic marker: ${ev.name}`;
  }
}

export function createNeurabridgeStubAdapter(): CognitiveAdapter {
  return {
    id: "neurabridge-stub",
    description:
      "Placeholder for NeuralBridge WS / BroadcastChannel. Deliver CognitiveFrame objects and call frameToCognitive().",
    start() {
      /* no-op in MVP — SyntheticCognitiveGenerator owns the live demo */
    },
    stop() {
      /* no-op */
    },
  };
}

export const NEURABRIDGE_WS_CONTRACT = {
  inbound_cognitive: [
    '{ "type": "cognitive", "engagement": 72, "fatigue": 20, "arousal": 40, "confidence": 65, "t": 1710000000000 }',
  ],
  inbound_intent: [
    '{ "type": "velocity_2d", "vx": 0.1, "vy": -0.2, "t": 1710000000000 }',
    '{ "type": "class_label", "label": "confirm", "confidence": 0.9, "t": 1710000000000 }',
    '{ "type": "switch_binary", "index": 0, "active": true, "t": 1710000000000 }',
  ],
  outbound_safety: [
    '{ "type": "policy", "action": "freeze", "t": 1710000000000 }',
    '{ "type": "policy", "action": "require_confirm", "steps": 3, "t": 1710000000000 }',
  ],
} as const;
