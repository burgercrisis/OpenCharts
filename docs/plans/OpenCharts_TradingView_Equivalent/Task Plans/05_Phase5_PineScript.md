# Phase 5: PineScript Enhancements

## Overview
Enhance the existing PineScript editor and add strategy backtesting capabilities.

## Steps

### 5.1 Editor Improvements
1. Add syntax highlighting to `PineScriptEditor.tsx` (regex-based keyword overlay)
2. Add autocomplete dropdown (built-in functions, inputs, plots, strategies)
3. Create `src/lib/pinescript/templates/` with built-in examples:
   - `sma-crossover.ts` — SMA crossover strategy
   - `rsi-overbought.ts` — RSI overbought/oversold signals
   - `macd-signal.ts` — MACD signal line crossover
4. Test: syntax highlighting renders correctly, autocomplete works, templates load

### 5.2 Strategy Backtesting UI
5. Create `StrategyResultsPanel.tsx` — trade list, P&L, win rate, equity curve
6. Add "Strategies" tab to right panel in `TradingPage.tsx`
7. Wire strategy results from `strategy-engine.ts` to the panel
8. Test: PineScript strategy script shows results in the panel

## Verification
- `npm run typecheck` passes
- `npm run dev` — manual verification of editor improvements and strategy results
