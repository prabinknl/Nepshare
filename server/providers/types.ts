import { MarketSessionInfo } from '../engine/nepaliCalendar.js';

export type FeedType = 'LIVE' | 'DELAYED_15MIN' | 'END_OF_DAY' | 'DEMO_DATA';
export type DataStatus = 'LIVE' | 'DELAYED' | 'END_OF_DAY' | 'STALE' | 'UNAVAILABLE' | 'DEMO';
export type LicenseStatus = 'LICENSED_COMMERCIAL' | 'EVALUATION_UAT' | 'DEMO';

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isAdjusted?: boolean;
}

export interface DividendRecord {
  fiscalYear: string; // e.g. "2080/081"
  bonusSharePercent: number;
  cashDividendPercent: number;
  bookClosureDate: string;
}

export interface CompanyFundamentals {
  eps: number;               // Earnings Per Share (NPR)
  pe: number;                // Price to Earnings ratio
  bookValue: number;         // Book Value Per Share (NPR)
  pb: number;                // Price to Book ratio
  roe: number;               // Return on Equity (%)
  marketCap: number;         // Total Market Capitalization (NPR)
  paidUpCapital: number;     // Paid-up Capital (NPR)
  quarterlyReportPeriod: string; // e.g., "Q4 2080/81"
  reportedDate: string;      // e.g., "2081-04-15"
  dividendHistory: DividendRecord[];
  isAvailable?: boolean;     // Honestly reports whether quarterly statements are available

  // Enhanced "Before You Buy" financial metrics
  revenue?: number | null;               // Total revenue / turnover (NPR)
  revenuePreviousYear?: number | null;   // Same period previous year revenue (NPR)
  netProfit?: number | null;             // Net profit after tax (NPR)
  netProfitPreviousYear?: number | null; // Same period previous year net profit (NPR)
  epsAnnual?: number | null;             // Full year audited EPS
  epsTTM?: number | null;                // Trailing 12 months EPS
  epsAnnualized?: number | null;         // Annualized interim quarterly EPS
  epsType?: 'ANNUAL' | 'TTM' | 'ANNUALIZED';
  roeConvention?: string;                // e.g. "Net Profit / Year-End Equity"
  debtToEquity?: number | null;          // D/E ratio (null for banks and insurers)
  interestCoverageRatio?: number | null; // EBIT / Interest expense (null for banks/insurers)
  operatingCashFlow?: number | null;     // Cash from operations (NPR)
  cashDividendYield?: number | null;     // Cash dividend / LTP * 100
  payoutRatio?: number | null;           // Total dividend / Net profit * 100
  payoutRatioConvention?: string;        // Basis explanation
  oneTimeProfitDisclosed?: boolean;      // Disclosed one-time profit/exceptional items
  oneTimeProfitDetails?: string;         // Details of one-time gain or write-back
  auditStatus?: 'AUDITED' | 'UNAUDITED' | 'NOT_AVAILABLE';
  sourceDoc?: string;                    // Source filing/announcement name
  quarterlyYoY?: {
    quarter: string;
    currentProfit: number;
    previousYearProfit: number;
    changePct: number;
  }[];
  annualHistory?: {
    fiscalYear: string;
    revenue: number;
    netProfit: number;
    eps: number;
  }[];
}

export interface SectorSpecificMetrics {
  sectorType: 'BANKING' | 'HYDROPOWER' | 'INSURANCE' | 'NON_FINANCIAL' | 'OTHER';
  banking?: {
    nplRatio: number;            // Non-performing loan % (e.g. 1.85%)
    loanLossProvision: number;   // Loan loss provisions in NPR
    capitalAdequacyRatio: number;// CAR % (NRB regulatory min 11.0%)
    regulatoryCarMin: number;    // 11.0% (NRB Unified Directive)
    distributableProfit: number; // Distributable profit in NPR
    distributableEps: number;    // Distributable EPS in NPR
    source: string;
    reportingPeriod: string;
  };
  hydropower?: {
    operationalStatus: 'OPERATIONAL' | 'UNDER_CONSTRUCTION' | 'PARTIALLY_OPERATIONAL';
    installedCapacityMW: number;
    actualGenerationGWh?: number;
    plantLoadFactorPct?: number;
    seasonalProductionNoteEn: string;
    seasonalProductionNoteNe: string;
    projectProgressPct?: number;
    projectDebt: number;
    debtEquityRatio: string;
    ppaDetails: string;
    materialDisruptions?: string;
    source: string;
  };
  insurance?: {
    insuranceType: 'LIFE' | 'NON_LIFE';
    solvencyRatio: number;         // Nepal Insurance Authority regulatory min 1.50x
    regulatorySolvencyMin: number; // 1.50
    claimsExperiencePct: number;   // Net claims ratio %
    underwritingProfit: number;
    combinedRatioPct?: number;     // For Non-life
    persistencyRatioPct?: number;  // For Life
    lifeInsuranceFund?: number;    // Life insurance fund (NPR)
    source: string;
  };
  nonFinancial?: {
    debtToEquity: number;
    interestCoverageRatio: number;
    operatingCashFlow: number;
    source: string;
  };
}

export interface CompanyRiskItem {
  id: string;
  category: 'EARNINGS' | 'DEBT' | 'CASH_FLOW' | 'LIQUIDITY' | 'VOLATILITY' | 'AUDIT' | 'DILUTION' | 'REPORTING' | 'DATA_GAP';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  titleEn: string;
  titleNe: string;
  reasonEn: string;
  reasonNe: string;
  reportingDate: string;
  source: string;
}

export interface PeerValuationMetric {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  pe: number | null;
  peDisplay: string;
  pb: number;
  roe: number;
  cashDividendYield: number;
}

export interface PeerValuationComparison {
  peerGroup: string;
  comparisonDate: string;
  calculationBasis: string;
  sectorAvgPe: number | null;
  sectorAvgPb: number;
  sectorAvgRoe: number;
  peers: PeerValuationMetric[];
}

export interface BeforeYouBuySummary {
  financialHealth: {
    status: 'Improving' | 'Mixed' | 'Needs attention' | 'Insufficient data';
    explanationEn: string;
    explanationNe: string;
  };
  valuation: {
    status: 'Fair' | 'Elevated' | 'Needs attention' | 'Discounted' | 'Insufficient data';
    explanationEn: string;
    explanationNe: string;
  };
  liquidity: {
    status: 'High liquidity' | 'Adequate' | 'Low trading liquidity' | 'Insufficient data';
    avgDailyVolume20D: number;
    avgDailyTurnover20D: number;
    volatilityAnnualizedPct: number;
    bidAskSpreadStatus: string;
    explanationEn: string;
    explanationNe: string;
  };
  keyRisks: {
    status: 'Low risk observed' | 'Moderate risks' | 'Elevated risk concerns' | 'Insufficient data';
    count: number;
    items: CompanyRiskItem[];
    explanationEn: string;
    explanationNe: string;
  };
  dataFreshness: {
    status: 'Fresh Data' | 'Delayed' | 'Stale' | 'Demo data';
    observedAtNPT: string;
    retrievedAtNPT: string;
    sourceTier: string;
    explanationEn: string;
    explanationNe: string;
  };
  rulesBasis: string[];
}

export interface TradePlanInput {
  symbol: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number;
  stopLossPrice: number;
  brokerRatePct?: number; // Custom or standard tiered
  sebonRatePct?: number;  // 0.015%
  dpFee?: number;         // NPR 25.00
  cgtRatePct?: number;    // 5% or 7.5%
  holdingPeriodDays?: number;
}

export interface TradePlanResult {
  symbol: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number;
  stopLossPrice: number;
  purchaseTurnover: number;
  buyBrokerFee: number;
  buySebonFee: number;
  buyDpFee: number;
  totalPurchaseCost: number;
  breakEvenPrice: number;
  targetTurnover: number;
  targetSellBrokerFee: number;
  targetSellSebonFee: number;
  targetSellDpFee: number;
  targetTotalSellFees: number;
  targetGrossProfit: number;
  targetCgt: number;
  targetNetProfit: number;
  targetRoiPct: number;
  stopTurnover: number;
  stopSellBrokerFee: number;
  stopSellSebonFee: number;
  stopSellDpFee: number;
  stopTotalSellFees: number;
  stopGrossLoss: number;
  stopNetLoss: number;
  stopLossPct: number;
  rewardToRiskRatio: number;
  assumptions: string[];
  caveats: string[];
}

export interface CompanySummary {
  symbol: string;
  name: string;
  nameNe?: string;
  sector: string;
  sectorNe?: string;
  ltp: number;
  change: number;
  pChange: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  previousClose: number;
  week52High: number;
  week52Low: number;
  observedAtNPT: string;     // Time market observation took place
  retrievedAtNPT: string;    // Time data was retrieved by our server
  dataStatus: DataStatus;
  isAdjustedPrice?: boolean;
}

export interface CompanyDetails extends CompanySummary {
  description: string;
  descriptionNe?: string;
  listingDate: string;
  totalShares: number;
  fundamentals: CompanyFundamentals;
  fundamentalsAvailable: boolean;
  announcementsAvailable: boolean;
  sectorMetrics?: SectorSpecificMetrics;
  trendSummaryEn: string;
  trendSummaryNe: string;
}

export interface TopMovers {
  topGainers: CompanySummary[];
  topLosers: CompanySummary[];
  mostActiveByTurnover: CompanySummary[];
  mostActiveByVolume: CompanySummary[];
}

export interface DataSourceInfo {
  providerName: string;
  officialAuthorization: string;
  attributionUrl: string;
  feedType: FeedType;
  dataStatus: DataStatus;
  licenseStatus: LicenseStatus;
  isDemo: boolean;
  isStale: boolean;
  delayMinutes: number;
  observedAtNPT: string;
  retrievedAtNPT: string;
  disclaimer: string;
  notes?: string;
}

export interface MarketSummary {
  nepseIndex: number;
  pointChange: number;
  percentChange: number;
  totalTurnover: number;
  totalSharesTraded: number;
  totalTransactions: number;
  session: MarketSessionInfo;
  dataSource: DataSourceInfo;
  plainLanguageSummaryEn: string;
  plainLanguageSummaryNe: string;
}

export interface Announcement {
  id: string;
  symbol: string;
  companyName: string;
  title: string;
  titleNe?: string;
  summary: string;
  summaryNe?: string;
  category: 'DIVIDEND' | 'AGM' | 'FINANCIAL_REPORT' | 'RIGHT_SHARE' | 'NOTICE';
  status?: 'PROPOSED' | 'APPROVED' | 'COMPLETED' | 'NOTICE';
  date: string;
  sourceUrl: string;
  publisher: string;
  isVerifiedSource: boolean;
}

export interface MarketNews {
  id: string;
  title: string;
  titleNe?: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  isVerifiedSource: boolean;
}

export interface IDataProvider {
  getMarketSummary(): Promise<MarketSummary>;
  getTopMovers(): Promise<TopMovers>;
  getCompanies(query?: string, sector?: string): Promise<CompanySummary[]>;
  getCompanyDetails(symbol: string): Promise<CompanyDetails | null>;
  getHistoricalCandles(symbol: string, period?: string): Promise<Candle[]>;
  getAnnouncements(symbol?: string): Promise<Announcement[]>;
  getMarketNews(): Promise<MarketNews[]>;
  getDataSourceInfo(): DataSourceInfo;
  isDemo(): boolean;
}

