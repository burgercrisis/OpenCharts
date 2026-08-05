/**
 * Strategy Results Panel
 * Displays backtest results from PineScript strategy scripts:
 * trade list, equity curve summary, win rate, max drawdown, Sharpe ratio.
 */

import { useState } from "react";
import type { StrategyResult, StrategyTrade } from "../../lib/pinescript/types.ts";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";

interface StrategyResultsPanelProps {
  result: StrategyResult | null;
  loading: boolean;
  error: string | null;
}

export function StrategyResultsPanel({ result, loading, error }: StrategyResultsPanelProps) {
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Running backtest...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">
          Run a PineScript strategy to see backtest results.
        </div>
      </div>
    );
  }

  if (result.errors.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {result.errors.map((err, i) => (
          <div key={i} className="text-sm text-destructive">
            {err}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-3">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-secondary rounded p-2">
          <div className="text-muted-foreground">Total P&L</div>
          <div className={`font-semibold ${result.totalPnL >= 0 ? "text-green-400" : "text-destructive"}`}>
            {result.totalPnL >= 0 ? "+" : ""}
            {result.totalPnL.toFixed(2)}
          </div>
        </div>
        <div className="bg-secondary rounded p-2">
          <div className="text-muted-foreground">Win Rate</div>
          <div className="font-semibold">{(result.winRate * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-secondary rounded p-2">
          <div className="text-muted-foreground">Max Drawdown</div>
          <div className="font-semibold text-destructive">{(result.maxDrawdown * 100).toFixed(2)}%</div>
        </div>
        <div className="bg-secondary rounded p-2">
          <div className="text-muted-foreground">Sharpe Ratio</div>
          <div className="font-semibold">{result.sharpeRatio.toFixed(2)}</div>
        </div>
      </div>

      {/* Trade list */}
      <div className="space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Trades ({result.trades.length})
        </div>
        {result.trades.length === 0 && (
          <div className="text-xs text-muted-foreground">No trades generated.</div>
        )}
        {result.trades.map((trade) => (
          <div key={trade.id} className="bg-secondary rounded p-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={trade.side === "long" ? "default" : "destructive"} className="text-[10px]">
                  {trade.side.toUpperCase()}
                </Badge>
                <span className={trade.pnl >= 0 ? "text-green-400" : "text-destructive"}>
                  {trade.pnl >= 0 ? "+" : ""}
                  {trade.pnl.toFixed(2)}
                </span>
              </div>
              <Badge variant={trade.status === "closed" ? "secondary" : "outline"} className="text-[10px]">
                {trade.status}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1">
              Entry: {trade.entryPrice.toFixed(2)} →{" "}
              {trade.exitPrice !== null ? `Exit: ${trade.exitPrice.toFixed(2)}` : "Open"}
            </div>
            <button
              className="text-primary hover:underline mt-1"
              onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
            >
              {expandedTrade === trade.id ? "Collapse" : "Details"}
            </button>
            {expandedTrade === trade.id && (
              <div className="mt-1 text-muted-foreground">
                <div>Entry Time: {new Date(trade.entryTime * 1000).toLocaleString()}</div>
                {trade.exitTime && <div>Exit Time: {new Date(trade.exitTime * 1000).toLocaleString()}</div>}
                <div>Quantity: {trade.quantity}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
