export interface MarketSessionInfo {
  status: 'OPEN' | 'CLOSED' | 'PRE_OPEN';
  statusLabelEn: string;
  statusLabelNe: string;
  currentTimeNPT: string;
  isTradingDay: boolean;
  nextSessionText: string;
}

export type MarketDataStatus = 'LIVE' | 'DELAYED' | 'END_OF_DAY' | 'STALE' | 'UNAVAILABLE' | 'DEMO';

export interface LicensingInfo {
  licenseeName?: string;
  distributorStatus?: string;
  termsUrl?: string;
  authorizedExchange?: string;
  redistributionAllowed?: boolean;
  attributionNotice?: string;
}

export interface DataSourceInfo {
  providerName: string;
  isDemo: boolean;
  feedType: 'LIVE' | 'DELAYED_15MIN' | 'END_OF_DAY' | 'DEMO_DATA';
  dataStatus: MarketDataStatus;
  observedAtNPT: string;
  retrievedAtNPT: string;
  applicableDelayMinutes: number;
  lastUpdatedTimeNPT: string;
  isStale: boolean;
  staleReason?: string;
  disclaimer: string;
  licensingInfo?: LicensingInfo;
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
  lastUpdated: string;
  dataStatus?: MarketDataStatus;
  observedAtNPT?: string;
  retrievedAtNPT?: string;
  applicableDelayMinutes?: number;
  isAdjustedPrice?: boolean;
}

export interface DividendRecord {
  fiscalYear: string;
  bonusSharePercent: number;
  cashDividendPercent: number;
  bookClosureDate: string;
}

export interface CompanyFundamentals {
  eps: number;
  pe: number;
  bookValue: number;
  pb: number;
  roe: number;
  marketCap: number;
  paidUpCapital: number;
  quarterlyReportPeriod: string;
  reportedDate: string;
  dividendHistory: DividendRecord[];
  isAvailable?: boolean;

  // Enhanced "Before You Buy" financial metrics
  revenue?: number | null;
  revenuePreviousYear?: number | null;
  netProfit?: number | null;
  netProfitPreviousYear?: number | null;
  epsAnnual?: number | null;
  epsTTM?: number | null;
  epsAnnualized?: number | null;
  epsType?: 'ANNUAL' | 'TTM' | 'ANNUALIZED';
  roeConvention?: string;
  debtToEquity?: number | null;
  interestCoverageRatio?: number | null;
  operatingCashFlow?: number | null;
  cashDividendYield?: number | null;
  payoutRatio?: number | null;
  payoutRatioConvention?: string;
  oneTimeProfitDisclosed?: boolean;
  oneTimeProfitDetails?: string;
  auditStatus?: 'AUDITED' | 'UNAUDITED' | 'NOT_AVAILABLE';
  sourceDoc?: string;
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
    nplRatio: number;
    loanLossProvision: number;
    capitalAdequacyRatio: number;
    regulatoryCarMin: number;
    distributableProfit: number;
    distributableEps: number;
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
    solvencyRatio: number;
    regulatorySolvencyMin: number;
    claimsExperiencePct: number;
    underwritingProfit: number;
    combinedRatioPct?: number;
    persistencyRatioPct?: number;
    lifeInsuranceFund?: number;
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
  brokerRatePct?: number;
  sebonRatePct?: number;
  dpFee?: number;
  cgtRatePct?: number;
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

export interface SavedTradePlan extends TradePlanResult {
  id: string;
  userId: string;
  notes?: string;
  createdAt: string;
}

export interface CompanyDetails extends CompanySummary {
  description: string;
  descriptionNe?: string;
  listingDate: string;
  totalShares: number;
  fundamentals: CompanyFundamentals;
  fundamentalsAvailable?: boolean;
  announcementsAvailable?: boolean;
  sectorMetrics?: SectorSpecificMetrics;
  trendSummaryEn: string;
  trendSummaryNe: string;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TopMovers {
  topGainers: CompanySummary[];
  topLosers: CompanySummary[];
  mostActiveByTurnover: CompanySummary[];
  mostActiveByVolume: CompanySummary[];
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
}

export interface MarketNews {
  id: string;
  title: string;
  titleNe?: string;
  summary: string;
  date: string;
  source: string;
  url: string;
}

export interface TechnicalSignalResult {
  symbol: string;
  signal: 'POTENTIAL_BUY_SETUP' | 'HOLD_WATCH' | 'POTENTIAL_SELL_SETUP' | 'INSUFFICIENT_DATA';
  signalLabelEn: string;
  signalLabelNe: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  analysisTimeNPT: string;
  intendedHoldingPeriodEn: string;
  intendedHoldingPeriodNe: string;
  supportLevel: number | null;
  resistanceLevel: number | null;
  entryRange: { min: number; max: number } | null;
  exitTarget: number | null;
  stopLoss: number | null;
  riskRewardRatio: string | null;
  reasonsEn: string[];
  reasonsNe: string[];
  risksEn: string[];
  risksNe: string[];
  invalidationEn: string;
  invalidationNe: string;
  indicators: {
    ltp: number;
    sma20: number | null;
    sma50: number | null;
    rsi14: number | null;
    macd: { macdLine: number; signalLine: number; histogram: number } | null;
    volumeRatio: number | null;
    supportLevel: number | null;
    resistanceLevel: number | null;
  };
  disclaimer: string;
}

export interface ScenarioDetail {
  probabilityCalibratedPct: number;
  range: { low: number; high: number };
  descriptionEn: string;
  descriptionNe: string;
}

export interface HorizonOutlook {
  horizonLabelEn: string;
  horizonLabelNe: string;
  expectedTradingSessions: number;
  bullish: ScenarioDetail;
  neutral: ScenarioDetail;
  bearish: ScenarioDetail;
}

export interface PredictiveOutlookResult {
  symbol: string;
  isAvailable: boolean;
  generatedAtNPT: string;
  currentLtp: number;
  nextSession: HorizonOutlook | null;
  next5Sessions: HorizonOutlook | null;
  validation: {
    testSessionsCount: number;
    directionalAccuracyPct: number;
    baselineBuyAndHoldReturnPct: number;
    modelStrategyNetReturnPct: number;
    methodologyEn: string;
    methodologyNe: string;
  } | null;
  descriptiveTrendEn: string;
  descriptiveTrendNe: string;
  disclaimerEn: string;
  disclaimerNe: string;
}

export interface HoldingPosition {
  symbol: string;
  totalQuantity: number;
  wacc: number;
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

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
}

export interface AlertItem {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: string;
  target_value: number | null;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  symbol: string | null;
  alert_type: string | null;
  is_read: number;
  created_at: string;
}

export interface AiMarketAnalysisResult {
  generatedAtNPT: string;
  regime: 'BULLISH_EXPANSION' | 'CONSOLIDATION_RANGE' | 'BEARISH_PRESSURE';
  regimeLabelEn: string;
  regimeLabelNe: string;
  breadth: {
    advancers: number;
    decliners: number;
    unchanged: number;
    totalTraded: number;
    advanceDeclineRatio: number;
    breadthScorePct: number;
  };
  liquidity: {
    turnoverNPR: number;
    transactions: number;
    sharesTraded: number;
    topTurnoverConcentrationPct: number;
    liquidityGrade: 'HIGH' | 'MODERATE' | 'LOW';
  };
  pivots: {
    nepseIndex: number;
    immediateSupport: number;
    immediateResistance: number;
    dailyVolatilityPct: number;
  };
  sectorRotationEn: string;
  sectorRotationNe: string;
  aiSynthesisEn: string;
  aiSynthesisNe: string;
  keyRisksEn: string[];
  keyRisksNe: string[];
  dataStatus: string;
  isStale: boolean;
}

export type TimeframeSessions = 5 | 10 | 20;
export type HoldingContext = 'PLANNING_TO_BUY' | 'ALREADY_HOLDING';
export type DecisionAction = 'BUY' | 'WAIT' | 'HOLD' | 'CONSIDER_SELLING';
export type AdditionalInvestmentAction = 'BUY' | 'WAIT';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface PredictAiTrendAnalysis {
  ema20: number | null;
  ema50: number | null;
  ltp: number;
  positionVsAverages: 'ABOVE_BOTH' | 'BETWEEN_EMAS' | 'BELOW_BOTH';
  positionLabelEn: string;
  positionLabelNe: string;
  ema20SlopePct: number;
  ema50SlopePct: number;
  trendPersistenceSessions: number;
  persistenceRatioPct: number;
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiMomentumAnalysis {
  rsi14: number | null;
  rsiSlope: number;
  rsiAssessmentEn: string;
  rsiAssessmentNe: string;
  rsiScore: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    histogramSlope: number;
    relationship: 'BULLISH' | 'BEARISH';
    histogramState: 'EXPANDING_POSITIVE' | 'CONTRACTING_POSITIVE' | 'EXPANDING_NEGATIVE' | 'CONTRACTING_NEGATIVE';
    stateLabelEn: string;
    stateLabelNe: string;
  } | null;
  macdScore: number;
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiVolumeLiquidityAnalysis {
  latestVolume: number;
  avgDailyVolume20D: number;
  volumeRatio: number;
  avgDailyTurnover20D: number;
  tradingFrequencyTransactions: number;
  zeroVolumeSessionsCount: number;
  hasParticipation: boolean;
  participationType: 'CONFIRMED_ACCUMULATION' | 'UNCONFIRMED_ADVANCE' | 'CONFIRMED_DISTRIBUTION' | 'NORMAL_CONSOLIDATION';
  participationLabelEn: string;
  participationLabelNe: string;
  spreadDepthNoteEn: string;
  spreadDepthNoteNe: string;
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiVolatilityRiskAnalysis {
  atr14: number;
  atrPctOfPrice: number;
  recentDrawdownPct: number;
  largeMovementsCount: number;
  volatilityRiskLevel: RiskLevel;
  explanationEn: string;
  explanationNe: string;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiPriceStructureAnalysis {
  supportLevel: number;
  resistanceLevel: number;
  distanceToResistancePct: number;
  distanceToSupportPct: number;
  rewardToRiskRatio: number;
  isBreakout: boolean;
  isBreakdown: boolean;
  structureStatus: 'BREAKOUT_SUPPORTED' | 'TESTING_RESISTANCE' | 'HEALTHY_RANGE' | 'NEAR_SUPPORT' | 'SUPPORT_BREAKDOWN';
  statusLabelEn: string;
  statusLabelNe: string;
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiMarketSectorAnalysis {
  companyReturnPct: number;
  nepseReturnPct: number;
  sectorReturnPct: number;
  alphaVsNepsePct: number;
  alphaVsSectorPct: number;
  nepseTrend: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  sectorTrend: 'LEADING' | 'IN_LINE' | 'LAGGING';
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiFinancialHealthAnalysis {
  isAvailable: boolean;
  eps: number | null;
  isLossMaking: boolean;
  profitGrowthYoYPct: number | null;
  roePct: number | null;
  companyPe: number | null;
  sectorAvgPe: number | null;
  companyPb: number | null;
  sectorAvgPb: number | null;
  peComparisonNoteEn: string;
  peComparisonNoteNe: string;
  reportingPeriod: string;
  reportedDate: string;
  auditStatus: string;
  score: number;
  weight: number;
  reasonsEn: string[];
  reasonsNe: string[];
}

export interface PredictAiIndicatorBreakdown {
  trend: PredictAiTrendAnalysis;
  momentum: PredictAiMomentumAnalysis;
  volumeLiquidity: PredictAiVolumeLiquidityAnalysis;
  volatilityRisk: PredictAiVolatilityRiskAnalysis;
  priceStructure: PredictAiPriceStructureAnalysis;
  marketSector: PredictAiMarketSectorAnalysis;
  financialHealth: PredictAiFinancialHealthAnalysis;
}

export interface DeteriorationGroup {
  groupId: 'TREND_MOMENTUM' | 'PRICE_STRUCTURE' | 'FINANCIAL_HEALTH' | 'VOLUME_LIQUIDITY' | 'MARKET_SECTOR';
  nameEn: string;
  nameNe: string;
  isDeteriorating: boolean;
  evidenceEn: string;
  evidenceNe: string;
}

export interface WalkForwardBacktestSummary {
  status: 'EXPERIMENTAL';
  methodologyVersion: string;
  timeframeSessions: number;
  testSessionsCount: number;
  winRatePct: number;
  strategyReturnNetPct: number;
  benchmarkBuyAndHoldReturnPct: number;
  roundTripFeePct: number;
  liquidityConstraintApplied: boolean;
  notesEn: string;
  notesNe: string;
}

export interface PredictAiDecisionResult {
  symbol: string;
  companyName: string;
  companyNameNe?: string;
  sector: string;
  timeframe: TimeframeSessions;
  holdingContext: HoldingContext;
  action: DecisionAction;
  actionLabelEn: string;
  actionLabelNe: string;
  badgeColor: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  badgeIcon: string;
  additionalInvestmentAction: AdditionalInvestmentAction;
  additionalInvestmentLabelEn: string;
  additionalInvestmentLabelNe: string;
  opportunityScore: number;
  scoreGrade: 'STRONG' | 'FAVORABLE' | 'NEUTRAL' | 'WEAK' | 'POOR';
  methodologyVersion: string;
  riskAssessment: {
    level: RiskLevel;
    levelLabelEn: string;
    levelLabelNe: string;
    materialRiskCount: number;
    flags: CompanyRiskItem[];
  };
  threeMainReasonsEn: string[];
  threeMainReasonsNe: string[];
  mainRisksEn: string[];
  mainRisksNe: string[];
  conditionsToChangeEn: string[];
  conditionsToChangeNe: string[];
  aiSynthesisEn: string;
  aiSynthesisNe: string;
  isAiFallbackUsed: boolean;
  deteriorationGroups: DeteriorationGroup[];
  confirmedDeteriorationCount: number;
  confirmationRuleSatisfied: boolean;
  liquidityConstraintNoteEn?: string;
  liquidityConstraintNoteNe?: string;
  breakdown: PredictAiIndicatorBreakdown;
  backtest: WalkForwardBacktestSummary;
  currentLtp: number;
  analysisTimeNPT: string;
  dataObservedAtNPT: string;
  dataStatus: string;
  dataSourceTier: string;
  sources: {
    exchangeData: string;
    reportingPeriod: string;
    auditStatus: string;
    filingDate: string;
  };
  disclaimerEn: string;
  disclaimerNe: string;
  isAvailable: boolean;
  unavailableReason?: string;
  userHoldingDetected?: boolean;
}
