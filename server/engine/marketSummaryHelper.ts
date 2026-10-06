import { CompanySummary } from '../providers/types.js';
import { formatNPR } from './nepaliCalendar.js';

export function generateDynamicMarketSummary(params: {
  nepseIndex: number;
  pointChange: number;
  percentChange: number;
  totalTurnover: number;
  totalTransactions: number;
  topGainers: CompanySummary[];
  topLosers: CompanySummary[];
}): { summaryEn: string; summaryNe: string } {
  const {
    nepseIndex,
    pointChange,
    percentChange,
    totalTurnover,
    totalTransactions,
    topGainers,
    topLosers
  } = params;

  const gainerSymbols = topGainers.slice(0, 3).map(g => `${g.symbol} (+${g.pChange.toFixed(1)}%)`).join(', ');
  const loserSymbols = topLosers.slice(0, 3).map(l => `${l.symbol} (${l.pChange.toFixed(1)}%)`).join(', ');
  const formattedTurnover = formatNPR(totalTurnover, { showPrefix: false });

  let summaryEn = '';
  let summaryNe = '';

  if (pointChange > 0) {
    summaryEn = `NEPSE Index advanced by +${pointChange.toFixed(2)} points (+${percentChange.toFixed(2)}%) to stand at ${nepseIndex.toFixed(2)}. Total turnover settled at NPR ${formattedTurnover} across ${totalTransactions.toLocaleString()} transactions. Leading advancing scrips included ${gainerSymbols || 'select stocks'}, while ${loserSymbols || 'declining scrips'} traded lower.`;
    summaryNe = `नेप्से परिसूचक +${pointChange.toFixed(2)} अंक (+${percentChange.toFixed(2)}%) ले बढेर ${nepseIndex.toFixed(2)} विन्दुमा पुगेको छ। ${totalTransactions.toLocaleString()} कारोबारबाट कुल कारोबार रकम NPR ${formattedTurnover} पुगेको छ। अग्रपंक्तिमा रहेका कम्पनीहरूमा ${gainerSymbols || 'केही कम्पनीहरू'} रहे भने ${loserSymbols || 'अन्य'} मा गिरावट देखियो।`;
  } else if (pointChange < 0) {
    summaryEn = `NEPSE Index contracted by ${pointChange.toFixed(2)} points (${percentChange.toFixed(2)}%) to stand at ${nepseIndex.toFixed(2)}. Total market turnover was recorded at NPR ${formattedTurnover} across ${totalTransactions.toLocaleString()} transactions. Declining scrips included ${loserSymbols || 'select stocks'}, while ${gainerSymbols || 'advancing scrips'} resisted downward pressure.`;
    summaryNe = `नेप्से परिसूचक ${pointChange.toFixed(2)} अंक (${percentChange.toFixed(2)}%) ले घटेर ${nepseIndex.toFixed(2)} विन्दुमा आएको छ। ${totalTransactions.toLocaleString()} कारोबारबाट कुल कारोबार रकम NPR ${formattedTurnover} पुगेको छ। गिरावट आउने कम्पनीहरूमा ${loserSymbols || 'केही कम्पनीहरू'} रहे भने ${gainerSymbols || 'केही कम्पनीहरू'} मा सामान्य सुधार रह्यो।`;
  } else {
    summaryEn = `NEPSE Index closed unchanged at ${nepseIndex.toFixed(2)}. Total market turnover was NPR ${formattedTurnover} across ${totalTransactions.toLocaleString()} transactions.`;
    summaryNe = `नेप्से परिसूचक स्थिर रहँदै ${nepseIndex.toFixed(2)} विन्दुमा बन्द भएको छ। कुल कारोबार रकम NPR ${formattedTurnover} रहेको छ।`;
  }

  return { summaryEn, summaryNe };
}
