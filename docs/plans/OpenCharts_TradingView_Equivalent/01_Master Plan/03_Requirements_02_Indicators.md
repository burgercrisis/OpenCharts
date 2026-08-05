# Requirements: Indicators

## R7: Additional Technical Indicators

Add 10+ new indicators to reach parity with TradingView's core indicator set.

### Acceptance Criteria
- All new indicators compute correctly from OHLCV data
- Indicators appear in the indicator toggle menu (driven by `INDICATOR_REGISTRY`)
- Each indicator renders correctly on the chart (line or histogram series)
- Oscillators render in separate below-chart panes (RSI, MACD, STOCH style)
- Overlay indicators render on the main price scale
- Indicator parameters are configurable via `defaultParams` in registry

### Required Indicators

| Indicator | Type | Pane | Params |
|-----------|------|------|--------|
| OBV | volume | below | — |
| Williams %R | oscillator | below | period: 14 |
| Momentum / ROC | momentum | below | period: 10 |
| Aroon Oscillator | trend | below | period: 14 |
| CCI | oscillator | below | period: 20 |
| ADX | trend | below | period: 14 |
| Ichimoku Cloud | overlay | overlay | tenkan: 9, kijun: 26, senkou: 52 |
| Parabolic SAR | overlay | overlay | acceleration: 0.02, maximum: 0.2 |
| Pivot Points (Standard) | overlay | overlay | — |
| Fibonacci Retracement (auto) | overlay | overlay | — |

### Technical Requirements
- Each indicator is a pure function in `src/lib/indicators.ts`
- Returns `IndicatorPoint[]` or a custom result interface (like `MACDResult`)
- Registered in `INDICATOR_REGISTRY` with `type`, `label`, `pane`, `defaultParams`, `color`
- `useIndicators.ts` has a `switch` case for each new type
- Ichimoku Cloud uses `addAreaSeries()` for the Senkou Span A/B cloud fill
- Volume Profile uses the `PluginBase` pattern (custom `ISeriesPrimitive`)

## R8: PineScript Multi-Plot Support

PineScript indicators must render all plots, not just the first.

### Acceptance Criteria
- All plots from `result.plots[]` are rendered on the chart
- Each plot gets a distinct color from a predefined palette
- Markers from `result.markers` are rendered as chart markers
- PineScript candles (if any) are rendered as custom candle series
- Horizontal lines from `result.hlines` are rendered as price lines

### Technical Requirements
- Modify `useIndicators.ts` PINESCRIPT case to iterate over all plots
- Assign colors cyclically from `["#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a855f7"]`
- Render markers using `series.setMarkers()` from lightweight-charts
- Render hlines using `chart.addLineSeries()` or price lines on the candle series

## R9: PineScript Strategy Backtesting

PineScript strategies must produce entry/exit signals and backtest results.

### Acceptance Criteria
- Strategy scripts produce `strategy.entry`/`strategy.exit` signals
- Entry/exit markers are rendered on the chart
- A strategy results panel shows trade list, P&L, win rate, max drawdown
- Equity curve is rendered in a separate pane

### Technical Requirements
- New `strategy-engine.ts` wraps `@heyphat/piner` for strategy execution
- `StrategyResult` type includes `trades`, `totalPnl`, `winRate`, `equityCurve`, `signals`
- `StrategyResultsPanel.tsx` displays results in a table + chart
- Strategy signals rendered as chart markers (entry=green arrow, exit=red arrow)
