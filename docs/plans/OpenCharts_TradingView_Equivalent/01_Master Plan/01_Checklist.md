# Checklist

## Phase 1: Chart Type Switching

- [ ] Add `ChartType` union type and `CHART_TYPE_CONFIG` to `constants.ts`
- [ ] Create `chart-types/` directory with shared types (`types.ts`)
- [ ] Implement `transformToRenko()` in `chart-types/renko.ts`
- [ ] Implement `transformToKagi()` in `chart-types/kagi.ts`
- [ ] Implement `transformToRange()` in `chart-types/range.ts`
- [ ] Implement `transformToPandF()` in `chart-types/pandf.ts`
- [ ] Create `useChartTypeData.ts` hook
- [ ] Create `CustomSeriesRenderer.tsx` (ICustomSeriesPaneView + ICustomSeriesPaneRenderer)
- [ ] Modify `ChartPanel.tsx` for chart type switching and custom series creation
- [ ] Modify `ChartToolbar.tsx` for chart type selector dropdown
- [ ] Modify `ChartSettingsDialog.tsx` for per-type config (brick size, reversal amount)
- [ ] Modify `TradingPage.tsx` to thread `chartType` state
- [ ] Modify `useChartPreferences.ts` to persist `chartType` preference
- [ ] Volume series only created for candlestick charts
- [ ] TypeScript compilation passes
- [ ] Manual verification of all chart types

## Phase 2: Additional Indicators

- [ ] Add OBV indicator function + registry entry + useIndicators case
- [ ] Add Williams %R indicator function + registry entry + useIndicators case
- [ ] Add Momentum/ROC indicator function + registry entry + useIndicators case
- [ ] Add Aroon Oscillator indicator function + registry entry + useIndicators case
- [ ] Add CCI indicator function + registry entry + useIndicators case
- [ ] Add ADX (+DI/-DI) indicator function + registry entry + useIndicators case
- [ ] Add Ichimoku Cloud indicator function + registry entry + useIndicators case
- [ ] Add Parabolic SAR indicator function + registry entry + useIndicators case
- [ ] Add Pivot Points indicator function + registry entry + useIndicators case
- [ ] Add Fibonacci Retracement (auto-levels) indicator + registry entry + useIndicators case
- [ ] Fix PineScript multi-plot rendering in `useIndicators.ts`
- [ ] Create `strategy-engine.ts` for PineScript strategy backtesting
- [ ] Add `StrategyResult` types to `pinescript/types.ts`
- [ ] Create `VolumeProfilePlugin` in `chart-plugins/volume-profile/`
- [ ] Register volume profile in `PLUGIN_FACTORIES`
- [ ] TypeScript compilation passes
- [ ] Unit tests for all new indicator functions

## Phase 3: Solana Trading Integration

- [ ] Add Solana packages to `package.json` and install
- [ ] Create `src/services/solana/types.ts`
- [ ] Create `src/services/solana/connection.ts`
- [ ] Create `src/services/solana/wallet.ts` (useSolanaWallet hook + SolanaProvider)
- [ ] Create `src/services/solana/jupiter.ts` (JupiterAggregator)
- [ ] Create `src/services/solana/tokens.ts`
- [ ] Create `src/services/solana/utils.ts`
- [ ] Modify `src/services/store.tsx` — add `solanaWallet` slice
- [ ] Modify `src/services/api.ts` — extend Proxy for Solana methods
- [ ] Modify `src/services/ws.ts` — extend for Solana event channels
- [ ] Create `WalletConnectButton.tsx` component
- [ ] Create `SwapForm.tsx` component
- [ ] Create `SolanaBalance.tsx` component
- [ ] Create `SolanaConnectionStatus.tsx` component
- [ ] Modify `App.tsx` — add `SolanaProvider` wrapper
- [ ] Modify `OrderPanel.tsx` — Solana mode switching
- [ ] Security review (address validation, slippage, no private keys in client)
- [ ] TypeScript compilation passes
- [ ] Manual verification of wallet connection + swap flow

## Phase 4: TradingView-like UX Improvements

- [ ] Add keyboard shortcuts to `ChartPanel.tsx` (K, G, V, +/-, 0, Space, Esc)
- [ ] Add `layoutMode` and `panelVisibility` to `useChartPreferences.ts`
- [ ] Add fullscreen toggle to `ChartToolbar.tsx`
- [ ] Add panel toggle buttons to `ChartToolbar.tsx`
- [ ] Enhance `ChartContextMenu.tsx` with indicator/chart-type/zoom submenus
- [ ] Create `MultiChartLayout.tsx` for grid layout
- [ ] Add layout configuration to `ChartSettingsDialog.tsx`
- [ ] Add price alerts to `WatchlistPanel.tsx`
- [ ] TypeScript compilation passes
- [ ] Manual verification of all UX features

## Phase 5: PineScript Enhancements

- [ ] Add syntax highlighting to `PineScriptEditor.tsx`
- [ ] Add autocomplete dropdown to `PineScriptEditor.tsx`
- [ ] Create `src/lib/pinescript/templates/` with built-in examples
- [ ] Create `StrategyResultsPanel.tsx` for backtest results
- [ ] Add "Strategies" tab to right panel in `TradingPage.tsx`
- [ ] TypeScript compilation passes
- [ ] Manual verification of editor improvements and strategy results

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run dev` — all features work manually
- [ ] `npm test` — all unit tests pass
- [ ] Parent `QM_Interpretations/README.md` untouched (832 lines)
- [ ] No files in `_quarantine` (all PDFs remain on-topic)
