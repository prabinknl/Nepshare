export interface FeeBreakdown {
  turnover: number;
  brokerFee: number;
  sebonFee: number;
  dpFee: number;
  totalFees: number;
  effectiveRatePct: number;
}

export interface TransactionInput {
  id?: string;
  userId?: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  transactionDate: string;
  brokerFee?: number;
  sebonFee?: number;
  dpFee?: number;
  cgtFee?: number;
  totalAmount?: number;
  isCustomFee?: boolean;
  notes?: string;
}

export interface HoldingPosition {
  symbol: string;
  totalQuantity: number;
  wacc: number; // Weighted Average Cost per share including buy fees
  totalCost: number;
  currentLtp: number;
  currentMarketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  dayChange: number;
  dayGain: number;
  sector: string;
}

export interface PortfolioSummary {
  totalInvestment: number;
  currentMarketValue: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPct: number;
  totalRealizedPnL: number;
  totalDayGain: number;
  holdingsCount: number;
  holdings: HoldingPosition[];
}

/**
 * Standard NEPSE Broker Commission Tier Calculation
 */
export function calculateNepseBrokerCommission(turnover: number): number {
  if (turnover <= 0) return 0;
  let rate = 0.0040; // 0.40%
  if (turnover > 10000000) {
    rate = 0.0027; // 0.27%
  } else if (turnover > 2000000) {
    rate = 0.0030; // 0.30%
  } else if (turnover > 500000) {
    rate = 0.0034; // 0.34%
  } else if (turnover > 50000) {
    rate = 0.0037; // 0.37%
  }
  const comm = turnover * rate;
  return Math.round(Math.max(10, comm) * 100) / 100;
}

export function estimateNepseFees(turnover: number, isSell = false): FeeBreakdown {
  const brokerFee = calculateNepseBrokerCommission(turnover);
  const sebonFee = Math.round((turnover * 0.00015) * 100) / 100; // 0.015%
  const dpFee = 25.00; // Rs 25
  const totalFees = Math.round((brokerFee + sebonFee + dpFee) * 100) / 100;
  const effectiveRatePct = turnover > 0 ? Math.round((totalFees / turnover) * 10000) / 100 : 0;

  return {
    turnover,
    brokerFee,
    sebonFee,
    dpFee,
    totalFees,
    effectiveRatePct
  };
}

/**
 * Process a user's transaction history to compute holdings, WACC, partial sales, and realized/unrealized P&L
 */
export function processPortfolioTransactions(
  transactions: TransactionInput[],
  currentQuotes: Record<string, { ltp: number; change: number; sector: string }>
): PortfolioSummary {
  // Sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  interface ScripTracker {
    symbol: string;
    quantity: number;
    totalCost: number; // Sum of buy amounts (including buy fees)
    realizedPnL: number;
  }

  const tracker: Record<string, ScripTracker> = {};

  for (const tx of sorted) {
    const sym = tx.symbol.toUpperCase();
    if (!tracker[sym]) {
      tracker[sym] = {
        symbol: sym,
        quantity: 0,
        totalCost: 0,
        realizedPnL: 0
      };
    }

    const item = tracker[sym];
    const turnover = tx.quantity * tx.price;
    const fees = (tx.brokerFee || 0) + (tx.sebonFee || 0) + (tx.dpFee || 0);

    if (tx.type === 'BUY') {
      // For buy: total cost increases by turnover + all fees
      const buyTotal = tx.totalAmount || (turnover + fees);
      item.quantity += tx.quantity;
      item.totalCost += buyTotal;
    } else if (tx.type === 'SELL') {
      if (item.quantity <= 0) continue; // ignore short sale without holdings

      const sellQty = Math.min(tx.quantity, item.quantity);
      const currentWacc = item.totalCost / item.quantity;
      const costOfSoldShares = currentWacc * sellQty;

      // Net sell proceeds = turnover - fees - cgt
      const cgt = tx.cgtFee || 0;
      const netSellProceeds = tx.totalAmount || (turnover - fees - cgt);
      
      const realizedGain = netSellProceeds - costOfSoldShares;
      item.realizedPnL += realizedGain;

      // Reduce remaining position
      item.quantity -= sellQty;
      item.totalCost -= costOfSoldShares;

      if (item.quantity <= 0) {
        item.quantity = 0;
        item.totalCost = 0;
      }
    }
  }

  // Build active holdings
  const holdings: HoldingPosition[] = [];
  let totalInvestment = 0;
  let currentMarketValue = 0;
  let totalRealizedPnL = 0;
  let totalDayGain = 0;

  for (const sym of Object.keys(tracker)) {
    const item = tracker[sym];
    totalRealizedPnL += item.realizedPnL;

    if (item.quantity > 0) {
      const quote = currentQuotes[sym] || { ltp: item.totalCost / item.quantity, change: 0, sector: 'Other' };
      const wacc = Math.round((item.totalCost / item.quantity) * 100) / 100;
      const mktVal = Math.round((item.quantity * quote.ltp) * 100) / 100;
      const unrealized = Math.round((mktVal - item.totalCost) * 100) / 100;
      const unrealizedPct = item.totalCost > 0 ? Math.round((unrealized / item.totalCost) * 10000) / 100 : 0;
      const dayGain = Math.round((item.quantity * quote.change) * 100) / 100;

      holdings.push({
        symbol: sym,
        totalQuantity: item.quantity,
        wacc,
        totalCost: Math.round(item.totalCost * 100) / 100,
        currentLtp: quote.ltp,
        currentMarketValue: mktVal,
        unrealizedPnL: unrealized,
        unrealizedPnLPct: unrealizedPct,
        dayChange: quote.change,
        dayGain,
        sector: quote.sector
      });

      totalInvestment += item.totalCost;
      currentMarketValue += mktVal;
      totalDayGain += dayGain;
    }
  }

  const totalUnrealizedPnL = Math.round((currentMarketValue - totalInvestment) * 100) / 100;
  const totalUnrealizedPnLPct = totalInvestment > 0 ? Math.round((totalUnrealizedPnL / totalInvestment) * 10000) / 100 : 0;

  return {
    totalInvestment: Math.round(totalInvestment * 100) / 100,
    currentMarketValue: Math.round(currentMarketValue * 100) / 100,
    totalUnrealizedPnL,
    totalUnrealizedPnLPct,
    totalRealizedPnL: Math.round(totalRealizedPnL * 100) / 100,
    totalDayGain: Math.round(totalDayGain * 100) / 100,
    holdingsCount: holdings.length,
    holdings
  };
}
