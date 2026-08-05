// ── useChartTypeData Hook ────────────────────────────────────────
// Converts CandleData[] to BrickData[] based on the selected chart type.
// This hook is the bridge between raw OHLCV data and the custom series renderer.

import { useMemo } from "react";
import type { CandleData } from "../../lib/indicators.ts";
import type { BrickData, ChartTypeResult } from "./types.ts";
import { transformToRenko } from "./renko.ts";
import { transformToKagi } from "./kagi.ts";
import { transformToRange } from "./range.ts";
import { transformToPandF } from "./pandf.ts";
import type { ChartType } from "./types.ts";

export interface UseChartTypeDataOptions {
  chartType: ChartType;
  candles: CandleData[];
  /** Brick/box size in price units. Auto-calculated if 0. */
  brickSize: number;
  /** Reversal amount in number of boxes. */
  reversalAmount: number;
}

export interface UseChartTypeDataReturn {
  bricks: BrickData[];
  effectiveBrickSize: number;
  priceMin: number;
  priceMax: number;
}

/**
 * Auto-calculate a sensible brick size based on recent price volatility.
 * Uses the average true range of the last 14 candles as a base,
 * then divides by 2 to get a reasonable default brick size.
 */
function autoCalculateBrickSize(candles: CandleData[]): number {
  if (candles.length < 15) return 0;

  // Calculate ATR of last 14 candles
  const period = 14;
  const recent = candles.slice(-period - 1);
  let totalTr = 0;
  for (let i = 1; i < recent.length; i++) {
    const tr = Math.max(
      recent[i]!.high - recent[i]!.low,
      Math.abs(recent[i]!.high - recent[i - 1]!.close),
      Math.abs(recent[i]!.low - recent[i - 1]!.close),
    );
    totalTr += tr;
  }
  const avgTr = totalTr / period;

  // Use half the ATR as the default brick size, rounded to 2 decimal places
  return Math.round((avgTr / 2) * 100) / 100;
}

/**
 * Hook that transforms OHLCV candle data into brick data for the
 * selected chart type.
 */
export function useChartTypeData(
  options: UseChartTypeDataOptions,
): UseChartTypeDataReturn {
  const { chartType, candles, brickSize, reversalAmount } = options;

  const result: UseChartTypeDataReturn = useMemo(() => {
    if (candles.length === 0) {
      return { bricks: [], effectiveBrickSize: 0, priceMin: 0, priceMax: 0 };
    }

    // Auto-calculate brick size if not provided
    const effectiveBrickSize =
      brickSize > 0 ? brickSize : autoCalculateBrickSize(candles);

    // Auto-calculate reversal amount if not provided
    const effectiveReversal =
      reversalAmount > 0 ? reversalAmount : Math.max(1, Math.round(effectiveBrickSize / 2));

    const input = {
      candles,
      brickSize: effectiveBrickSize,
      reversalAmount: effectiveReversal,
    };

    let transformResult: ChartTypeResult;

    switch (chartType) {
      case "renko":
        transformResult = transformToRenko(input);
        break;
      case "kagi":
        transformResult = transformToKagi(input);
        break;
      case "range":
        transformResult = transformToRange(input);
        break;
      case "point_and_figure":
        transformResult = transformToPandF(input);
        break;
      default:
        // Standard chart types don't use brick transformation
        return { bricks: [], effectiveBrickSize: 0, priceMin: 0, priceMax: 0 };
    }

    return {
      bricks: transformResult.bricks,
      effectiveBrickSize: transformResult.effectiveBrickSize,
      priceMin: transformResult.priceMin,
      priceMax: transformResult.priceMax,
    };
  }, [chartType, candles, brickSize, reversalAmount]);

  return result;
}
