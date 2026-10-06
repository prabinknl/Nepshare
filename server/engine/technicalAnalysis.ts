import { Candle } from '../providers/types.js';
import { formatNepalDateTime } from './nepaliCalendar.js';

export type SignalType = 'POTENTIAL_BUY_SETUP' | 'HOLD_WATCH' | 'POTENTIAL_SELL_SETUP' | 'INSUFFICIENT_DATA';

export interface IndicatorValues {
  ltp: number;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  volumeRatio: number | null; // latest volume / 20-day average
  supportLevel: number | null;
  resistanceLevel: number | null;
}

export interface TechnicalSignalResult {
  symbol: string;
  signal: SignalType;
  signalLabelEn: string;
  signalLabelNe: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  analysisTimeNPT: string;
  intendedHoldingPeriodEn: string;
  intendedHoldingPeriodNe: string;
  
  // Numerical levels (when supported by data)
  supportLevel: number | null;
  resistanceLevel: number | null;
  entryRange: { min: number; max: number } | null;
  exitTarget: number | null;
  stopLoss: number | null;
  riskRewardRatio: string | null;

  // Transparent explanation of rules triggered
  reasonsEn: string[];
  reasonsNe: string[];
  
  // Main risks
  risksEn: string[];
  risksNe: string[];

  // Invalidation condition
  invalidationEn: string;
  invalidationNe: string;

  indicators: IndicatorValues;
  disclaimer: string;
}

export function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Math.round((sum / period) * 100) / 100;
}

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const emaValues: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const ema = data[i] * k + emaValues[i - 1] * (1 - k);
    emaValues.push(ema);
  }
  return emaValues;
}

export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Math.round(rsi * 10) / 10;
}

export function calculateMACD(closes: number[]): { macdLine: number; signalLine: number; histogram: number } | null {
  if (closes.length < 26) return null;

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdSeries.push(ema12[i] - ema26[i]);
  }

  const signalSeries = calculateEMA(macdSeries, 9);
  const lastIndex = closes.length - 1;

  const macdLine = Math.round(macdSeries[lastIndex] * 100) / 100;
  const signalLine = Math.round(signalSeries[lastIndex] * 100) / 100;
  const histogram = Math.round((macdLine - signalLine) * 100) / 100;

  return { macdLine, signalLine, histogram };
}

export function analyzeTechnicalSetup(
  symbol: string,
  candles: Candle[],
  options?: { isStale?: boolean }
): TechnicalSignalResult {
  const analysisTimeNPT = formatNepalDateTime();
  const disclaimer = 'Rule-based technical analysis for informational evaluation only. This indicator score does not represent a probability of profit and does not guarantee returns.';

  if (options?.isStale) {
    return {
      symbol,
      signal: 'INSUFFICIENT_DATA',
      signalLabelEn: 'Data Stale (Signals Suppressed)',
      signalLabelNe: 'डेटा पुरानो (विश्लेषण स्थगित)',
      badgeColor: 'slate',
      analysisTimeNPT,
      intendedHoldingPeriodEn: 'N/A',
      intendedHoldingPeriodNe: 'लागु हुँदैन',
      supportLevel: null,
      resistanceLevel: null,
      entryRange: null,
      exitTarget: null,
      stopLoss: null,
      riskRewardRatio: null,
      reasonsEn: ['Actionable signal suppressed: Market data is currently stale or unverified. Real-time/fresh feed is required before evaluating setups.'],
      reasonsNe: ['संकेत स्थगित: बजार डेटा पुरानो वा अपुष्ट रहेकोले प्राविधिक विश्लेषण स्थगित गरिएको छ।'],
      risksEn: ['Acting on outdated price information introduces execution slippage and pricing disparity.'],
      risksNe: ['पुरानो मूल्यमा कारोबार गर्दा वास्तविक बजारमा घाटा हुनसक्छ।'],
      invalidationEn: 'Wait until fresh live or verified end-of-day market feeds resume.',
      invalidationNe: 'ताजा बजार विवरण प्राप्त नभएसम्म प्रतीक्षा गर्नुहोस्।',
      indicators: {
        ltp: candles.length > 0 ? candles[candles.length - 1].close : 0,
        sma20: null,
        sma50: null,
        rsi14: null,
        macd: null,
        volumeRatio: null,
        supportLevel: null,
        resistanceLevel: null
      },
      disclaimer
    };
  }

  if (!candles || candles.length < 30) {
    return {
      symbol,
      signal: 'INSUFFICIENT_DATA',
      signalLabelEn: 'Insufficient Data',
      signalLabelNe: 'अपर्याप्त डेटा',
      badgeColor: 'slate',
      analysisTimeNPT,
      intendedHoldingPeriodEn: 'N/A',
      intendedHoldingPeriodNe: 'लागु हुँदैन',
      supportLevel: null,
      resistanceLevel: null,
      entryRange: null,
      exitTarget: null,
      stopLoss: null,
      riskRewardRatio: null,
      reasonsEn: ['Fewer than 30 trading sessions recorded. Technical indicators require sufficient historical depth to produce reliable signals.'],
      reasonsNe: ['३० भन्दा कम कारोबार दिनको डेटा उपलब्ध छ। प्राविधिक विश्लेषणका लागि कम्तीमा ३० दिनको कारोबार इतिहास आवश्यक हुन्छ।'],
      risksEn: ['Inadequate liquidity tracking', 'Distorted moving averages due to sparse volume'],
      risksNe: ['तरलता मापन गर्न नसकिने', 'कम कारोबारका कारण औसत मूल्य प्रभावित हुनसक्ने'],
      invalidationEn: 'Wait until scrip completes at least 30 continuous trading sessions.',
      invalidationNe: 'कम्पनीको कम्तीमा ३० नियमित कारोबार दिन पूरा नभएसम्म प्रतीक्षा गर्नुहोस्।',
      indicators: {
        ltp: candles.length > 0 ? candles[candles.length - 1].close : 0,
        sma20: null,
        sma50: null,
        rsi14: null,
        macd: null,
        volumeRatio: null,
        supportLevel: null,
        resistanceLevel: null
      },
      disclaimer
    };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const ltp = closes[closes.length - 1];

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  // Volume 20 avg
  const vol20 = calculateSMA(volumes, 20);
  const latestVol = volumes[volumes.length - 1];
  const volumeRatio = vol20 && vol20 > 0 ? Math.round((latestVol / vol20) * 100) / 100 : 1;

  // Support & Resistance from recent 30 sessions
  const recentSlice = candles.slice(-30);
  const supportLevel = Math.round(Math.min(...recentSlice.map(c => c.low)) * 10) / 10;
  const resistanceLevel = Math.round(Math.max(...recentSlice.map(c => c.high)) * 10) / 10;

  // Rule evaluation
  let buyScore = 0;
  let sellScore = 0;
  const reasonsEn: string[] = [];
  const reasonsNe: string[] = [];

  // RSI rules
  if (rsi14 !== null) {
    if (rsi14 <= 38) {
      buyScore += 2;
      reasonsEn.push(`RSI(14) is at ${rsi14} (approaching lower boundary <= 38), reflecting extended downward momentum.`);
      reasonsNe.push(`आरएसआइ (RSI) ${rsi14} विन्दुमा छ, जसले ३८ भन्दा तलको अधिक बिक्री सीमा नजिक पुगेको देखाउँछ।`);
    } else if (rsi14 >= 68) {
      sellScore += 2;
      reasonsEn.push(`RSI(14) is at ${rsi14} (approaching upper boundary >= 68), reflecting extended upward price moves.`);
      reasonsNe.push(`आरएसआइ (RSI) ${rsi14} विन्दुमा पुगेको छ, जहाँ माथिल्लो दायरा नजिक पुगेको देखिन्छ।`);
    } else {
      reasonsEn.push(`RSI(14) is neutral at ${rsi14}.`);
      reasonsNe.push(`आरएसआइ (RSI) ${rsi14} विन्दुमा सन्तुलित छ।`);
    }
  }

  // Moving Average rules
  if (sma20 !== null) {
    if (ltp > sma20) {
      buyScore += 1;
      reasonsEn.push(`Price is trading above its 20-day simple moving average (NPR ${sma20}), maintaining short-term upward momentum.`);
      reasonsNe.push(`मूल्य २० दिने औसत (NPR ${sma20}) भन्दा माथि कारोबार भइरहेकोले अल्पकालीन सकारात्मक गति देखिन्छ।`);
    } else {
      sellScore += 1;
      reasonsEn.push(`Price has dipped below its 20-day simple moving average (NPR ${sma20}).`);
      reasonsNe.push(`मूल्य २० दिने औसत (NPR ${sma20}) भन्दा तल झरेको छ।`);
    }
  }

  if (sma20 !== null && sma50 !== null) {
    if (sma20 >= sma50) {
      buyScore += 1;
      reasonsEn.push(`20-day SMA is positioned above the 50-day SMA, sustaining medium-term trend alignment.`);
      reasonsNe.push(`२० दिने औसत ५० दिने औसतभन्दा माथि रहेकोले मध्यमकालीन प्रवृत्ति सकारात्मक छ।`);
    } else {
      sellScore += 1;
      reasonsEn.push(`20-day SMA is below the 50-day SMA, indicating prevailing downward medium-term trend pressure.`);
      reasonsNe.push(`२० दिने औसत ५० दिने औसतभन्दा तल रहेकोले मध्यमकालीन दबाब कायमै छ।`);
    }
  }

  // MACD rules
  if (macd !== null) {
    if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
      buyScore += 1;
      reasonsEn.push(`MACD histogram is positive (+${macd.histogram}) with MACD line leading above signal line.`);
      reasonsNe.push(`एमएसीडी (MACD) सकारात्मक छ र सिग्नल रेखाभन्दा माथि रहेकोले खरिद गति बलियो देखिन्छ।`);
    } else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
      sellScore += 1;
      reasonsEn.push(`MACD histogram is negative (${macd.histogram}), signaling softening buying momentum.`);
      reasonsNe.push(`एमएसीडी (MACD) नकारात्मक विन्दुमा रहेकोले खरिदकर्ताको चाप केही घटेको देखिन्छ।`);
    }
  }

  // Volume rules
  if (volumeRatio && volumeRatio > 1.25) {
    if (ltp > (candles[candles.length - 2]?.close || ltp)) {
      buyScore += 1;
      reasonsEn.push(`Trading volume is ${volumeRatio}x its 20-day average on an advancing candle, confirming elevated buyer turnover participation.`);
      reasonsNe.push(`कारोबार कित्ता २० दिने औसतभन्दा ${volumeRatio} गुणा बढी छ, जसले बढ्दो मूल्यमा उच्च सहभागिता देखाउँछ।`);
    } else {
      sellScore += 1;
      reasonsEn.push(`High volume (${volumeRatio}x 20-day avg) on a red candle points to elevated selling volume.`);
      reasonsNe.push(`मूल्य घट्दा २० दिने औसतभन्दा ${volumeRatio} गुणा बढी कारोबार भएकाले उच्च बिक्री दबाब देखिन्छ।`);
    }
  }

  // Determine Signal Type
  let signal: SignalType = 'HOLD_WATCH';
  let signalLabelEn = 'Hold / Watch';
  let signalLabelNe = 'पर्ख र हेर (Hold/Watch)';
  let badgeColor: 'emerald' | 'amber' | 'rose' | 'slate' = 'amber';
  let intendedHoldingPeriodEn = '1 to 4 weeks (Range observation)';
  let intendedHoldingPeriodNe = '१ देखि ४ हप्ता (दायरा अवलोकन)';

  let entryRange: { min: number; max: number } | null = null;
  let exitTarget: number | null = null;
  let stopLoss: number | null = null;
  let riskRewardRatio: string | null = null;

  if (buyScore >= 4 && buyScore > sellScore + 1) {
    signal = 'POTENTIAL_BUY_SETUP';
    signalLabelEn = 'Potential Buy Setup';
    signalLabelNe = 'सम्भावित खरिद अवसर (Buy Setup)';
    badgeColor = 'emerald';
    intendedHoldingPeriodEn = 'Short to Medium-term (2 to 6 weeks)';
    intendedHoldingPeriodNe = 'अल्पकालीन देखि मध्यमकालीन (२ देखि ६ हप्ता)';

    // Entry near current or support
    const entryMin = Math.round(Math.max(supportLevel, ltp * 0.985) * 10) / 10;
    const entryMax = Math.round((ltp * 1.008) * 10) / 10;
    entryRange = { min: entryMin, max: entryMax };

    // Stop loss just below support
    stopLoss = Math.round((supportLevel * 0.975) * 10) / 10;
    
    // Target near resistance or +8% minimum
    exitTarget = Math.round(Math.max(resistanceLevel, ltp * 1.08) * 10) / 10;

    const risk = ltp - stopLoss;
    const reward = exitTarget - ltp;
    if (risk > 0 && reward > 0) {
      riskRewardRatio = `1 : ${(reward / risk).toFixed(1)}`;
    }
  } else if (sellScore >= 4 && sellScore > buyScore + 1) {
    signal = 'POTENTIAL_SELL_SETUP';
    signalLabelEn = 'Potential Sell Setup';
    signalLabelNe = 'सम्भावित बिक्री/नाफा सुरक्षित (Sell Setup)';
    badgeColor = 'rose';
    intendedHoldingPeriodEn = 'Immediate to 1 week (Defensive rebalancing)';
    intendedHoldingPeriodNe = 'तुरुन्त देखि १ हप्ता (जोखिम व्यवस्थापन)';

    stopLoss = Math.round((resistanceLevel * 1.025) * 10) / 10;
    exitTarget = Math.round(Math.min(supportLevel, ltp * 0.92) * 10) / 10;
    entryRange = null; // No buy entry for sell setup
  }

  // Risks identification
  const risksEn: string[] = [];
  const risksNe: string[] = [];

  if (latestVol < 15000) {
    risksEn.push('Low trading liquidity: Executing larger orders without slippage may be difficult.');
    risksNe.push('न्यून तरलता जोखिम: ठूलो परिमाणमा सेयर खरिद-बिक्री गर्दा मूल्यमा असर पर्न सक्छ।');
  }
  if (Math.abs(ltp - supportLevel) / ltp > 0.08) {
    risksEn.push('Extended distance to key support level increases potential downside volatility.');
    risksNe.push('सपोर्ट विन्दु निकै टाढा रहेकोले बजार करेक्सनमा धेरै घट्न सक्ने जोखिम रहन्छ।');
  }
  risksEn.push('Sector-wide regulatory announcements or sudden NEPSE index sentiment shifts.');
  risksNe.push('सम्बन्धित क्षेत्रको नीतिगत फेरबदल वा समग्र नेप्से बजारको गिरावट।');

  // Invalidation condition
  let invalidationEn = `A daily closing candle below NPR ${supportLevel} with elevated turnover would invalidate this setup.`;
  let invalidationNe = `दैनिक अन्तिम कारोबार मूल्य NPR ${supportLevel} भन्दा तल झरेर बन्द भएमा यो विश्लेषण बदर मानिनेछ।`;
  
  if (signal === 'POTENTIAL_SELL_SETUP') {
    invalidationEn = `A decisive daily breakout above NPR ${resistanceLevel} accompanied by 1.5x average volume would invalidate this sell signal.`;
    invalidationNe = `औसतभन्दा १.५ गुणा उच्च कारोबारसहित NPR ${resistanceLevel} भन्दा माथि बन्द भएमा यो बिक्री संकेत खारेज हुनेछ।`;
  }

  return {
    symbol,
    signal,
    signalLabelEn,
    signalLabelNe,
    badgeColor,
    analysisTimeNPT,
    intendedHoldingPeriodEn,
    intendedHoldingPeriodNe,
    supportLevel,
    resistanceLevel,
    entryRange,
    exitTarget,
    stopLoss,
    riskRewardRatio,
    reasonsEn,
    reasonsNe,
    risksEn,
    risksNe,
    invalidationEn,
    invalidationNe,
    indicators: {
      ltp,
      sma20,
      sma50,
      rsi14,
      macd,
      volumeRatio,
      supportLevel,
      resistanceLevel
    },
    disclaimer
  };
}
