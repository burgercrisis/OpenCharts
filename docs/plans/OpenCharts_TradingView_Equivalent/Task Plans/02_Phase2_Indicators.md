# Phase 2: Additional Indicators

## Overview
Expand indicator set from 9 to 20+ and enhance PineScript support.

## Steps

### 2.1 New Indicators
1. Add `obv()` function to `indicators.ts` + registry entry
2. Add `williamsR()` function to `indicators.ts` + registry entry
3. Add `momentum()` function to `indicators.ts` + registry entry
4. Add `aroon()` function to `indicators.ts` + registry entry
5. Add `cci()` function to `indicators.ts` + registry entry
6. Add `adx()` function to `indicators.ts` + registry entry
7. Add `ichimoku()` function to `indicators.ts` + registry entry
8. Add `parabolicSar()` function to `indicators.ts` + registry entry
9. Add `pivotPoints()` function to `indicators.ts` + registry entry
10. Add `fibonacciRetracement()` function to `indicators.ts` + registry entry
11. Add `switch` cases for each in `useIndicators.ts`
12. Test: each indicator computes correctly with known input/output pairs

### 2.2 PineScript Enhancements
13. Fix `useIndicators.ts` PINESCRIPT case to iterate over all `result.plots`
14. Add marker rendering from `result.markers`
15. Add hline rendering from `result.hlines`
16. Test: PineScript script with multiple plots renders all correctly

### 2.3 Strategy Backtesting
17. Create `src/lib/pinescript/strategy-engine.ts`
18. Add `StrategyResult`, `StrategyTrade` types to `pinescript/types.ts`
19. Create `StrategyResultsPanel.tsx` component
20. Add "Strategies" tab to right panel in `TradingPage.tsx`
21. Test: PineScript strategy script produces entry/exit signals and P&L

### 2.4 Volume Profile Plugin
22. Create `src/lib/chart-plugins/volume-profile/volume-profile.ts`
23. Register in `PLUGIN_FACTORIES` in `ChartPanel.tsx`
24. Test: volume profile renders correctly as horizontal histogram

## Verification
- `npm run typecheck` passes
- `npm test` — unit tests for all new indicator functions
- `npm run dev` — manual verification of all indicators and PineScript
