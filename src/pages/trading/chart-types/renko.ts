// ── Renko Transformer ────────────────────────────────────────────────────
// Renko bricks form when the close price moves by at least `brickSize`
// from the last brick's close. Multiple bricks can form per candle if the
// price move exceeds N * brickSize.

import type { BrickData, ChartTypeInput, ChartTypeResult } from "./types.ts";

/**
 * Transform OHLCV candles into Renko bricks.
 *
 * Algorithm:
 * 1. Start with the first candle's close as the initial brick price.
 * 2. For each subsequent candle, check if the close has moved by at least
 *    `brickSize` from the last brick's close.
 * 3. If the move is upward (close > lastBrickPrice + brickSize), create
 *    one or more up bricks.
 * 4. If the move is downward (close < lastBrickPrice - brickSize), create
 *    one or more down bricks.
 * 5. If the move is within brickSize, no brick is formed.
 *
 * @param input - Candle data and brick configuration
 * @returns BrickData array and price range for auto-scaling
 */
export function transformToRenko(input: ChartTypeInput): ChartTypeResult {
  const { candles, brickSize, reversalAmount } = input;
  const bricks: BrickData[] = [];

  if (candles.length === 0 || brickSize <= 0) {
    return { bricks, effectiveBrickSize: brickSize, priceMin: 0, priceMax: 0 };
  }

  // Use the first candle's close as the starting price
  let lastBrickPrice = candles[0]!.close;
  const startTime = candles[0]!.time;

  // Create the initial brick
  bricks.push({
    time: startTime,
    price: lastBrickPrice,
    size: brickSize,
    direction: "up",
  });

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]!;
    const close = candle.close;
    const diff = close - lastBrickPrice;

    if (diff >= brickSize) {
      // Price moved up — create up bricks
      const numBricks = Math.floor(diff / brickSize);
      for (let b = 1; b <= numBricks; b++) {
        const brickPrice = lastBrickPrice + b * brickSize;
        bricks.push({
          time: candle.time,
          price: brickPrice - brickSize, // bottom of brick
          size: brickSize,
          direction: "up",
        });
      }
      lastBrickPrice = lastBrickPrice + numBricks * brickSize;
    } else if (diff <= -brickSize) {
      // Price moved down — create down bricks
      const numBricks = Math.floor(Math.abs(diff) / brickSize);
      for (let b = 1; b <= numBricks; b++) {
        const brickPrice = lastBrickPrice - b * brickSize;
        bricks.push({
          time: candle.time,
          price: brickPrice, // top of brick (for down bricks, price is the top)
          size: brickSize,
          direction: "down",
        });
      }
      lastBrickPrice = lastBrickPrice - numBricks * brickSize;
    }
    // If |diff| < brickSize, no brick is formed
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
