import { describe, it, expect } from 'vitest';
import {
  calculateNepseBrokerCommission,
  estimateNepseFees,
  processPortfolioTransactions,
  TransactionInput
} from '../engine/portfolioEngine.js';

describe('NEPSE Portfolio Engine', () => {
  it('applies correct standard NEPSE broker commission tiers', () => {
    // Up to 50k: 0.40%
    expect(calculateNepseBrokerCommission(40000)).toBe(160);

    // 50,001 to 500,000: 0.37%
    expect(calculateNepseBrokerCommission(100000)).toBe(370);

    // 500,001 to 2,000,000: 0.34%
    expect(calculateNepseBrokerCommission(1000000)).toBe(3400);

    // Minimum fee of 10
    expect(calculateNepseBrokerCommission(1000)).toBe(10);
  });

  it('accurately estimates total NEPSE fees (Broker + SEBON + DP)', () => {
    const fees = estimateNepseFees(50000, false);
    // Turnover: 50,000
    // Broker: 50,000 * 0.40% = 200
    // SEBON: 50,000 * 0.015% = 7.50
    // DP: 25.00
    // Total = 232.50
    expect(fees.brokerFee).toBe(200);
    expect(fees.sebonFee).toBe(7.5);
    expect(fees.dpFee).toBe(25);
    expect(fees.totalFees).toBe(232.5);
  });

  it('correctly tracks WACC across multiple purchases', () => {
    const txs: TransactionInput[] = [
      {
        symbol: 'NABIL',
        type: 'BUY',
        quantity: 100,
        price: 500,
        transactionDate: '2081-01-10',
        brokerFee: 185,
        sebonFee: 7.5,
        dpFee: 25,
        totalAmount: 50217.5
      },
      {
        symbol: 'NABIL',
        type: 'BUY',
        quantity: 100,
        price: 600,
        transactionDate: '2081-02-10',
        brokerFee: 222,
        sebonFee: 9,
        dpFee: 25,
        totalAmount: 60256
      }
    ];

    const quotes = { NABIL: { ltp: 580, change: 5, sector: 'Commercial Banks' } };
    const summary = processPortfolioTransactions(txs, quotes);

    expect(summary.holdingsCount).toBe(1);
    const holding = summary.holdings[0];
    expect(holding.totalQuantity).toBe(200);
    
    // Total cost = 50217.5 + 60256 = 110473.5
    // WACC = 110473.5 / 200 = 552.37
    expect(holding.wacc).toBeCloseTo(552.37, 2);
    expect(holding.currentMarketValue).toBe(200 * 580);
    expect(holding.unrealizedPnL).toBeGreaterThan(0);
  });

  it('correctly accounts for partial sales and realized profit', () => {
    const txs: TransactionInput[] = [
      {
        symbol: 'UPPER',
        type: 'BUY',
        quantity: 200,
        price: 250,
        transactionDate: '2081-01-05',
        totalAmount: 50220
      },
      {
        symbol: 'UPPER',
        type: 'SELL',
        quantity: 50,
        price: 300,
        transactionDate: '2081-02-01',
        totalAmount: 14900 // Net proceeds after fees & tax
      }
    ];

    const quotes = { UPPER: { ltp: 280, change: 0, sector: 'Hydropower' } };
    const summary = processPortfolioTransactions(txs, quotes);

    const holding = summary.holdings[0];
    expect(holding.totalQuantity).toBe(150); // 200 - 50
    // Cost of sold shares: (50220 / 200) * 50 = 12555
    // Realized gain = 14900 - 12555 = 2345
    expect(summary.totalRealizedPnL).toBeCloseTo(2345, 1);
  });
});
