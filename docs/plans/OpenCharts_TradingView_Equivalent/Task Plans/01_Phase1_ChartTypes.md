# Phase 1: Chart Type Switching

## Overview
Add chart type switching (candlestick, line, area, bar, hollow candles) and non-standard chart types (Renko, Kagi, Range, Point & Figure) to OpenCharts.

## Steps

### 1.1 Standard Chart Types
1. Add `ChartType` union type and `CHART_TYPE_CONFIG` to `constants.ts`
2. Modify `ChartPanel.tsx` — extract `createSeries()` function with chart type switch
3. Modify `ChartToolbar.tsx` — add chart type selector dropdown
4. Modify `ChartSettingsDialog.tsx` — add chart type setting
5. Modify `TradingPage.tsx` — add `chartType` state, pass to ChartPanel
6. Modify `useChartPreferences.ts` — persist `chartType` preference
7. Test: switch between all 5 standard types, verify rendering and preferences

### 1.2 Non-Standard Chart Types
8. Create `src/pages/trading/chart-types/types.ts` — `BrickData`, `ChartTypeConfig` interfaces
9. Create `src/pages/trading/chart-types/renko.ts` — `transformToRenko(candles, brickSize)`
10. Create `src/pages/trading/chart-types/kagi.ts` — `transformToKagi(candles, reversalAmount)`
11. Create `src/pages/trading/chart-types/range.ts` — `transformToRange(candles, boxSize)`
12. Create `src/pages/trading/chart-types/pandf.ts` — `transformToPandF(candles, boxSize, reversalAmount)`
13. Create `src/pages/trading/chart-types/useChartTypeData.ts` — hook for data transformation
14. Create `src/pages/trading/chart-types/CustomSeriesRenderer.tsx` — `ICustomSeriesPaneView` + renderer
15. Modify `ChartPanel.tsx` — conditional `addCustomSeries()` for non-standard types
16. Modify `ChartSettingsDialog.tsx` — dynamic config fields per chart type
17. Test: Renko, Kagi, Range, P&F with various brick sizes and reversal amounts

### 1.3 Volume Series
18. Ensure volume series only renders for candlestick charts
19. Test: volume hidden for non-standard chart types

## Verification
- `npm run typecheck` passes
- `npm run dev` — manual verification of all chart types
- `npm test` — unit tests for transformer functions
