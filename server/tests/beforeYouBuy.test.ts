import { describe, it, expect } from 'vitest';
import {
  calculateTradePlan,
  evaluateCompanyRisks,
  computeSectorPeerComparison,
  buildBeforeYouBuySummary,
  computeLiquidityMetrics
} from '../engine/beforeYouBuyEngine.js';
import { DEMO_COMPANIES, getCachedDemoCandles } from '../providers/nepseDemoData.js';
import { CompanyDetails } from '../providers/types.js';

describe('Before You Buy Analysis Engine - Verification Suite', () => {
  const nabil = DEMO_COMPANIES.find(c => c.symbol === 'NABIL')!;
  const upper = DEMO_COMPANIES.find(c => c.symbol === 'UPPER')!;
  const nlic = DEMO_COMPANIES.find(c => c.symbol === 'NLIC')!;
  const shivm = DEMO_COMPANIES.find(c => c.symbol === 'SHIVM')!;

  describe('1. Ratio Calculations & Edge Cases', () => {
    it('handles negative earnings correctly and treats P/E as not meaningful', () => {
      expect(upper.fundamentals.eps).toBeLessThan(0);
      const candles = getCachedDemoCandles('UPPER');
      const summary = buildBeforeYouBuySummary(upper, candles, DEMO_COMPANIES);

      expect(summary.valuation.status).toBe('Needs attention');
      expect(summary.valuation.explanationEn).toContain('P/E is not meaningful');
      expect(summary.financialHealth.status).toBe('Needs attention');
    });

    it('distinguishes cash dividend yield from bonus shares', () => {
      // NABIL has 10% bonus share and 4.5% cash dividend
      expect(nabil.fundamentals.dividendHistory[0].bonusSharePercent).toBe(10.0);
      expect(nabil.fundamentals.dividendHistory[0].cashDividendPercent).toBe(4.5);
      
      const peerComp = computeSectorPeerComparison(nabil, DEMO_COMPANIES);
      const nabilPeer = peerComp.peers.find(p => p.symbol === 'NABIL')!;
      // Cash yield: (4.5 * 100) / 548 = 0.82%
      expect(nabilPeer.cashDividendYield).toBeCloseTo(0.82, 1);
    });

    it('labels ROE calculation convention accurately', () => {
      expect(nabil.fundamentals.roeConvention).toBeDefined();
      expect(nabil.fundamentals.roeConvention).toContain('Net Profit');
    });

    it('handles zero or missing denominators without crashing or returning NaN', () => {
      const mockCompany: CompanyDetails = {
        ...nabil,
        symbol: 'TEST',
        fundamentals: {
          ...nabil.fundamentals,
          eps: 0,
          pe: 0,
          bookValue: 0,
          roe: 0,
          netProfit: 0,
          netProfitPreviousYear: 0
        }
      };

      const summary = buildBeforeYouBuySummary(mockCompany, [], [mockCompany]);
      expect(summary.financialHealth.status).toBeDefined();
      expect(summary.valuation.status).toBe('Needs attention');
      expect(summary.liquidity.avgDailyVolume20D).toBe(0);
    });
  });

  describe('2. Quarterly YoY & Annual Historical Comparisons', () => {
    it('accurately captures YoY quarterly profit changes', () => {
      const qYoY = nabil.fundamentals.quarterlyYoY;
      expect(qYoY).toBeDefined();
      expect(qYoY!.length).toBeGreaterThan(0);
      
      const q4 = qYoY![0];
      expect(q4.quarter).toBe('Q4 2080/81');
      const expectedChange = ((q4.currentProfit - q4.previousYearProfit) / q4.previousYearProfit) * 100;
      expect(q4.changePct).toBeCloseTo(expectedChange, 1);
    });

    it('evaluates improving financial health when YoY growth and ROE are strong', () => {
      const candles = getCachedDemoCandles('NABIL');
      const summary = buildBeforeYouBuySummary(nabil, candles, DEMO_COMPANIES);
      expect(summary.financialHealth.status).toBe('Improving');
      expect(summary.financialHealth.explanationEn).toContain('Net profit expanded');
    });
  });

  describe('3. Sector-Specific Metric Selection', () => {
    it('isolates Banking metrics (NPL, CAR >= 11%, Distributable profit)', () => {
      expect(nabil.sectorMetrics?.sectorType).toBe('BANKING');
      const banking = nabil.sectorMetrics?.banking;
      expect(banking).toBeDefined();
      expect(banking?.nplRatio).toBe(1.85);
      expect(banking?.capitalAdequacyRatio).toBe(12.80);
      expect(banking?.regulatoryCarMin).toBe(11.0);
      expect(banking?.distributableProfit).toBeGreaterThan(0);

      // Verifies that bank does NOT apply debt-to-equity or operating cash flow
      expect(nabil.fundamentals.debtToEquity).toBeUndefined();
      expect(nabil.fundamentals.operatingCashFlow).toBeUndefined();
    });

    it('isolates Hydropower metrics (Capacity MW, Seasonal RoR production, PPA)', () => {
      expect(upper.sectorMetrics?.sectorType).toBe('HYDROPOWER');
      const hydro = upper.sectorMetrics?.hydropower;
      expect(hydro).toBeDefined();
      expect(hydro?.installedCapacityMW).toBe(456);
      expect(hydro?.seasonalProductionNoteEn).toContain('Run-of-River');
      expect(hydro?.ppaDetails).toContain('Take-or-Pay');
    });

    it('isolates Life Insurance metrics (Solvency >= 1.50x, Claims experience, Life Fund)', () => {
      expect(nlic.sectorMetrics?.sectorType).toBe('INSURANCE');
      const ins = nlic.sectorMetrics?.insurance;
      expect(ins).toBeDefined();
      expect(ins?.solvencyRatio).toBe(1.82);
      expect(ins?.regulatorySolvencyMin).toBe(1.50);
      expect(ins?.claimsExperiencePct).toBe(78.4);
      expect(ins?.lifeInsuranceFund).toBeGreaterThan(0);
    });

    it('evaluates Non-Financial manufacturing metrics (Operating Cash Flow, Debt/Equity)', () => {
      expect(shivm.sectorMetrics?.sectorType).toBe('NON_FINANCIAL');
      const nf = shivm.sectorMetrics?.nonFinancial;
      expect(nf).toBeDefined();
      expect(nf?.debtToEquity).toBe(0.42);
      expect(nf?.interestCoverageRatio).toBe(3.85);
      expect(nf?.operatingCashFlow).toBe(1180000000);
    });
  });

  describe('4. Trade-Planning Calculator & Fee Assumptions', () => {
    it('correctly calculates total investment, SEBON fees, DP fees, and tiered broker commission', () => {
      // 100 shares @ NPR 500 = Turnover NPR 50,000 (Tier 1 <= 50k: 0.40%)
      const plan = calculateTradePlan({
        symbol: 'NABIL',
        entryPrice: 500,
        quantity: 100,
        targetPrice: 600,
        stopLossPrice: 470
      });

      expect(plan.purchaseTurnover).toBe(50000);
      expect(plan.buyBrokerFee).toBe(200); // 0.40% of 50,000 = Rs 200
      expect(plan.buySebonFee).toBe(7.5);  // 0.015% of 50,000 = Rs 7.50
      expect(plan.buyDpFee).toBe(25);      // NPR 25.00
      expect(plan.totalPurchaseCost).toBe(50232.5);
    });

    it('calculates target net profit after deducting sell fees and Capital Gains Tax (7.5%)', () => {
      const plan = calculateTradePlan({
        symbol: 'NABIL',
        entryPrice: 500,
        quantity: 100,
        targetPrice: 600,
        stopLossPrice: 470,
        cgtRatePct: 7.5
      });

      expect(plan.targetTurnover).toBe(60000);
      expect(plan.targetGrossProfit).toBe(10000);
      expect(plan.targetCgt).toBeGreaterThan(0);
      expect(plan.targetNetProfit).toBeLessThan(plan.targetGrossProfit);
      expect(plan.targetRoiPct).toBeGreaterThan(15);
    });

    it('calculates stop-loss net loss and computes Reward-to-Risk ratio', () => {
      const plan = calculateTradePlan({
        symbol: 'NABIL',
        entryPrice: 500,
        quantity: 100,
        targetPrice: 600,
        stopLossPrice: 470
      });

      expect(plan.stopGrossLoss).toBe(3000);
      expect(plan.stopNetLoss).toBeGreaterThan(plan.stopGrossLoss); // Loss is higher due to round-trip fees
      expect(plan.rewardToRiskRatio).toBeGreaterThan(2.0); // Target ~8.5k profit vs ~3.4k stop loss => ~2.5 R:R
    });

    it('includes explicit stop-loss caveats and non-guarantee notices', () => {
      const plan = calculateTradePlan({
        symbol: 'NABIL',
        entryPrice: 500,
        quantity: 100,
        targetPrice: 600,
        stopLossPrice: 470
      });

      expect(plan.caveats.length).toBeGreaterThan(0);
      expect(plan.caveats[0]).toContain('Stop-loss price is a planning threshold, NOT a guaranteed execution order');
      expect(plan.caveats[2]).toContain('does NOT place or execute real market orders');
    });

    it('rejects invalid prices or zero quantities', () => {
      expect(() => {
        calculateTradePlan({
          symbol: 'NABIL',
          entryPrice: -100,
          quantity: 100,
          targetPrice: 200,
          stopLossPrice: 50
        });
      }).toThrow('Entry price and quantity must be positive');
    });
  });

  describe('5. Missing Data & Risk Engine Invariance', () => {
    it('treats missing financial reports as high risk (DATA_GAP), never as low risk', () => {
      const companyWithMissingData: CompanyDetails = {
        ...nabil,
        symbol: 'NODATA',
        fundamentalsAvailable: false,
        fundamentals: {
          ...nabil.fundamentals,
          isAvailable: false
        }
      };

      const risks = evaluateCompanyRisks(companyWithMissingData, []);
      const dataGapRisk = risks.find(r => r.category === 'DATA_GAP');
      expect(dataGapRisk).toBeDefined();
      expect(dataGapRisk?.severity).toBe('HIGH');
      expect(dataGapRisk?.reasonEn).toContain('Missing data must not be interpreted as low risk');
    });

    it('computes 20-day liquidity and flags thin trading volume under 20,000 kitta', () => {
      const lowVolumeCandles = Array(20).fill(null).map((_, i) => ({
        date: `2081-06-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 5000 // thin volume
      }));

      const metrics = computeLiquidityMetrics(lowVolumeCandles, 100);
      expect(metrics.avgDailyVolume20D).toBe(5000);

      const mockCompany: CompanyDetails = {
        ...nabil,
        ltp: 100
      };
      const risks = evaluateCompanyRisks(mockCompany, lowVolumeCandles);
      const liqRisk = risks.find(r => r.category === 'LIQUIDITY');
      expect(liqRisk).toBeDefined();
      expect(liqRisk?.titleEn).toContain('Thin Daily Trading Liquidity');
    });
  });
});
