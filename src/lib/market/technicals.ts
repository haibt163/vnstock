import type { PricePoint } from "./types.ts";

function closes(series: PricePoint[]): number[] {
  return series.map((p) => p.close);
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function macd(values: number[]): { macd: number; signal: number; hist: number } | null {
  if (values.length < 26) return null;
  const ema = (period: number) => {
    const k = 2 / (period + 1);
    let prev = values[0];
    for (let i = 1; i < values.length; i++) prev = values[i] * k + prev * (1 - k);
    return prev;
  };
  const line = ema(12) - ema(26);
  const signal = line * 0.2;
  return { macd: line, signal, hist: line - signal };
}

export function supportResistance(series: PricePoint[]): { support: number | null; resistance: number | null } {
  if (series.length < 5) return { support: null, resistance: null };
  const window = series.slice(-60);
  const lows = window.map((p) => p.low);
  const highs = window.map((p) => p.high);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

export interface DerivedTechnicals {
  ma20: number | null;
  ma50: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; hist: number } | null;
  support: number | null;
  resistance: number | null;
  lastClose: number | null;
}

export function deriveTechnicals(series: PricePoint[]): DerivedTechnicals {
  const c = closes(series);
  const sr = supportResistance(series);
  return {
    ma20: sma(c, 20),
    ma50: sma(c, 50),
    rsi14: rsi(c, 14),
    macd: macd(c),
    support: sr.support,
    resistance: sr.resistance,
    lastClose: c.length ? c[c.length - 1] : null,
  };
}
