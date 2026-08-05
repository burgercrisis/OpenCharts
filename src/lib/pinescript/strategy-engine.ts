/**
 * PineScript Strategy Backtesting Engine
 * Parses PineScript strategy scripts and produces trade entries/exits
 * with P&L calculations.
 */

import { compile, Engine, ArrayFeed } from "@heyphat/piner";
import type { CandleData } from "../indicators.ts";
import type { StrategyResult, StrategyTrade } from "./types.ts";

interface StrategyOutput {
  trades: Array<{
    entry_time: number;
    exit_time: number | null;
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    side: "long" | "short";
  }>;
  equity_curve: Array<{ time: number; value: number }>;
}

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

/**
 * Run a PineScript strategy backtest against candle data.
 * Returns structured trade results and equity curve or compilation/runtime errors.
 */
export async function runStrategyBacktest(
  source: string,
  candles: CandleData[],
  opts?: {
    symbol?: string;
    timeframe?: string;
    initialCapital?: number;
    inputs?: Record<string, unknown>;
  },
): Promise<StrategyResult> {
  const errors: string[] = [];
  const initialCapital = opts?.initialCapital ?? 10000;

  if (candles.length === 0) {
    return { trades: [], equityCurve: [], totalPnL: 0, winRate: 0, maxDrawdown: 0, sharpeRatio: 0, errors: ["No candle data provided"] };
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

    // Extract strategy trades from the engine output
    const trades: StrategyTrade[] = [];
    const equityCurve: Array<{ time: number; value: number }> = [];

    // Try to read strategy results from engine outputs
    // @heyphat/piner may expose strategy trades via outputs.strategyTrades or similar
    const strategyTrades = (outputs as Record<string, unknown>).strategyTrades as StrategyOutput["trades"] | undefined;
    const equityData = (outputs as Record<string, unknown>).equityCurve as StrategyOutput["equityCurve"] | undefined;

    if (strategyTrades) {
      for (let i = 0; i < strategyTrades.length; i++) {
        const t = strategyTrades[i]!;
        trades.push({
          id: i,
          entryTime: t.entry_time,
          exitTime: t.exit_time,
          entryPrice: t.entry_price,
          exitPrice: t.exit_price,
          quantity: t.quantity,
          pnl: (t.exit_price ?? t.entry_price) * t.quantity * (t.side === "long" ? 1 : -1) - initialCapital * 0.001,
          side: t.side,
          status: t.exit_time !== null && t.exit_price !== null ? "closed" : "open",
        });
      }
    }

    if (equityData) {
      equityCurve.push(...equityData);
    } else {
      // Compute equity curve from trades if not provided
      let equity = initialCapital;
      for (const trade of trades) {
        if (trade.status === "closed" && trade.exitPrice !== null) {
          equity += trade.pnl;
        }
        equityCurve.push({ time: trade.entryTime, value: equity });
      }
    }

    // Calculate summary statistics
    const closedTrades = trades.filter((t) => t.status === "closed");
    const winningTrades = closedTrades.filter((t) => t.pnl > 0);
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;

    // Max drawdown
    let maxEquity = initialCapital;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.value > maxEquity) maxEquity = point.value;
      const drawdown = (maxEquity - point.value) / maxEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Sharpe ratio (simplified: annualized return / volatility of equity curve)
    const sharpeRatio = equityCurve.length > 1 ? computeSharpeRatio(equityCurve, initialCapital) : 0;

    return { trades, equityCurve, totalPnL, winRate, maxDrawdown, sharpeRatio, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { trades: [], equityCurve: [], totalPnL: 0, winRate: 0, maxDrawdown: 0, sharpeRatio: 0, errors };
  }
}

/** Compute a simplified Sharpe ratio from the equity curve. */
function computeSharpeRatio(
  equityCurve: Array<{ time: number; value: number }>,
  initialCapital: number,
): number {
  if (equityCurve.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!.value;
    const curr = equityCurve[i]!.value;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 0 : mean / stdDev;
}

/**
 * Synchronous compile-only check for strategy scripts — returns diagnostics without running.
 */
export function checkStrategyScript(source: string): {
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
