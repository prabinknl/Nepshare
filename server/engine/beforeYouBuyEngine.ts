import {
  CompanyDetails,
  Candle,
  BeforeYouBuySummary,
  CompanyRiskItem,
  PeerValuationComparison,
  PeerValuationMetric,
  TradePlanInput,
  TradePlanResult
} from '../providers/types.js';
import { calculateNepseBrokerCommission } from './portfolioEngine.js';

/**
 * Computes 20-day trading metrics from candle history
 */
export function computeLiquidityMetrics(candles: Candle[], currentLtp: number) {
  if (!candles || candles.length === 0) {
    return {
      avgDailyVolume20D: 0,
      avgDailyTurnover20D: 0,
      volatilityAnnualizedPct: 0
    };
  }

  const last20 = candles.slice(-20);
  const totalVol = last20.reduce((sum, c) => sum + c.volume, 0);
  const avgVol = Math.round(totalVol / last20.length);

  const totalTurnover = last20.reduce((sum, c) => sum + (c.volume * c.close), 0);
  const avgTurnover = Math.round(totalTurnover / last20.length);

  // Daily log returns volatility
  let sumReturns = 0;
  const returns: number[] = [];
  for (let i = 1; i < last20.length; i++) {
    const prev = last20[i - 1].close;
    const curr = last20[i].close;
    if (prev > 0) {
      const r = (curr - prev) / prev;
      returns.push(r);
      sumReturns += r;
    }
  }

  let volatility = 0;
  if (returns.length > 1) {
    const mean = sumReturns / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    volatility = Math.round(Math.sqrt(variance) * Math.sqrt(240) * 10000) / 100; // 240 trading days/year
  }

  return {
    avgDailyVolume20D: avgVol,
    avgDailyTurnover20D: avgTurnover,
    volatilityAnnualizedPct: volatility
  };
}

/**
 * Evaluates evidence-backed risks for a company
 */
export function evaluateCompanyRisks(details: CompanyDetails, candles: Candle[]): CompanyRiskItem[] {
  const risks: CompanyRiskItem[] = [];
  const funds = details.fundamentals;
  const sector = details.sector;
  const isFinancial = sector === 'Commercial Banks' || sector === 'Development Banks' || sector === 'Life Insurance' || sector === 'Non Life Insurance';

  // 1. Data gap check
  const isDataMissing = details.fundamentalsAvailable === false || !funds || funds.isAvailable === false;
  if (isDataMissing) {
    risks.push({
      id: 'risk-data-gap',
      category: 'DATA_GAP',
      severity: 'HIGH',
      titleEn: 'Missing or Outdated Quarterly Financial Reports',
      titleNe: 'त्रैमासिक वित्तीय विवरण अप्राप्त वा पुरानो',
      reasonEn: `Official quarterly financial statement has not been disclosed or verified for ${details.symbol}. Missing data must not be interpreted as low risk.`,
      reasonNe: `${details.symbol} को आधिकारिक त्रैमासिक वित्तीय विवरण उपलब्ध छैन। अपूर्ण तथ्यांकलाई न्यून जोखिम मान्न सकिँदैन।`,
      reportingDate: details.observedAtNPT || 'Recent',
      source: 'NEPSE / Company Disclosure Desk'
    });
  }

  // 2. Earnings decline or losses
  if (funds && funds.eps < 0) {
    risks.push({
      id: 'risk-net-loss',
      category: 'EARNINGS',
      severity: 'HIGH',
      titleEn: 'Negative Net Earnings (Loss)',
      titleNe: 'खुद नोक्सानी (ऋणात्मक ईपीएस)',
      reasonEn: `${details.symbol} reported negative EPS of NPR ${funds.eps.toFixed(2)} in ${funds.quarterlyReportPeriod}. P/E valuation is not meaningful for loss-making companies.`,
      reasonNe: `${details.symbol} ले ${funds.quarterlyReportPeriod} मा प्रतिसेयर आम्दानी रु ${funds.eps.toFixed(2)} ऋणात्मक देखाएको छ। घाटामा रहेका कम्पनीहरूको पी/ई अनुपात अर्थपूर्ण हुँदैन।`,
      reportingDate: funds.reportedDate || 'Recent',
      source: `Quarterly Report (${funds.quarterlyReportPeriod})`
    });
  } else if (funds && funds.netProfit !== undefined && funds.netProfitPreviousYear !== undefined) {
    if (funds.netProfit !== null && funds.netProfitPreviousYear !== null && funds.netProfitPreviousYear > 0) {
      const growth = (funds.netProfit - funds.netProfitPreviousYear) / funds.netProfitPreviousYear;
      if (growth < -0.15) {
        risks.push({
          id: 'risk-earnings-drop',
          category: 'EARNINGS',
          severity: 'MEDIUM',
          titleEn: 'Contraction in Net Profits YoY',
          titleNe: 'खुद नाफामा गत वर्षको तुलनामा गिरावट',
          reasonEn: `Net profit contracted by ${(Math.abs(growth) * 100).toFixed(1)}% compared to the same period last fiscal year.`,
          reasonNe: `गत आर्थिक वर्षको सोही अवधिको तुलनामा खुद नाफामा ${(Math.abs(growth) * 100).toFixed(1)}% ले गिरावट आएको छ।`,
          reportingDate: funds.reportedDate || 'Recent',
          source: `Interim Financial Disclosure`
        });
      }
    }
  }

  // 3. Sector-specific balance sheet risks
  if (details.sectorMetrics) {
    // Banking
    if (details.sectorMetrics.banking) {
      const b = details.sectorMetrics.banking;
      if (b.nplRatio > 3.5) {
        risks.push({
          id: 'risk-high-npl',
          category: 'DEBT',
          severity: 'HIGH',
          titleEn: `Elevated Non-Performing Loan Ratio (${b.nplRatio.toFixed(2)}%)`,
          titleNe: `खराब कर्जा (NPL) उच्च विन्दुमा (${b.nplRatio.toFixed(2)}%)`,
          reasonEn: `NPL ratio of ${b.nplRatio.toFixed(2)}% demands heightened loan-loss provisioning, exerting downward pressure on distributable profits.`,
          reasonNe: `खराब कर्जा ${b.nplRatio.toFixed(2)}% पुगेकाले थप प्रोभिजनिङ आवश्यक भई वितरणयोग्य नाफामा दबाब पर्न सक्छ।`,
          reportingDate: b.reportingPeriod,
          source: b.source
        });
      }
      if (b.capitalAdequacyRatio < b.regulatoryCarMin + 0.5) {
        risks.push({
          id: 'risk-car-buffer',
          category: 'DEBT',
          severity: 'HIGH',
          titleEn: `Narrow Capital Adequacy Buffer (${b.capitalAdequacyRatio.toFixed(2)}%)`,
          titleNe: `पूँजी कोष पर्याप्तता अनुपात (CAR) नियामक सीमा नजिक`,
          reasonEn: `CAR of ${b.capitalAdequacyRatio.toFixed(2)}% is close to the regulatory minimum of ${b.regulatoryCarMin}%, restricting credit growth or dividend distributions.`,
          reasonNe: `पूँजी कोष अनुपात ${b.capitalAdequacyRatio.toFixed(2)}% राष्ट्र बैंकको न्यूनतम सीमा ${b.regulatoryCarMin}% को नजिक छ, जसले कर्जा विस्तार तथा लाभांश क्षमतामा सीमा लगाउन सक्छ।`,
          reportingDate: b.reportingPeriod,
          source: b.source
        });
      }
    }

    // Hydropower
    if (details.sectorMetrics.hydropower) {
      const h = details.sectorMetrics.hydropower;
      if (h.operationalStatus === 'UNDER_CONSTRUCTION') {
        risks.push({
          id: 'risk-construction-delay',
          category: 'REPORTING',
          severity: 'MEDIUM',
          titleEn: 'Under-Construction Execution & Cost Overrun Risk',
          titleNe: 'निर्माणाधीन आयोजना: समय र लागत वृद्धिको जोखिम',
          reasonEn: `Project progress is at ${h.projectProgressPct || 70}%. Commercial generation has not started, leaving revenue dependent on timely commissioning.`,
          reasonNe: `आयोजना हाल निर्माणाधीन अवस्थामा छ (${h.projectProgressPct || 70}%)। व्यावसायिक उत्पादन सुरु नभएसम्म लाभांश वितरण सम्भव हुँदैन।`,
          reportingDate: 'Current',
          source: h.source
        });
      }
    }

    // Insurance
    if (details.sectorMetrics.insurance) {
      const ins = details.sectorMetrics.insurance;
      if (ins.solvencyRatio < ins.regulatorySolvencyMin + 0.2) {
        risks.push({
          id: 'risk-solvency-pressure',
          category: 'DEBT',
          severity: 'HIGH',
          titleEn: `Solvency Ratio (${ins.solvencyRatio.toFixed(2)}x) Near Minimum`,
          titleNe: `सल्भेन्सी अनुपात नियामक न्यूनतम सीमा नजिक`,
          reasonEn: `Solvency margin of ${ins.solvencyRatio.toFixed(2)}x is near the Nepal Insurance Authority minimum of ${ins.regulatorySolvencyMin}x.`,
          reasonNe: `बीमा प्राधिकरणको न्यूनतम ${ins.regulatorySolvencyMin} गुणाको सल्भेन्सी अनुपातको तुलनामा कम्पनीको अनुपात ${ins.solvencyRatio.toFixed(2)} गुणा छ।`,
          reportingDate: 'Recent',
          source: ins.source
        });
      }
    }

    // Non-financial debt
    if (details.sectorMetrics.nonFinancial) {
      const nf = details.sectorMetrics.nonFinancial;
      if (nf.debtToEquity > 1.8) {
        risks.push({
          id: 'risk-high-debt',
          category: 'DEBT',
          severity: 'MEDIUM',
          titleEn: `High Debt-to-Equity Leverage (${nf.debtToEquity.toFixed(2)}x)`,
          titleNe: `उच्च ऋण अनुपात (Debt to Equity: ${nf.debtToEquity.toFixed(2)}x)`,
          reasonEn: `Total debt exceeds equity by ${nf.debtToEquity.toFixed(2)}x, increasing sensitivity to lending rate increases.`,
          reasonNe: `कम्पनीको ऋण पूँजीको तुलनामा ${nf.debtToEquity.toFixed(2)} गुणा छ, जसले ब्याजदर वृद्धिमा जोखिम बढाउँछ।`,
          reportingDate: 'Recent',
          source: nf.source
        });
      }
      if (nf.interestCoverageRatio < 1.5 && nf.interestCoverageRatio > 0) {
        risks.push({
          id: 'risk-interest-coverage',
          category: 'CASH_FLOW',
          severity: 'HIGH',
          titleEn: `Weak Interest Coverage Ratio (${nf.interestCoverageRatio.toFixed(2)}x)`,
          titleNe: `कमजोर ब्याज कभरेज अनुपात (${nf.interestCoverageRatio.toFixed(2)}x)`,
          reasonEn: `Operating earnings only cover debt interest charges by ${nf.interestCoverageRatio.toFixed(2)}x, leaving a slim safety buffer.`,
          reasonNe: `सञ्चालन आम्दानीले ब्याज खर्चलाई केवल ${nf.interestCoverageRatio.toFixed(2)} गुणा मात्र धान्न सक्छ।`,
          reportingDate: 'Recent',
          source: nf.source
        });
      }
    }
  }

  // 4. Liquidity & Volatility risks from candles
  const { avgDailyVolume20D, volatilityAnnualizedPct } = computeLiquidityMetrics(candles, details.ltp);

  if (avgDailyVolume20D > 0 && avgDailyVolume20D < 20000) {
    risks.push({
      id: 'risk-low-liquidity',
      category: 'LIQUIDITY',
      severity: 'MEDIUM',
      titleEn: `Thin Daily Trading Liquidity (~${avgDailyVolume20D.toLocaleString()} kitta/day)`,
      titleNe: `न्यून दैनिक कारोबार तरलता (~${avgDailyVolume20D.toLocaleString()} कित्ता/दिन)`,
      reasonEn: `Low trading volume makes it difficult to exit larger positions without moving market prices against your order.`,
      reasonNe: `दैनिक कारोबार कित्ता न्यून भएकाले बजारमा चाहेको समयमा तुरुन्तै सेयर बिक्री गर्न कठिन हुन सक्छ।`,
      reportingDate: 'Last 20 Trading Sessions',
      source: 'NEPSE Daily Market Observation'
    });
  }

  if (volatilityAnnualizedPct > 45) {
    risks.push({
      id: 'risk-high-volatility',
      category: 'VOLATILITY',
      severity: 'MEDIUM',
      titleEn: `Elevated Annualized Price Volatility (${volatilityAnnualizedPct}%)`,
      titleNe: `उच्च मूल्य उतारचढाव (वार्षिक ${volatilityAnnualizedPct}%)`,
      reasonEn: `High historical swing amplitude increases drawdown risk; wider stop-losses are typically required.`,
      reasonNe: `सेयर मूल्यमा तीव्र उतारचढाव हुने गरेकाले योजनाबद्ध स्टप-लस र सतर्कता आवश्यक पर्दछ।`,
      reportingDate: 'Last 20 Trading Sessions',
      source: 'Statistical Price Series'
    });
  }

  return risks;
}

/**
 * Computes Sector Peer Valuation Comparison
 */
export function computeSectorPeerComparison(
  currentCompany: CompanyDetails,
  allCompanies: CompanyDetails[]
): PeerValuationComparison {
  const sector = currentCompany.sector;
  // Get all companies in same sector
  const peers = allCompanies.filter(c => c.sector === sector);

  // If no peers found in same sector, include all or fallback
  const pool = peers.length >= 2 ? peers : allCompanies;

  let totalPe = 0;
  let countPe = 0;
  let totalPb = 0;
  let totalRoe = 0;

  const peerMetrics: PeerValuationMetric[] = pool.map(c => {
    const f = c.fundamentals;
    const pe = (f && f.eps > 0) ? f.pe : null;
    const peDisplay = pe ? pe.toFixed(2) : 'N/A (Loss)';
    const pb = f ? f.pb : 0;
    const roe = f ? f.roe : 0;

    // Latest cash dividend yield %
    let cashYield = 0;
    if (f && f.dividendHistory && f.dividendHistory.length > 0 && c.ltp > 0) {
      const latestDiv = f.dividendHistory[0];
      // Face value in Nepal is NPR 100 (except select few). Cash dividend % of face value / LTP * 100
      cashYield = Math.round(((latestDiv.cashDividendPercent * 100) / c.ltp) * 100) / 100;
    }

    if (pe && pe > 0) {
      totalPe += pe;
      countPe++;
    }
    totalPb += pb;
    totalRoe += roe;

    return {
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      ltp: c.ltp,
      pe,
      peDisplay,
      pb,
      roe,
      cashDividendYield: cashYield
    };
  });

  const sectorAvgPe = countPe > 0 ? Math.round((totalPe / countPe) * 100) / 100 : null;
  const sectorAvgPb = Math.round((totalPb / pool.length) * 100) / 100;
  const sectorAvgRoe = Math.round((totalRoe / pool.length) * 100) / 100;

  return {
    peerGroup: `${sector} (${pool.length} companies)`,
    comparisonDate: currentCompany.observedAtNPT || 'Latest Session',
    calculationBasis: `Comparison calculated from latest official financial disclosures and market LTPs. Companies reporting net losses are excluded from average P/E calculation.`,
    sectorAvgPe,
    sectorAvgPb,
    sectorAvgRoe,
    peers: peerMetrics
  };
}

/**
 * Builds the compact 5-dimension "Before You Buy" summary
 */
export function buildBeforeYouBuySummary(
  details: CompanyDetails,
  candles: Candle[],
  allCompanies: CompanyDetails[]
): BeforeYouBuySummary {
  const funds = details.fundamentals;
  const { avgDailyVolume20D, avgDailyTurnover20D, volatilityAnnualizedPct } = computeLiquidityMetrics(candles, details.ltp);
  const risks = evaluateCompanyRisks(details, candles);
  const peerComparison = computeSectorPeerComparison(details, allCompanies);

  // 1. Financial Health
  let fhStatus: 'Improving' | 'Mixed' | 'Needs attention' | 'Insufficient data' = 'Mixed';
  let fhEn = '';
  let fhNe = '';

  const isDataMissing = details.fundamentalsAvailable === false || !funds || funds.isAvailable === false;

  if (isDataMissing) {
    fhStatus = 'Insufficient data';
    fhEn = 'Quarterly financial statements have not been provided or verified for this period.';
    fhNe = 'यस अवधिको आधिकारिक त्रैमासिक वित्तीय विवरण उपलब्ध छैन वा प्रमाणीकरण हुन बाँकी छ।';
  } else if (funds.eps < 0) {
    fhStatus = 'Needs attention';
    fhEn = `Company reported negative EPS of NPR ${funds.eps.toFixed(2)} in ${funds.quarterlyReportPeriod}. Unprofitable operations.`;
    fhNe = `कम्पनीले ${funds.quarterlyReportPeriod} मा प्रतिसेयर आम्दानी रु ${funds.eps.toFixed(2)} ऋणात्मक देखाएको छ। खुद नोक्सानी कायम।`;
  } else if (funds.netProfit !== undefined && funds.netProfitPreviousYear !== undefined && funds.netProfit !== null && funds.netProfitPreviousYear !== null) {
    const yoy = (funds.netProfit - funds.netProfitPreviousYear) / (funds.netProfitPreviousYear || 1);
    if (yoy > 0.08 && funds.roe > 10) {
      fhStatus = 'Improving';
      fhEn = `Net profit expanded by ${(yoy * 100).toFixed(1)}% YoY with solid ROE of ${funds.roe.toFixed(1)}%.`;
      fhNe = `खुद नाफामा वार्षिक ${(yoy * 100).toFixed(1)}% को सुधार र ${funds.roe.toFixed(1)}% को प्रतिफल (ROE) कायम।`;
    } else if (yoy < -0.15 || funds.roe < 5) {
      fhStatus = 'Needs attention';
      fhEn = `Net profit contracted by ${(Math.abs(yoy) * 100).toFixed(1)}% YoY with low ROE (${funds.roe.toFixed(1)}%).`;
      fhNe = `खुद नाफामा गत वर्षको तुलनामा ${(Math.abs(yoy) * 100).toFixed(1)}% गिरावट र कमजोर पूँजी प्रतिफल।`;
    } else {
      fhStatus = 'Mixed';
      fhEn = `Stable earnings with moderate growth (${(yoy * 100).toFixed(1)}% YoY) and ${funds.roe.toFixed(1)}% ROE.`;
      fhNe = `सामान्य वृद्धि (${(yoy * 100).toFixed(1)}% YoY) र औसत पूँजी प्रतिफल सहित स्थिर वित्तीय स्थिति।`;
    }
  } else {
    fhStatus = 'Mixed';
    fhEn = `Positive EPS (NPR ${funds.eps.toFixed(2)}) with ${funds.roe.toFixed(1)}% ROE reported for ${funds.quarterlyReportPeriod}.`;
    fhNe = `प्रतिसेयर आम्दानी रु ${funds.eps.toFixed(2)} र ${funds.roe.toFixed(1)}% प्रतिफल सहित सामान्य वित्तीय स्वास्थ्य।`;
  }

  // 2. Valuation
  let valStatus: 'Fair' | 'Elevated' | 'Needs attention' | 'Discounted' | 'Insufficient data' = 'Fair';
  let valEn = '';
  let valNe = '';

  if (isDataMissing) {
    valStatus = 'Insufficient data';
    valEn = 'Valuation multiples unavailable due to missing earnings statement.';
    valNe = 'वित्तीय विवरण नभएकाले मूल्याङ्कन अनुपात उपलब्ध छैन।';
  } else if (funds.eps <= 0) {
    valStatus = 'Needs attention';
    valEn = 'P/E is not meaningful because recent earnings are negative. Do not interpret as cheap.';
    valNe = 'ऋणात्मक नाफा भएकाले पी/ई अनुपात लागू हुँदैन। सस्तो भनी भ्रममा पर्नु हुँदैन।';
  } else {
    const sectorPe = peerComparison.sectorAvgPe;
    if (sectorPe && funds.pe > sectorPe * 1.4) {
      valStatus = 'Elevated';
      valEn = `P/E of ${funds.pe.toFixed(1)} is higher than sector average (${sectorPe.toFixed(1)}). Demands strong future earnings growth.`;
      valNe = `पी/ई अनुपात (${funds.pe.toFixed(1)}) क्षेत्रगत औसत (${sectorPe.toFixed(1)}) भन्दा उच्च छ। उच्च मूल्याङ्कन।`;
    } else if (sectorPe && funds.pe < sectorPe * 0.7 && funds.roe > 10) {
      valStatus = 'Discounted';
      valEn = `P/E of ${funds.pe.toFixed(1)} is lower than peer average (${sectorPe.toFixed(1)}) alongside healthy ROE. Review fundamentals for cyclical traps.`;
      valNe = `पी/ई अनुपात (${funds.pe.toFixed(1)}) समकक्षी औसतभन्दा कम छ। चक्रीय जोखिम समेत जाँच्नुहोला।`;
    } else {
      valStatus = 'Fair';
      valEn = `P/E of ${funds.pe.toFixed(1)} and P/B of ${funds.pb.toFixed(1)} are within the typical sector valuation band.`;
      valNe = `पी/ई (${funds.pe.toFixed(1)}) र पी/बी (${funds.pb.toFixed(1)}) क्षेत्रगत दायराभित्रै सन्तुलित छन्।`;
    }
  }

  // 3. Liquidity
  let liqStatus: 'High liquidity' | 'Adequate' | 'Low trading liquidity' | 'Insufficient data' = 'Adequate';
  let liqEn = '';
  let liqNe = '';

  if (avgDailyVolume20D === 0) {
    liqStatus = 'Insufficient data';
    liqEn = 'Insufficient trading history to evaluate market liquidity.';
    liqNe = 'कारोबार तरलता मूल्याङ्कन गर्न पर्याप्त तथ्यांक छैन।';
  } else if (avgDailyVolume20D > 100000 || avgDailyTurnover20D > 50000000) {
    liqStatus = 'High liquidity';
    liqEn = `Active turnover (~${avgDailyVolume20D.toLocaleString()} kitta/day). Large orders execute with minimal price slippage.`;
    liqNe = `उच्च दैनिक कारोबार (~${avgDailyVolume20D.toLocaleString()} कित्ता/दिन)। ठूलो कित्ता सहजै किनबेच हुन सक्छ।`;
  } else if (avgDailyVolume20D < 20000) {
    liqStatus = 'Low trading liquidity';
    liqEn = `Thin trading volume (~${avgDailyVolume20D.toLocaleString()} kitta/day). Exiting larger positions quickly may prove difficult.`;
    liqNe = `न्यून कारोबार (~${avgDailyVolume20D.toLocaleString()} कित्ता/दिन)। ठूलो परिमाण बिक्री गर्न समय लाग्न सक्छ।`;
  } else {
    liqStatus = 'Adequate';
    liqEn = `Moderate trading activity (~${avgDailyVolume20D.toLocaleString()} kitta/day), suitable for standard retail trade sizes.`;
    liqNe = `सामान्य कारोबार (~${avgDailyVolume20D.toLocaleString()} कित्ता/दिन), साधारण लगानीकर्ताका लागि पर्याप्त।`;
  }

  // 4. Key Risks
  let riskStatus: 'Low risk observed' | 'Moderate risks' | 'Elevated risk concerns' | 'Insufficient data' = 'Low risk observed';
  let riskEn = '';
  let riskNe = '';

  const highRisks = risks.filter(r => r.severity === 'HIGH').length;
  if (risks.some(r => r.category === 'DATA_GAP')) {
    riskStatus = 'Insufficient data';
    riskEn = `${risks.length} concerns noted, including missing official quarterly reports.`;
    riskNe = `त्रैमासिक विवरण अभाव लगायत ${risks.length} वटा जोखिम विषय पहिचान।`;
  } else if (highRisks >= 1 || risks.length >= 3) {
    riskStatus = 'Elevated risk concerns';
    riskEn = `${risks.length} evidence-backed concerns identified, including ${highRisks} high-priority issues.`;
    riskNe = `${highRisks} वटा गम्भीर सहित कुल ${risks.length} वटा जोखिम विषयहरू पहिचान गरिएका छन्।`;
  } else if (risks.length > 0) {
    riskStatus = 'Moderate risks';
    riskEn = `${risks.length} manageable operational or market risk factors noted.`;
    riskNe = `${risks.length} वटा सामान्य जोखिम विषयहरू ध्यान दिनुपर्ने देखिन्छ।`;
  } else {
    riskStatus = 'Low risk observed';
    riskEn = 'No acute regulatory or balance-sheet stress flags observed in latest filings.';
    riskNe = 'पछिल्लो विवरणहरूमा कुनै गम्भीर वित्तीय वा नियामक जोखिम देखिएको छैन।';
  }

  // 5. Data Freshness
  const isDemo = details.dataStatus === 'DEMO';
  const isStale = details.dataStatus === 'STALE';
  let freshnessStatus: 'Fresh Data' | 'Delayed' | 'Stale' | 'Demo data' = 'Fresh Data';
  let freshEn = '';
  let freshNe = '';

  if (isDemo) {
    freshnessStatus = 'Demo data';
    freshEn = 'Demonstration dataset used for educational preview. Connect licensed provider for live trading.';
    freshNe = 'यो अभ्यास प्रयोजनको डेमो तथ्यांक हो। वास्तविक कारोबारका लागि इजाजतप्राप्त फिड आवश्यक छ।';
  } else if (isStale) {
    freshnessStatus = 'Stale';
    freshEn = `Feed is stale (last observed at ${details.observedAtNPT || details.lastUpdated}).`;
    freshNe = `तथ्यांक पुरानो भइसकेको छ (पछिल्लो समय: ${details.observedAtNPT || details.lastUpdated})।`;
  } else if (details.dataStatus === 'DELAYED') {
    freshnessStatus = 'Delayed';
    freshEn = 'Official 15-minute delayed market snapshot.';
    freshNe = '१५ मिनेट ढिलाइ भएको आधिकारिक बजार तथ्यांक।';
  } else {
    freshnessStatus = 'Fresh Data';
    freshEn = `Live market session feed observed at ${details.observedAtNPT || 'Market Hours'}.`;
    freshNe = `सत्रको ताजा बजार तथ्यांक (${details.observedAtNPT || 'कारोबार समय'})।`;
  }

  return {
    financialHealth: {
      status: fhStatus,
      explanationEn: fhEn,
      explanationNe: fhNe
    },
    valuation: {
      status: valStatus,
      explanationEn: valEn,
      explanationNe: valNe
    },
    liquidity: {
      status: liqStatus,
      avgDailyVolume20D,
      avgDailyTurnover20D,
      volatilityAnnualizedPct,
      bidAskSpreadStatus: 'Level 1 feed: Top-of-book depth spread requires Level 2 live broker terminal',
      explanationEn: liqEn,
      explanationNe: liqNe
    },
    keyRisks: {
      status: riskStatus,
      count: risks.length,
      items: risks,
      explanationEn: riskEn,
      explanationNe: riskNe
    },
    dataFreshness: {
      status: freshnessStatus,
      observedAtNPT: details.observedAtNPT || details.lastUpdated,
      retrievedAtNPT: details.retrievedAtNPT || 'Just now',
      sourceTier: isDemo ? 'NEPSE Educational Sandbox' : 'Source Code Pvt. Ltd. (MDP)',
      explanationEn: freshEn,
      explanationNe: freshNe
    },
    rulesBasis: [
      'Financial health evaluated using YoY net profit growth, quarterly EPS, and sector ROE.',
      'Valuation compares company P/E and P/B to the broader sector peer group. Low P/E is not automatically classified as cheap.',
      'Liquidity uses 20-day average volume and turnover to establish execution ease.',
      'Key risks aggregate verified balance-sheet warnings, regulatory notices, and data gaps. Missing data is treated as high risk.',
      'Data freshness tracks observation timestamps and provider synchronization status.'
    ]
  };
}

/**
 * Calculates NEPSE trade planning numbers with fee verification
 */
export function calculateTradePlan(input: TradePlanInput): TradePlanResult {
  const { symbol, entryPrice, quantity, targetPrice, stopLossPrice } = input;

  if (entryPrice <= 0 || quantity <= 0) {
    throw new Error('Entry price and quantity must be positive numbers.');
  }

  const purchaseTurnover = Math.round(entryPrice * quantity * 100) / 100;
  
  // Custom or standard tiered broker commission
  const buyBrokerFee = input.brokerRatePct !== undefined
    ? Math.round((purchaseTurnover * (input.brokerRatePct / 100)) * 100) / 100
    : calculateNepseBrokerCommission(purchaseTurnover);

  // SEBON regulatory fee (0.015%)
  const sebonRate = input.sebonRatePct !== undefined ? input.sebonRatePct / 100 : 0.00015;
  const buySebonFee = Math.round((purchaseTurnover * sebonRate) * 100) / 100;

  // DP Fee (flat NPR 25.00)
  const dpFee = input.dpFee !== undefined ? input.dpFee : 25.00;
  const buyDpFee = dpFee;

  const totalPurchaseCost = Math.round((purchaseTurnover + buyBrokerFee + buySebonFee + buyDpFee) * 100) / 100;

  // Break-even price calculation: price where targetSellProceeds == totalPurchaseCost
  // Approx: (totalPurchaseCost + dpFee) / (quantity * (1 - brokerRate - sebonRate))
  const estSellRate = purchaseTurnover > 10000000 ? 0.0027 : purchaseTurnover > 2000000 ? 0.0030 : purchaseTurnover > 500000 ? 0.0034 : 0.0040;
  const breakEvenPrice = Math.round(((totalPurchaseCost + dpFee) / (quantity * (1 - estSellRate - sebonRate))) * 10) / 10;

  // Target Leg
  const targetTurnover = Math.round(targetPrice * quantity * 100) / 100;
  const targetSellBrokerFee = input.brokerRatePct !== undefined
    ? Math.round((targetTurnover * (input.brokerRatePct / 100)) * 100) / 100
    : calculateNepseBrokerCommission(targetTurnover);
  const targetSellSebonFee = Math.round((targetTurnover * sebonRate) * 100) / 100;
  const targetSellDpFee = dpFee;
  const targetTotalSellFees = Math.round((targetSellBrokerFee + targetSellSebonFee + targetSellDpFee) * 100) / 100;

  const targetGrossProfit = Math.round((targetTurnover - purchaseTurnover) * 100) / 100;
  
  // Taxable capital gain for individual = targetTurnover - totalPurchaseCost - targetTotalSellFees
  const targetNetBeforeTax = Math.round((targetTurnover - totalPurchaseCost - targetTotalSellFees) * 100) / 100;
  const cgtRate = input.cgtRatePct !== undefined ? input.cgtRatePct / 100 : 0.075; // Default 7.5% (< 365 days)
  const targetCgt = targetNetBeforeTax > 0 ? Math.round((targetNetBeforeTax * cgtRate) * 100) / 100 : 0;
  const targetNetProfit = Math.round((targetNetBeforeTax - targetCgt) * 100) / 100;
  const targetRoiPct = Math.round((targetNetProfit / totalPurchaseCost) * 10000) / 100;

  // Stop Leg
  const stopTurnover = Math.round(stopLossPrice * quantity * 100) / 100;
  const stopSellBrokerFee = input.brokerRatePct !== undefined
    ? Math.round((stopTurnover * (input.brokerRatePct / 100)) * 100) / 100
    : calculateNepseBrokerCommission(stopTurnover);
  const stopSellSebonFee = Math.round((stopTurnover * sebonRate) * 100) / 100;
  const stopSellDpFee = dpFee;
  const stopTotalSellFees = Math.round((stopSellBrokerFee + stopSellSebonFee + stopSellDpFee) * 100) / 100;

  const stopGrossLoss = Math.round((purchaseTurnover - stopTurnover) * 100) / 100;
  // Total economic loss including round-trip fees
  const stopNetProceeds = Math.round((stopTurnover - stopTotalSellFees) * 100) / 100;
  const stopNetLoss = Math.round((totalPurchaseCost - stopNetProceeds) * 100) / 100;
  const stopLossPct = Math.round((stopNetLoss / totalPurchaseCost) * 10000) / 100;

  // Reward-to-Risk Ratio
  let rewardToRiskRatio = 0;
  if (targetNetProfit > 0 && stopNetLoss > 0) {
    rewardToRiskRatio = Math.round((targetNetProfit / stopNetLoss) * 100) / 100;
  }

  return {
    symbol: symbol.toUpperCase(),
    entryPrice,
    quantity,
    targetPrice,
    stopLossPrice,
    purchaseTurnover,
    buyBrokerFee,
    buySebonFee,
    buyDpFee,
    totalPurchaseCost,
    breakEvenPrice,
    targetTurnover,
    targetSellBrokerFee,
    targetSellSebonFee,
    targetSellDpFee,
    targetTotalSellFees,
    targetGrossProfit,
    targetCgt,
    targetNetProfit,
    targetRoiPct,
    stopTurnover,
    stopSellBrokerFee,
    stopSellSebonFee,
    stopSellDpFee,
    stopTotalSellFees,
    stopGrossLoss,
    stopNetLoss,
    stopLossPct,
    rewardToRiskRatio,
    assumptions: [
      `Broker commission calculated per official SEBON slab (${input.brokerRatePct ? `${input.brokerRatePct}% custom` : '0.27% - 0.40% tiered'}).`,
      `SEBON regulatory fee: ${(sebonRate * 100).toFixed(3)}%.`,
      `Depository Participant (DP) fee: NPR ${dpFee.toFixed(2)} per transaction leg.`,
      `Capital Gains Tax (CGT): ${(cgtRate * 100).toFixed(1)}% applied to positive net capital gain after deducting all transaction fees.`
    ],
    caveats: [
      'Stop-loss price is a planning threshold, NOT a guaranteed execution order. NEPSE trading system does not support automatic stop-loss execution.',
      'Execution price can slip significantly during gap-downs, market circuit halts, or when trading low-liquidity shares.',
      'This calculator is strictly for educational trade planning and does NOT place or execute real market orders.'
    ]
  };
}
