import {
  IDataProvider,
  MarketSummary,
  TopMovers,
  CompanySummary,
  CompanyDetails,
  Candle,
  Announcement,
  MarketNews,
  DataSourceInfo,
  DataStatus,
  FeedType
} from './types.js';
import {
  getNepseMarketStatus,
  formatNepalDateTime,
  formatNPR
} from '../engine/nepaliCalendar.js';
import { generateDynamicMarketSummary } from '../engine/marketSummaryHelper.js';

export interface SourceCodeCredentials {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  accessId: string;
  apiVersion?: string;
  cacheTtlSeconds?: number;
  timeoutMs?: number;
  feedType?: FeedType;
}

export class SourceCodeMdpProvider implements IDataProvider {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private accessId: string;
  private apiVersion: string;
  private cacheTtlMs: number;
  private timeoutMs: number;
  private feedType: FeedType;

  // Shared in-memory cache to prevent per-visitor API spam
  private cache: Map<string, { timestamp: number; data: any; observedAt: string }> = new Map();

  // Last known valid states for graceful degradation with explicit stale tagging
  private lastValidMarketSummary: MarketSummary | null = null;
  private lastValidCompanyMap: Map<string, CompanyDetails> = new Map();

  constructor(creds?: Partial<SourceCodeCredentials>) {
    this.baseUrl = (creds?.baseUrl || process.env.SOURCECODE_BASE_URL || 'https://uat.sourcecode.com.np').replace(/\/$/, '');
    this.apiKey = creds?.apiKey || process.env.SOURCECODE_API_KEY || '';
    this.apiSecret = creds?.apiSecret || process.env.SOURCECODE_API_SECRET || '';
    this.accessId = creds?.accessId || process.env.SOURCECODE_ACCESS_ID || '';
    this.apiVersion = creds?.apiVersion || process.env.SOURCECODE_API_VERSION || '1.0';
    this.cacheTtlMs = (creds?.cacheTtlSeconds !== undefined ? creds.cacheTtlSeconds : parseInt(process.env.SOURCECODE_CACHE_TTL_SECONDS || '60', 10)) * 1000;
    this.timeoutMs = creds?.timeoutMs !== undefined ? creds.timeoutMs : parseInt(process.env.SOURCECODE_TIMEOUT_MS || '8000', 10);
    this.feedType = (creds?.feedType || (process.env.SOURCECODE_FEED_TYPE as FeedType) || 'LIVE');
  }

  isDemo(): boolean {
    return false;
  }

  hasValidCredentials(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiSecret &&
      this.accessId &&
      this.apiKey !== 'your_sourcecode_api_key_here' &&
      this.apiSecret !== 'your_sourcecode_api_secret_here' &&
      this.accessId !== 'your_sourcecode_access_id_here'
    );
  }

  getDataSourceInfo(): DataSourceInfo {
    const session = getNepseMarketStatus();
    const isLiveHours = session.status === 'OPEN';
    const isConfigured = this.hasValidCredentials();

    let dataStatus: DataStatus = 'UNAVAILABLE';
    if (isConfigured) {
      if (!isLiveHours) {
        dataStatus = 'END_OF_DAY';
      } else if (this.feedType === 'DELAYED_15MIN') {
        dataStatus = 'DELAYED';
      } else {
        dataStatus = 'LIVE';
      }
    }

    return {
      providerName: 'Source Code MDP (NEPSE Licensed Distributor)',
      officialAuthorization: 'NEPSE Licensed Market Data Vendor (Source Code Pvt. Ltd.)',
      attributionUrl: 'https://sourcecode.com.np',
      feedType: this.feedType,
      dataStatus,
      licenseStatus: this.baseUrl.includes('uat.') ? 'EVALUATION_UAT' : 'LICENSED_COMMERCIAL',
      isDemo: false,
      isStale: false,
      delayMinutes: this.feedType === 'DELAYED_15MIN' ? 15 : 0,
      observedAtNPT: formatNepalDateTime(),
      retrievedAtNPT: formatNepalDateTime(),
      disclaimer: 'Market data sourced from Source Code Pvt. Ltd., licensed distributor for Nepal Stock Exchange (NEPSE). Redistribution subject to NEPSE data policies.',
      notes: isConfigured
        ? `Connected to ${this.baseUrl.includes('uat.') ? 'UAT gateway' : 'Production gateway'}.`
        : 'Source Code MDP credentials (ApiKey, ApiSecret, AccessId) required to stream live exchange records.'
    };
  }

  /**
   * Secure HTTP request execution with headers, timeout, bounded retries, and rate-limit guard
   */
  private async executeRequest<T>(endpoint: string, options: { retries?: number } = {}): Promise<T> {
    if (!this.hasValidCredentials()) {
      throw new Error('Source Code MDP credentials missing or unconfigured. Please configure SOURCECODE_API_KEY, SOURCECODE_API_SECRET, and SOURCECODE_ACCESS_ID.');
    }

    const { retries = 2 } = options;
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= retries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'ApiKey': this.apiKey,
            'ApiSecret': this.apiSecret,
            'AccessId': this.accessId,
            'ApiVersion': this.apiVersion,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed with Source Code MDP (HTTP ${response.status}). Verify ApiKey, ApiSecret, and AccessId permissions.`);
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
          if (attempt <= retries) {
            await new Promise(res => setTimeout(res, retryAfter * 1000));
            continue;
          }
          throw new Error('Source Code MDP rate limit exceeded (HTTP 429). Please reduce request frequency.');
        }

        if (!response.ok) {
          throw new Error(`Source Code MDP returned HTTP ${response.status} for ${endpoint}`);
        }

        const json = await response.json();
        return json as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        
        // If aborted due to timeout
        if (err.name === 'AbortError') {
          lastError = new Error(`Source Code MDP request timed out after ${this.timeoutMs}ms for ${endpoint}`);
        }

        // Do not retry 401/403 client authentication errors
        if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
          throw err;
        }

        if (attempt <= retries) {
          const backoff = 300 * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, backoff));
        }
      }
    }

    throw lastError;
  }

  private getCache<T>(key: string): { data: T; isStale: boolean; observedAt: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const isStale = (Date.now() - entry.timestamp) >= this.cacheTtlMs;
    return { data: entry.data as T, isStale, observedAt: entry.observedAt };
  }

  private setCache(key: string, data: any, observedAt: string) {
    this.cache.set(key, { timestamp: Date.now(), data, observedAt });
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const cacheKey = 'mdp_market_summary';
    const cached = this.getCache<MarketSummary>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    const session = getNepseMarketStatus();
    const retrievedAt = formatNepalDateTime();

    try {
      // Documented Source Code MDP endpoint for live index and market turnover
      const raw = await this.executeRequest<any>('/api/v1/Indices/live');

      // Validate numeric values and payload schema
      const nepseIndex = Number(raw.currentValue || raw.indexValue || raw.nepseIndex);
      const pointChange = Number(raw.pointChange || raw.change || 0);
      const percentChange = Number(raw.percentageChange || raw.pChange || 0);
      const totalTurnover = Number(raw.totalTurnover || raw.turnover || 0);
      const totalSharesTraded = Number(raw.totalVolume || raw.totalShares || 0);
      const totalTransactions = Number(raw.totalTransactions || 0);
      const observedAt = raw.timestamp || raw.asOfDate || retrievedAt;

      if (isNaN(nepseIndex) || nepseIndex <= 0) {
        throw new Error('Malformed market index payload received from Source Code MDP.');
      }

      // Fetch top movers to build dynamic, verified summary
      let topMovers: TopMovers = { topGainers: [], topLosers: [], mostActiveByTurnover: [], mostActiveByVolume: [] };
      try {
        topMovers = await this.getTopMovers();
      } catch {
        // top movers optional for summary
      }

      const { summaryEn, summaryNe } = generateDynamicMarketSummary({
        nepseIndex,
        pointChange,
        percentChange,
        totalTurnover,
        totalTransactions,
        topGainers: topMovers.topGainers,
        topLosers: topMovers.topLosers
      });

      const dsInfo: DataSourceInfo = {
        providerName: 'Source Code MDP (NEPSE Licensed Distributor)',
        officialAuthorization: 'NEPSE Licensed Market Data Vendor (Source Code Pvt. Ltd.)',
        attributionUrl: 'https://sourcecode.com.np',
        feedType: session.status === 'OPEN' ? this.feedType : 'END_OF_DAY',
        dataStatus: session.status === 'OPEN' ? 'LIVE' : 'END_OF_DAY',
        licenseStatus: this.baseUrl.includes('uat.') ? 'EVALUATION_UAT' : 'LICENSED_COMMERCIAL',
        isDemo: false,
        isStale: false,
        delayMinutes: this.feedType === 'DELAYED_15MIN' ? 15 : 0,
        observedAtNPT: observedAt,
        retrievedAtNPT: retrievedAt,
        disclaimer: 'Official NEPSE market data provided via Source Code Pvt. Ltd.',
        notes: `Verified exchange session record. Observed at ${observedAt}.`
      };

      const summary: MarketSummary = {
        nepseIndex: Math.round(nepseIndex * 100) / 100,
        pointChange: Math.round(pointChange * 100) / 100,
        percentChange: Math.round(percentChange * 100) / 100,
        totalTurnover: Math.round(totalTurnover * 100) / 100,
        totalSharesTraded: Math.round(totalSharesTraded),
        totalTransactions: Math.round(totalTransactions),
        session,
        dataSource: dsInfo,
        plainLanguageSummaryEn: summaryEn,
        plainLanguageSummaryNe: summaryNe
      };

      this.lastValidMarketSummary = summary;
      this.setCache(cacheKey, summary, observedAt);
      return summary;
    } catch (err: any) {
      // If cached data exists or last valid data exists, serve it marked as STALE
      if (this.lastValidMarketSummary) {
        console.warn(`⚠️ Source Code MDP fetch failed: ${err.message}. Serving last valid market summary with STALE warning.`);
        return {
          ...this.lastValidMarketSummary,
          dataSource: {
            ...this.lastValidMarketSummary.dataSource,
            isStale: true,
            dataStatus: 'STALE',
            retrievedAtNPT: retrievedAt,
            notes: `Data stale: Provider request failed (${err.message}). Showing last verified observation from ${this.lastValidMarketSummary.dataSource.observedAtNPT}.`
          }
        };
      }

      // No silent demo fallback: return explicit UNAVAILABLE structure per specification
      throw new Error(`Source Code MDP unavailable: ${err.message}`);
    }
  }

  async getTopMovers(): Promise<TopMovers> {
    const companies = await this.getCompanies();
    const sorted = [...companies];

    const topGainers = [...sorted].sort((a, b) => b.pChange - a.pChange).slice(0, 5);
    const topLosers = [...sorted].sort((a, b) => a.pChange - b.pChange).slice(0, 5);
    const mostActiveByTurnover = [...sorted].sort((a, b) => b.turnover - a.turnover).slice(0, 5);
    const mostActiveByVolume = [...sorted].sort((a, b) => b.volume - a.volume).slice(0, 5);

    return {
      topGainers,
      topLosers,
      mostActiveByTurnover,
      mostActiveByVolume
    };
  }

  async getCompanies(query?: string, sector?: string): Promise<CompanySummary[]> {
    const cacheKey = 'mdp_companies_list';
    let list: CompanySummary[] = [];

    const cached = this.getCache<CompanySummary[]>(cacheKey);
    if (cached && !cached.isStale) {
      list = cached.data;
    } else {
      const retrievedAt = formatNepalDateTime();
      try {
        // Documented endpoint for current market stock quotes
        const rawList = await this.executeRequest<any[]>('/api/v1/StockLive');

        if (!Array.isArray(rawList)) {
          throw new Error('Expected array of stock quotes from Source Code MDP.');
        }

        list = rawList.map(item => {
          const ltp = Number(item.lastTradedPrice || item.ltp || item.close || 0);
          const change = Number(item.pointChange || item.change || 0);
          const pChange = Number(item.percentageChange || item.pChange || 0);
          const volume = Number(item.totalTradedShares || item.volume || 0);
          const turnover = Number(item.totalTradedValue || item.turnover || 0);
          const previousClose = Number(item.previousClose || (ltp - change));
          const observedAt = item.timestamp || item.lastUpdated || retrievedAt;

          return {
            symbol: String(item.symbol || item.scrip || '').trim().toUpperCase(),
            name: String(item.companyName || item.securityName || item.symbol || '').trim(),
            nameNe: item.securityNameNe || undefined,
            sector: String(item.sectorName || item.sector || 'Other').trim(),
            sectorNe: item.sectorNameNe || undefined,
            ltp: Math.round(ltp * 100) / 100,
            change: Math.round(change * 100) / 100,
            pChange: Math.round(pChange * 100) / 100,
            high: Number(item.highPrice || item.high || ltp),
            low: Number(item.lowPrice || item.low || ltp),
            volume: Math.round(volume),
            turnover: Math.round(turnover * 100) / 100,
            previousClose: Math.round(previousClose * 100) / 100,
            week52High: Number(item.fiftyTwoWeekHigh || item.week52High || ltp),
            week52Low: Number(item.fiftyTwoWeekLow || item.week52Low || ltp),
            observedAtNPT: observedAt,
            retrievedAtNPT: retrievedAt,
            dataStatus: 'LIVE',
            isAdjustedPrice: Boolean(item.isAdjusted)
          };
        }).filter(c => c.symbol.length > 0 && c.ltp > 0);

        this.setCache(cacheKey, list, retrievedAt);
      } catch (err: any) {
        if (cached) {
          // Serve stale cache with warning
          list = cached.data.map(c => ({ ...c, dataStatus: 'STALE' as DataStatus }));
        } else {
          throw err;
        }
      }
    }

    // Apply filtering
    let result = list;
    if (query) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        c => c.symbol.toLowerCase().includes(q) ||
             c.name.toLowerCase().includes(q) ||
             (c.nameNe && c.nameNe.toLowerCase().includes(q))
      );
    }

    if (sector && sector !== 'ALL') {
      result = result.filter(c => c.sector.toLowerCase() === sector.toLowerCase());
    }

    return result;
  }

  async getCompanyDetails(symbol: string): Promise<CompanyDetails | null> {
    const sym = symbol.trim().toUpperCase();
    const cacheKey = `mdp_company_details_${sym}`;
    const cached = this.getCache<CompanyDetails>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    const retrievedAt = formatNepalDateTime();

    try {
      // 1. Get quote
      const companies = await this.getCompanies();
      const baseQuote = companies.find(c => c.symbol === sym);
      if (!baseQuote) {
        return null;
      }

      // 2. Query company profile & financial ratios from MDP
      let profileRaw: any = null;
      let fundamentalsRaw: any = null;
      let fundamentalsAvailable = false;

      try {
        profileRaw = await this.executeRequest<any>(`/api/v1/Company/${sym}`);
      } catch {
        // Profile endpoint may be separate
      }

      try {
        fundamentalsRaw = await this.executeRequest<any>(`/api/v1/Financial/ratios?symbol=${sym}`);
        if (fundamentalsRaw && (fundamentalsRaw.eps || fundamentalsRaw.bookValue)) {
          fundamentalsAvailable = true;
        }
      } catch {
        fundamentalsAvailable = false;
      }

      // Treat fundamentals honestly: do not invent figures if unavailable
      const eps = fundamentalsRaw ? Number(fundamentalsRaw.eps || 0) : 0;
      const pe = fundamentalsRaw ? Number(fundamentalsRaw.pe || (eps > 0 ? baseQuote.ltp / eps : 0)) : 0;
      const bookValue = fundamentalsRaw ? Number(fundamentalsRaw.bookValue || 0) : 0;
      const pb = bookValue > 0 ? Math.round((baseQuote.ltp / bookValue) * 100) / 100 : 0;
      const roe = fundamentalsRaw ? Number(fundamentalsRaw.roe || 0) : 0;
      const marketCap = fundamentalsRaw ? Number(fundamentalsRaw.marketCap || 0) : 0;
      const paidUpCapital = fundamentalsRaw ? Number(fundamentalsRaw.paidUpCapital || 0) : 0;
      const quarterlyPeriod = fundamentalsRaw ? (fundamentalsRaw.period || 'Unavailable') : 'Unavailable';
      const reportedDate = fundamentalsRaw ? (fundamentalsRaw.reportedDate || 'Unavailable') : 'Unavailable';

      const dividendHistory = Array.isArray(fundamentalsRaw?.dividends)
        ? fundamentalsRaw.dividends.map((d: any) => ({
            fiscalYear: String(d.fiscalYear || ''),
            bonusSharePercent: Number(d.bonusShare || 0),
            cashDividendPercent: Number(d.cashDividend || 0),
            bookClosureDate: String(d.bookClosureDate || '—')
          }))
        : [];

      // Factual descriptive trend summary without speculative inferences
      const changeWord = baseQuote.change >= 0 ? 'advanced' : 'declined';
      const trendSummaryEn = `${baseQuote.symbol} ${changeWord} ${Math.abs(baseQuote.change)} (${baseQuote.pChange}%) in the latest trading session to trade at NPR ${baseQuote.ltp} across ${baseQuote.volume.toLocaleString()} shares.`;
      const trendSummaryNe = `${baseQuote.symbol} पछिल्लो सत्रमा ${baseQuote.change >= 0 ? '+' : ''}${baseQuote.change} (${baseQuote.pChange}%) ले परिवर्तन भई NPR ${baseQuote.ltp} मा कारोबार भएको छ।`;

      const details: CompanyDetails = {
        ...baseQuote,
        description: profileRaw?.description || `${baseQuote.name} is a listed company on the Nepal Stock Exchange operating in the ${baseQuote.sector} sector.`,
        descriptionNe: profileRaw?.descriptionNe || undefined,
        listingDate: profileRaw?.listingDate || '—',
        totalShares: Number(profileRaw?.totalShares || 0),
        fundamentals: {
          eps: Math.round(eps * 100) / 100,
          pe: Math.round(pe * 100) / 100,
          bookValue: Math.round(bookValue * 100) / 100,
          pb,
          roe: Math.round(roe * 100) / 100,
          marketCap,
          paidUpCapital,
          quarterlyReportPeriod: quarterlyPeriod,
          reportedDate,
          dividendHistory,
          isAvailable: fundamentalsAvailable
        },
        fundamentalsAvailable,
        announcementsAvailable: false, // will check announcements endpoint
        trendSummaryEn,
        trendSummaryNe
      };

      this.lastValidCompanyMap.set(sym, details);
      this.setCache(cacheKey, details, retrievedAt);
      return details;
    } catch (err: any) {
      if (this.lastValidCompanyMap.has(sym)) {
        const stale = this.lastValidCompanyMap.get(sym)!;
        return {
          ...stale,
          dataStatus: 'STALE'
        };
      }
      throw err;
    }
  }

  async getHistoricalCandles(symbol: string, period = '3M'): Promise<Candle[]> {
    const sym = symbol.trim().toUpperCase();
    const cacheKey = `mdp_candles_${sym}_${period}`;
    const cached = this.getCache<Candle[]>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      // Documented chart history endpoint
      const raw = await this.executeRequest<any>(`/api/v1/Chart/history?symbol=${sym}&period=${period}`);
      
      let candles: Candle[] = [];
      if (Array.isArray(raw)) {
        candles = raw.map(c => ({
          date: String(c.date || c.d),
          open: Number(c.open || c.o),
          high: Number(c.high || c.h),
          low: Number(c.low || c.l),
          close: Number(c.close || c.c),
          volume: Number(c.volume || c.v),
          isAdjusted: Boolean(c.isAdjusted)
        }));
      } else if (raw && Array.isArray(raw.t) && Array.isArray(raw.c)) {
        // TradingView UDF format: t=timestamps, o=opens, h=highs, l=lows, c=closes, v=volumes
        candles = raw.t.map((timestamp: number, i: number) => {
          const d = new Date(timestamp * 1000);
          const dateStr = d.toISOString().split('T')[0];
          return {
            date: dateStr,
            open: Number(raw.o[i]),
            high: Number(raw.h[i]),
            low: Number(raw.l[i]),
            close: Number(raw.c[i]),
            volume: Number(raw.v[i] || 0),
            isAdjusted: true
          };
        });
      }

      this.setCache(cacheKey, candles, formatNepalDateTime());
      return candles;
    } catch (err: any) {
      if (cached) {
        return cached.data;
      }
      throw err;
    }
  }

  async getAnnouncements(symbol?: string): Promise<Announcement[]> {
    const sym = symbol ? symbol.trim().toUpperCase() : undefined;
    const cacheKey = `mdp_announcements_${sym || 'all'}`;
    const cached = this.getCache<Announcement[]>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const endpoint = sym
        ? `/api/v1/CorporateAction/announcements?symbol=${sym}`
        : '/api/v1/CorporateAction/announcements';
      const raw = await this.executeRequest<any[]>(endpoint);

      if (!Array.isArray(raw)) {
        return [];
      }

      const announcements: Announcement[] = raw.map(item => ({
        id: String(item.id || item.announcementId),
        symbol: String(item.symbol || '').toUpperCase(),
        companyName: String(item.companyName || item.symbol),
        title: String(item.title || item.heading),
        titleNe: item.titleNe || undefined,
        summary: String(item.summary || item.details || item.title),
        summaryNe: item.summaryNe || undefined,
        category: (item.category || 'NOTICE') as any,
        date: String(item.date || item.publishedDate),
        sourceUrl: item.sourceUrl || 'https://nepalstock.com.np',
        publisher: item.publisher || 'NEPSE / Company Disclosure',
        isVerifiedSource: true
      }));

      this.setCache(cacheKey, announcements, formatNepalDateTime());
      return announcements;
    } catch {
      // Return empty array honestly if announcement feed is not part of provider tier
      return [];
    }
  }

  async getMarketNews(): Promise<MarketNews[]> {
    const cacheKey = 'mdp_news';
    const cached = this.getCache<MarketNews[]>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const raw = await this.executeRequest<any[]>('/api/v1/News/market');
      if (!Array.isArray(raw)) return [];

      const news: MarketNews[] = raw.map(item => ({
        id: String(item.id || item.newsId),
        title: String(item.title),
        titleNe: item.titleNe || undefined,
        summary: String(item.summary || item.title),
        date: String(item.date || item.publishedAt),
        source: String(item.source || 'NEPSE Official Press'),
        url: item.url || 'https://nepalstock.com.np',
        isVerifiedSource: true
      }));

      this.setCache(cacheKey, news, formatNepalDateTime());
      return news;
    } catch {
      return [];
    }
  }
}
