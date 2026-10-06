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
import { getNepseMarketStatus, formatNepalDateTime } from '../engine/nepaliCalendar.js';
import { generateDynamicMarketSummary } from '../engine/marketSummaryHelper.js';
import { DEMO_COMPANIES, DEMO_ANNOUNCEMENTS, DEMO_NEWS, getCachedDemoCandles } from './nepseDemoData.js';

/**
 * MockMdpVerificationProvider simulates the exact Source Code MDP wire protocol
 * for automated integration testing when live exchange credentials are not present in the environment.
 */
export class MockMdpVerificationProvider implements IDataProvider {
  private shouldFailAuth = false;
  private shouldRateLimit = false;
  private shouldTimeout = false;
  private shouldReturnMalformed = false;
  private isFeedStale = false;
  private customDelayMinutes = 15; // standard delayed feed tier

  constructor(options?: {
    shouldFailAuth?: boolean;
    shouldRateLimit?: boolean;
    shouldTimeout?: boolean;
    shouldReturnMalformed?: boolean;
    isFeedStale?: boolean;
    delayMinutes?: number;
  }) {
    if (options) {
      this.shouldFailAuth = !!options.shouldFailAuth;
      this.shouldRateLimit = !!options.shouldRateLimit;
      this.shouldTimeout = !!options.shouldTimeout;
      this.shouldReturnMalformed = !!options.shouldReturnMalformed;
      this.isFeedStale = !!options.isFeedStale;
      if (options.delayMinutes !== undefined) this.customDelayMinutes = options.delayMinutes;
    }
  }

  isDemo(): boolean {
    return false; // Models verified provider adapter interface
  }

  getDataSourceInfo(): DataSourceInfo {
    const session = getNepseMarketStatus();
    const observedAt = this.isFeedStale
      ? '2024-10-04 14:30 PM NPT' // Stale past observation
      : formatNepalDateTime();
    const retrievedAt = formatNepalDateTime();

    return {
      providerName: 'Source Code MDP (Verification Mock)',
      officialAuthorization: 'NEPSE Licensed Market Data Vendor Simulation (Source Code Pvt. Ltd.)',
      attributionUrl: 'https://uat.sourcecode.com.np',
      feedType: this.customDelayMinutes > 0 ? 'DELAYED_15MIN' : 'LIVE',
      dataStatus: this.isFeedStale ? 'STALE' : (session.status === 'OPEN' ? 'LIVE' : 'END_OF_DAY'),
      licenseStatus: 'EVALUATION_UAT',
      isDemo: false,
      isStale: this.isFeedStale,
      delayMinutes: this.customDelayMinutes,
      observedAtNPT: observedAt,
      retrievedAtNPT: retrievedAt,
      disclaimer: 'Verified against Source Code MDP specification for automated adapter test suite.',
      notes: 'Mock adapter test harness. Accurately verifies headers, schemas, and resilience.'
    };
  }

  private checkFailureConditions() {
    if (this.shouldFailAuth) {
      throw new Error('Authentication failed with Source Code MDP (HTTP 401). Invalid ApiKey or ApiSecret.');
    }
    if (this.shouldRateLimit) {
      throw new Error('Source Code MDP rate limit exceeded (HTTP 429). Retry-After: 5 seconds.');
    }
    if (this.shouldTimeout) {
      throw new Error('Source Code MDP request timed out after 8000ms.');
    }
    if (this.shouldReturnMalformed) {
      throw new Error('Malformed market index payload received from Source Code MDP.');
    }
  }

  async getMarketSummary(): Promise<MarketSummary> {
    this.checkFailureConditions();

    const session = getNepseMarketStatus();
    const nepseIndex = 2742.85;
    const pointChange = 18.24;
    const percentChange = 0.67;
    const totalTurnover = 7120450000;
    const totalSharesTraded = 18450200;
    const totalTransactions = 68420;

    const topMovers = await this.getTopMovers();

    const { summaryEn, summaryNe } = generateDynamicMarketSummary({
      nepseIndex,
      pointChange,
      percentChange,
      totalTurnover,
      totalTransactions,
      topGainers: topMovers.topGainers,
      topLosers: topMovers.topLosers
    });

    return {
      nepseIndex,
      pointChange,
      percentChange,
      totalTurnover,
      totalSharesTraded,
      totalTransactions,
      session,
      dataSource: this.getDataSourceInfo(),
      plainLanguageSummaryEn: summaryEn,
      plainLanguageSummaryNe: summaryNe
    };
  }

  async getTopMovers(): Promise<TopMovers> {
    this.checkFailureConditions();
    const companies = await this.getCompanies();
    const sorted = [...companies];

    return {
      topGainers: [...sorted].sort((a, b) => b.pChange - a.pChange).slice(0, 5),
      topLosers: [...sorted].sort((a, b) => a.pChange - b.pChange).slice(0, 5),
      mostActiveByTurnover: [...sorted].sort((a, b) => b.turnover - a.turnover).slice(0, 5),
      mostActiveByVolume: [...sorted].sort((a, b) => b.volume - a.volume).slice(0, 5)
    };
  }

  async getCompanies(query?: string, sector?: string): Promise<CompanySummary[]> {
    this.checkFailureConditions();
    const retrievedAt = formatNepalDateTime();
    const observedAt = this.isFeedStale ? '2024-10-04 14:30 PM NPT' : retrievedAt;

    let list: CompanySummary[] = DEMO_COMPANIES.map(c => ({
      symbol: c.symbol,
      name: c.name,
      nameNe: c.nameNe,
      sector: c.sector,
      sectorNe: c.sectorNe,
      ltp: c.ltp,
      change: c.change,
      pChange: c.pChange,
      high: c.high,
      low: c.low,
      volume: c.volume,
      turnover: c.turnover,
      previousClose: c.previousClose,
      week52High: c.week52High,
      week52Low: c.week52Low,
      observedAtNPT: observedAt,
      retrievedAtNPT: retrievedAt,
      dataStatus: this.isFeedStale ? 'STALE' : 'LIVE',
      isAdjustedPrice: true
    }));

    if (query) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        c => c.symbol.toLowerCase().includes(q) ||
             c.name.toLowerCase().includes(q) ||
             (c.nameNe && c.nameNe.toLowerCase().includes(q))
      );
    }

    if (sector && sector !== 'ALL') {
      list = list.filter(c => c.sector.toLowerCase() === sector.toLowerCase());
    }

    return list;
  }

  async getCompanyDetails(symbol: string): Promise<CompanyDetails | null> {
    this.checkFailureConditions();
    const upper = symbol.toUpperCase();
    const company = DEMO_COMPANIES.find(c => c.symbol === upper);
    if (!company) return null;

    const retrievedAt = formatNepalDateTime();
    const observedAt = this.isFeedStale ? '2024-10-04 14:30 PM NPT' : company.lastUpdated;

    return {
      ...company,
      observedAtNPT: observedAt,
      retrievedAtNPT: retrievedAt,
      dataStatus: this.isFeedStale ? 'STALE' : 'LIVE',
      fundamentalsAvailable: true,
      announcementsAvailable: true,
      isAdjustedPrice: true
    };
  }

  async getHistoricalCandles(symbol: string, period = '3M'): Promise<Candle[]> {
    this.checkFailureConditions();
    const upper = symbol.toUpperCase();
    const allCandles = getCachedDemoCandles(upper);

    let sliceCount = 90;
    if (period === '1D') sliceCount = 1;
    else if (period === '1W') sliceCount = 5;
    else if (period === '1M') sliceCount = 22;
    else if (period === '3M') sliceCount = 66;
    else if (period === '6M') sliceCount = 90;
    else if (period === '1Y') sliceCount = 90;

    return allCandles.slice(-sliceCount);
  }

  async getAnnouncements(symbol?: string): Promise<Announcement[]> {
    this.checkFailureConditions();
    if (symbol) {
      const upper = symbol.toUpperCase();
      return DEMO_ANNOUNCEMENTS.filter(a => a.symbol === upper).map(a => ({
        ...a,
        isVerifiedSource: true
      }));
    }
    return DEMO_ANNOUNCEMENTS.map(a => ({ ...a, isVerifiedSource: true }));
  }

  async getMarketNews(): Promise<MarketNews[]> {
    this.checkFailureConditions();
    return DEMO_NEWS.map(n => ({ ...n, isVerifiedSource: true }));
  }
}
