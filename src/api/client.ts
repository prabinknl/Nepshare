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
import { clientFallback } from './clientFallback.js';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sharenep_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const json = await res.json();
      if (json.error) errorMsg = json.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

async function withFallback<T>(backendCall: () => Promise<T>, fallbackCall: () => Promise<T>): Promise<T> {
  try {
    return await backendCall();
  } catch (err) {
    // If backend is unreachable, in static hosting mode, or returns 404, gracefully fall back
    return await fallbackCall();
  }
}

export const api = {
  // Auth
  register: (payload: { username: string; email: string; password: string; fullName: string }) =>
    withFallback(
      () =>
        request<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        }),
      () => clientFallback.register(payload)
    ),

  login: (payload: { loginIdentifier: string; password: string }) =>
    withFallback(
      () =>
        request<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload)
        }),
      () => clientFallback.login(payload)
    ),

  demoLogin: () =>
    withFallback(
      () =>
        request<{ token: string; user: User }>('/auth/demo-login', {
          method: 'POST'
        }),
      () => clientFallback.demoLogin()
    ),

  getMe: () => withFallback(() => request<{ user: User }>('/auth/me'), () => clientFallback.getMe()),

  // Market
  getMarketSummary: () =>
    withFallback(() => request<MarketSummary>('/market/summary'), () => clientFallback.getMarketSummary()),

  getTopMovers: () =>
    withFallback(() => request<TopMovers>('/market/top-movers'), () => clientFallback.getTopMovers()),

  getAnnouncements: (symbol?: string) =>
    withFallback(
      () => request<Announcement[]>(`/market/announcements${symbol ? `?symbol=${symbol}` : ''}`),
      () => clientFallback.getAnnouncements(symbol)
    ),

  getMarketNews: () =>
    withFallback(() => request<MarketNews[]>('/market/news'), () => clientFallback.getMarketNews()),

  getSectors: () =>
    withFallback(
      () =>
        request<Array<{ name: string; nameNe?: string; companyCount: number; totalTurnover: number }>>(
          '/market/sectors'
        ),
      () => clientFallback.getSectors()
    ),

  getAiMarketAnalysis: () =>
    withFallback(
      () => request<AiMarketAnalysisResult>('/market/ai-analysis'),
      () => clientFallback.getAiMarketAnalysis()
    ),

  // Companies
  getCompanies: (query?: string, sector?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (sector && sector !== 'ALL') params.set('sector', sector);
    const qs = params.toString();
    return withFallback(
      () => request<CompanySummary[]>(`/companies${qs ? `?${qs}` : ''}`),
      () => clientFallback.getCompanies(query, sector)
    );
  },

  getCompanyDetails: (symbol: string) =>
    withFallback(
      () => request<CompanyDetails>(`/companies/${symbol}`),
      () => clientFallback.getCompanyDetails(symbol)
    ),

  getCandles: (symbol: string, period = '3M') =>
    withFallback(
      () => request<Candle[]>(`/companies/${symbol}/candles?period=${period}`),
      () => clientFallback.getCandles(symbol, period)
    ),

  getTechnicalAnalysis: (symbol: string) =>
    withFallback(
      () => request<TechnicalSignalResult>(`/companies/${symbol}/technical`),
      () => clientFallback.getTechnicalAnalysis(symbol)
    ),

  getPredictions: (symbol: string) =>
    withFallback(
      () => request<PredictiveOutlookResult>(`/companies/${symbol}/predictions`),
      () => clientFallback.getPredictions(symbol)
    ),

  getPredictAiAnalysis: (
    symbol: string,
    timeframe: TimeframeSessions = 10,
    holdingContext: HoldingContext = 'PLANNING_TO_BUY',
    bypassCache = false
  ) => {
    const params = new URLSearchParams({
      timeframe: String(timeframe),
      holdingContext,
      ...(bypassCache ? { bypassCache: 'true' } : {})
    });
    return withFallback(
      () => request<PredictAiDecisionResult>(`/companies/${symbol}/predict-ai?${params.toString()}`),
      () => clientFallback.getPredictAiAnalysis(symbol, timeframe, holdingContext)
    );
  },

  getBeforeYouBuy: (symbol: string) =>
    withFallback(
      () =>
        request<{
          symbol: string;
          summary: any;
          peerComparison: any;
          sectorMetrics: any;
          risks: any[];
          fundamentals: any;
          company: any;
        }>(`/companies/${symbol}/before-you-buy`),
      () => clientFallback.getBeforeYouBuy(symbol)
    ),

  calculatePlan: (symbol: string, input: any) =>
    withFallback(
      () =>
        request<any>(`/companies/${symbol}/calculate-plan`, {
          method: 'POST',
          body: JSON.stringify(input)
        }),
      () => clientFallback.calculatePlan(symbol, input)
    ),

  // Trade Plans
  getSavedTradePlans: () =>
    withFallback(() => request<any[]>('/trade-plans'), () => clientFallback.getSavedTradePlans()),

  saveTradePlan: (plan: any) =>
    withFallback(
      () =>
        request<{ message: string; plan: any }>('/trade-plans', {
          method: 'POST',
          body: JSON.stringify(plan)
        }),
      () => clientFallback.saveTradePlan(plan)
    ),

  deleteTradePlan: (id: string) =>
    withFallback(
      () =>
        request<{ message: string }>(`/trade-plans/${id}`, {
          method: 'DELETE'
        }),
      () => clientFallback.deleteTradePlan(id)
    ),

  // Watchlist
  getWatchlist: () =>
    withFallback(() => request<any[]>('/watchlist'), () => clientFallback.getWatchlist()),

  addToWatchlist: (symbol: string, notes?: string) =>
    withFallback(
      () =>
        request<{ message: string; id: string; symbol: string }>('/watchlist', {
          method: 'POST',
          body: JSON.stringify({ symbol, notes })
        }),
      () => clientFallback.addToWatchlist(symbol, notes)
    ),

  removeFromWatchlist: (symbol: string) =>
    withFallback(
      () =>
        request<{ message: string }>(`/watchlist/${symbol}`, {
          method: 'DELETE'
        }),
      () => clientFallback.removeFromWatchlist(symbol)
    ),

  // Alerts
  getAlerts: () =>
    withFallback(() => request<AlertItem[]>('/alerts'), () => clientFallback.getAlerts()),

  createAlert: (payload: { symbol: string; alertType: string; targetValue?: number }) =>
    withFallback(
      () =>
        request<{ message: string; id: string }>('/alerts', {
          method: 'POST',
          body: JSON.stringify(payload)
        }),
      () => clientFallback.createAlert(payload)
    ),

  toggleAlert: (id: string) =>
    withFallback(
      () =>
        request<{ message: string; isActive: boolean }>(`/alerts/${id}/toggle`, {
          method: 'PATCH'
        }),
      () => clientFallback.toggleAlert(id)
    ),

  deleteAlert: (id: string) =>
    withFallback(
      () =>
        request<{ message: string }>(`/alerts/${id}`, {
          method: 'DELETE'
        }),
      () => clientFallback.deleteAlert(id)
    ),

  getNotifications: () =>
    withFallback(
      () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/alerts/notifications'),
      () => clientFallback.getNotifications()
    ),

  markNotificationRead: (id: string) =>
    withFallback(
      () =>
        request<{ message: string }>(`/alerts/notifications/${id}/read`, {
          method: 'PATCH'
        }),
      () => clientFallback.markNotificationRead(id)
    ),

  clearAllNotifications: () =>
    withFallback(
      () =>
        request<{ message: string }>('/alerts/notifications/clear-all', {
          method: 'POST'
        }),
      () => clientFallback.clearAllNotifications()
    ),

  // Portfolio
  getPortfolioSummary: () =>
    withFallback(() => request<PortfolioSummary>('/portfolio/summary'), () => clientFallback.getPortfolioSummary()),

  getTransactions: () =>
    withFallback(() => request<any[]>('/portfolio/transactions'), () => clientFallback.getTransactions()),

  calculateFeesPreview: (quantity: number, price: number, isSell = false) =>
    withFallback(
      () =>
        request<{
          turnover: number;
          brokerFee: number;
          sebonFee: number;
          dpFee: number;
          totalFees: number;
          effectiveRatePct: number;
        }>('/portfolio/calculate-fees', {
          method: 'POST',
          body: JSON.stringify({ quantity, price, isSell })
        }),
      () => clientFallback.calculateFeesPreview(quantity, price, isSell)
    ),

  addTransaction: (tx: TransactionInput) =>
    withFallback(
      () =>
        request<{ message: string; id: string }>('/portfolio/transactions', {
          method: 'POST',
          body: JSON.stringify(tx)
        }),
      () => clientFallback.addTransaction(tx)
    ),

  deleteTransaction: (id: string) =>
    withFallback(
      () =>
        request<{ message: string }>(`/portfolio/transactions/${id}`, {
          method: 'DELETE'
        }),
      () => clientFallback.deleteTransaction(id)
    )
};
