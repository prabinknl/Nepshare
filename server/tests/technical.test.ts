import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  analyzeTechnicalSetup
} from '../engine/technicalAnalysis.js';
import { Candle } from '../providers/types.js';

describe('Technical Analysis Engine', () => {
  it('calculates Simple Moving Average (SMA) accurately', () => {
    const data = [10, 20, 30, 40, 50];
    const sma3 = calculateSMA(data, 3);
    // (30 + 40 + 50) / 3 = 40
    expect(sma3).toBe(40);

    const sma5 = calculateSMA(data, 5);
    // (10 + 20 + 30 + 40 + 50) / 5 = 30
    expect(sma5).toBe(30);

    // If data length is less than period, should return null
    expect(calculateSMA([10, 20], 5)).toBeNull();
  });

  it('calculates Relative Strength Index (RSI) within bounds [0, 100]', () => {
    // 20 rising closes
    const rising = Array.from({ length: 25 }, (_, i) => 100 + i * 2);
    const rsiBull = calculateRSI(rising, 14);
    expect(rsiBull).not.toBeNull();
    expect(rsiBull!).toBeGreaterThan(70);

    // 20 declining closes
    const declining = Array.from({ length: 25 }, (_, i) => 200 - i * 3);
    const rsiBear = calculateRSI(declining, 14);
    expect(rsiBear).not.toBeNull();
    expect(rsiBear!).toBeLessThan(35);
  });

  it('calculates MACD values correctly', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 500 + Math.sin(i / 3) * 20);
    const macd = calculateMACD(closes);
    expect(macd).not.toBeNull();
    expect(typeof macd!.macdLine).toBe('number');
    expect(typeof macd!.signalLine).toBe('number');
    expect(typeof macd!.histogram).toBe('number');
    expect(macd!.histogram).toBeCloseTo(macd!.macdLine - macd!.signalLine, 1);
  });

  it('suppresses actionable signals when historical data is insufficient (< 30 bars)', () => {
    const shortCandles: Candle[] = [
      { date: '2081-06-01', open: 500, high: 510, low: 495, close: 505, volume: 1000 },
      { date: '2081-06-02', open: 505, high: 515, low: 500, close: 512, volume: 1200 }
    ];

    const result = analyzeTechnicalSetup('NABIL', shortCandles);
    expect(result.signal).toBe('INSUFFICIENT_DATA');
    expect(result.entryRange).toBeNull();
    expect(result.stopLoss).toBeNull();
    expect(result.exitTarget).toBeNull();
  });

  it('generates transparent rule-based signal with support, resistance, and invalidation for 60-bar series', () => {
    const candles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      date: `2081-0${Math.floor(i / 30) + 1}-${(i % 28) + 1}`,
      open: 500 + i * 1.5,
      high: 505 + i * 1.5,
      low: 495 + i * 1.5,
      close: 502 + i * 1.5,
      volume: 20000 + i * 200
    }));

    const result = analyzeTechnicalSetup('UPPER', candles);
    expect(['POTENTIAL_BUY_SETUP', 'HOLD_WATCH', 'POTENTIAL_SELL_SETUP']).toContain(result.signal);
    expect(result.supportLevel).toBeGreaterThan(0);
    expect(result.resistanceLevel).toBeGreaterThan(0);
    expect(result.invalidationEn).toBeTruthy();
    expect(result.invalidationNe).toBeTruthy();
  });
});
