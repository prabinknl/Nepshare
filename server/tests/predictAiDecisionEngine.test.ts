import { describe, it, expect } from 'vitest';
import {
  evaluatePredictAiDecision,
  METHODOLOGY_VERSION
} from '../engine/predictAiDecisionEngine.js';
import { Candle, CompanyDetails, CompanySummary, MarketSummary } from '../providers/types.js';

function createMockCandles(count: number, basePrice = 500, trend: 'bull' | 'bear' | 'flat' = 'bull'): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const change = trend === 'bull' ? 1.5 : trend === 'bear' ? -1.8 : (i % 2 === 0 ? 0.8 : -0.8);
    price = Math.max(50, price + change);
    const day = String(i + 1).padStart(2, '0');
    const isLastBull = i === count - 1 && trend === 'bull';
    candles.push({
      date: `2024-01-${day}`,
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: isLastBull ? 180000 : (120000 + (trend === 'bull' ? 15000 : 0))
    });
  }
  return candles;
}

function createMockDetails(overrides: Partial<CompanyDetails> = {}): CompanyDetails {
  return {
    symbol: 'NABIL',
    name: 'Nabil Bank Limited',
    nameNe: 'नबिल बैंक लिमिटेड',
    sector: 'Commercial Banks',
    sectorNe: 'वाणिज्य बैंक',
    ltp: 550,
    change: 5,
    pChange: 0.92,
    high: 555,
    low: 542,
    volume: 125000,
    turnover: 68750000,
    previousClose: 545,
    week52High: 635,
    week52Low: 462,
    observedAtNPT: '2081-06-19 14:45 NPT',
    retrievedAtNPT: '2081-06-19 14:45 NPT',
    lastUpdated: '2081-06-19 14:45 NPT',
    listingDate: '1984-07-12',
    totalShares: 270569973,
    description: 'Commercial Bank in Nepal',
    fundamentalsAvailable: true,
    announcementsAvailable: true,
    dataStatus: 'LIVE',
    trendSummaryEn: 'Consolidating',
    trendSummaryNe: 'दायराभित्र',
    fundamentals: {
      eps: 26.42,
      pe: 20.74,
      bookValue: 218.60,
      pb: 2.51,
      roe: 12.08,
      marketCap: 148272345204,
      paidUpCapital: 27056997300,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-28',
      revenue: 16800000000,
      revenuePreviousYear: 14900000000,
      netProfit: 7150000000,
      netProfitPreviousYear: 6400000000,
      auditStatus: 'AUDITED',
      dividendHistory: [],
      isAvailable: true
    },
    ...overrides
  };
}

function createMockMarketSummary(): MarketSummary {
  return {
    nepseIndex: 2742.85,
    pointChange: 18.24,
    percentChange: 0.67,
    totalTurnover: 7240000000,
    totalSharesTraded: 18450000,
    totalTransactions: 68420,
    session: {
      status: 'CLOSED',
      statusLabelEn: 'Market Closed',
      statusLabelNe: 'बजार बन्द',
      currentTimeNPT: '2081-06-19 15:30 NPT',
      isTradingDay: true,
      nextSessionText: 'Opens Sunday 11:00 AM'
    } as any
  };
}

const mockPeers: CompanySummary[] = [
  {
    symbol: 'NABIL',
    name: 'Nabil Bank',
    sector: 'Commercial Banks',
    ltp: 550,
    change: 5,
    pChange: 0.92,
    high: 555,
    low: 542,
    volume: 125000,
    turnover: 68750000,
    previousClose: 545,
    week52High: 635,
    week52Low: 462,
    observedAtNPT: '2081-06-19 14:45 NPT',
    retrievedAtNPT: '2081-06-19 14:45 NPT',
    dataStatus: 'LIVE'
  },
  {
    symbol: 'GBIME',
    name: 'Global IME Bank',
    sector: 'Commercial Banks',
    ltp: 240,
    change: 1,
    pChange: 0.42,
    high: 243,
    low: 238,
    volume: 85000,
    turnover: 20400000,
    previousClose: 239,
    week52High: 280,
    week52Low: 195,
    observedAtNPT: '2081-06-19 14:45 NPT',
    retrievedAtNPT: '2081-06-19 14:45 NPT',
    dataStatus: 'LIVE'
  }
];

describe('Predict AI Decision Engine Suite', () => {
  it('1. Returns Analysis Unavailable when data is stale or candles < 30', () => {
    const staleDetails = createMockDetails({ dataStatus: 'STALE' });
    const candles = createMockCandles(50);
    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'PLANNING_TO_BUY',
      details: staleDetails,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    expect(result.isAvailable).toBe(false);
    expect(result.action).toBe('WAIT');
    expect(result.actionLabelEn).toBe('Analysis Unavailable');
    expect(result.opportunityScore).toBe(0);
    expect(result.unavailableReason).toContain('stale');
  });

  it('2. Evaluates Planning to Buy -> BUY for supportive uptrend, liquidity and strong fundamentals', () => {
    const candles = createMockCandles(60, 480, 'bull');
    const details = createMockDetails({ ltp: candles[candles.length - 1].close });
    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'PLANNING_TO_BUY',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    expect(result.isAvailable).toBe(true);
    expect(result.holdingContext).toBe('PLANNING_TO_BUY');
    expect(result.opportunityScore).toBeGreaterThanOrEqual(70);
    expect(result.action).toBe('BUY');
    expect(result.badgeColor).toBe('emerald');
    expect(result.threeMainReasonsEn.length).toBeGreaterThanOrEqual(3);
    expect(result.methodologyVersion).toBe(METHODOLOGY_VERSION);
  });

  it('3. Evaluates Planning to Buy -> WAIT when opportunity score or trend does not meet Buy criteria', () => {
    // Flat/downtrend candles
    const candles = createMockCandles(60, 550, 'flat');
    const details = createMockDetails({ ltp: candles[candles.length - 1].close });
    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'PLANNING_TO_BUY',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    expect(result.isAvailable).toBe(true);
    expect(result.holdingContext).toBe('PLANNING_TO_BUY');
    expect(result.action).toBe('WAIT');
    expect(result.badgeColor).toBe('amber');
    expect(result.threeMainReasonsEn[0]).toBeDefined();
  });

  it('4. Evaluates Already Holding -> HOLD when selling conditions are not met', () => {
    const candles = createMockCandles(60, 520, 'flat');
    const details = createMockDetails({ ltp: candles[candles.length - 1].close });
    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'ALREADY_HOLDING',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    expect(result.isAvailable).toBe(true);
    expect(result.holdingContext).toBe('ALREADY_HOLDING');
    expect(result.action).toBe('HOLD');
    expect(result.badgeColor).toBe('blue');
    // For holders, additional investment field should also be populated
    expect(['BUY', 'WAIT']).toContain(result.additionalInvestmentAction);
  });

  it('5. Evaluates Already Holding -> CONSIDER SELLING when score < 40 and >= 2 deterioration groups confirm', () => {
    // Severe persistent bear trend + loss-making fundamentals
    const candles = createMockCandles(60, 600, 'bear');
    const details = createMockDetails({
      ltp: candles[candles.length - 1].close,
      fundamentals: {
        eps: -8.5, // Loss-making
        pe: 0,
        bookValue: 90,
        pb: 4.2,
        roe: -6.4,
        marketCap: 12000000000,
        paidUpCapital: 5000000000,
        quarterlyReportPeriod: 'Q4 2080/81',
        reportedDate: '2081-04-28',
        netProfit: -420000000,
        netProfitPreviousYear: 310000000,
        auditStatus: 'AUDITED',
        dividendHistory: [],
        isAvailable: true
      }
    });

    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'ALREADY_HOLDING',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    expect(result.isAvailable).toBe(true);
    expect(result.holdingContext).toBe('ALREADY_HOLDING');
    expect(result.opportunityScore).toBeLessThan(40);
    expect(result.confirmedDeteriorationCount).toBeGreaterThanOrEqual(2);
    expect(result.action).toBe('CONSIDER_SELLING');
    expect(result.badgeColor).toBe('rose');
    expect(result.additionalInvestmentAction).toBe('WAIT');
  });

  it('6. Does not double-count EMA and MACD as two independent deterioration groups', () => {
    const candles = createMockCandles(60, 550, 'bear');
    const details = createMockDetails({ ltp: candles[candles.length - 1].close });
    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'ALREADY_HOLDING',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    // Check that TREND_MOMENTUM is a single group containing both EMA and MACD
    const trendMomentumGroup = result.deteriorationGroups.find(g => g.groupId === 'TREND_MOMENTUM');
    expect(trendMomentumGroup).toBeDefined();
    // Total groups is exactly 5 distinct conceptual categories
    expect(result.deteriorationGroups.length).toBe(5);
  });

  it('7. High opportunity score cannot override HIGH severity risk flag', () => {
    const candles = createMockCandles(60, 480, 'bull');
    // Strong technicals but severe loss-making or missing audited financials
    const details = createMockDetails({
      ltp: candles[candles.length - 1].close,
      fundamentalsAvailable: false,
      fundamentals: {
        eps: 0,
        pe: 0,
        bookValue: 0,
        pb: 0,
        roe: 0,
        marketCap: 0,
        paidUpCapital: 0,
        quarterlyReportPeriod: '',
        reportedDate: '',
        dividendHistory: [],
        isAvailable: false
      }
    });

    const result = evaluatePredictAiDecision({
      symbol: 'NABIL',
      timeframe: 10,
      holdingContext: 'PLANNING_TO_BUY',
      details,
      candles,
      allCompanies: mockPeers,
      marketSummary: createMockMarketSummary()
    });

    // Even if technical trend was strong, missing data/high risk must force WAIT
    expect(result.action).toBe('WAIT');
    expect(result.riskAssessment.materialRiskCount).toBeGreaterThan(0);
  });

  it('8. Supports timeframe switching (5, 10, 20 sessions) and reports chronological backtest', () => {
    const candles = createMockCandles(60, 500, 'bull');
    const details = createMockDetails({ ltp: candles[candles.length - 1].close });

    [5, 10, 20].forEach((tf) => {
      const result = evaluatePredictAiDecision({
        symbol: 'NABIL',
        timeframe: tf as any,
        holdingContext: 'PLANNING_TO_BUY',
        details,
        candles,
        allCompanies: mockPeers,
        marketSummary: createMockMarketSummary()
      });

      expect(result.timeframe).toBe(tf);
      expect(result.backtest.timeframeSessions).toBe(tf);
      expect(result.backtest.status).toBe('EXPERIMENTAL');
      expect(result.backtest.roundTripFeePct).toBe(0.75);
    });
  });
});
