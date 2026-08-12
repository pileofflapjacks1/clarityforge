# NeuraBeach listing copy (ClarityForge)

**Source of truth for catalog re-seed.** Keep in sync with NeuraBeach seed for collection `col-neura-suite` (e.g. `seed-proj-clarityforge` when added).

> **Host note:** Planned first deploy hostname is `clarityforge.vercel.app`. If Vercel assigns a different URL, replace it everywhere below + in `neurabeach-manifest.json` before re-seeding Beach. Do not invent a live URL before deploy.

| Field | Value |
|-------|--------|
| **Slug** | `clarityforge` |
| **Title** | ClarityForge |
| **Version** | `0.1.0` |
| **Category** | `research_utility` |
| **Featured** | yes |
| **Collection** | `col-neura-suite` |
| **Suite role** | `app` (BCI paper-trading companion) |
| **Depends on** | `[]` (optional soft Neurabridge later) |
| **License** | MIT |
| **GitHub** | https://github.com/pileofflapjacks1/clarityforge |
| **Live demo** | *(set after first deploy)* `/demo` |
| **Dashboard** | `/` |
| **A11y** | `/a11y` |
| **Disclaimer** | `/disclaimer` |
| **How it works** | `/how-it-works` |
| **Entrypoint** | same as live demo `/demo` |
| **Manifest** | `neurabeach-manifest.json` in repo root |
| **safety_class** | `computer_side` |
| **runtime** | `web` |
| **adapter_maturity** | `simulator_only` |
| **banned_claims** | `true` |
| **permissions** | `none` |
| **inputs** | `synthetic` |
| **outputs** | `ui_only`, `file_export` |
| **hardware** | `synthetic`, `generic_intent` |

---

## Short description (catalog card)

> Simulator-first BCI paper-trading companion: mock cognitive state, Decision Quality friction, intent-native orders, local heuristic memory. Not implant software. Not a medical device. Not a brokerage. Not affiliated with Neuralink.

---

## Screenshots (paths; prefix with the live host after deploy)

```
/screenshots/01-desk.svg
/screenshots/02-quality.svg
/screenshots/03-demo.svg
/screenshots/04-settings.svg
/screenshots/05-a11y.svg
/og.svg
```

| Asset | Content |
|-------|---------|
| `01-desk` | Cognitive rail + paper tape + order construction |
| `02-quality` | Decision Quality + freeze |
| `03-demo` | `/demo` injection tour |
| `04-settings` | Thresholds + local export |
| `05-a11y` | Accessibility scorecard |
| `og.svg` | Open Graph / social card |

Suite one-pager: [`docs/WHAT-IS-CLARITYFORGE.md`](./docs/WHAT-IS-CLARITYFORGE.md)

---

## Safety blurb (required)

Computer-side web app only. Not implant software. Not a medical device (not SaMD). Not a brokerage. Not financial advice. Not affiliated with Neuralink or any implant vendor. Consumes **synthetic cognitive channels** only in the MVP — never private implant APIs. Paper market only. Local session export only; no cloud neural data. Persistent disclaimer banner + full `/disclaimer` page. `banned_claims: true`.

---

## Safety gate (upload checklist)

- [x] Computer-side / simulation / research only
- [x] Not implant firmware
- [x] Not a medical device / SaMD
- [x] Not affiliated with Neuralink
- [x] No real implant connect API claimed
- [x] No live brokerage
- [x] Simulator Mode badge + non-dismissible disclaimer
