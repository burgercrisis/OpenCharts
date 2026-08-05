/**
 * PineScript Editor Component
 * A text editor for writing and running PineScript v6 indicators
 * using the @heyphat/piner engine.
 */

import { useState, useCallback } from "react";
import { Button } from "./ui/button.tsx";
import { runPineScript } from "../lib/pinescript/engine.ts";
import type { PineScriptResult } from "../lib/pinescript/types.ts";

interface PineScriptEditorProps {
  onResult: (result: PineScriptResult | null, source: string) => void;
}

const DEFAULT_PINE_SCRIPT = `//@version=6
indicator("My PineScript Indicator", overlay=true)
fast = ta.sma(close, 5)
slow = ta.sma(close, 20)
plot(fast, title="Fast SMA", color=color.blue)
plot(slow, title="Slow SMA", color=color.red)
plotshape(ta.crossover(fast, slow), title="Buy Signal", location=location.belowbar, color=color.green, style=shape.triangleup, size=size.small)
plotshape(ta.crossunder(fast, slow), title="Sell Signal", location=location.abovebar, color=color.red, style=shape.triangledown, size=size.small)
`;

export function PineScriptEditor({ onResult }: PineScriptEditorProps) {
  const [source, setSource] = useState(DEFAULT_PINE_SCRIPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plotIndex, setPlotIndex] = useState(0);
  const [result, setResult] = useState<PineScriptResult | null>(null);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runPineScript(source, [], {
        symbol: "BTCUSD",
        timeframe: "1d",
      });
      setResult(res);
      onResult(res, source);
      if (res.errors.length > 0) {
        setError(res.errors.join("; "));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      onResult(null, source);
    } finally {
      setLoading(false);
    }
  }, [source, onResult]);

  const handleClear = useCallback(() => {
    setSource(DEFAULT_PINE_SCRIPT);
    setResult(null);
    setError(null);
    onResult(null, DEFAULT_PINE_SCRIPT);
  }, [onResult]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">PineScript Editor</span>
        <span className="text-xs text-muted-foreground">v6</span>
      </div>

      {/* Source editor */}
      <textarea
        className="flex-1 w-full p-3 font-mono text-xs bg-background text-foreground resize-none outline-none"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Write PineScript v6 code here..."
        spellCheck={false}
      />

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <Button
          variant="default"
          size="sm"
          onClick={handleRun}
          disabled={loading || !source.trim()}
        >
          {loading ? "Running..." : "▶ Run"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
        {result && result.plots.length > 0 && (
          <select
            className="text-xs bg-background border border-border rounded px-2 py-1 outline-none"
            value={plotIndex}
            onChange={(e) => setPlotIndex(Number(e.target.value))}
          >
            {result.plots.map((p, i) => (
              <option key={p.id} value={i}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-t border-border">
          {error}
        </div>
      )}

      {/* Results summary */}
      {result && !error && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border space-y-1">
          <div className="flex justify-between">
            <span>Plots:</span>
            <span>{result.plots.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Markers:</span>
            <span>{result.markers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Security Requests:</span>
            <span>{result.securityRequests.length}</span>
          </div>
          {result.securityRequests.length > 0 && (
            <div className="mt-1">
              {result.securityRequests.map((req, i) => (
                <div key={i} className="text-xs">
                  {req.symbol} / {req.timeframe}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
