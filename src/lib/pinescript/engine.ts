/**
 * PineScript Engine Service
 * Wraps @heyphat/piner to compile and run PineScript v6 indicators
 * against OpenCharts candle data.
 */

import { compile, Engine, ArrayFeed } from "@heyphat/piner";
import type { CandleData, IndicatorPoint } from "../indicators.ts";
import type { PineScriptResult, PineScriptPlot } from "./types.ts";

/** Convert OpenCharts CandlestickData[] to piner Bar[] */
function candlesToBars(candles: CandleData[]): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  return candles.map((c) => ({
    time: c.time as number,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? 0,
  }));
}

/** Convert piner PlotSeries data to IndicatorPoint[] */
function plotToIndicatorPoints(
  plot: { id: number; title: string; data: number[]; colors: (string | null)[] },
  bars: ReturnType<typeof candlesToBars>,
): PineScriptPlot {
  const data: IndicatorPoint[] = [];
  for (let i = 0; i < plot.data.length && i < bars.length; i++) {
    data.push({ time: bars[i]!.time, value: plot.data[i] ?? NaN });
  }
  return {
    id: plot.id,
    title: plot.title,
    data,
    colors: plot.colors,
  };
}

/**
 * Compile and run a PineScript indicator against candle data.
 * Returns structured results or compilation/runtime errors.
 */
export async function runPineScript(
  source: string,
  candles: CandleData[],
  opts?: {
    symbol?: string;
    timeframe?: string;
    inputs?: Record<string, unknown>;
  },
): Promise<PineScriptResult> {
  const errors: string[] = [];

  if (candles.length === 0) {
    return { plots: [], markers: [], candles: [], hlines: [], securityRequests: [], errors: ["No candle data provided"] };
  }

  try {
    const compiled = compile(source);
    const bars = candlesToBars(candles);
    const feed = new ArrayFeed(bars);

    const engine = new Engine(compiled, feed, {
      inputs: opts?.inputs,
      backend: "js",
    });

    await engine.run({
      symbol: opts?.symbol ?? "UNKNOWN",
      timeframe: opts?.timeframe ?? "1d",
    });

    const outputs = engine.outputs;

    // Extract plots
    const plots: PineScriptPlot[] = [];
    for (const [, plot] of outputs.plots) {
      plots.push(plotToIndicatorPoints(plot, bars));
    }

    // Extract markers
    const markers: PineScriptResult["markers"] = [];
    for (const [, marker] of outputs.markers) {
      const data: (IndicatorPoint | null)[] = [];
      for (let i = 0; i < marker.data.length && i < bars.length; i++) {
        const pt = marker.data[i];
        if (pt) {
          data.push({ time: bars[i]!.time, value: pt.text ? 1 : 0 });
        } else {
          data.push(null);
        }
      }
      markers.push({
        id: marker.id,
        title: marker.title,
        kind: marker.kind,
        location: marker.location as "abovebar" | "belowbar" | "top" | "bottom" | "absolute",
        glyph: marker.glyph,
        data,
      });
    }

    // Extract candles
    const candleOutputs: PineScriptResult["candles"] = [];
    for (const [, candle] of outputs.candles) {
      const data: (IndicatorPoint[] | null)[] = [];
      for (let i = 0; i < candle.data.length && i < bars.length; i++) {
        const ohlc = candle.data[i];
        if (ohlc) {
          data.push([
            { time: bars[i]!.time, value: ohlc.open },
            { time: bars[i]!.time, value: ohlc.high },
            { time: bars[i]!.time, value: ohlc.low },
            { time: bars[i]!.time, value: ohlc.close },
          ]);
        } else {
          data.push(null);
        }
      }
      candleOutputs.push({
        id: candle.id,
        title: candle.title,
        data,
        colors: candle.colors,
      });
    }

    // Extract hlines
    const hlines = Array.from(outputs.hlines).map(([, h]) => ({
      id: h.id,
      price: h.price,
      title: h.title,
    }));

    // Extract security requests
    const securityRequests = outputs.securityRequests.map((req) => ({
      symbol: req.symbol,
      timeframe: req.timeframe,
    }));

    return { plots, markers: markers, candles: candleOutputs, hlines, securityRequests, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { plots: [], markers: [], candles: [], hlines: [], securityRequests: [], errors };
  }
}

/**
 * Synchronous compile-only check — returns diagnostics without running.
 */
export function checkPineScript(source: string): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  try {
    compile(source);
    return { success: true, errors: [], warnings: [] };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
      warnings: [],
    };
  }
}
