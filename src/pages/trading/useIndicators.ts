import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { LineStyle } from "lightweight-charts";
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  stochastic,
  vwap,
  obv,
  williamsR,
  momentum,
  aroon,
  cci,
  adx,
  ichimoku,
  parabolicSar,
  pivotPoints,
  fibonacciRetracement,
  INDICATOR_REGISTRY,
  type IndicatorType,
} from "../../lib/indicators.ts";
import { runPineScript } from "../../lib/pinescript/engine.ts";
import { toIndicatorCandles } from "./utils.ts";
import { CHART_COLORS } from "./constants.ts";

export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  chartData: CandlestickData<Time>[],
  activeIndicators: IndicatorType[],
  isDark: boolean,
  pineScriptSource?: string | null,
): void {
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line"> | ISeriesApi<"Histogram">>>(
    new Map(),
  );
  const pineScriptResultsRef = useRef<Array<{ title: string; data: Array<{ time: number; value: number }> }>>(
    [],
  );
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || chartData.length === 0) return;

    const chart = chartRef.current;
    const indCandles = toIndicatorCandles(chartData);

    // Remove old indicator series
    for (const [_key, series] of indicatorSeriesRef.current) {
      try {
        chart.removeSeries(series);
      } catch {
        /* already removed */
      }
    }
    indicatorSeriesRef.current.clear();

    for (const type of activeIndicators) {
      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      if (!config) continue;

      switch (type) {
        case "SMA": {
          const data = sma(indCandles, config.defaultParams.period!);
          const s = chart.addLineSeries({
            color: config.color,
            lineWidth: 1,
            priceScaleId: "right",
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("SMA", s);
          break;
        }
        case "EMA": {
          const data = ema(indCandles, config.defaultParams.period!);
          const s = chart.addLineSeries({
            color: config.color,
            lineWidth: 1,
            priceScaleId: "right",
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("EMA", s);
          break;
        }
        case "RSI": {
          const data = rsi(indCandles, config.defaultParams.period);
          const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "rsi" });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("RSI", s);
          const refHigh = chart.addLineSeries({
            color: "#555",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceScaleId: "rsi",
          });
          refHigh.setData(data.map((p) => ({ time: p.time as Time, value: 70 })));
          indicatorSeriesRef.current.set("RSI-70", refHigh);
          const refLow = chart.addLineSeries({
            color: "#555",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceScaleId: "rsi",
          });
          refLow.setData(data.map((p) => ({ time: p.time as Time, value: 30 })));
          indicatorSeriesRef.current.set("RSI-30", refLow);
          break;
        }
        case "MACD": {
          const data = macd(
            indCandles,
            config.defaultParams.fast,
            config.defaultParams.slow,
            config.defaultParams.signal,
          );
          const mLine = chart.addLineSeries({
            color: "#2196f3",
            lineWidth: 1,
            priceScaleId: "macd",
          });
          mLine.setData(data.macd.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("MACD-line", mLine);
          const sLine = chart.addLineSeries({
            color: "#ff9800",
            lineWidth: 1,
            priceScaleId: "macd",
          });
          sLine.setData(data.signal.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("MACD-signal", sLine);
          const histo = chart.addHistogramSeries({ priceScaleId: "macd" });
          histo.setData(
            data.histogram.map((p) => ({
              time: p.time as Time,
              value: p.value,
              color: p.value >= 0 ? colors.up + "99" : colors.down + "99",
            })),
          );
          indicatorSeriesRef.current.set("MACD-hist", histo);
          break;
        }
        case "BOLL": {
          const data = bollingerBands(
            indCandles,
            config.defaultParams.period,
            config.defaultParams.stdDev,
          );
          const upper = chart.addLineSeries({
            color: config.color + "80",
            lineWidth: 1,
            priceScaleId: "right",
          });
          upper.setData(data.upper.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-upper", upper);
          const mid = chart.addLineSeries({
            color: config.color,
            lineWidth: 1,
            priceScaleId: "right",
          });
          mid.setData(data.middle.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-mid", mid);
          const lower = chart.addLineSeries({
            color: config.color + "80",
            lineWidth: 1,
            priceScaleId: "right",
          });
          lower.setData(data.lower.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-lower", lower);
          break;
        }
        case "ATR": {
          const data = atr(indCandles, config.defaultParams.period);
          const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "atr" });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("ATR", s);
          break;
        }
        case "STOCH": {
          const data = stochastic(
            indCandles,
            config.defaultParams.kPeriod,
            config.defaultParams.dPeriod,
          );
          const kLine = chart.addLineSeries({
            color: "#ab47bc",
            lineWidth: 1,
            priceScaleId: "stoch",
          });
          kLine.setData(data.k.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("STOCH-K", kLine);
          const dLine = chart.addLineSeries({
            color: "#ff7043",
            lineWidth: 1,
            priceScaleId: "stoch",
          });
          dLine.setData(data.d.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("STOCH-D", dLine);
          break;
        }
        case "VWAP": {
          const data = vwap(indCandles);
          const s = chart.addLineSeries({
            color: config.color,
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            priceScaleId: "right",
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("VWAP", s);
          break;
        }
         case "PINESCRIPT": {
           if (!pineScriptSource) break;
           // Async PineScript execution — run engine and render results
           (async () => {
             try {
               const result = await runPineScript(pineScriptSource, indCandles, {
                 symbol: "BTCUSD",
                 timeframe: "1d",
               });
               if (result.errors.length > 0) {
                 console.warn("PineScript errors:", result.errors);
                 return;
               }
               // Render all plot outputs
               result.plots.forEach((plot, idx) => {
                 const s = chart.addLineSeries({
                   color: config.color,
                   lineWidth: 1,
                   priceScaleId: "right",
                 });
                 s.setData(
                   plot.data.map((p) => ({ time: p.time as Time, value: p.value })),
                 );
                 indicatorSeriesRef.current.set(`PINESCRIPT-plot-${idx}`, s);
               });
               // Render markers (plotshape, plotchar, etc.)
               result.markers.forEach((marker) => {
                 const markerData = marker.data.filter((d): d is IndicatorPoint => d !== null);
                 if (markerData.length === 0) return;
                 const s = chart.addLineSeries({
                   color: config.color,
                   lineWidth: 1,
                   priceScaleId: "right",
                 });
                 s.setData(
                   markerData.map((p) => ({ time: p.time as Time, value: p.value })),
                 );
                 indicatorSeriesRef.current.set(`PINESCRIPT-marker-${marker.id}`, s);
               });
               // Render horizontal lines
               result.hlines.forEach((h) => {
                 const s = chart.addLineSeries({
                   color: config.color,
                   lineWidth: 1,
                   lineStyle: LineStyle.Dashed,
                   priceScaleId: "right",
                 });
                 // Render hline as a single-point series at the price level
                 s.setData([{ time: indCandles[0]!.time as Time, value: h.price }]);
                 indicatorSeriesRef.current.set(`PINESCRIPT-hline-${h.id}`, s);
               });
             } catch (err) {
               console.error("PineScript execution error:", err);
             }
           })();
           break;
         }
         case "OBV": {
           const data = obv(indCandles);
           const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "right" });
           s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("OBV", s);
           break;
         }
         case "WILLIAMS_R": {
           const data = williamsR(indCandles, config.defaultParams.period);
           const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "right" });
           s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("WILLIAMS_R", s);
           break;
         }
         case "MOMENTUM": {
           const data = momentum(indCandles, config.defaultParams.period);
           const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "right" });
           s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("MOMENTUM", s);
           break;
         }
         case "AROON": {
           const data = aroon(indCandles, config.defaultParams.period);
           const up = chart.addLineSeries({ color: "#2196f3", lineWidth: 1, priceScaleId: "aroon" });
           up.setData(data.aroonUp.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("AROON-up", up);
           const down = chart.addLineSeries({ color: "#f44336", lineWidth: 1, priceScaleId: "aroon" });
           down.setData(data.aroonDown.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("AROON-down", down);
           break;
         }
         case "CCI": {
           const data = cci(indCandles, config.defaultParams.period);
           const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "right" });
           s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("CCI", s);
           break;
         }
         case "ADX": {
           const data = adx(indCandles, config.defaultParams.period);
           const adxLine = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "adx" });
           adxLine.setData(data.adx.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ADX", adxLine);
           const diPlus = chart.addLineSeries({ color: "#4caf50", lineWidth: 1, priceScaleId: "adx" });
           diPlus.setData(data.diPlus.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ADX-plus", diPlus);
           const diMinus = chart.addLineSeries({ color: "#f44336", lineWidth: 1, priceScaleId: "adx" });
           diMinus.setData(data.diMinus.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ADX-minus", diMinus);
           break;
         }
         case "ICHIMOKU": {
           const data = ichimoku(indCandles, config.defaultParams.tenkan, config.defaultParams.kijun, config.defaultParams.senkouB);
           const tenkan = chart.addLineSeries({ color: "#ff9800", lineWidth: 1, priceScaleId: "ichimoku" });
           tenkan.setData(data.tenkan.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ICHIMOKU-tenkan", tenkan);
           const kijun = chart.addLineSeries({ color: "#2196f3", lineWidth: 1, priceScaleId: "ichimoku" });
           kijun.setData(data.kijun.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ICHIMOKU-kijun", kijun);
           const senkouA = chart.addLineSeries({ color: "#4caf50", lineWidth: 1, priceScaleId: "ichimoku" });
           senkouA.setData(data.senkouA.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ICHIMOKU-senkouA", senkouA);
           const senkouB = chart.addLineSeries({ color: "#e91e63", lineWidth: 1, priceScaleId: "ichimoku" });
           senkouB.setData(data.senkouB.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("ICHIMOKU-senkouB", senkouB);
           break;
         }
         case "PARABOLIC_SAR": {
           const data = parabolicSar(indCandles, config.defaultParams.startAccel, config.defaultParams.maxAccel);
           const s = chart.addLineSeries({ color: config.color, lineWidth: 1, priceScaleId: "right" });
           s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
           indicatorSeriesRef.current.set("PARABOLIC_SAR", s);
           break;
         }
         case "PIVOT_POINTS": {
           const pp = pivotPoints(indCandles);
           if (!pp) break;
           const levels = [
             { value: pp.pivot, label: "P" },
             { value: pp.r1, label: "R1" },
             { value: pp.r2, label: "R2" },
             { value: pp.r3, label: "R3" },
             { value: pp.s1, label: "S1" },
             { value: pp.s2, label: "S2" },
             { value: pp.s3, label: "S3" },
           ];
           levels.forEach((lvl) => {
             const s = chart.addLineSeries({
               color: config.color,
               lineWidth: 1,
               lineStyle: LineStyle.Dashed,
               priceScaleId: "right",
             });
             s.setData([{ time: indCandles[0]!.time as Time, value: lvl.value }]);
             indicatorSeriesRef.current.set(`PIVOT-${lvl.label}`, s);
           });
           break;
         }
         case "FIBONACCI": {
           const fib = fibonacciRetracement(indCandles, config.defaultParams.lookback);
           if (!fib) break;
           fib.forEach((level) => {
             const s = chart.addLineSeries({
               color: config.color,
               lineWidth: 1,
               lineStyle: LineStyle.Dashed,
               priceScaleId: "right",
             });
             s.setData([{ time: indCandles[0]!.time as Time, value: level.price }]);
             indicatorSeriesRef.current.set(`FIB-${level.label}`, s);
           });
           break;
         }
      }
    }
    // chartRef/candleSeriesRef are stable refs; colors derived from isDark dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, chartData, isDark, pineScriptSource]);
}
