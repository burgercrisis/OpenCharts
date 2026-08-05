// ── Shared Types for Non-Standard Chart Types ──────────────────────────

/** A single brick/block in a non-standard chart type. */
export interface BrickData {
  /** Unix seconds — the timestamp when this brick was formed. */
  time: number;
  /** The bottom price of the brick (for up bricks) or top price (for down bricks). */
  price: number;
  /** The size/height of the brick in price units. */
  size: number;
  /** Direction of the brick. */
  direction: "up" | "down";
  /** Kagi-specific: whether this is a horizontal shoulder connector. */
  isShoulder?: boolean;
  /** Kagi-specific: the price level of the shoulder connector. */
  shoulderPrice?: number;
  /** Point & Figure-specific: column index for grid alignment. */
  column?: number;
  /** Point & Figure-specific: whether this is an X (up) or O (down). */
  mark?: "X" | "O";
}

/** Configuration for a non-standard chart type. */
export interface ChartTypeConfig {
  /** The chart type identifier. */
  type: string;
  /** Human-readable label for the UI. */
  label: string;
  /** Default brick/box size in price units. */
  defaultBrickSize: number;
  /** Default reversal amount (number of boxes for Kagi/P&F). */
  defaultReversalAmount: number;
  /** Whether the chart type uses time-based or price-based formation. */
  priceDriven: boolean;
}

/** Input data for chart type transformers. */
export interface ChartTypeInput {
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  brickSize: number;
  reversalAmount: number;
}

/** Result of chart type data transformation, ready for CustomSeriesRenderer. */
export interface ChartTypeResult {
  bricks: BrickData[];
  /** The effective brick size used (may differ from input for auto-calculated sizes). */
  effectiveBrickSize: number;
  /** The price range covered by the bricks (for auto-scaling). */
  priceMin: number;
  priceMax: number;
}
