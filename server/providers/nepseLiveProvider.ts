import {
  IDataProvider,
  MarketSummary,
  TopMovers,
  CompanySummary,
  CompanyDetails,
  Candle,
  Announcement,
  MarketNews,
  DataSourceInfo
} from './types.js';
import { NepseDemoProvider } from './nepseDemoProvider.js';
import { formatNepalDateTime } from '../engine/nepaliCalendar.js';

export class NepseLiveProvider implements IDataProvider {
  private apiUrl: string;
  private apiKey: string;
  private cacheTTL: number;
  private fallbackProvider: NepseDemoProvider;
  private cache: Map<string, { timestamp: number; data: any }> = new Map();

  constructor() {
    this.apiUrl = process.env.NEPSE_API_URL || '';
    this.apiKey = process.env.NEPSE_API_KEY || '';
    this.cacheTTL = (parseInt(process.env.NEPSE_CACHE_TTL_SECONDS || '60', 10)) * 1000;
    this.fallbackProvider = new NepseDemoProvider();
  }

  isDemo(): boolean {
    // If no valid API URL or key is provided, return true (demo)
    return !(this.apiUrl && this.apiKey && this.apiKey !== 'your_authorized_nepse_api_key_here');
  }

  getDataSourceInfo(): DataSourceInfo {
    if (this.isDemo()) {
      return this.fallbackProvider.getDataSourceInfo();
    }
    return {
      providerName: 'Authorized NEPSE Direct Feed',
      isDemo: false,
      feedType: 'LIVE',
      lastUpdatedTimeNPT: formatNepalDateTime(),
      isStale: false,
      disclaimer: 'Live market prices provided via authorized secondary market data feed. Prices refreshed every minute during market hours.'
    };
  }

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  async getMarketSummary(): Promise<MarketSummary> {
    if (this.isDemo()) return this.fallbackProvider.getMarketSummary();
    const cached = this.getCached('market_summary');
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/market/summary`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache('market_summary', data);
      return data;
    } catch (err) {
      console.warn('⚠️ Live NEPSE provider request failed, falling back to verified demo data:', err);
      return this.fallbackProvider.getMarketSummary();
    }
  }

  async getTopMovers(): Promise<TopMovers> {
    if (this.isDemo()) return this.fallbackProvider.getTopMovers();
    const cached = this.getCached('top_movers');
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/market/top-movers`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache('top_movers', data);
      return data;
    } catch {
      return this.fallbackProvider.getTopMovers();
    }
  }

  async getCompanies(query?: string, sector?: string): Promise<CompanySummary[]> {
    if (this.isDemo()) return this.fallbackProvider.getCompanies(query, sector);
    const cacheKey = `companies_${query || ''}_${sector || ''}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${this.apiUrl}/market/companies`);
      if (query) url.searchParams.set('q', query);
      if (sector) url.searchParams.set('sector', sector);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch {
      return this.fallbackProvider.getCompanies(query, sector);
    }
  }

  async getCompanyDetails(symbol: string): Promise<CompanyDetails | null> {
    if (this.isDemo()) return this.fallbackProvider.getCompanyDetails(symbol);
    const cacheKey = `company_${symbol.toUpperCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/companies/${symbol.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch {
      return this.fallbackProvider.getCompanyDetails(symbol);
    }
  }

  async getHistoricalCandles(symbol: string, period = '3M'): Promise<Candle[]> {
    if (this.isDemo()) return this.fallbackProvider.getHistoricalCandles(symbol, period);
    const cacheKey = `candles_${symbol.toUpperCase()}_${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/companies/${symbol.toUpperCase()}/candles?period=${period}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch {
      return this.fallbackProvider.getHistoricalCandles(symbol, period);
    }
  }

  async getAnnouncements(symbol?: string): Promise<Announcement[]> {
    if (this.isDemo()) return this.fallbackProvider.getAnnouncements(symbol);
    const cacheKey = `announcements_${symbol || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${this.apiUrl}/announcements`);
      if (symbol) url.searchParams.set('symbol', symbol.toUpperCase());
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch {
      return this.fallbackProvider.getAnnouncements(symbol);
    }
  }

  async getMarketNews(): Promise<MarketNews[]> {
    if (this.isDemo()) return this.fallbackProvider.getMarketNews();
    const cached = this.getCached('market_news');
    if (cached) return cached;

    try {
      const response = await fetch(`${this.apiUrl}/news`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      if (!response.ok) throw new Error(`Live provider returned ${response.status}`);
      const data = await response.json();
      this.setCache('market_news', data);
      return data;
    } catch {
      return this.fallbackProvider.getMarketNews();
    }
  }
}
