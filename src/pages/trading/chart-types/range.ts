// ── Range Chart Transformer ──────────────────────────────────────────────
// Range charts form a new brick when the high-low range of a candle exceeds
// `brickSize`. The brick direction is determined by whether the close is
// above or below the previous brick's close.

import type { BrickData, ChartTypeInput, ChartTypeResult } from "./types.ts";

/**
 * Transform OHLCV candles into Range chart bricks.
 *
 * Algorithm:
 * 1. Start with the first candle's close as the initial brick price.
 * 2. For each subsequent candle, check if the high-low range exceeds
 *    `brickSize`.
 * 3. If the range exceeds brickSize, create a new brick:
 *    - If close > lastBrickPrice, create an up brick.
 *    - If close < lastBrickPrice, create a down brick.
 *    - If close == lastBrickPrice, skip (no direction change).
 * 4. Multiple bricks can form if the range is large enough to accommodate
 *    multiple brick sizes.
 *
 * @param input - Candle data and brick configuration
 * @returns BrickData array and price range for auto-scaling
 */
export function transformToRange(input: ChartTypeInput): ChartTypeResult {
  const { candles, brickSize, reversalAmount } = input;
  const bricks: BrickData[] = [];

  if (candles.length === 0 || brickSize <= 0) {
    return { bricks, effectiveBrickSize: brickSize, priceMin: 0, priceMax: 0 };
  }

  // Use the first candle's close as the starting price
  let lastBrickPrice = candles[0]!.close;

  // Create the initial brick
  bricks.push({
    time: candles[0]!.time,
    price: lastBrickPrice,
    size: brickSize,
    direction: "up",
  });

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]!;
    const range = candle.high - candle.low;

    if (range >= brickSize) {
      const close = candle.close;
      const diff = close - lastBrickPrice;

      if (diff > 0) {
        // Up brick(s)
        const numBricks = Math.floor(diff / brickSize);
        for (let b = 1; b <= numBricks; b++) {
          const brickPrice = lastBrickPrice + b * brickSize;
          bricks.push({
            time: candle.time,
            price: brickPrice - brickSize,
            size: brickSize,
            direction: "up",
          });
        }
        lastBrickPrice = lastBrickPrice + numBricks * brickSize;
      } else if (diff < 0) {
        // Down brick(s)
        const numBricks = Math.floor(Math.abs(diff) / brickSize);
        for (let b = 1; b <= numBricks; b++) {
          const brickPrice = lastBrickPrice - b * brickSize;
          bricks.push({
            time: candle.time,
            price: brickPrice,
            size: brickSize,
            direction: "down",
          });
        }
        lastBrickPrice = lastBrickPrice - numBricks * brickSize;
      }
      // If diff == 0, skip (no direction change)
    }
  }

  // Calculate price range for auto-scaling
  const prices = bricks.map((b) => b.price);
  const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

  return {
    bricks,
    effectiveBrickSize: brickSize,
    priceMin,
    priceMax,
  };
}
