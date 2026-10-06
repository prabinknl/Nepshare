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
import {
  DEMO_COMPANIES,
  DEMO_ANNOUNCEMENTS,
  DEMO_NEWS,
  getCachedDemoCandles
} from './nepseDemoData.js';
import { getNepseMarketStatus, formatNepalDateTime } from '../engine/nepaliCalendar.js';
import { generateDynamicMarketSummary } from '../engine/marketSummaryHelper.js';

export class NepseDemoProvider implements IDataProvider {
  private dataSourceInfo: DataSourceInfo;

  constructor() {
    this.dataSourceInfo = {
      providerName: 'Nepshare Verified Demonstration Feed',
      officialAuthorization: 'Demonstration / Simulated Dataset (Not official exchange feed)',
      attributionUrl: 'https://sharenep.internal/demo',
      feedType: 'DEMO_DATA',
      dataStatus: 'DEMO',
      licenseStatus: 'DEMO',
      isDemo: true,
      isStale: false,
      delayMinutes: 0,
      observedAtNPT: formatNepalDateTime(),
      retrievedAtNPT: formatNepalDateTime(),
      disclaimer: 'Demo data—not current market information. Real-market trade execution and outbound broker alerts are disabled.',
      notes: 'Explicit demonstration dataset. Does not connect to live trading infrastructure.'
    };
  }

  isDemo(): boolean {
    return true;
  }

  getDataSourceInfo(): DataSourceInfo {
    this.dataSourceInfo.observedAtNPT = formatNepalDateTime();
    this.dataSourceInfo.retrievedAtNPT = formatNepalDateTime();
    return this.dataSourceInfo;
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const session = getNepseMarketStatus();
    
    // Calculate aggregate turnover and points from demo universe
    const totalTurnover = DEMO_COMPANIES.reduce((acc, c) => acc + c.turnover, 0) * 1.8;
    const totalShares = DEMO_COMPANIES.reduce((acc, c) => acc + c.volume, 0) * 1.8;
    const nepseIndex = 2742.85;
    const pointChange = 18.24;
    const percentChange = 0.67;
    const totalTransactions = 68420;

    const topMovers = await this.getTopMovers();

    // Dynamically generate market summary text from verified numbers only
    const { summaryEn, summaryNe } = generateDynamicMarketSummary({
      nepseIndex,
      pointChange,
      percentChange,
      totalTurnover: Math.round(totalTurnover),
      totalTransactions,
      topGainers: topMovers.topGainers,
      topLosers: topMovers.topLosers
    });

    return {
      nepseIndex,
      pointChange,
      percentChange,
      totalTurnover: Math.round(totalTurnover),
      totalSharesTraded: Math.round(totalShares),
      totalTransactions,
      session,
      dataSource: this.getDataSourceInfo(),
      plainLanguageSummaryEn: summaryEn,
      plainLanguageSummaryNe: summaryNe
    };
  }

  async getTopMovers(): Promise<TopMovers> {
    const companies = await this.getCompanies();
    const sorted = [...companies];

    const topGainers = [...sorted]
      .sort((a, b) => b.pChange - a.pChange)
      .slice(0, 5);

    const topLosers = [...sorted]
      .sort((a, b) => a.pChange - b.pChange)
      .slice(0, 5);

    const mostActiveByTurnover = [...sorted]
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 5);

    const mostActiveByVolume = [...sorted]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return {
      topGainers,
      topLosers,
      mostActiveByTurnover,
      mostActiveByVolume
    };
  }

  async getCompanies(query?: string, sector?: string): Promise<CompanySummary[]> {
    const currentTime = formatNepalDateTime();
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
      observedAtNPT: c.lastUpdated,
      retrievedAtNPT: currentTime,
      dataStatus: 'DEMO',
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
    const upper = symbol.toUpperCase();
    const company = DEMO_COMPANIES.find(c => c.symbol === upper);
    if (!company) return null;

    const currentTime = formatNepalDateTime();

    return {
      ...company,
      observedAtNPT: company.lastUpdated,
      retrievedAtNPT: currentTime,
      dataStatus: 'DEMO',
      fundamentalsAvailable: true,
      announcementsAvailable: true,
      isAdjustedPrice: true
    };
  }

  async getHistoricalCandles(symbol: string, period = '3M'): Promise<Candle[]> {
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
    if (symbol) {
      const upper = symbol.toUpperCase();
      return DEMO_ANNOUNCEMENTS.filter(a => a.symbol === upper).map(a => ({
        ...a,
        isVerifiedSource: true
      }));
    }
    return DEMO_ANNOUNCEMENTS.map(a => ({
      ...a,
      isVerifiedSource: true
    }));
  }

  async getMarketNews(): Promise<MarketNews[]> {
    return DEMO_NEWS.map(n => ({
      ...n,
      isVerifiedSource: true
    }));
  }
}
