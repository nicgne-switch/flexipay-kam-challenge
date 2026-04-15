# FlexiPay × Yuno — KAM Account Strategy Package

**Interactive dashboard + presentation deck for the Yuno KAM challenge.**

## 📊 Live links

- **Dashboard:** https://nicgne-switch.github.io/flexipay-kam-challenge/
- **Presentation deck:** https://nicgne-switch.github.io/flexipay-kam-challenge/slides.html

## What's in this repo

A complete Account Strategy Package delivered as an interactive web dashboard, with four sections:

1. **Account Health & QBR Narrative** — 6-month TPV trajectory, approval-rate gap analysis, three strategic insights.
2. **Brazil + Argentina Expansion Model** — 3 scenarios (Conservative / Base / Aggressive) with interactive scenario switching.
3. **Retention & Competitive Response** — point-by-point counter to dLocal's proposal, switching-cost waterfall, 30-day action plan.
4. **Internal Memo to Yuno VP** — honest risk, resource asks, 90-day plan.

Plus two AI-assisted decision-support modules:

- **QBR Script Generator** — pick a stakeholder, get a tailored script.
- **Dynamic Plan B Generator** — pick a failure mode, get probability, analysis, and response plan.

## Structure

```
flexipay-kam-challenge/
├── index.html          # Main dashboard
├── slides.html         # reveal.js presentation deck
├── data/
│   └── model.json      # Single source of truth — all numbers live here
├── assets/
│   ├── style.css
│   └── app.js          # Chart.js + interactive AI modules
└── README.md
```

## Methodology note

Every number in the dashboard, the slides, and the narrative document traces back to a **single financial model** in `data/model.json`. That model was built in Python once and verified for cross-section consistency (dLocal savings, switching costs, expansion revenue, Yuno ARR, approval-rate upside). This is what "AI orchestration" means in practice: build the source of truth once, let every surface draw from it.

The AI modules (QBR scripts, Plan B scenarios) are **pre-computed and served as JSON** — deterministic, offline-capable, and reviewable. No live LLM calls during the demo, which means the modules work even without an API key and can't fail mid-presentation.

## Prepared by

Nicolas · KAM, FlexiPay Account · April 15, 2026
