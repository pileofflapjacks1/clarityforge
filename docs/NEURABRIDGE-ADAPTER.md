# NeuralBridge adapter (stub)

ClarityForge does not depend on NeuralBridge at runtime.

Integration point:

1. Receive `CognitiveFrame` or suite intent events over WebSocket / BroadcastChannel.
2. Map with `frameToCognitive()` in `src/lib/adapter/neurabridge-stub.ts`.
3. Call `useForgeStore.getState().ingestCognitive(state)`.
4. Optionally map `velocity_2d` onto quantity / limit sliders and `switch_binary` onto confirm.

Keep `CognitiveState` field names stable so Decision Quality and heuristics do not change.

See `NEURABRIDGE_WS_CONTRACT` in the stub for message shapes.
