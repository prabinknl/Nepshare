import {
  MarketSummary,
  TopMovers,
  Announcement,
  MarketNews,
  CompanySummary,
  CompanyDetails,
  Candle,
  TechnicalSignalResult,
  PredictiveOutlookResult,
  PortfolioSummary,
  TransactionInput,
  User,
  AlertItem,
  NotificationItem,
  AiMarketAnalysisResult,
  PredictAiDecisionResult,
  TimeframeSessions,
  HoldingContext
} from '../types/index.js';
import {
  DEMO_COMPANIES,
  DEMO_ANNOUNCEMENTS,
  DEMO_NEWS,
  DEMO_SECTORS,
  getCachedDemoCandles
} from '../../server/providers/nepseDemoData.js';
import { NepseDemoProvider } from '../../server/providers/nepseDemoProvider.js';
import { analyzeTechnicalSetup } from '../../server/engine/technicalAnalysis.js';
import { evaluatePredictAiDecision } from '../../server/engine/predictAiDecisionEngine.js';
import {
  buildBeforeYouBuySummary,
  calculateTradePlan,
  evaluateCompanyRisks,
  computeSectorPeerComparison
} from '../../server/engine/beforeYouBuyEngine.js';
import {
  estimateNepseFees,
  processPortfolioTransactions
} from '../../server/engine/portfolioEngine.js';
import { generatePredictiveOutlook } from '../../server/engine/predictiveEngine.js';

const demoProvider = new NepseDemoProvider();

// LocalStorage helpers for browser-only static mode
function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota issues
  }
}

const STORAGE_KEYS = {
  PORTFOLIO: 'nepshare_offline_portfolio',
  WATCHLIST: 'nepshare_offline_watchlist',
  ALERTS: 'nepshare_offline_alerts',
  TRADE_PLANS: 'nepshare_offline_trade_plans',
  NOTIFICATIONS: 'nepshare_offline_notifications'
};

export const clientFallback = {
  // Auth
  register: async (payload: { username: string; email: string; fullName: string }) => {
    const user: User = {
      id: 'usr_local',
      username: payload.username,
      email: payload.email,
      fullName: payload.fullName,
      role: 'investor',
      createdAt: new Date().toISOString()
    };
    return { token: 'mock_jwt_token_nepshare', user };
  },

  login: async (payload: { loginIdentifier: string }) => {
    const user: User = {
      id: 'usr_local',
      username: payload.loginIdentifier,
      email: `${payload.loginIdentifier}@nepshare.demo`,
      fullName: payload.loginIdentifier.toUpperCase(),
      role: 'investor',
      createdAt: new Date().toISOString()
    };
    return { token: 'mock_jwt_token_nepshare', user };
  },

  demoLogin: async () => {
    const user: User = {
      id: 'usr_demo',
      username: 'nepal_investor',
      email: 'investor@nepshare.demo',
      fullName: 'Prabin Khanal (Demo Investor)',
      role: 'investor',
      createdAt: new Date().toISOString()
    };
    return { token: 'mock_jwt_token_nepshare', user };
  },

  getMe: async () => {
    const user: User = {
      id: 'usr_demo',
      username: 'nepal_investor',
      email: 'investor@nepshare.demo',
      fullName: 'Prabin Khanal (Demo Investor)',
      role: 'investor',
      createdAt: new Date().toISOString()
    };
    return { user };
  },

  // Market
  getMarketSummary: async (): Promise<MarketSummary> => {
    return demoProvider.getMarketSummary();
  },

  getTopMovers: async (): Promise<TopMovers> => {
    return demoProvider.getTopMovers();
  },

  getAnnouncements: async (symbol?: string): Promise<Announcement[]> => {
    return demoProvider.getAnnouncements(symbol);
  },

  getMarketNews: async (): Promise<MarketNews[]> => {
    return demoProvider.getMarketNews();
  },

  getSectors: async () => {
    return demoProvider.getSectors();
  },

  getAiMarketAnalysis: async (): Promise<AiMarketAnalysisResult> => {
    const summary = await demoProvider.getMarketSummary();
    const movers = await demoProvider.getTopMovers();
    const companies = await demoProvider.getCompanies();

    let adv = 0;
    let dec = 0;
    let unc = 0;
    companies.forEach(c => {
      if (c.change > 0) adv++;
      else if (c.change < 0) dec++;
      else unc++;
    });

    const isBullish = summary.pointChange >= 0;

    return {
      generatedAtNPT: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' NPT',
      regime: isBullish ? 'BULLISH_EXPANSION' : 'CONSOLIDATION_RANGE',
      regimeLabelEn: isBullish ? 'Bullish Momentum Expansion' : 'Selective Consolidation Zone',
      regimeLabelNe: isBullish ? 'सकारात्मक वृद्धि मोमेन्टम' : 'सीमित दायराको बजार',
      breadth: {
        advancers: adv,
        decliners: dec,
        unchanged: unc,
        totalTraded: companies.length,
        advanceDeclineRatio: dec > 0 ? Math.round((adv / dec) * 100) / 100 : adv,
        breadthScorePct: Math.round((adv / (companies.length || 1)) * 100)
      },
      liquidity: {
        turnoverNPR: summary.totalTurnover,
        transactions: summary.totalTransactions,
        sharesTraded: summary.totalSharesTraded,
        topTurnoverConcentrationPct: 42,
        liquidityGrade: 'HIGH'
      },
      pivots: {
        nepseIndex: summary.nepseIndex,
        r2: Math.round((summary.nepseIndex + 50) * 10) / 10,
        r1: Math.round((summary.nepseIndex + 25) * 10) / 10,
        pivot: summary.nepseIndex,
        s1: Math.round((summary.nepseIndex - 25) * 10) / 10,
        s2: Math.round((summary.nepseIndex - 50) * 10) / 10
      },
      leadingSectors: [
        { name: 'Commercial Banks', returnPct: 1.45, bias: 'BULLISH' },
        { name: 'Hydropower', returnPct: 0.95, bias: 'BULLISH' },
        { name: 'Finance', returnPct: -0.4, bias: 'BEARISH' }
      ],
      aiNarrativeEn: summary.plainLanguageSummaryEn,
      aiNarrativeNe: summary.plainLanguageSummaryNe,
      actionableTakeaways: [
        'Watch for volume confirmation at key resistance levels before scaling into high-beta scrips.',
        'Banking and large-cap bluechips are exhibiting steady institutional accumulation.',
        'Maintain strict stop-loss discipline on speculative momentum trades.'
      ]
    };
  },

  // Companies
  getCompanies: async (query?: string, sector?: string): Promise<CompanySummary[]> => {
    return demoProvider.getCompanies(query, sector);
  },

  getCompanyDetails: async (symbol: string): Promise<CompanyDetails> => {
    const details = await demoProvider.getCompanyDetails(symbol);
    if (!details) {
      throw new Error(`Company not found: ${symbol}`);
    }
    return details;
  },

  getCandles: async (symbol: string, period = '3M'): Promise<Candle[]> => {
    return demoProvider.getCandles(symbol, period);
  },

  getTechnicalAnalysis: async (symbol: string): Promise<TechnicalSignalResult> => {
    const candles = await demoProvider.getCandles(symbol, '1Y');
    return analyzeTechnicalSetup(symbol, candles);
  },

  getPredictions: async (symbol: string): Promise<PredictiveOutlookResult> => {
    const candles = await demoProvider.getCandles(symbol, '1Y');
    const company = await demoProvider.getCompanyDetails(symbol);
    return generatePredictiveOutlook(candles, company ? company.name : symbol);
  },

  getPredictAiAnalysis: async (
    symbol: string,
    timeframe: TimeframeSessions = 10,
    holdingContext: HoldingContext = 'PLANNING_TO_BUY'
  ): Promise<PredictAiDecisionResult> => {
    const details = await demoProvider.getCompanyDetails(symbol);
    const candles = await demoProvider.getCandles(symbol, '1Y');
    if (!details) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return evaluatePredictAiDecision(details, candles, timeframe, holdingContext);
  },

  getBeforeYouBuy: async (symbol: string) => {
    const details = await demoProvider.getCompanyDetails(symbol);
    if (!details) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    const candles = await demoProvider.getCandles(symbol, '1Y');
    const summary = buildBeforeYouBuySummary(details, candles, DEMO_COMPANIES);
    const risks = evaluateCompanyRisks(details, candles);
    const peerComparison = computeSectorPeerComparison(details, DEMO_COMPANIES);

    return {
      symbol,
      summary,
      peerComparison,
      sectorMetrics: {
        sector: details.sector,
        avgPe: 22.4,
        avgPb: 3.1,
        avgRoePct: 14.2
      },
      risks,
      fundamentals: details.fundamentals,
      company: details
    };
  },

  calculatePlan: async (symbol: string, input: any) => {
    return calculateTradePlan(input);
  },

  // Saved trade plans in localStorage
  getSavedTradePlans: async () => {
    return getStorage<any[]>(STORAGE_KEYS.TRADE_PLANS, []);
  },

  saveTradePlan: async (plan: any) => {
    const plans = getStorage<any[]>(STORAGE_KEYS.TRADE_PLANS, []);
    const newPlan = { ...plan, id: 'plan_' + Date.now(), createdAt: new Date().toISOString() };
    plans.unshift(newPlan);
    setStorage(STORAGE_KEYS.TRADE_PLANS, plans);
    return { message: 'Trade plan saved locally', plan: newPlan };
  },

  deleteTradePlan: async (id: string) => {
    let plans = getStorage<any[]>(STORAGE_KEYS.TRADE_PLANS, []);
    plans = plans.filter(p => p.id !== id);
    setStorage(STORAGE_KEYS.TRADE_PLANS, plans);
    return { message: 'Trade plan deleted' };
  },

  // Watchlist in localStorage
  getWatchlist: async () => {
    const defaultWatchlist = [
      { id: 'w1', symbol: 'NABIL', notes: 'Top Commercial Bank benchmark', addedAt: new Date().toISOString() },
      { id: 'w2', symbol: 'UPPER', notes: 'Major Hydropower bellwether', addedAt: new Date().toISOString() },
      { id: 'w3', symbol: 'SHIVM', notes: 'Manufacturing & Processing sector leader', addedAt: new Date().toISOString() }
    ];
    return getStorage<any[]>(STORAGE_KEYS.WATCHLIST, defaultWatchlist);
  },

  addToWatchlist: async (symbol: string, notes?: string) => {
    const list = getStorage<any[]>(STORAGE_KEYS.WATCHLIST, []);
    const existing = list.find(item => item.symbol === symbol);
    if (!existing) {
      const newItem = {
        id: 'w_' + Date.now(),
        symbol: symbol.toUpperCase(),
        notes: notes || '',
        addedAt: new Date().toISOString()
      };
      list.push(newItem);
      setStorage(STORAGE_KEYS.WATCHLIST, list);
      return { message: 'Added to watchlist', id: newItem.id, symbol };
    }
    return { message: 'Already in watchlist', id: existing.id, symbol };
  },

  removeFromWatchlist: async (symbol: string) => {
    let list = getStorage<any[]>(STORAGE_KEYS.WATCHLIST, []);
    list = list.filter(item => item.symbol !== symbol);
    setStorage(STORAGE_KEYS.WATCHLIST, list);
    return { message: 'Removed from watchlist' };
  },

  // Alerts in localStorage
  getAlerts: async (): Promise<AlertItem[]> => {
    const defaultAlerts: AlertItem[] = [
      {
        id: 'alt_1',
        symbol: 'NABIL',
        alertType: 'PRICE_ABOVE',
        targetValue: 620,
        currentValue: 604,
        isActive: true,
        triggered: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'alt_2',
        symbol: 'UPPER',
        alertType: 'RSI_OVERSOLD',
        targetValue: 30,
        currentValue: 56.4,
        isActive: true,
        triggered: false,
        createdAt: new Date().toISOString()
      }
    ];
    return getStorage<AlertItem[]>(STORAGE_KEYS.ALERTS, defaultAlerts);
  },

  createAlert: async (payload: { symbol: string; alertType: string; targetValue?: number }) => {
    const alerts = getStorage<AlertItem[]>(STORAGE_KEYS.ALERTS, []);
    const newAlert: AlertItem = {
      id: 'alt_' + Date.now(),
      symbol: payload.symbol.toUpperCase(),
      alertType: payload.alertType as any,
      targetValue: payload.targetValue,
      currentValue: 0,
      isActive: true,
      triggered: false,
      createdAt: new Date().toISOString()
    };
    alerts.unshift(newAlert);
    setStorage(STORAGE_KEYS.ALERTS, alerts);
    return { message: 'Alert created successfully', id: newAlert.id };
  },

  toggleAlert: async (id: string) => {
    const alerts = getStorage<AlertItem[]>(STORAGE_KEYS.ALERTS, []);
    const item = alerts.find(a => a.id === id);
    if (item) {
      item.isActive = !item.isActive;
      setStorage(STORAGE_KEYS.ALERTS, alerts);
      return { message: 'Alert updated', isActive: item.isActive };
    }
    return { message: 'Alert not found', isActive: false };
  },

  deleteAlert: async (id: string) => {
    let alerts = getStorage<AlertItem[]>(STORAGE_KEYS.ALERTS, []);
    alerts = alerts.filter(a => a.id !== id);
    setStorage(STORAGE_KEYS.ALERTS, alerts);
    return { message: 'Alert deleted' };
  },

  getNotifications: async () => {
    const defaultNotifs: NotificationItem[] = [
      {
        id: 'notif_1',
        title: 'NABIL Approaches Resistance',
        titleNe: 'नबिल बैंक प्रमुख प्रतिरोध विन्दु नजिक',
        message: 'NABIL is trading at NPR 604.00, approaching SMA50 resistance zone.',
        type: 'SIGNAL',
        symbol: 'NABIL',
        timestamp: '10 mins ago',
        isRead: false
      },
      {
        id: 'notif_2',
        title: 'NEPSE Index Update',
        titleNe: 'नेप्से परिसूचक अपडेट',
        message: 'NEPSE advanced +18.24 points (+0.67%) with robust institutional turnover.',
        type: 'SYSTEM',
        timestamp: '1 hour ago',
        isRead: true
      }
    ];
    const notifications = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, defaultNotifs);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return { notifications, unreadCount };
  },

  markNotificationRead: async (id: string) => {
    const notifications = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const item = notifications.find(n => n.id === id);
    if (item) item.isRead = true;
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return { message: 'Marked read' };
  },

  clearAllNotifications: async () => {
    setStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    return { message: 'Cleared all' };
  },

  // Portfolio in localStorage
  getTransactions: async () => {
    const defaultTx: TransactionInput[] = [
      {
        id: 'tx_1',
        symbol: 'NABIL',
        type: 'BUY',
        quantity: 100,
        price: 580,
        transactionDate: '2026-09-15',
        brokerFee: 232,
        sebonFee: 8.7,
        dpFee: 25,
        totalAmount: 58265.7
      },
      {
        id: 'tx_2',
        symbol: 'UPPER',
        type: 'BUY',
        quantity: 250,
        price: 360,
        transactionDate: '2026-09-20',
        brokerFee: 360,
        sebonFee: 13.5,
        dpFee: 25,
        totalAmount: 90398.5
      }
    ];
    return getStorage<TransactionInput[]>(STORAGE_KEYS.PORTFOLIO, defaultTx);
  },

  getPortfolioSummary: async (): Promise<PortfolioSummary> => {
    const txs = await clientFallback.getTransactions();
    const ltpMap: Record<string, { ltp: number; change: number; sector: string }> = {};
    DEMO_COMPANIES.forEach(c => {
      ltpMap[c.symbol] = { ltp: c.ltp, change: c.change, sector: c.sector };
    });
    return processPortfolioTransactions(txs as any, ltpMap);
  },

  calculateFeesPreview: async (quantity: number, price: number, isSell = false) => {
    const turnover = Math.round(quantity * price * 100) / 100;
    return estimateNepseFees(turnover, isSell);
  },

  addTransaction: async (tx: TransactionInput) => {
    const txs = getStorage<TransactionInput[]>(STORAGE_KEYS.PORTFOLIO, []);
    const turnover = Math.round(tx.quantity * tx.price * 100) / 100;
    const fees = estimateNepseFees(turnover, tx.type === 'SELL');
    const newTx: TransactionInput = {
      ...tx,
      id: 'tx_' + Date.now(),
      brokerFee: fees.brokerFee,
      sebonFee: fees.sebonFee,
      dpFee: fees.dpFee,
      totalAmount: tx.type === 'BUY' ? fees.turnover + fees.totalFees : fees.turnover - fees.totalFees
    };
    txs.push(newTx);
    setStorage(STORAGE_KEYS.PORTFOLIO, txs);
    return { message: 'Transaction added', id: newTx.id! };
  },

  deleteTransaction: async (id: string) => {
    let txs = getStorage<TransactionInput[]>(STORAGE_KEYS.PORTFOLIO, []);
    txs = txs.filter(t => t.id !== id);
    setStorage(STORAGE_KEYS.PORTFOLIO, txs);
    return { message: 'Transaction deleted' };
  }
};
