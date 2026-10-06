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

const API_BASE = '/api';

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

export const api = {
  // Auth
  register: (payload: { username: string; email: string; password: string; fullName: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { loginIdentifier: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  demoLogin: () =>
    request<{ token: string; user: User }>('/auth/demo-login', {
      method: 'POST'
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Market
  getMarketSummary: () => request<MarketSummary>('/market/summary'),
  getTopMovers: () => request<TopMovers>('/market/top-movers'),
  getAnnouncements: (symbol?: string) =>
    request<Announcement[]>(`/market/announcements${symbol ? `?symbol=${symbol}` : ''}`),
  getMarketNews: () => request<MarketNews[]>('/market/news'),
  getSectors: () => request<Array<{ name: string; nameNe?: string; companyCount: number; totalTurnover: number }>>('/market/sectors'),
  getAiMarketAnalysis: () => request<AiMarketAnalysisResult>('/market/ai-analysis'),

  // Companies
  getCompanies: (query?: string, sector?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (sector && sector !== 'ALL') params.set('sector', sector);
    const qs = params.toString();
    return request<CompanySummary[]>(`/companies${qs ? `?${qs}` : ''}`);
  },

  getCompanyDetails: (symbol: string) => request<CompanyDetails>(`/companies/${symbol}`),
  getCandles: (symbol: string, period = '3M') =>
    request<Candle[]>(`/companies/${symbol}/candles?period=${period}`),
  getTechnicalAnalysis: (symbol: string) =>
    request<TechnicalSignalResult>(`/companies/${symbol}/technical`),
  getPredictions: (symbol: string) =>
    request<PredictiveOutlookResult>(`/companies/${symbol}/predictions`),
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
    return request<PredictAiDecisionResult>(`/companies/${symbol}/predict-ai?${params.toString()}`);
  },
  getBeforeYouBuy: (symbol: string) =>
    request<{
      symbol: string;
      summary: any;
      peerComparison: any;
      sectorMetrics: any;
      risks: any[];
      fundamentals: any;
      company: any;
    }>(`/companies/${symbol}/before-you-buy`),
  calculatePlan: (symbol: string, input: any) =>
    request<any>(`/companies/${symbol}/calculate-plan`, {
      method: 'POST',
      body: JSON.stringify(input)
    }),

  // Trade Plans
  getSavedTradePlans: () => request<any[]>('/trade-plans'),
  saveTradePlan: (plan: any) =>
    request<{ message: string; plan: any }>('/trade-plans', {
      method: 'POST',
      body: JSON.stringify(plan)
    }),
  deleteTradePlan: (id: string) =>
    request<{ message: string }>(`/trade-plans/${id}`, {
      method: 'DELETE'
    }),

  // Watchlist
  getWatchlist: () => request<any[]>('/watchlist'),
  addToWatchlist: (symbol: string, notes?: string) =>
    request<{ message: string; id: string; symbol: string }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol, notes })
    }),
  removeFromWatchlist: (symbol: string) =>
    request<{ message: string }>(`/watchlist/${symbol}`, {
      method: 'DELETE'
    }),

  // Alerts
  getAlerts: () => request<AlertItem[]>('/alerts'),
  createAlert: (payload: { symbol: string; alertType: string; targetValue?: number }) =>
    request<{ message: string; id: string }>('/alerts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  toggleAlert: (id: string) =>
    request<{ message: string; isActive: boolean }>(`/alerts/${id}/toggle`, {
      method: 'PATCH'
    }),
  deleteAlert: (id: string) =>
    request<{ message: string }>(`/alerts/${id}`, {
      method: 'DELETE'
    }),
  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>('/alerts/notifications'),
  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/alerts/notifications/${id}/read`, {
      method: 'PATCH'
    }),
  clearAllNotifications: () =>
    request<{ message: string }>('/alerts/notifications/clear-all', {
      method: 'POST'
    }),

  // Portfolio
  getPortfolioSummary: () => request<PortfolioSummary>('/portfolio/summary'),
  getTransactions: () => request<any[]>('/portfolio/transactions'),
  calculateFeesPreview: (quantity: number, price: number, isSell = false) =>
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
  addTransaction: (tx: TransactionInput) =>
    request<{ message: string; id: string }>('/portfolio/transactions', {
      method: 'POST',
      body: JSON.stringify(tx)
    }),
  deleteTransaction: (id: string) =>
    request<{ message: string }>(`/portfolio/transactions/${id}`, {
      method: 'DELETE'
    })
};
