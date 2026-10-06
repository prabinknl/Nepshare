import { getDataProvider } from '../providers/index.js';
import { formatNepalDateTime } from './nepaliCalendar.js';

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

export async function generateAiMarketAnalysis(): Promise<AiMarketAnalysisResult> {
  const provider = getDataProvider();
  const dsInfo = provider.getDataSourceInfo();
  const summary = await provider.getMarketSummary();
  const companies = await provider.getCompanies();
  const movers = await provider.getTopMovers();

  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let top5TurnoverSum = 0;

  for (const c of companies) {
    if (c.change > 0) advancers++;
    else if (c.change < 0) decliners++;
    else unchanged++;
  }

  for (const m of movers.mostActiveByTurnover.slice(0, 5)) {
    top5TurnoverSum += m.turnover;
  }

  const totalTraded = companies.length;
  const adRatio = decliners > 0 ? Math.round((advancers / decliners) * 100) / 100 : advancers;
  const breadthScorePct = totalTraded > 0 ? Math.round((advancers / totalTraded) * 100) : 50;
  const topTurnoverConcentrationPct = summary.totalTurnover > 0 
    ? Math.round((top5TurnoverSum / summary.totalTurnover) * 100) 
    : 35;

  const nepseIndex = summary.nepseIndex;
  const pointChange = summary.pointChange;
  const isUp = pointChange >= 0;

  // Determine regime
  let regime: 'BULLISH_EXPANSION' | 'CONSOLIDATION_RANGE' | 'BEARISH_PRESSURE' = 'CONSOLIDATION_RANGE';
  let regimeLabelEn = 'Balanced Range Consolidation';
  let regimeLabelNe = 'सन्तुलित दायरा (Consolidation)';

  if (isUp && breadthScorePct >= 55) {
    regime = 'BULLISH_EXPANSION';
    regimeLabelEn = 'Broad-Based Bullish Expansion';
    regimeLabelNe = 'व्यापक वृद्धि (Bullish Expansion)';
  } else if (!isUp && breadthScorePct <= 45) {
    regime = 'BEARISH_PRESSURE';
    regimeLabelEn = 'Correctional Selling Pressure';
    regimeLabelNe = 'सुधारात्मक दबाब (Bearish Pressure)';
  }

  // Support / resistance clusters around index
  const dVol = 0.012; // ~1.2% typical daily volatility
  const immediateSupport = Math.round((nepseIndex * (1 - dVol)) * 10) / 10;
  const immediateResistance = Math.round((nepseIndex * (1 + dVol)) * 10) / 10;

  // Sector analysis
  const sectorMap: Record<string, number> = {};
  for (const c of companies) {
    sectorMap[c.sector] = (sectorMap[c.sector] || 0) + c.turnover;
  }
  const topSectorEntry = Object.entries(sectorMap).sort((a, b) => b[1] - a[1])[0];
  const topSectorName = topSectorEntry ? topSectorEntry[0] : 'Commercial Banks';

  const sectorRotationEn = `Turnover is predominantly focused in the ${topSectorName} sector, capturing significant intraday market liquidity. High participation in top momentum scrips suggests selective capital rotation across active sub-indices.`;
  const sectorRotationNe = `कारोबार रकम मुख्यतया ${topSectorName} समूहमा केन्द्रित रहेको देखिन्छ। चुनिंदा सक्रिय कम्पनीहरूमा पुँजीको स्थानान्तरणले बजारमा सकारात्मक गतिविधि कायम राखेको छ।`;

  const aiSynthesisEn = `NEPSE is trading at ${nepseIndex.toFixed(2)} (${isUp ? '+' : ''}${pointChange.toFixed(2)} pts). Market breadth shows ${advancers} advancing scrips against ${decliners} decliners with an A/D ratio of ${adRatio}. Total secondary turnover reached NPR ${(summary.totalTurnover / 1e7).toFixed(2)} Crores across ${summary.totalTransactions.toLocaleString()} contracts. Technical momentum remains bounded between ${immediateSupport} support floor and ${immediateResistance} overhead resistance band.`;
  const aiSynthesisNe = `नेप्से परिसूचक हाल ${nepseIndex.toFixed(2)} विन्दुमा (${isUp ? '+' : ''}${pointChange.toFixed(2)} अंक) रहेको छ। बजारमा ${advancers} कम्पनीको मूल्य बढ्दा ${decliners} कम्पनीको मूल्य घटेको छ (A/D अनुपात ${adRatio})। कुल कारोबार रकम रु. ${(summary.totalTurnover / 1e7).toFixed(2)} करोड पुगेको छ। प्राविधिक रूपमा सूचक ${immediateSupport} सपोर्ट र ${immediateResistance} प्रतिरोधको दायराभित्र चलायमान छ।`;

  const keyRisksEn = [
    `Top 5 scrips command ${topTurnoverConcentrationPct}% of total market turnover, indicating liquidity concentration.`,
    `Failure to sustain above ${immediateSupport} may invite profit-booking towards secondary demand zones.`,
    'Macroeconomic liquidity shifts and interbank interest rate fluctuations remain key drivers.'
  ];

  const keyRisksNe = [
    `शीर्ष ५ कम्पनीहरूले कुल कारोबारको ${topTurnoverConcentrationPct}% हिस्सा ओगटेका छन्, जसले तरलता एकाग्रता देखाउँछ।`,
    `${immediateSupport} को सपोर्ट तहभन्दा तल मूल्य ओर्लिएमा नाफा सुरक्षित गर्ने बिक्री बढ्न सक्छ।`,
    'मुद्रा बजारको तरलता र अन्तरबैंक ब्याजदरको प्रभाव मुख्य कारकका रूपमा रहनेछ।'
  ];

  return {
    generatedAtNPT: formatNepalDateTime(),
    regime,
    regimeLabelEn,
    regimeLabelNe,
    breadth: {
      advancers,
      decliners,
      unchanged,
      totalTraded,
      advanceDeclineRatio: adRatio,
      breadthScorePct
    },
    liquidity: {
      turnoverNPR: summary.totalTurnover,
      transactions: summary.totalTransactions,
      sharesTraded: summary.totalSharesTraded,
      topTurnoverConcentrationPct,
      liquidityGrade: summary.totalTurnover > 4e9 ? 'HIGH' : summary.totalTurnover > 1.5e9 ? 'MODERATE' : 'LOW'
    },
    pivots: {
      nepseIndex,
      immediateSupport,
      immediateResistance,
      dailyVolatilityPct: Math.round(dVol * 1000) / 10
    },
    sectorRotationEn,
    sectorRotationNe,
    aiSynthesisEn,
    aiSynthesisNe,
    keyRisksEn,
    keyRisksNe,
    dataStatus: dsInfo.dataStatus,
    isStale: dsInfo.isStale
  };
}
