/**
 * PineScript Integration Types
 * Types for the @heyphat/piner-based PineScript evaluation service.
 */

import type { IndicatorPoint } from "../indicators.ts";

/** Result of a single PineScript plot output. */
export interface PineScriptPlot {
  id: number;
  title: string;
  data: IndicatorPoint[];
  /** Per-bar color overrides (#RRGGBBAA) or null for default. */
  colors: (string | null)[];
}

/** Result of a PineScript marker output (plotshape, plotchar, etc.). */
export interface PineScriptMarker {
  id: number;
  title: string;
  kind: "shape" | "char" | "arrow";
  location: "abovebar" | "belowbar" | "top" | "bottom" | "absolute";
  glyph: string;
  data: (IndicatorPoint | null)[];
}

/** Result of a PineScript candle overlay (plotcandle, plotbar). */
export interface PineScriptCandle {
  id: number;
  title: string;
  data: (IndicatorPoint[] | null)[];
  colors: (string | null)[];
}

/** Complete output from a PineScript indicator run. */
export interface PineScriptResult {
  plots: PineScriptPlot[];
  markers: PineScriptMarker[];
  candles: PineScriptCandle[];
  hlines: Array<{ id: number; price: number; title: string }>;
  /** request.security data dependencies (symbol/timeframe pairs). */
  securityRequests: Array<{ symbol: string; timeframe: string }>;
  /** Any compile or runtime errors. */
  errors: string[];
}

/** Configuration for a PineScript indicator instance on the chart. */
export interface PineScriptIndicatorConfig {
  type: "PINESCRIPT";
  label: string;
  pane: "overlay" | "below";
  defaultParams: Record<string, unknown>;
  color: string;
  /** The PineScript source code. */
  source: string;
  /** Which plot output to render (by index). */
  plotIndex: number;
}
