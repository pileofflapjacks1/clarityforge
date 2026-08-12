# ClarityForge

Simulator-first, computer-side **BCI trading companion**. It watches mock cognitive state, turns it into a single Decision Quality status, and lets you construct **paper** orders with intent-style controls. Designed so a real NeuralBridge stream can later replace the generator without rewriting the desk.

**Research / simulation only.** Not a medical device. Not implant software. Not a brokerage. Not financial advice. Not affiliated with Neuralink.

Part of the [Neura suite](https://neurabeach.com/collections/col-neura-suite).

## What it does

1. **Mock neural engine** — continuous Engagement, Fatigue, Arousal, Calibrated Confidence (0–100), plus anomaly detection and manual injection.
2. **Decision Quality** — High / Medium / Low / Caution. Low and Caution add confirmation steps and a short pause. Hard Freeze disables all order intent.
3. **Intent-native orders** — sliders and discrete confirms for symbol, side, quantity, market/limit, stop, take-profit, time-in-force. These map later to suite intents (`velocity_2d`, `class_label`, `switch_binary`).
4. **Paper book** — random-walk tape for AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, SPY, QQQ, BTC-USD, ETH-USD. Cash, positions, P&L, fills, reset.
5. **Heuristic memory** — remembers state-at-fill and gently notes when a new ticket diverges from your higher-quality paper history.
6. **Local-first privacy** — localStorage + IndexedDB. Export / import is explicit. Nothing is uploaded.

## Quick start

```bash
cd ~/Projects/clarityforge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test        # vitest — generator, quality, paper engine, heuristics
npm run build   # production build
npm run lint
```

## Architecture

```
Mock / future BCI adapter
        │
        ▼
 CognitiveState (engagement, fatigue, arousal, confidence, anomaly)
        │
        ▼
 Decision Quality ──► friction / freeze / confirm steps
        │
        ▼
 Intent order construction ──► paper matching engine
        │
        ▼
 Portfolio + fills ──► heuristic memory (local)
```

| Path | Role |
|------|------|
| `src/lib/neural/generator.ts` | Synthetic cognitive stream. **FUTURE BCI:** replace `next()`. |
| `src/lib/neural/decision-quality.ts` | Score, band, confirm steps. |
| `src/lib/neural/formulas.ts` | Human-readable formulas. |
| `src/lib/trading/` | Universe, random-walk tape, matching engine. |
| `src/lib/heuristics/memory.ts` | Personal pattern notes. |
| `src/lib/adapter/neurabridge-stub.ts` | Documented NeuralBridge contract (no-op). |
| `src/lib/persist/storage.ts` | localStorage + IndexedDB. |
| `src/lib/store.ts` | Zustand runtime (`ingestCognitive` is the live hook). |

## Keyboard

| Key | Action |
|-----|--------|
| `F` | Hard Freeze (when not typing) |
| `Esc` | Hard Freeze |
| Tab / arrows | Move through sliders and confirms |

## Safety stance

- Persistent disclaimer banner + `/disclaimer`.
- Simulator Mode badge always visible.
- Hard Freeze is immediate and local.
- No live broker, no implant SDK, no cloud neural store.
- `banned_claims: true` in the Beach manifest.

## Beach packaging

- `LISTING.md` — human re-seed copy
- `neurabeach-manifest.json` — machine source
- Live demo: [https://clarityforge-gamma.vercel.app/demo](https://clarityforge-gamma.vercel.app/demo)
- Dashboard: [https://clarityforge-gamma.vercel.app](https://clarityforge-gamma.vercel.app)

Re-seed NeuraBeach from `LISTING.md` + `neurabeach-manifest.json` when the host or version changes.

## License

MIT — see `LICENSE`.
