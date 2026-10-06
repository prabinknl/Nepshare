import { Router, Response } from 'express';
import { getDataProvider } from '../providers/index.js';
import { analyzeTechnicalSetup } from '../engine/technicalAnalysis.js';
import { generatePredictiveOutlook } from '../engine/predictiveEngine.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/database.js';
import {
  evaluatePredictAiDecision,
  getCachedDecision,
  setCachedDecision,
  METHODOLOGY_VERSION,
  TimeframeSessions,
  HoldingContext
} from '../engine/predictAiDecisionEngine.js';

const router = Router();

// List / Search companies
router.get('/', async (req, res: Response) => {
  try {
    const provider = getDataProvider();
    const query = req.query.q as string | undefined;
    const sector = req.query.sector as string | undefined;
    const companies = await provider.getCompanies(query, sector);
    res.json(companies);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch companies.' });
  }
});

// Single company profile & fundamentals
router.get('/:symbol', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const provider = getDataProvider();
    const details = await provider.getCompanyDetails(symbol);

    if (!details) {
      res.status(404).json({ error: `Company with symbol "${symbol.toUpperCase()}" not found.` });
      return;
    }

    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch company details.' });
  }
});

// Historical price candles
router.get('/:symbol/candles', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as string) || '3M';
    const provider = getDataProvider();
    const candles = await provider.getHistoricalCandles(symbol, period);
    res.json(candles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch price history.' });
  }
});

// Rule-based technical analysis signal & indicators
router.get('/:symbol/technical', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const provider = getDataProvider();
    const details = await provider.getCompanyDetails(symbol);
    const candles = await provider.getHistoricalCandles(symbol, '6M');
    const isStale = details?.dataStatus === 'STALE' || details?.dataStatus === 'UNAVAILABLE';
    const result = analyzeTechnicalSetup(symbol.toUpperCase(), candles, { isStale });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run technical analysis.' });
  }
});

// Walk-forward validated scenario predictions
router.get('/:symbol/predictions', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const provider = getDataProvider();
    const details = await provider.getCompanyDetails(symbol);
    const candles = await provider.getHistoricalCandles(symbol, '6M');
    const isStale = details?.dataStatus === 'STALE' || details?.dataStatus === 'UNAVAILABLE';
    const result = generatePredictiveOutlook(symbol.toUpperCase(), candles, { 
      isStale, 
      dataStatus: details?.dataStatus 
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate predictive outlook.' });
  }
});

// Combined "Predict AI Analysis" Decision Engine (Buy / Wait / Hold / Consider Selling)
router.get('/:symbol/predict-ai', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const timeframeParam = Number(req.query.timeframe);
    const timeframe: TimeframeSessions = (timeframeParam === 5 || timeframeParam === 20) ? timeframeParam : 10;
    
    // Check portfolio for current user if authenticated
    let userOwnsHolding = false;
    if (req.user) {
      try {
        const holdingRow = db.prepare<[string, string], { totalQty: number | null }>(`
          SELECT SUM(CASE WHEN type = 'BUY' THEN quantity ELSE -quantity END) as totalQty
          FROM transactions WHERE user_id = ? AND UPPER(symbol) = ?
        `).get(req.user.id, symbol.toUpperCase());
        if (holdingRow && holdingRow.totalQty && holdingRow.totalQty > 0) {
          userOwnsHolding = true;
        }
      } catch (dbErr) {
        // Continue gracefully if db query encounters error
      }
    }

    // Determine holding context: honors explicit query or defaults to detected portfolio state
    let holdingContext: HoldingContext = 'PLANNING_TO_BUY';
    if (req.query.holdingContext === 'ALREADY_HOLDING' || req.query.holdingContext === 'PLANNING_TO_BUY') {
      holdingContext = req.query.holdingContext as HoldingContext;
    } else if (userOwnsHolding) {
      holdingContext = 'ALREADY_HOLDING';
    }

    const provider = getDataProvider();
    const details = await provider.getCompanyDetails(symbol);

    if (!details) {
      res.status(404).json({ error: `Company with symbol "${symbol.toUpperCase()}" not found.` });
      return;
    }

    const dataVersion = details.dataStatus || 'LIVE';
    const cacheKey = `${symbol.toUpperCase()}_TF${timeframe}_DV${dataVersion}_MV${METHODOLOGY_VERSION}`;
    const bypassCache = req.query.bypassCache === 'true';

    let cached = !bypassCache ? getCachedDecision(cacheKey) : null;

    if (cached) {
      // Re-apply holdingContext to cached evaluation if different from cached snapshot
      if (cached.holdingContext !== holdingContext) {
        const buySatisfied = cached.additionalInvestmentAction === 'BUY';
        const activeAction = holdingContext === 'ALREADY_HOLDING'
          ? (cached.opportunityScore < 40 && cached.confirmedDeteriorationCount >= 2 && cached.confirmationRuleSatisfied ? 'CONSIDER_SELLING' : 'HOLD')
          : (buySatisfied ? 'BUY' : 'WAIT');

        const labelEn = activeAction === 'BUY' ? 'Buy' : activeAction === 'WAIT' ? 'Wait' : activeAction === 'HOLD' ? 'Hold' : 'Consider Selling';
        const labelNe = activeAction === 'BUY' ? 'खरिद (Buy)' : activeAction === 'WAIT' ? 'प्रतीक्षा (Wait)' : activeAction === 'HOLD' ? 'होल्ड (Hold)' : 'बिक्री विचारणीय (Consider Selling)';
        const color = activeAction === 'BUY' ? 'emerald' : activeAction === 'WAIT' ? 'amber' : activeAction === 'HOLD' ? 'blue' : 'rose';
        const icon = activeAction === 'BUY' ? '🟢' : activeAction === 'WAIT' ? '🟡' : activeAction === 'HOLD' ? '🔵' : '🔴';

        cached = {
          ...cached,
          holdingContext,
          action: activeAction,
          actionLabelEn: labelEn,
          actionLabelNe: labelNe,
          badgeColor: color,
          badgeIcon: icon
        };
      }
      res.json({
        ...cached,
        userHoldingDetected: userOwnsHolding
      });
      return;
    }

    const [candles, allCompanies, marketSummary] = await Promise.all([
      provider.getHistoricalCandles(symbol, '6M'),
      provider.getCompanies(),
      provider.getMarketSummary()
    ]);

    const result = evaluatePredictAiDecision({
      symbol: symbol.toUpperCase(),
      timeframe,
      holdingContext,
      details,
      candles,
      allCompanies,
      marketSummary
    });

    if (result.isAvailable) {
      setCachedDecision(cacheKey, result);
    }

    res.json({
      ...result,
      userHoldingDetected: userOwnsHolding
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to evaluate Predict AI Analysis.' });
  }
});

// "Before You Buy" structured analysis & checklist evaluation
router.get('/:symbol/before-you-buy', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const provider = getDataProvider();
    const details = await provider.getCompanyDetails(symbol);

    if (!details) {
      res.status(404).json({ error: `Company with symbol "${symbol.toUpperCase()}" not found.` });
      return;
    }

    const candles = await provider.getHistoricalCandles(symbol, '6M');
    const allSummaries = await provider.getCompanies();
    
    // Fetch full details for peer companies to get accurate peer multiples
    const peerSummaries = allSummaries.filter(c => c.sector === details.sector).slice(0, 10);
    const peerDetails = await Promise.all(
      peerSummaries.map(async p => {
        if (p.symbol === details.symbol) return details;
        const d = await provider.getCompanyDetails(p.symbol);
        return d || (p as any);
      })
    );

    const {
      buildBeforeYouBuySummary,
      computeSectorPeerComparison,
      evaluateCompanyRisks
    } = await import('../engine/beforeYouBuyEngine.js');

    const summary = buildBeforeYouBuySummary(details, candles, peerDetails);
    const peerComparison = computeSectorPeerComparison(details, peerDetails);
    const risks = evaluateCompanyRisks(details, candles);

    res.json({
      symbol: details.symbol,
      summary,
      peerComparison,
      sectorMetrics: details.sectorMetrics || null,
      risks,
      fundamentals: details.fundamentals,
      company: {
        symbol: details.symbol,
        name: details.name,
        nameNe: details.nameNe,
        sector: details.sector,
        sectorNe: details.sectorNe,
        ltp: details.ltp,
        change: details.change,
        pChange: details.pChange,
        observedAtNPT: details.observedAtNPT,
        dataStatus: details.dataStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate Before You Buy analysis.' });
  }
});

// Trade-planning calculator on company
router.post('/:symbol/calculate-plan', async (req, res: Response) => {
  try {
    const { symbol } = req.params;
    const {
      entryPrice,
      quantity,
      targetPrice,
      stopLossPrice,
      brokerRatePct,
      sebonRatePct,
      dpFee,
      cgtRatePct,
      holdingPeriodDays
    } = req.body;

    const { calculateTradePlan } = await import('../engine/beforeYouBuyEngine.js');

    const result = calculateTradePlan({
      symbol: symbol.toUpperCase(),
      entryPrice: Number(entryPrice),
      quantity: Number(quantity),
      targetPrice: Number(targetPrice),
      stopLossPrice: Number(stopLossPrice),
      brokerRatePct: brokerRatePct !== undefined ? Number(brokerRatePct) : undefined,
      sebonRatePct: sebonRatePct !== undefined ? Number(sebonRatePct) : undefined,
      dpFee: dpFee !== undefined ? Number(dpFee) : undefined,
      cgtRatePct: cgtRatePct !== undefined ? Number(cgtRatePct) : undefined,
      holdingPeriodDays: holdingPeriodDays ? Number(holdingPeriodDays) : undefined
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to calculate trade plan.' });
  }
});

export default router;
