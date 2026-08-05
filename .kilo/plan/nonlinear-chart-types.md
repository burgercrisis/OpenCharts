# Implementation Plan: Renko, Kagi, Range, and Point & Figure Chart Types

## 1. Architecture Overview

The existing chart system hardcodes `addCandlestickSeries()` in `ChartPanel.tsx`. We need to:
- Add a data transformation pipeline that converts OHLCV candles into chart-type-specific brick data
- Use `addCustomSeries()` (lightweight-charts v4.2.0) with a custom `ICustomSeriesPaneView`/`ICustomSeriesPaneRenderer` for rendering bricks
- Add chart type switching UI in `ChartToolbar` and `constants.ts`
- Add configuration controls for brick size, reversal amount, etc.

## 2. Key Design Decisions

### 2.1 Rendering Approach: `addCustomSeries()` with Canvas Renderer

**Why not Line/Area series simulation?**
- Line series can't render filled rectangles (Renko/Range/P&F bricks)
- Area series can't handle disconnected bricks (Kagi, P&F)
- Custom series gives full canvas control over brick drawing

**Why not a separate canvas overlay?**
- `addCustomSeries()` integrates with the chart's coordinate system (time scale, price scale)
- It handles zooming, panning, and crosshair natively
- It supports tooltips via the existing crosshair/mouse-move infrastructure

### 2.2 Custom Series Data Model

Each chart type produces an array of `BrickData` objects:

```typescript
interface BrickData {
  time: number;           // Unix seconds - brick formation timestamp
  price: number;          // Bottom price (for up bricks) or top price (for down bricks)
  size: number;           // Brick height (brickSize for Renko/Range, boxSize for P&F)
  direction: "up" | "down";
  // Kagi-specific
  isShoulder?: boolean;   // true for horizontal reversal connectors
  shoulderPrice?: number; // Price at which the shoulder connects
}
```

The `priceValueBuilder` returns `[price, price + size]` for up bricks and `[price - size, price]` for down bricks. This tells lightweight-charts the vertical extent of each brick for auto-scaling.

### 2.3 Chart Type Enum

Add to `constants.ts`:

```typescript
export type ChartType = "candlestick" | "renko" | "kagi" | "range" | "pandf";

export const CHART_TYPE_CONFIG: Record<ChartType, ChartTypeConfig> = {
  candlestick: { label: "Candlestick", icon: "candlestick", needsConfig: false },
  renko: { label: "Renko", icon: "brick", needsConfig: true, configLabel: "Brick Size", defaultConfig: 0.5 },
  kagi: { label: "Kagi", icon: "line", needsConfig: true, configLabel: "Reversal Amount", defaultConfig: 0.5 },
  range: { label: "Range", icon: "range", needsConfig: true, configLabel: "Brick Size", defaultConfig: 0.5 },
  pandf: { label: "P&F", icon: "grid", needsConfig: true, configLabel: "Box Size", defaultConfig: 0.5 },
};
```

## 3. File Structure

```
src/
  pages/trading/
    constants.ts                    # Add ChartType, ChartTypeConfig, CHART_TYPE_CONFIG
    ChartPanel.tsx                  # Modify: accept chartType prop, switch series type
    ChartToolbar.tsx                # Modify: add chart type selector dropdown
    ChartSettingsDialog.tsx         # Modify: add chart-type-specific config section
    chart-types/                    # NEW directory
      index.ts                      # Barrel export
      types.ts                      # Shared types (BrickData, ChartTypeConfig, etc.)
      renko.ts                      # transformToRenko() + RenkoRenderer
      kagi.ts                       # transformToKagi() + KagiRenderer
      range.ts                      # transformToRange() + RangeRenderer
      pandf.ts                      # transformToPandF() + PandFRenderer
      useChartTypeData.ts           # Hook: transforms Candle[] → BrickData[] based on chartType
      CustomSeriesRenderer.tsx      # ICustomSeriesPaneView + ICustomSeriesPaneRenderer impl
```

## 4. Data Transformation Pipeline

### 4.1 `useChartTypeData` Hook

Location: `src/pages/trading/chart-types/useChartTypeData.ts`

```typescript
interface UseChartTypeDataResult {
  brickData: BrickData[];
  priceFormat: { type: "price"; precision: number; minMove: number };
}

function useChartTypeData(
  candles: Candle[],
  chartType: ChartType,
  pipDigits: number,
  config: { brickSize?: number; reversalAmount?: number; boxSize?: number },
): UseChartTypeDataResult
```

This hook:
1. Sorts and deduplicates candles (reuse existing `useChartData` logic)
2. Calls the appropriate transformer based on `chartType`
3. Returns `BrickData[]` and price format config

### 4.2 Transformer Functions

#### Renko Transformer (`renko.ts`)

Algorithm:
1. Sort candles by time ascending
2. Initialize `lastBrickClose = candles[0].close`
3. For each candle, calculate `delta = (candle.close - lastBrickClose) / brickSize`
4. If `delta >= 1`: create upward brick(s) — increment `lastBrickClose += brickSize` for each full brick
5. If `delta <= -1`: create downward brick(s) — decrement `lastBrickClose -= brickSize` for each full brick
6. Each brick gets the timestamp of the candle that caused it

```typescript
export function transformToRenko(
  candles: Candle[],
  brickSize: number,
): BrickData[] {
  if (candles.length === 0 || brickSize <= 0) return [];
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const bricks: BrickData[] = [];
  let lastBrickClose = sorted[0]!.close;

  for (const candle of sorted) {
    const delta = (candle.close - lastBrickClose) / brickSize;
    if (delta >= 1) {
      const count = Math.floor(delta);
      for (let i = 0; i < count; i++) {
        lastBrickClose += brickSize;
        bricks.push({ time: candle.time, price: lastBrickClose - brickSize, size: brickSize, direction: "up" });
      }
    } else if (delta <= -1) {
      const count = Math.floor(Math.abs(delta));
      for (let i = 0; i < count; i++) {
        lastBrickClose -= brickSize;
        bricks.push({ time: candle.time, price: lastBrickClose, size: brickSize, direction: "down" });
      }
    }
  }
  return bricks;
}
```

#### Kagi Transformer (`kagi.ts`)

Algorithm:
1. Start direction = UP if first candle close > open, else DOWN
2. `currentPrice = first candle close`
3. For each candle:
   - If direction == UP and candle.low < currentPrice - reversalAmount:
     - Change direction to DOWN
     - Record shoulder at currentPrice
     - currentPrice = candle.high
   - If direction == DOWN and candle.high > currentPrice + reversalAmount:
     - Change direction to UP
     - Record shoulder at currentPrice
     - currentPrice = candle.low
   - Else: currentPrice = candle.close
4. Each segment is a vertical line from previous price to current price at the candle's time

```typescript
export function transformToKagi(
  candles: Candle[],
  reversalAmount: number,
): BrickData[] {
  if (candles.length === 0 || reversalAmount <= 0) return [];
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const segments: BrickData[] = [];
  let direction: "up" | "down" = sorted[0]!.close >= sorted[0]!.open ? "up" : "down";
  let currentPrice = sorted[0]!.close;

  for (let i = 1; i < sorted.length; i++) {
    const candle = sorted[i]!;
    if (direction === "up") {
      if (candle.low < currentPrice - reversalAmount) {
        segments.push({ time: candle.time, price: currentPrice, size: reversalAmount, direction: "down", isShoulder: true, shoulderPrice: currentPrice });
        direction = "down";
        currentPrice = candle.high;
      } else {
        segments.push({ time: candle.time, price: currentPrice, size: reversalAmount, direction: "up" });
        currentPrice = candle.close;
      }
    } else {
      if (candle.high > currentPrice + reversalAmount) {
        segments.push({ time: candle.time, price: currentPrice, size: reversalAmount, direction: "up", isShoulder: true, shoulderPrice: currentPrice });
        direction = "up";
        currentPrice = candle.low;
      } else {
        segments.push({ time: candle.time, price: currentPrice, size: reversalAmount, direction: "down" });
        currentPrice = candle.close;
      }
    }
  }
  return segments;
}
```

#### Range Transformer (`range.ts`)

Similar to Renko but triggers on the candle's range (high - low) exceeding brickSize:
1. If `candle.high - candle.low >= brickSize`, create a brick at the candle's close
2. Direction determined by close vs previous brick close

#### Point & Figure Transformer (`pandf.ts`)

Algorithm:
1. Start direction = UP, referencePrice = first candle close
2. For each candle:
   - If UP: if close > referencePrice + boxSize, add X box, referencePrice += boxSize
   - If UP: if close < referencePrice - (reversalAmount * boxSize), switch to DOWN, referencePrice = floor(close / boxSize) * boxSize
   - If DOWN: if close < referencePrice - boxSize, add O box, referencePrice -= boxSize
   - If DOWN: if close > referencePrice + (reversalAmount * boxSize), switch to UP, referencePrice = ceil(close / boxSize) * boxSize

## 5. Custom Series Renderer

### 5.1 `CustomSeriesRenderer.tsx`

This component implements `ICustomSeriesPaneView` and `ICustomSeriesPaneRenderer`:

```typescript
import { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
  ICustomSeriesPaneRenderer,
  ICustomSeriesPaneView,
  PaneRendererCustomData,
  CustomData,
  Time,
  CustomSeriesPricePlotValues,
} from "lightweight-charts";

interface BrickRenderData {
  bricks: BrickData[];
  brickWidth: number;  // computed from barSpacing
  upColor: string;
  downColor: string;
}

class BrickRenderer implements ICustomSeriesPaneRenderer {
  draw(target: CanvasRenderingTarget2D, priceConverter: PriceToCoordinateConverter, isHovered: boolean, hitTestData?: unknown): void {
    // Iterate over bricks, convert price to Y coordinates, draw rectangles
  }
}

class BrickPaneView implements ICustomSeriesPaneView<Time, BrickData, CustomSeriesOptions> {
  _data: BrickRenderData;

  update(data: PaneRendererCustomData<Time, BrickData>, seriesOptions: CustomSeriesOptions): void {
    // Convert BrickData[] to render-ready format
    // Compute brickWidth from data.barSpacing
  }

  renderer(): ICustomSeriesPaneRenderer {
    return new BrickRenderer();
  }

  priceValueBuilder(plotRow: BrickData): CustomSeriesPricePlotValues {
    // Return [bottomPrice, topPrice] for auto-scaling
    if (plotRow.direction === "up") {
      return [plotRow.price, plotRow.price + plotRow.size];
    }
    return [plotRow.price - plotRow.size, plotRow.price];
  }

  isWhitespace(data: BrickData | CustomSeriesWhitespaceData<Time>): boolean {
    return false;
  }
}
```

### 5.2 Integration with ChartPanel

In `ChartPanel.tsx`, replace the hardcoded `addCandlestickSeries()` with a factory:

```typescript
function createChartSeries(
  chart: IChartApi,
  chartType: ChartType,
  options: SeriesOptions,
): ISeriesApi<"Custom"> {
  switch (chartType) {
    case "candlestick":
      return chart.addCandlestickSeries(options as CandlestickSeriesPartialOptions);
    case "renko":
    case "kagi":
    case "range":
    case "pandf":
      return chart.addCustomSeries(new BrickPaneView(), {
        color: options.upColor,
        // Custom series options
      });
    default:
      return chart.addCandlestickSeries(options as CandlestickSeriesPartialOptions);
  }
}
```

**Critical**: The `ISeriesApi` type becomes `ISeriesApi<"Custom">` for all non-candlestick types. This means:
- `series.setData()` accepts `CustomData<Time>[]` instead of `CandlestickData<Time>[]`
- `series.update()` accepts a single `CustomData<Time>` item
- The `priceValueBuilder` in the pane view handles price conversion

## 6. Chart Type Switching in UI

### 6.1 `constants.ts` Changes

Add:
```typescript
export type ChartType = "candlestick" | "renko" | "kagi" | "range" | "pandf";

export interface ChartTypeConfig {
  label: string;
  needsConfig: boolean;
  configLabel: string;
  defaultConfig: number;
  defaultReversal?: number;
}

export const CHART_TYPE_CONFIG: Record<ChartType, ChartTypeConfig> = { ... };
```

### 6.2 `ChartToolbar.tsx` Changes

Add a chart type selector dropdown next to the timeframe selector:

```tsx
// In ChartToolbar props
chartType: ChartType;
onChartTypeChange: (t: ChartType) => void;

// In the toolbar JSX, between timeframe and indicators
<div className="flex items-center gap-0.5 shrink-0">
  {CHART_TYPE_OPTIONS.map(({ value, label }) => (
    <button
      key={value}
      onClick={() => onChartTypeChange(value)}
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium transition-all",
        value === chartType
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  ))}
</div>
```

### 6.3 `ChartSettingsDialog.tsx` Changes

Add a "Chart Type" tab or section in the Appearance tab with:
- Chart type selector (radio buttons or segmented control)
- Dynamic config fields based on `CHART_TYPE_CONFIG[chartType].needsConfig`
- Brick size / reversal amount / box size numeric input

### 6.4 `TradingPage.tsx` Changes

Add `chartType` state and pass it down:

```typescript
const [chartType, setChartType] = useState<ChartType>("candlestick");
// Pass to ChartToolbar and ChartPanel
```

## 7. ChartPanel.tsx Modifications

### 7.1 Props

Add to `ChartPanelProps`:
```typescript
chartType: ChartType;
onChartTypeChange?: (t: ChartType) => void;
renkoBrickSize?: number;
kagiReversalAmount?: number;
rangeBrickSize?: number;
pandfBoxSize?: number;
pandfReversalAmount?: number;
```

### 7.2 Series Creation

Replace the hardcoded `chart.addCandlestickSeries(...)` with a conditional:

```typescript
// In the chart-create effect
let candleSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Custom">;

if (chartType === "candlestick") {
  candleSeries = chart.addCandlestickSeries({ ...candleOptions });
} else {
  candleSeries = chart.addCustomSeries(new BrickPaneView(), {
    color: colors.up,
    // Custom series options
  } as CustomSeriesPartialOptions);
}
```

### 7.3 Data Setting

Replace `series.setData(chartData)` with type-aware logic:

```typescript
if (chartType === "candlestick") {
  series.setData(chartData as CandlestickData<Time>[]);
} else {
  const { brickData } = useChartTypeData(allCandles, chartType, pipDigits, chartTypeConfig);
  series.setData(brickData.map(b => ({
    time: b.time as Time,
    customValues: { brickData: b },
  })));
}
```

### 7.4 Real-time Updates

The live candle / tick effects need to be chart-type-aware:
- For candlestick: existing logic (update OHLCV)
- For Renko/Range/Kagi/P&F: re-run the transformer on the latest candle and call `series.update()` with the new brick data

### 7.5 Volume Series

Volume histogram only makes sense for candlestick charts. For other chart types, hide the volume series or don't create it.

## 8. Configuration UI

### 8.1 Chart Type Selector (ChartToolbar)

Segmented control with icons:
- Candlestick (bar chart icon)
- Renko (brick icon)
- Kagi (line icon)
- Range (range icon)
- P&F (grid icon)

### 8.2 Per-Type Configuration

**Renko**: Brick size (numeric input, default 0.5)
**Kagi**: Reversal amount (numeric input, default 0.5)
**Range**: Brick size (numeric input, default 0.5)
**P&F**: Box size (numeric input, default 0.5) + Reversal amount (numeric input, default 3)

Configuration can be:
1. In `ChartSettingsDialog` → Appearance tab (persistent, saved per user)
2. In a floating config panel next to the chart type selector (ephemeral)

Option 1 is preferred for consistency with existing patterns.

## 9. Timeframe Handling

Renko, Kagi, Range, and P&F charts don't have fixed time intervals per brick. The existing `TF_INTERVAL_MS` and `timeframe` concept still applies for:
- Data fetching (which candles to load)
- Time scale display (seconds visible, right offset)
- Drawing tool anchoring

But the chart type itself determines brick formation, not the timeframe. The `timeframe` prop controls how granular the input data is (1m candles → more bricks than 1d candles), not the brick size.

## 10. Plugin Architecture Considerations

The existing `ISeriesPrimitive<Time>` plugin system (crosshair, session breaks, etc.) attaches to a series. For custom series:
- Plugins should still work since `ISeriesPrimitive` attaches to any `ISeriesApi`
- The `PluginBase` class uses `ISeriesApi<keyof SeriesOptionsMap>` which is generic enough
- No changes needed to the plugin system

## 11. Implementation Steps (Order)

1. **Add types and config** to `constants.ts` (`ChartType`, `ChartTypeConfig`, `CHART_TYPE_CONFIG`)
2. **Create `chart-types/` directory** with `types.ts`, `renko.ts`, `kagi.ts`, `range.ts`, `pandf.ts`
3. **Create `CustomSeriesRenderer.tsx`** with `BrickPaneView` and `BrickRenderer`
4. **Create `useChartTypeData.ts`** hook
5. **Modify `ChartPanel.tsx`** to support chart type switching, custom series creation, and data transformation
6. **Modify `ChartToolbar.tsx`** to add chart type selector
7. **Modify `ChartSettingsDialog.tsx`** to add chart type config
8. **Modify `TradingPage.tsx`** to add `chartType` state and pass it down
9. **Update `useIndicators.ts`** to handle custom series type for indicator attachment
10. **Add tests** for transformer functions

## 12. Key Integration Points

| File | Change |
|------|--------|
| `src/pages/trading/constants.ts` | Add `ChartType`, `ChartTypeConfig`, `CHART_TYPE_CONFIG` |
| `src/pages/trading/ChartPanel.tsx` | Add chart type prop, conditional series creation, data transformation |
| `src/pages/trading/ChartToolbar.tsx` | Add chart type selector dropdown |
| `src/pages/trading/ChartSettingsDialog.tsx` | Add chart type config section |
| `src/pages/TradingPage.tsx` | Add `chartType` state, pass to children |
| `src/pages/trading/chart-types/` | New directory with all chart type logic |
| `src/lib/indicators.ts` | No changes needed (indicators work on any series) |
| `src/lib/chart-plugins/plugin-base.ts` | No changes needed (ISeriesPrimitive is generic) |

## 13. Verification

1. Run `npm run typecheck` to verify TypeScript compilation
2. Run `npm run dev` and verify:
   - Chart type selector appears in toolbar
   - Switching between candlestick/renko/kagi/range/pandf updates the chart
   - Brick size / reversal amount config changes take effect immediately
   - Volume histogram only shows for candlestick
   - Drawing tools work on all chart types
   - Crosshair and tooltips work on all chart types
3. Run `npm test` to verify transformer function correctness
4. Verify `ChartPanel.tsx` line count stays manageable (extract helpers as needed)