// ── Point & Figure Transformer ───────────────────────────────────────────
// Point & Figure charts use X columns for upward moves and O columns for
// downward moves. A new column is started when the price reverses by
// `reversalAmount` boxes. Each box represents `boxSize` in price units.

import type { BrickData, ChartTypeInput, ChartTypeResult } from "./types.ts";

/**
 * Transform OHLCV candles into Point & Figure brick data.
 *
 * Algorithm:
 * 1. Start with the first candle's close as the initial price.
 * 2. Track the current column direction (X for up, O for down).
 * 3. When the price moves in the current direction by at least one boxSize,
 *    add a brick to the current column.
 * 4. When the price reverses by at least `reversalAmount * boxSize`,
 *    start a new column in the opposite direction.
 * 5. X columns represent upward price movement; O columns represent downward.
 *
 * @param input - Candle data and P&F configuration
 * @returns BrickData array with column and mark fields for rendering
 */
export function transformToPandF(input: ChartTypeInput): ChartTypeResult {
  const { candles, brickSize, reversalAmount } = input;
  const bricks: BrickData[] = [];

  if (candles.length === 0 || brickSize <= 0 || reversalAmount <= 0) {
    return { bricks, effectiveBrickSize: brickSize, priceMin: 0, priceMax: 0 };
  }

  // Use the first candle's close as the starting price
  let currentPrice = candles[0]!.close;
  let currentDirection: "X" | "O" = "X"; // start with up column
  let currentColumn: number = 0;
  let boxesInCurrentColumn = 0;

  // Create the initial brick
  bricks.push({
    time: candles[0]!.time,
    price: currentPrice,
    size: brickSize,
    direction: "up",
    column: currentColumn,
    mark: "X",
  });
  boxesInCurrentColumn = 1;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]!;
    const close = candle.close;
    const diff = close - currentPrice;

    if (currentDirection === "X") {
      if (diff >= brickSize) {
        // Continue upward in current column
        const numBoxes = Math.floor(diff / brickSize);
        for (let b = 1; b <= numBoxes; b++) {
          currentPrice = currentPrice + brickSize;
          currentColumn = currentColumn; // same column
          bricks.push({
            time: candle.time,
            price: currentPrice - brickSize,
            size: brickSize,
            direction: "up",
            column: currentColumn,
            mark: "X",
          });
        }
        boxesInCurrentColumn += numBoxes;
      } else if (diff <= -reversalAmount * brickSize) {
        // Reversal — start new O column
        currentDirection = "O";
        currentColumn = currentColumn + 1;
        const numBoxes = Math.floor(Math.abs(diff) / brickSize);
        for (let b = 1; b <= numBoxes; b++) {
          currentPrice = currentPrice - brickSize;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: brickSize,
            direction: "down",
            column: currentColumn,
            mark: "O",
          });
        }
        boxesInCurrentColumn = numBoxes;
      }
      // If diff is positive but < brickSize, or negative but < reversalAmount * brickSize,
      // no brick is formed (insufficient movement)
    } else {
      // currentDirection === "O"
      if (diff <= -brickSize) {
        // Continue downward in current column
        const numBoxes = Math.floor(Math.abs(diff) / brickSize);
        for (let b = 1; b <= numBoxes; b++) {
          currentPrice = currentPrice - brickSize;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: brickSize,
            direction: "down",
            column: currentColumn,
            mark: "O",
          });
        }
        boxesInCurrentColumn += numBoxes;
      } else if (diff >= reversalAmount * brickSize) {
        // Reversal — start new X column
        currentDirection = "X";
        currentColumn = currentColumn + 1;
        const numBoxes = Math.floor(diff / brickSize);
        for (let b = 1; b <= numBoxes; b++) {
          currentPrice = currentPrice + brickSize;
          bricks.push({
            time: candle.time,
            price: currentPrice - brickSize,
            size: brickSize,
            direction: "up",
            column: currentColumn,
            mark: "X",
          });
        }
        boxesInCurrentColumn = numBoxes;
      }
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
