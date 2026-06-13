// Pure mathematical calculation helpers for technical analysis indicators.
// Keep pure, dependency-free, and server-safe.

/** Calculate Simple Moving Average (SMA) */
export function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/** Calculate Exponential Moving Average (EMA) */
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  // Start with SMA as initial value
  let sum = 0;
  const startLength = Math.min(closes.length, period);
  for (let i = 0; i < startLength; i++) {
    sum += closes[i];
  }
  let currentEma = sum / startLength;
  ema.push(currentEma);

  for (let i = 1; i < closes.length; i++) {
    currentEma = closes[i] * k + currentEma * (1 - k);
    ema.push(currentEma);
  }
  return ema;
}

/** Calculate Relative Strength Index (RSI - 14) */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let gains = 0;
  let losses = 0;

  // First values
  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Calculate Bollinger Bands (20 periods, 2 standard deviations) */
export function calculateBollinger(
  closes: number[],
  period = 20,
  multiplier = 2
): { upper: number; middle: number; lower: number; position: number } | null {
  if (closes.length < period) return null;
  const middle = calculateSMA(closes, period);
  if (middle === null) return null;

  const slice = closes.slice(-period);
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  
  const current = closes[closes.length - 1];
  const position = upper !== lower ? (current - lower) / (upper - lower) : 0.5;

  return { upper, middle, lower, position };
}

/** Calculate MACD (12, 26, 9) */
export function calculateMACD(
  closes: number[],
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
): { macd: number; signal: number; histogram: number; signalLabel: string } | null {
  if (closes.length < longPeriod) return null;

  const emaShort = calculateEMA(closes, shortPeriod);
  const emaLong = calculateEMA(closes, longPeriod);

  // MACD line is difference between short EMA and long EMA
  const macdLine: number[] = [];
  const startIdx = emaShort.length - emaLong.length;
  for (let i = 0; i < emaLong.length; i++) {
    macdLine.push(emaShort[startIdx + i] - emaLong[i]);
  }

  if (macdLine.length < signalPeriod) return null;

  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  const macdVal = macdLine[macdLine.length - 1];
  const signalVal = signalLine[signalLine.length - 1];
  const histogram = macdVal - signalVal;

  let signalLabel = "Neutral";
  if (histogram > 0) {
    signalLabel = macdVal > 0 ? "Bullish (above 0)" : "Bullish Crossover";
  } else if (histogram < 0) {
    signalLabel = macdVal < 0 ? "Bearish (below 0)" : "Bearish Crossover";
  }

  return { macd: macdVal, signal: signalVal, histogram, signalLabel };
}

/** Calculate Annualized Volatility */
export function calculateVolatility(closes: number[]): number | null {
  if (closes.length < 5) return null;
  
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  if (returns.length < 2) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  const dailyStdDev = Math.sqrt(variance);

  // Annualize daily standard deviation (assuming 252 trading days)
  return dailyStdDev * Math.sqrt(252) * 100;
}

/** Determine if Golden Cross (50 SMA above 200 SMA) or Death Cross */
export function calculateGoldenCross(closes: number[]): boolean | null {
  if (closes.length < 200) return null;
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  if (sma50 === null || sma200 === null) return null;
  return sma50 > sma200;
}
