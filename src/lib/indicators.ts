/**
 * Technical Indicator Calculations
 * Pure functions for computing chart indicators from OHLCV candle data.
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

// ── Simple Moving Average ────────────────────────────────────
export function sma(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i]!.close;

  result.push({ time: candles[period - 1]!.time, value: sum / period });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i]!.close - candles[i - period]!.close;
    result.push({ time: candles[i]!.time, value: sum / period });
  }
  return result;
}

// ── Exponential Moving Average ───────────────────────────────
export function ema(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period) return result;

  const k = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i]!.close;
  let prev = sum / period;
  result.push({ time: candles[period - 1]!.time, value: prev });

  for (let i = period; i < candles.length; i++) {
    prev = candles[i]!.close * k + prev * (1 - k);
    result.push({ time: candles[i]!.time, value: prev });
  }
  return result;
}

// ── Relative Strength Index ──────────────────────────────────
export function rsi(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  // First period
  for (let i = 1; i <= period; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result.push({ time: candles[period]!.time, value: rs0 });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsiVal = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push({ time: candles[i]!.time, value: rsiVal });
  }
  return result;
}

// ── MACD ─────────────────────────────────────────────────────
export interface MACDResult {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}

export function macd(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const fastEma = ema(candles, fastPeriod);
  const slowEma = ema(candles, slowPeriod);

  // Align by time
  const slowTimes = new Map(slowEma.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = [];
  for (const fp of fastEma) {
    const sv = slowTimes.get(fp.time);
    if (sv !== undefined) {
      macdLine.push({ time: fp.time, value: fp.value - sv });
    }
  }

  // Signal line = EMA of MACD line
  const signalLine: IndicatorPoint[] = [];
  if (macdLine.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdLine[i]!.value;
    let prev = sum / signalPeriod;
    signalLine.push({ time: macdLine[signalPeriod - 1]!.time, value: prev });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      prev = macdLine[i]!.value * k + prev * (1 - k);
      signalLine.push({ time: macdLine[i]!.time, value: prev });
    }
  }

  // Histogram = MACD - Signal
  const signalTimes = new Map(signalLine.map((p) => [p.time, p.value]));
  const histogram: IndicatorPoint[] = [];
  for (const mp of macdLine) {
    const sv = signalTimes.get(mp.time);
    if (sv !== undefined) {
      histogram.push({ time: mp.time, value: mp.value - sv });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ── Bollinger Bands ──────────────────────────────────────────
export interface BollingerResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

export function bollingerBands(
  candles: CandleData[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerResult {
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  if (candles.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j]!.close;
    const avg = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (candles[j]!.close - avg) ** 2;
    }
    const stdDev = Math.sqrt(variance / period);

    const t = candles[i]!.time;
    middle.push({ time: t, value: avg });
    upper.push({ time: t, value: avg + stdDevMultiplier * stdDev });
    lower.push({ time: t, value: avg - stdDevMultiplier * stdDev });
  }

  return { upper, middle, lower };
}

// ── Average True Range ───────────────────────────────────────
export function atr(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period + 1) return result;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i]!.high - candles[i]!.low,
      Math.abs(candles[i]!.high - candles[i - 1]!.close),
      Math.abs(candles[i]!.low - candles[i - 1]!.close),
    );
    trs.push(tr);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i]!;
  let prev = sum / period;
  result.push({ time: candles[period]!.time, value: prev });

  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]!) / period;
    result.push({ time: candles[i + 1]!.time, value: prev });
  }
  return result;
}

// ── Stochastic Oscillator ────────────────────────────────────
export interface StochasticResult {
  k: IndicatorPoint[];
  d: IndicatorPoint[];
}

export function stochastic(candles: CandleData[], kPeriod = 14, dPeriod = 3): StochasticResult {
  const kLine: IndicatorPoint[] = [];
  if (candles.length < kPeriod) return { k: [], d: [] };

  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j]!.high > highest) highest = candles[j]!.high;
      if (candles[j]!.low < lowest) lowest = candles[j]!.low;
    }
    const range = highest - lowest;
    const kVal = range === 0 ? 50 : ((candles[i]!.close - lowest) / range) * 100;
    kLine.push({ time: candles[i]!.time, value: kVal });
  }

  // %D = SMA of %K
  const dLine: IndicatorPoint[] = [];
  if (kLine.length >= dPeriod) {
    let sum = 0;
    for (let i = 0; i < dPeriod; i++) sum += kLine[i]!.value;
    dLine.push({ time: kLine[dPeriod - 1]!.time, value: sum / dPeriod });
    for (let i = dPeriod; i < kLine.length; i++) {
      sum += kLine[i]!.value - kLine[i - dPeriod]!.value;
      dLine.push({ time: kLine[i]!.time, value: sum / dPeriod });
    }
  }

  return { k: kLine, d: dLine };
}

// ── Volume Weighted Average Price ────────────────────────────
export function vwap(candles: CandleData[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let cumVolPrice = 0;
  let cumVol = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumVolPrice += typicalPrice * vol;
    cumVol += vol;
    result.push({ time: c.time, value: cumVolPrice / cumVol });
  }
  return result;
}

// ── On-Balance Volume ──────────────────────────────────
export function obv(candles: CandleData[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < 2) return result;

  let obv = 0;
  const firstVol = candles[0]!.volume || 0;
  obv += candles[0]!.close >= candles[0]!.open ? firstVol : -firstVol;
  result.push({ time: candles[0]!.time, value: obv });

  for (let i = 1; i < candles.length; i++) {
    const vol = candles[i]!.volume || 0;
    if (candles[i]!.close >= candles[i]!.open) obv += vol;
    else obv -= vol;
    result.push({ time: candles[i]!.time, value: obv });
  }
  return result;
}

// ── Williams %R ────────────────────────────────────────
export function williamsR(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j]!.high > highest) highest = candles[j]!.high;
      if (candles[j]!.low < lowest) lowest = candles[j]!.low;
    }
    const range = highest - lowest;
    const val = range === 0 ? -50 : -((highest - candles[i]!.close) / range) * 100;
    result.push({ time: candles[i]!.time, value: val });
  }
  return result;
}

// ── Momentum ────────────────────────────────────────────
export function momentum(candles: CandleData[], period = 10): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period + 1) return result;

  for (let i = period; i < candles.length; i++) {
    result.push({ time: candles[i]!.time, value: candles[i]!.close - candles[i - period]!.close });
  }
  return result;
}

// ── Aroon ───────────────────────────────────────────────
export interface AroonResult {
  aroonUp: IndicatorPoint[];
  aroonDown: IndicatorPoint[];
}

export function aroon(candles: CandleData[], period = 14): AroonResult {
  const aroonUp: IndicatorPoint[] = [];
  const aroonDown: IndicatorPoint[] = [];
  if (candles.length < period) return { aroonUp, aroonDown };

  for (let i = period - 1; i < candles.length; i++) {
    let highestIdx = i;
    let lowestIdx = i;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j]!.high > candles[highestIdx]!.high) highestIdx = j;
      if (candles[j]!.low < candles[lowestIdx]!.low) lowestIdx = j;
    }
    const aroonUpVal = ((period - (i - highestIdx)) / period) * 100;
    const aroonDownVal = ((period - (i - lowestIdx)) / period) * 100;
    aroonUp.push({ time: candles[i]!.time, value: aroonUpVal });
    aroonDown.push({ time: candles[i]!.time, value: aroonDownVal });
  }
  return { aroonUp, aroonDown };
}

// ── Commodity Channel Index ────────────────────────────
export function cci(candles: CandleData[], period = 20, constant = 0.015): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let sumTypical = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumTypical += (candles[j]!.high + candles[j]!.low + candles[j]!.close) / 3;
    }
    const mean = sumTypical / period;

    let sumDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const typical = (candles[j]!.high + candles[j]!.low + candles[j]!.close) / 3;
      sumDev += Math.abs(typical - mean);
    }
    const meanDev = sumDev / period;

    const val = meanDev === 0 ? 0 : (candles[i]!.close - mean) / (constant * meanDev);
    result.push({ time: candles[i]!.time, value: val });
  }
  return result;
}

// ── Average Directional Index ──────────────────────────
export interface ADXResult {
  adx: IndicatorPoint[];
  diPlus: IndicatorPoint[];
  diMinus: IndicatorPoint[];
}

export function adx(candles: CandleData[], period = 14): ADXResult {
  const adxLine: IndicatorPoint[] = [];
  const diPlusLine: IndicatorPoint[] = [];
  const diMinusLine: IndicatorPoint[] = [];
  if (candles.length < period + 1) return { adx: adxLine, diPlus: diPlusLine, diMinus: diMinusLine };

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i]!.high - candles[i]!.low,
      Math.abs(candles[i]!.high - candles[i - 1]!.close),
      Math.abs(candles[i]!.low - candles[i - 1]!.close),
    );
    trs.push(tr);

    const upMove = candles[i]!.high - candles[i - 1]!.high;
    const downMove = candles[i - 1]!.low - candles[i]!.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Seed with SMA for first period
  let sumTR = 0, sumPlus = 0, sumMinus = 0;
  for (let i = 0; i < period; i++) {
    sumTR += trs[i]!;
    sumPlus += plusDMs[i]!;
    sumMinus += minusDMs[i]!;
  }

  let prevTR = sumTR / period;
  let prevPlus = (sumPlus / period) * 100 / prevTR;
  let prevMinus = (sumMinus / period) * 100 / prevTR;

  const startIdx = period;
  diPlusLine.push({ time: candles[startIdx]!.time, value: prevPlus });
  diMinusLine.push({ time: candles[startIdx]!.time, value: prevMinus });

  for (let i = startIdx + 1; i < candles.length; i++) {
    prevTR = (prevTR * (period - 1) + trs[i - 1]!) / period;
    prevPlus = (prevPlus * (period - 1) + plusDMs[i - 1]! * 100 / (prevTR || 1)) / period;
    prevMinus = (prevMinus * (period - 1) + minusDMs[i - 1]! * 100 / (prevTR || 1)) / period;

    const dx = Math.abs(prevPlus - prevMinus) / (prevPlus + prevMinus || 1) * 100;
    if (i >= startIdx + period - 1) {
      adxLine.push({ time: candles[i]!.time, value: dx });
    }
    diPlusLine.push({ time: candles[i]!.time, value: prevPlus });
    diMinusLine.push({ time: candles[i]!.time, value: prevMinus });
  }

  return { adx: adxLine, diPlus: diPlusLine, diMinus: diMinusLine };
}

// ── Ichimoku Cloud ─────────────────────────────────────
export interface IchimokuResult {
  tenkan: IndicatorPoint[];
  kijun: IndicatorPoint[];
  senkouA: IndicatorPoint[];
  senkouB: IndicatorPoint[];
  chikou: IndicatorPoint[];
}

export function ichimoku(
  candles: CandleData[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52,
): IchimokuResult {
  const tenkan: IndicatorPoint[] = [];
  const kijun: IndicatorPoint[] = [];
  const senkouA: IndicatorPoint[] = [];
  const senkouB: IndicatorPoint[] = [];
  const chikou: IndicatorPoint[] = [];

  if (candles.length < senkouBPeriod) return { tenkan, kijun, senkouA, senkouB, chikou };

  for (let i = 0; i < candles.length; i++) {
    // Tenkan-sen
    if (i >= tenkanPeriod - 1) {
      let high = -Infinity, low = Infinity;
      for (let j = i - tenkanPeriod + 1; j <= i; j++) {
        if (candles[j]!.high > high) high = candles[j]!.high;
        if (candles[j]!.low < low) low = candles[j]!.low;
      }
      tenkan.push({ time: candles[i]!.time, value: (high + low) / 2 });
    }

    // Kijun-sen
    if (i >= kijunPeriod - 1) {
      let high = -Infinity, low = Infinity;
      for (let j = i - kijunPeriod + 1; j <= i; j++) {
        if (candles[j]!.high > high) high = candles[j]!.high;
        if (candles[j]!.low < low) low = candles[j]!.low;
      }
      kijun.push({ time: candles[i]!.time, value: (high + low) / 2 });
    }

    // Senkou Span A (leading span A)
    if (i >= kijunPeriod - 1 && tenkan.length > 0 && kijun.length > 0) {
      const tVal = tenkan[tenkan.length - 1]!.value;
      const kVal = kijun[kijun.length - 1]!.value;
      senkouA.push({ time: candles[i]!.time, value: (tVal + kVal) / 2 });
    }

    // Senkou Span B (leading span B)
    if (i >= senkouBPeriod - 1) {
      let high = -Infinity, low = Infinity;
      for (let j = i - senkouBPeriod + 1; j <= i; j++) {
        if (candles[j]!.high > high) high = candles[j]!.high;
        if (candles[j]!.low < low) low = candles[j]!.low;
      }
      senkouB.push({ time: candles[i]!.time, value: (high + low) / 2 });
    }

    // Chikou Span (lagging span)
    chikou.push({ time: candles[i]!.time, value: candles[i]!.close });
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

// ── Parabolic SAR ──────────────────────────────────────
export function parabolicSar(
  candles: CandleData[],
  startAccel = 0.02,
  maxAccel = 0.2,
  step = 0.02,
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length < 2) return result;

  let af = startAccel;
  let ep = candles[0]!.low;
  let isLong = candles[1]!.high > candles[0]!.high;
  let sar = isLong ? Math.min(candles[0]!.low, candles[1]!.low) : Math.max(candles[0]!.high, candles[1]!.high);

  for (let i = 0; i < candles.length; i++) {
    result.push({ time: candles[i]!.time, value: sar });

    if (i < candles.length - 1) {
      const prevCandle = candles[i]!;
      const currCandle = candles[i + 1]!;

      if (isLong) {
        if (currCandle.low < sar) {
          isLong = false;
          sar = ep;
          af = startAccel;
          ep = currCandle.high;
        } else {
          if (currCandle.high > ep) {
            ep = currCandle.high;
            af = Math.min(af + step, maxAccel);
          }
          sar = sar + af * (ep - sar);
          const minLow = Math.min(prevCandle.low, currCandle.low);
          if (sar > minLow) sar = minLow;
        }
      } else {
        if (currCandle.high > sar) {
          isLong = true;
          sar = ep;
          af = startAccel;
          ep = currCandle.low;
        } else {
          if (currCandle.low < ep) {
            ep = currCandle.low;
            af = Math.min(af + step, maxAccel);
          }
          sar = sar + af * (ep - sar);
          const maxHigh = Math.max(prevCandle.high, currCandle.high);
          if (sar < maxHigh) sar = maxHigh;
        }
      }
    }
  }
  return result;
}

// ── Pivot Points ───────────────────────────────────────
export interface PivotPointResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function pivotPoints(candles: CandleData[]): PivotPointResult | null {
  if (candles.length < 2) return null;

  const prev = candles[candles.length - 2]!;
  const high = prev.high;
  const low = prev.low;
  const close = prev.close;

  const pivot = (high + low + close) / 3;
  const range = high - low;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + range,
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - range,
    s3: low - 2 * (high - pivot),
  };
}

// ── Fibonacci Retracement ──────────────────────────────
export interface FibonacciLevel {
  ratio: number;
  label: string;
  price: number;
}

export function fibonacciRetracement(
  candles: CandleData[],
  lookback = 50,
): FibonacciLevel[] | null {
  if (candles.length < lookback) return null;

  const slice = candles.slice(-lookback);
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const diff = high - low;

  const ratios = [
    { ratio: 0, label: "0%" },
    { ratio: 0.236, label: "23.6%" },
    { ratio: 0.382, label: "38.2%" },
    { ratio: 0.5, label: "50%" },
    { ratio: 0.618, label: "61.8%" },
    { ratio: 0.786, label: "78.6%" },
    { ratio: 1, label: "100%" },
  ];

  return ratios.map((r) => ({
    ratio: r.ratio,
    label: r.label,
    price: low + diff * r.ratio,
  }));
}

// ── Indicator Registry (for UI) ──────────────────────────
export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BOLL"
  | "ATR"
  | "STOCH"
  | "VWAP"
  | "OBV"
  | "WILLIAMS_R"
  | "MOMENTUM"
  | "AROON"
  | "CCI"
  | "ADX"
  | "ICHIMOKU"
  | "PARABOLIC_SAR"
  | "PIVOT_POINTS"
  | "FIBONACCI"
  | "PINESCRIPT";

export type IndicatorPane = "overlay" | "below";

export interface IndicatorConfig {
  type: IndicatorType;
  label: string;
  pane: IndicatorPane;
  defaultParams: Record<string, number>;
  color: string;
}

export const INDICATOR_REGISTRY: IndicatorConfig[] = [
  {
    type: "SMA",
    label: "Simple Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    color: "#f0b90b",
  },
  {
    type: "EMA",
    label: "Exponential Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    color: "#e377c2",
  },
  {
    type: "RSI",
    label: "Relative Strength Index",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#8884d8",
  },
  {
    type: "MACD",
    label: "MACD",
    pane: "below",
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    color: "#2196f3",
  },
  {
    type: "BOLL",
    label: "Bollinger Bands",
    pane: "overlay",
    defaultParams: { period: 20, stdDev: 2 },
    color: "#26a69a",
  },
  {
    type: "ATR",
    label: "Average True Range",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#ff7043",
  },
  {
    type: "STOCH",
    label: "Stochastic Oscillator",
    pane: "below",
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    color: "#ab47bc",
  },
  {
    type: "VWAP",
    label: "Volume Weighted Avg Price",
    pane: "overlay",
    defaultParams: {},
    color: "#42a5f5",
  },
  {
    type: "PINESCRIPT",
    label: "PineScript Indicator",
    pane: "overlay",
    defaultParams: {},
    color: "#00ff88",
  },
  {
    type: "OBV",
    label: "On-Balance Volume",
    pane: "below",
    defaultParams: {},
    color: "#607d8b",
  },
  {
    type: "WILLIAMS_R",
    label: "Williams %R",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#ff5722",
  },
  {
    type: "MOMENTUM",
    label: "Momentum",
    pane: "below",
    defaultParams: { period: 10 },
    color: "#00bcd4",
  },
  {
    type: "AROON",
    label: "Aroon",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#795548",
  },
  {
    type: "CCI",
    label: "Commodity Channel Index",
    pane: "below",
    defaultParams: { period: 20 },
    color: "#ff9800",
  },
  {
    type: "ADX",
    label: "Average Directional Index",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#9c27b0",
  },
  {
    type: "ICHIMOKU",
    label: "Ichimoku Cloud",
    pane: "overlay",
    defaultParams: { tenkan: 9, kijun: 26, senkouB: 52 },
    color: "#4caf50",
  },
  {
    type: "PARABOLIC_SAR",
    label: "Parabolic SAR",
    pane: "overlay",
    defaultParams: { startAccel: 0.02, maxAccel: 0.2 },
    color: "#f44336",
  },
  {
    type: "PIVOT_POINTS",
    label: "Pivot Points",
    pane: "overlay",
    defaultParams: {},
    color: "#e91e63",
  },
  {
    type: "FIBONACCI",
    label: "Fibonacci Retracement",
    pane: "overlay",
    defaultParams: { lookback: 50 },
    color: "#2196f3",
  },
];
