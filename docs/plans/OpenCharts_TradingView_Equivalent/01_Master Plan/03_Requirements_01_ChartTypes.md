# Requirements: Chart Types

## R1: Standard Chart Type Switching

The user must be able to switch between candlestick, line, area, bar, and hollow candle chart types via a selector in the ChartToolbar.

### Acceptance Criteria
- Chart type selector is a segmented control between timeframe and indicators
- Switching chart types preserves zoom/pan state and drawings
- Volume series only renders for candlestick charts
- Chart type preference is persisted in localStorage via `useChartPreferences`
- All 5 standard types render correctly with proper color theming (up/down colors)

### Technical Requirements
- Use native `addLineSeries()`, `addAreaSeries()`, `addBarSeries()` for standard types
- Hollow candles use `addCandlestickSeries()` with transparent body colors
- `ChartPanel.tsx` extracts series creation into `createSeries(chart, chartType, colors)` function
- `chartType` is a prop on `ChartPanel` passed from `TradingPage`

## R2: Renko Charts

The user must be able to view Renko charts with configurable brick size.

### Acceptance Criteria
- Renko bricks form when price moves by `brickSize` from the last brick's close
- Multiple bricks can form per candle if the move exceeds `N * brickSize`
- Up bricks are green/cyan, down bricks are red/pink (matching theme)
- Brick size is configurable (default: auto-calculated from ATR)
- Renko bricks render with proper time-scale alignment

### Technical Requirements
- `transformToRenko(candles, brickSize)` returns `BrickData[]`
- `BrickData` has `{ time, price, size, direction }`
- Rendered via `addCustomSeries()` with `ICustomSeriesPaneView`
- `priceValueBuilder` returns `[bottomPrice, topPrice]` for auto-scaling
- Brick size can be absolute (price units) or percentage-based

## R3: Kagi Charts

The user must be able to view Kagi charts with configurable reversal amount.

### Acceptance Criteria
- Kagi line changes direction when price reverses by `reversalAmount`
- Shoulder segments connect reversal points horizontally
- Up segments are green, down segments are red
- Reversal amount is configurable (default: 2x ATR)

### Technical Requirements
- `transformToKagi(candles, reversalAmount)` returns `BrickData[]` with `isShoulder` and `shoulderPrice` fields
- Custom renderer draws vertical segments and horizontal shoulder connectors
- Time scale shows formation timestamps

## R4: Range Charts

The user must be able to view Range charts with configurable box size.

### Acceptance Criteria
- A new box forms when `high - low` exceeds `boxSize`
- Up boxes are green, down boxes are red
- Box size is configurable

### Technical Requirements
- `transformToRange(candles, boxSize)` returns `BrickData[]`
- Similar to Renko but triggers on bar range, not close-to-close movement

## R5: Point & Figure Charts

The user must be able to view Point & Figure charts with configurable box size and reversal amount.

### Acceptance Criteria
- X columns for up moves, O columns for down moves
- Reversal requires `reversalAmount` boxes
- Box size is configurable
- Classic P&F rendering with proper column alignment

### Technical Requirements
- `transformToPandF(candles, boxSize, reversalAmount)` returns `BrickData[]`
- Custom renderer draws X and O characters in grid pattern
- Most complex of the non-standard types; requires column-based layout

## R6: Chart Type Configuration

Each non-standard chart type has its own configuration dialog.

### Acceptance Criteria
- ChartSettingsDialog shows dynamic fields based on selected chart type
- Brick size, reversal amount, box size are configurable per type
- Configuration is persisted per symbol
