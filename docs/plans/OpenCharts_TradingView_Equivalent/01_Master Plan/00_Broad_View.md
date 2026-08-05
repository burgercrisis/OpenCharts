# Broad View: OpenCharts → TradingView-Equivalent Platform

## What

Transform OpenCharts into a TradingView-equivalent trading terminal with:
- All standard chart types (candlestick, line, area, bar, hollow candles)
- Non-standard chart types (Renko, Kagi, Range, Point & Figure)
- 20+ technical indicators
- PineScript v6 support with multi-plot rendering and strategy backtesting
- Solana blockchain trading (wallet connection, DEX swaps)
- TradingView-like UX (keyboard shortcuts, layouts, context menus)

## Why

OpenCharts already has a solid foundation (lightweight-charts, PineScript via @heyphat/piner, paper trading, TradingView-like UI layout). The gaps are:
1. No chart type switching — only candlestick
2. Limited indicators (9 vs TradingView's dozens)
3. No Solana/blockchain trading
4. PineScript only renders first plot
5. Missing TradingView UX features (shortcuts, layouts, multi-chart)

## Key Figures

| Role | Responsibility |
|------|---------------|
| Lead Engineer | Overall architecture, chart engine integration |
| Frontend Developer | UI components, TradingView-like UX |
| Blockchain Engineer | Solana wallet/DEX integration |
| QA | Type checking, manual verification, E2E tests |

## Technical Structure

### Frontend Stack (unchanged)
- React 19 + TypeScript + Vite 6
- lightweight-charts v4.2.0 (canvas)
- fancy-canvas 2 (custom plugin rendering)
- @heyphat/piner v0.11.1 (PineScript v6)
- Zustand + TanStack Query + Radix UI + Tailwind CSS

### New Dependencies
- `@solana/web3.js` — Solana blockchain interaction
- `@solana/wallet-adapter-react` + `react-ui` + `wallets` — Wallet connection
- `@jup-ag/api` — Jupiter DEX aggregator
- `@solana/spl-token` — SPL token operations

### Architecture Pattern
All new features follow the existing backend-agnostic pattern:
- `services/api.ts` Proxy → swap for real backend
- `services/ws.ts` WebSocket client → swap for real WS
- `services/store.tsx` Zustand → extend with new slices
- `lib/` pure functions → testable in isolation
- `components/` React → follow existing patterns

## Philosophical Profile

The platform should feel indistinguishable from TradingView to a user, while maintaining OpenCharts' existing strengths:
- Zero-backend simplicity (still deployable as static site)
- Paper trading as default mode
- Clean separation between UI and data layers
- Extensible plugin architecture for chart overlays

## Axes Matrix

| Axis | Current | Target |
|------|---------|--------|
| Chart Types | 1 (candlestick) | 8+ (candlestick, line, area, bar, hollow, renko, kagi, range, p&f) |
| Indicators | 9 | 20+ |
| PineScript | Basic (1 plot) | Full (multi-plot + strategies) |
| Trading | Paper only | Paper + Solana real |
| UX Features | Basic toolbar | Full TradingView parity |
| Blockchain | None | Solana mainnet-beta |

## Problem Handling

| Problem | Approach |
|---------|----------|
| lightweight-charts doesn't support Renko/Kagi natively | Use `addCustomSeries()` with custom `ISeriesPrimitive` renderer |
| Solana wallet connection in browser | `@solana/wallet-adapter-react` handles provider abstraction |
| PineScript multi-plot | Iterate `result.plots[]` instead of using only `[0]` |
| Strategy backtesting in browser | `@heyphat/piner` already supports strategy output; parse and display |
| Performance with many indicators | React Query caching + Zustand batching + memoized indicator computation |
