// ── Kagi Transformer ─────────────────────────────────────────────────────
// Kagi charts change direction when the price reverses by `reversalAmount`
// (in price units, not percentage). The line is drawn as vertical segments
// with horizontal shoulder connectors at reversal points.

import type { BrickData, ChartTypeInput, ChartTypeResult } from "./types.ts";

/**
 * Transform OHLCV candles into Kagi line data.
 *
 * Algorithm:
 * 1. Start with the first candle's close as the initial price.
 * 2. Track the current direction (up or down).
 * 3. When the price moves in the current direction by at least one
 *    reversalAmount, extend the line in that direction.
 * 4. When the price reverses by at least one reversalAmount, change
 *    direction and add a horizontal shoulder connector.
 * 5. The Kagi line is a series of vertical segments connected by
 *    horizontal shoulders at reversal points.
 *
 * @param input - Candle data and reversal configuration
 * @returns BrickData array with shoulder markers for rendering
 */
export function transformToKagi(input: ChartTypeInput): ChartTypeResult {
  const { candles, brickSize, reversalAmount } = input;
  const bricks: BrickData[] = [];

  if (candles.length === 0 || reversalAmount <= 0) {
    return { bricks, effectiveBrickSize: reversalAmount, priceMin: 0, priceMax: 0 };
  }

  // Use the first candle's close as the starting price
  let currentPrice = candles[0]!.close;
  let direction: "up" | "down" = "up"; // initial direction

  // Create the initial brick
  bricks.push({
    time: candles[0]!.time,
    price: currentPrice,
    size: reversalAmount,
    direction: "up",
  });

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]!;
    const close = candle.close;
    const diff = close - currentPrice;

    if (direction === "up") {
      if (diff >= reversalAmount) {
        // Continue upward — extend the line
        const numSteps = Math.floor(diff / reversalAmount);
        for (let s = 1; s <= numSteps; s++) {
          currentPrice = currentPrice + reversalAmount;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: reversalAmount,
            direction: "up",
          });
        }
      } else if (diff <= -reversalAmount) {
        // Reversal — change direction to down
        direction = "down";
        const numSteps = Math.floor(Math.abs(diff) / reversalAmount);
        for (let s = 1; s <= numSteps; s++) {
          currentPrice = currentPrice - reversalAmount;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: reversalAmount,
            direction: "down",
          });
        }
        // Add shoulder connector at the reversal point
        bricks[bricks.length - 1] = {
          ...bricks[bricks.length - 1]!,
          isShoulder: true,
          shoulderPrice: currentPrice + reversalAmount,
        };
      }
    } else {
      // direction === "down"
      if (diff <= -reversalAmount) {
        // Continue downward — extend the line
        const numSteps = Math.floor(Math.abs(diff) / reversalAmount);
        for (let s = 1; s <= numSteps; s++) {
          currentPrice = currentPrice - reversalAmount;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: reversalAmount,
            direction: "down",
          });
        }
      } else if (diff >= reversalAmount) {
        // Reversal — change direction to up
        direction = "up";
        const numSteps = Math.floor(diff / reversalAmount);
        for (let s = 1; s <= numSteps; s++) {
          currentPrice = currentPrice + reversalAmount;
          bricks.push({
            time: candle.time,
            price: currentPrice,
            size: reversalAmount,
            direction: "up",
          });
        }
        // Add shoulder connector at the reversal point
        bricks[bricks.length - 1] = {
          ...bricks[bricks.length - 1]!,
          isShoulder: true,
          shoulderPrice: currentPrice - reversalAmount,
        };
      }
    }
  }

  // Calculate price range for auto-scaling
  const prices = bricks.map((b) => b.price);
  const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

  return {
    bricks,
    effectiveBrickSize: reversalAmount,
    priceMin,
    priceMax,
  };
}
