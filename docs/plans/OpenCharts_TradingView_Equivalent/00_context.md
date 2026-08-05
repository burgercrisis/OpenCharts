# OpenCharts → TradingView-Equivalent Platform

## Source of Truth

**Plan Name**: OpenCharts_TradingView_Equivalent
**Created**: 2026-08-05
**Status**: In Progress (planning phase)
**Last Updated**: 2026-08-05

## Project Overview

Transform OpenCharts from a candlestick-only paper-trading terminal into a full TradingView-equivalent platform with PineScript support, Solana network trading, all standard indicators, and non-standard chart types (Renko, Kagi, Range, Point & Figure).

## Current State

- **Chart engine**: lightweight-charts v4.2.0 (canvas), candlestick only
- **Indicators**: 9 (SMA, EMA, RSI, MACD, BOLL, ATR, STOCH, VWAP, PINESCRIPT)
- **PineScript**: Working via @heyphat/piner v0.11.1 (only renders first plot)
- **Trading**: Paper trading engine (in-browser)
- **Solana/Web3**: None
- **Chart types**: Candlestick only — no switching mechanism
- **UI**: TradingView-like layout (toolbar, right panel, bottom panel) — already well-structured

## Key Decisions

1. Use `addCustomSeries()` from lightweight-charts v4.2.0 for non-standard chart types (Renko, Kagi, Range, P&F) — integrates with chart coordinate system natively
2. Standard chart types (line, area, bar, hollow candles) use native lightweight-charts series types
3. Solana integration follows existing `api.ts`/`ws.ts` swap pattern — backend-agnostic
4. PineScript enhancements build on existing @heyphat/piner integration
5. All new code follows existing patterns (PluginBase for chart plugins, pure functions for indicators, Zustand for state)

## Checkpoint

- Plan created: 2026-08-05
- Exploration complete: 3 research agents + 3 design agents
- Plan documents written: 11 files across 4 directories
- Plan approved: pending user signoff

## Plan Documents

| Document | Path |
|----------|------|
| Source of Truth | `00_context.md` |
| Broad View | `01_Master Plan/00_Broad_View.md` |
| Checklist | `01_Master Plan/01_Checklist.md` |
| Tech Stack | `01_Master Plan/02_Techstack.md` |
| Chart Type Requirements | `01_Master Plan/03_Requirements_01_ChartTypes.md` |
| Indicator Requirements | `01_Master Plan/03_Requirements_02_Indicators.md` |
| Solana Requirements | `01_Master Plan/03_Requirements_03_Solana.md` |
| UX Requirements | `01_Master Plan/03_Requirements_04_UX.md` |
| Master Codemap | `01_Master Plan/10_Master_Codemap.mmd` |
| Unit Codemap (Chart+Indicators) | `01_Master Plan/11_Unit_Codemap_01_ChartAndIndicators.mmd` |
| Unit Codemap (Solana+PineScript) | `01_Master Plan/11_Unit_Codemap_02_SolanaAndPineScript.mmd` |
| Phase 1 Task Plan | `Task Plans/01_Phase1_ChartTypes.md` |
| Phase 2 Task Plan | `Task Plans/02_Phase2_Indicators.md` |
| Phase 3 Task Plan | `Task Plans/03_Phase3_Solana.md` |
| Phase 4 Task Plan | `Task Plans/04_Phase4_UX.md` |
| Phase 5 Task Plan | `Task Plans/05_Phase5_PineScript.md` |
| Master Log | `Reports/01_Master_Log.md` |
