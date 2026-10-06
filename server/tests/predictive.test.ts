import { describe, it, expect } from 'vitest';
import { generatePredictiveOutlook } from '../engine/predictiveEngine.js';
import { Candle } from '../providers/types.js';

describe('Predictive Scenario Engine', () => {
  it('returns unavailable status when historical sessions are under 30', () => {
    const shortCandles: Candle[] = [
      { date: '2081-06-01', open: 500, high: 510, low: 495, close: 505, volume: 1000 }
    ];

    const result = generatePredictiveOutlook('NABIL', shortCandles);
    expect(result.isAvailable).toBe(false);
    expect(result.nextSession).toBeNull();
    expect(result.next5Sessions).toBeNull();
    expect(result.validation).toBeNull();
    expect(result.descriptiveTrendEn).toContain('Prediction unavailable');
  });

  it('generates 1-day and 5-day scenario envelopes with walk-forward validation for sufficient data', () => {
    const candles: Candle[] = Array.from({ length: 65 }, (_, i) => ({
      date: `2081-0${Math.floor(i / 30) + 1}-${(i % 28) + 1}`,
      open: 500 + Math.sin(i / 4) * 25,
      high: 505 + Math.sin(i / 4) * 25,
      low: 495 + Math.sin(i / 4) * 25,
      close: 500 + Math.sin(i / 4) * 25,
      volume: 25000
    }));

    const result = generatePredictiveOutlook('SHIVM', candles);
    expect(result.isAvailable).toBe(true);
    expect(result.nextSession).not.toBeNull();
    expect(result.next5Sessions).not.toBeNull();

    // Verify scenarios exist
    expect(result.nextSession!.bullish.range.high).toBeGreaterThan(result.nextSession!.bullish.range.low);
    expect(result.nextSession!.bearish.range.low).toBeLessThan(result.currentLtp);

    // Verify walk-forward validation
    expect(result.validation).not.toBeNull();
    expect(result.validation!.testSessionsCount).toBeGreaterThan(20);
    expect(result.validation!.directionalAccuracyPct).toBeGreaterThanOrEqual(0);
    expect(result.validation!.directionalAccuracyPct).toBeLessThanOrEqual(100);

    // Verify disclaimers exist
    expect(result.disclaimerEn).toBeTruthy();
    expect(result.disclaimerNe).toBeTruthy();
  });
});
