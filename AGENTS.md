# AGENTS.md — ClarityForge

You are working on **ClarityForge only** unless the user asks to edit another suite repo.

## Product

Computer-side **BCI paper-trading companion**: mock cognitive state, Decision Quality friction, intent-native order construction, local paper book.

**MVP:** 0.1.0 — synthetic neural engine, quality bands, paper market, heuristics, freeze, export.

Not implant software. Not medical. Not a brokerage. Not financial advice. Not Neuralink-affiliated.  
Not Guard (firewall). Not Shell (OS control). Not Beach (catalog). Not Binder (TCG).

## Suite role

| | |
|--|--|
| **Path** | `~/Projects/clarityforge` |
| **Beach** | `col-neura-suite` · `suite_role: app` |
| **Inputs** | `synthetic`, optional later `velocity_2d`, `class_label`, `switch_binary` |
| **Outputs** | `ui_only`, `file_export` |

## MVP boundaries

- Simulator-first: keyboard + synthetic always work without hardware.
- Paper trading only — no brokerage APIs.
- Estimation = transparent heuristics — document in `src/lib/neural/formulas.ts`.
- No implant SDKs, medical claims, live money, or monorepo merges without explicit ask.
- Soft Neurabridge adapter stub only (`src/lib/adapter/neurabridge-stub.ts`).

## Layout

```
src/app/           / /settings /history /how-it-works /disclaimer /demo /a11y
src/components/    desk, cognitive, trading, heuristics, ui
src/lib/neural/    generator, decision-quality, formulas
src/lib/trading/   symbols, market, engine
src/lib/heuristics memory
src/lib/adapter/   neurabridge stub
src/lib/persist/   localStorage + IndexedDB
public/screenshots/ Beach catalog SVGs + og.svg
LISTING.md         Beach re-seed copy
neurabeach-manifest.json
```

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## Commits

Author: Joe \<pileofflapjacks1@gmail.com\>

## Beach

Re-seed from `LISTING.md` + `neurabeach-manifest.json` when version or demo URL changes. Do not invent a live host until deploy.
