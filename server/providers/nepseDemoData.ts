import { CompanyDetails, Announcement, MarketNews, Candle } from './types.js';

// Deterministic candle series generator anchored on realistic recent market prices
function generateHistoricalCandles(
  basePrice: number,
  volatility: number,
  trendDirection: 'bullish' | 'bearish' | 'neutral',
  days = 90
): Candle[] {
  const candles: Candle[] = [];
  let currentClose = basePrice;
  const now = new Date();

  // Walk backwards or forwards
  const prices: { open: number; high: number; low: number; close: number; volume: number; date: string }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 1.4); // skip non-trading days roughly

    // Drift based on trend
    let drift = 0;
    if (trendDirection === 'bullish') drift = 0.0018;
    else if (trendDirection === 'bearish') drift = -0.0015;
    else drift = 0.0002 * Math.sin(i / 5);

    // Pseudorandom pseudo-walk
    const seed = (Math.sin(i * 997 + basePrice) * 10000) % 1;
    const changePct = (seed - 0.49) * volatility + drift;
    
    const open = Math.round(currentClose * (1 + (seed - 0.5) * 0.005) * 10) / 10;
    const close = Math.round(open * (1 + changePct) * 10) / 10;
    const high = Math.round(Math.max(open, close) * (1 + Math.abs(seed) * 0.012) * 10) / 10;
    const low = Math.round(Math.min(open, close) * (1 - Math.abs(seed) * 0.011) * 10) / 10;
    const baseVolume = Math.round(15000 + Math.abs(seed * 45000) * (basePrice > 1000 ? 0.3 : 1.5));

    prices.push({
      date: d.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: baseVolume
    });

    currentClose = close;
  }

  // Adjust so that the final candle matches basePrice
  const factor = basePrice / (prices[prices.length - 1].close || 1);
  return prices.map(p => ({
    date: p.date,
    open: Math.round(p.open * factor * 10) / 10,
    high: Math.round(p.high * factor * 10) / 10,
    low: Math.round(p.low * factor * 10) / 10,
    close: Math.round(p.close * factor * 10) / 10,
    volume: p.volume
  }));
}

export const DEMO_COMPANIES: CompanyDetails[] = [
  {
    symbol: 'NABIL',
    name: 'Nabil Bank Limited',
    nameNe: 'नबिल बैंक लिमिटेड',
    sector: 'Commercial Banks',
    sectorNe: 'वाणिज्य बैंक',
    ltp: 548.0,
    change: 6.5,
    pChange: 1.20,
    high: 552.0,
    low: 541.0,
    volume: 124800,
    turnover: 68140800,
    previousClose: 541.5,
    week52High: 635.0,
    week52Low: 462.0,
    observedAtNPT: '2081-06-19 14:45 NPT',
    retrievedAtNPT: '2081-06-19 14:45 NPT',
    lastUpdated: '2081-06-19 14:45 NPT',
    listingDate: '1984-07-12',
    totalShares: 270569973,
    description: 'Nabil Bank is the pioneer private commercial bank in Nepal, offering widespread branch banking and strong corporate credit portfolios.',
    descriptionNe: 'नबिल बैंक नेपालको अग्रणी निजी वाणिज्य बैंक हो, जसको देशभर सशक्त शाखा सञ्जाल र वित्तीय स्थायित्व छ।',
    fundamentals: {
      eps: 26.42,
      pe: 20.74,
      bookValue: 218.60,
      pb: 2.51,
      roe: 12.08,
      marketCap: 148272345204,
      paidUpCapital: 27056997300,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-28',
      revenue: 16800000000,
      revenuePreviousYear: 14900000000,
      netProfit: 7150000000,
      netProfitPreviousYear: 6400000000,
      epsAnnual: 26.42,
      epsTTM: 26.42,
      epsAnnualized: 26.42,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Year-End Equity (Audited Q4 2080/81)',
      cashDividendYield: 0.82,
      payoutRatio: 54.88,
      payoutRatioConvention: 'Total Declared Dividend (10% Bonus + 4.5% Cash) / Net Profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Nabil Bank 40th Annual Report & NRB Audited Financial Disclosures',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 7150000000, previousYearProfit: 6400000000, changePct: 11.72 },
        { quarter: 'Q3 2080/81', currentProfit: 5040000000, previousYearProfit: 4520000000, changePct: 11.50 },
        { quarter: 'Q2 2080/81', currentProfit: 3200000000, previousYearProfit: 2900000000, changePct: 10.34 }
      ],
      annualHistory: [
        { fiscalYear: '2080/81', revenue: 16800000000, netProfit: 7150000000, eps: 26.42 },
        { fiscalYear: '2079/80', revenue: 14900000000, netProfit: 6400000000, eps: 23.65 },
        { fiscalYear: '2078/79', revenue: 12800000000, netProfit: 4970000000, eps: 22.38 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 10.0, cashDividendPercent: 4.5, bookClosureDate: '2081-09-12' },
        { fiscalYear: '2079/80', bonusSharePercent: 9.0, cashDividendPercent: 2.0, bookClosureDate: '2080-09-08' },
        { fiscalYear: '2078/79', bonusSharePercent: 18.5, cashDividendPercent: 11.5, bookClosureDate: '2079-09-15' }
      ]
    },
    sectorMetrics: {
      sectorType: 'BANKING',
      banking: {
        nplRatio: 1.85,
        loanLossProvision: 4250000000,
        capitalAdequacyRatio: 12.80,
        regulatoryCarMin: 11.0,
        distributableProfit: 3920000000,
        distributableEps: 14.49,
        source: 'NRB Q4 Regulatory Returns & Audited Disclosure',
        reportingPeriod: 'Q4 2080/81'
      }
    },
    trendSummaryEn: 'NABIL is consolidating near its 50-day moving average with steady daily trading volume.',
    trendSummaryNe: 'नबिल बैंक हाल आफ्नो ५० दिने औसत मूल्य नजिक सामान्य कारोबारमा रहेको छ।'
  },
  {
    symbol: 'GBIME',
    name: 'Global IME Bank Limited',
    nameNe: 'ग्लोबल आइएमई बैंक लिमिटेड',
    sector: 'Commercial Banks',
    sectorNe: 'वाणिज्य बैंक',
    ltp: 218.0,
    change: -1.2,
    pChange: -0.55,
    high: 221.0,
    low: 216.5,
    volume: 245600,
    turnover: 53540800,
    previousClose: 219.2,
    week52High: 254.0,
    week52Low: 184.0,
    observedAtNPT: '2081-06-19 14:48 NPT',
    retrievedAtNPT: '2081-06-19 14:48 NPT',
    lastUpdated: '2081-06-19 14:48 NPT',
    listingDate: '2007-01-02',
    totalShares: 361287000,
    description: 'Global IME Bank is one of the largest commercial banks in Nepal by balance sheet size and branch presence.',
    descriptionNe: 'ग्लोबल आइएमई बैंक नेपालको सबैभन्दा ठूलो शाखा सञ्जाल र सम्पत्ति भएको बैंकहरूमध्ये एक हो।',
    fundamentals: {
      eps: 16.85,
      pe: 12.94,
      bookValue: 168.40,
      pb: 1.29,
      roe: 10.01,
      marketCap: 78760566000,
      paidUpCapital: 36128700000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-29',
      revenue: 19400000000,
      revenuePreviousYear: 18100000000,
      netProfit: 6090000000,
      netProfitPreviousYear: 5850000000,
      epsAnnual: 16.85,
      epsTTM: 16.85,
      epsAnnualized: 16.85,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Year-End Equity',
      cashDividendYield: 1.61,
      payoutRatio: 53.4,
      payoutRatioConvention: 'Total Declared Dividend (5.5% Bonus + 3.5% Cash) / Net Profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Global IME Bank 18th Annual Report & NRB Disclosure',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 6090000000, previousYearProfit: 5850000000, changePct: 4.10 }
      ],
      annualHistory: [
        { fiscalYear: '2080/81', revenue: 19400000000, netProfit: 6090000000, eps: 16.85 },
        { fiscalYear: '2079/80', revenue: 18100000000, netProfit: 5850000000, eps: 16.19 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 5.5, cashDividendPercent: 3.5, bookClosureDate: '2081-09-15' },
        { fiscalYear: '2079/80', bonusSharePercent: 8.0, cashDividendPercent: 1.0, bookClosureDate: '2080-09-18' }
      ]
    },
    sectorMetrics: {
      sectorType: 'BANKING',
      banking: {
        nplRatio: 4.12,
        loanLossProvision: 6120000000,
        capitalAdequacyRatio: 11.75,
        regulatoryCarMin: 11.0,
        distributableProfit: 2880000000,
        distributableEps: 7.97,
        source: 'NRB Q4 Regulatory Filing',
        reportingPeriod: 'Q4 2080/81'
      }
    },
    trendSummaryEn: 'GBIME trades in a tight accumulation channel with solid book value support around NPR 210.',
    trendSummaryNe: 'ग्लोबल आइएमई बैंक २१० रुपैयाँको दह्रो सपोर्ट नजिक सिमित दायरामा कारोबार भइरहेको छ।'
  },
  {
    symbol: 'NICA',
    name: 'NIC Asia Bank Limited',
    nameNe: 'एनआईसी एशिया बैंक लिमिटेड',
    sector: 'Commercial Banks',
    sectorNe: 'वाणिज्य बैंक',
    ltp: 432.0,
    change: 8.0,
    pChange: 1.89,
    high: 438.0,
    low: 422.0,
    volume: 185000,
    turnover: 79550000,
    previousClose: 424.0,
    week52High: 580.0,
    week52Low: 375.0,
    observedAtNPT: '2081-06-19 14:50 NPT',
    retrievedAtNPT: '2081-06-19 14:50 NPT',
    lastUpdated: '2081-06-19 14:50 NPT',
    listingDate: '1998-07-21',
    totalShares: 149175660,
    description: 'NIC Asia Bank has an extensive retail footprint across suburban and rural Nepal with aggressive digital banking adoption.',
    descriptionNe: 'एनआईसी एशिया बैंकले डिजिटल बैंकिङ र खुद्रा ग्राहकहरूलाई लक्षित गरी देशभर सेवा दिइरहेको छ।',
    fundamentals: {
      eps: 21.14,
      pe: 20.44,
      bookValue: 245.80,
      pb: 1.76,
      roe: 8.60,
      marketCap: 64443885120,
      paidUpCapital: 14917566000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-30',
      revenue: 15200000000,
      revenuePreviousYear: 16800000000,
      netProfit: 3150000000,
      netProfitPreviousYear: 4650000000,
      epsAnnual: 21.14,
      epsTTM: 21.14,
      epsAnnualized: 21.14,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      cashDividendYield: 0.0,
      payoutRatio: 0.0,
      payoutRatioConvention: 'Capital conservation phase per NRB supervisory guidance',
      oneTimeProfitDisclosed: false,
      auditStatus: 'UNAUDITED',
      sourceDoc: 'NIC Asia Q4 Unaudited Interim Report',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 3150000000, previousYearProfit: 4650000000, changePct: -32.26 }
      ],
      dividendHistory: [
        { fiscalYear: '2079/80', bonusSharePercent: 29.0, cashDividendPercent: 1.5, bookClosureDate: '2080-09-10' }
      ]
    },
    sectorMetrics: {
      sectorType: 'BANKING',
      banking: {
        nplRatio: 3.41,
        loanLossProvision: 3890000000,
        capitalAdequacyRatio: 11.45,
        regulatoryCarMin: 11.0,
        distributableProfit: 1950000000,
        distributableEps: 13.07,
        source: 'NRB Q4 Disclosure',
        reportingPeriod: 'Q4 2080/81'
      }
    },
    trendSummaryEn: 'NICA shows momentum recovery following a test of multi-month support, with rising MACD histogram.',
    trendSummaryNe: 'एनआईसी एशिया बैंकले पुराना सपोर्ट विन्दुबाट फर्कँदै सकारात्मक प्राविधिक संकेत देखाएको छ।'
  },
  {
    symbol: 'UPPER',
    name: 'Upper Tamakoshi Hydropower Ltd',
    nameNe: 'माथिल्लो तामाकोशी जलविद्युत लिमिटेड',
    sector: 'Hydropower',
    sectorNe: 'जलविद्युत',
    ltp: 284.0,
    change: 14.0,
    pChange: 5.19,
    high: 290.0,
    low: 268.0,
    volume: 680400,
    turnover: 191872800,
    previousClose: 270.0,
    week52High: 360.0,
    week52Low: 182.0,
    observedAtNPT: '2081-06-19 14:52 NPT',
    retrievedAtNPT: '2081-06-19 14:52 NPT',
    lastUpdated: '2081-06-19 14:52 NPT',
    listingDate: '2018-12-24',
    totalShares: 211800000,
    description: 'Upper Tamakoshi operates the largest domestic hydropower project (456 MW) in Dolakha district, supplying national baseload grid power.',
    descriptionNe: 'माथिल्लो तामाकोशी नेपालको ४५६ मेगावाट क्षमताको ठूलो राष्ट्रिय गौरवको जलविद्युत आयोजना हो।',
    fundamentals: {
      eps: -4.12,
      pe: 0,
      bookValue: 92.50,
      pb: 3.07,
      roe: -4.45,
      marketCap: 60151200000,
      paidUpCapital: 21180000000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-05-05',
      revenue: 7200000000,
      revenuePreviousYear: 6850000000,
      netProfit: -872000000,
      netProfitPreviousYear: -1250000000,
      epsAnnual: -4.12,
      epsTTM: -4.12,
      epsAnnualized: -4.12,
      epsType: 'ANNUAL',
      roeConvention: 'Net Loss / Total Equity (Negative)',
      cashDividendYield: 0.0,
      payoutRatio: null,
      payoutRatioConvention: 'Not applicable (Company reported net losses)',
      oneTimeProfitDisclosed: false,
      auditStatus: 'UNAUDITED',
      sourceDoc: 'Upper Tamakoshi Q4 Interim Report',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: -872000000, previousYearProfit: -1250000000, changePct: 30.24 }
      ],
      dividendHistory: []
    },
    sectorMetrics: {
      sectorType: 'HYDROPOWER',
      hydropower: {
        operationalStatus: 'OPERATIONAL',
        installedCapacityMW: 456,
        actualGenerationGWh: 2150,
        plantLoadFactorPct: 53.8,
        seasonalProductionNoteEn: 'Run-of-River (RoR) cascade design: generation peaks during monsoon months (Ashad–Ashwin) and drops to ~35-40% capacity during dry winter flow (Mangsir–Chaitra).',
        seasonalProductionNoteNe: 'नदी प्रवाहमा आधारित (RoR) आयोजना भएकाले वर्षायाममा पूर्ण क्षमतामा र हिउँदमा ३५-४०% मात्र उत्पादन हुने गर्दछ।',
        projectDebt: 38200000000,
        debtEquityRatio: '1.8:1',
        ppaDetails: '30-year Take-or-Pay Power Purchase Agreement with NEA at posted benchmark tariffs (Rs 4.80 dry / Rs 8.40 peak).',
        materialDisruptions: 'Transmission line maintenance completed; full grid evacuation restored.',
        source: 'NEA Annual Power Procurement & Q4 Corporate Filing'
      }
    },
    trendSummaryEn: 'UPPER broke out above 275 resistance on high volume, entering a strong short-term bullish channel.',
    trendSummaryNe: 'माथिल्लो तामाकोशीले उच्च कारोबार रकमसहित २७५ को प्रतिरोध तोडेर तीव्र वृद्धि देखाएको छ।'
  },
  {
    symbol: 'CHCL',
    name: 'Chilime Hydropower Co. Ltd',
    nameNe: 'चिलिमे जलविद्युत कम्पनी लिमिटेड',
    sector: 'Hydropower',
    sectorNe: 'जलविद्युत',
    ltp: 512.0,
    change: 4.0,
    pChange: 0.79,
    high: 518.0,
    low: 504.0,
    volume: 78500,
    turnover: 40112000,
    previousClose: 508.0,
    week52High: 585.0,
    week52Low: 440.0,
    observedAtNPT: '2081-06-19 14:49 NPT',
    retrievedAtNPT: '2081-06-19 14:49 NPT',
    lastUpdated: '2081-06-19 14:49 NPT',
    listingDate: '2003-04-10',
    totalShares: 79800000,
    description: 'Chilime is an established NEA subsidiary generating stable cash flows with stakes in multiple upcoming hydro projects.',
    descriptionNe: 'चिलिमे जलविद्युत निरन्तर लाभांश वितरण गर्ने नेपाल विद्युत प्राधिकरणको सहायक कम्पनी हो।',
    fundamentals: {
      eps: 14.80,
      pe: 34.59,
      bookValue: 154.20,
      pb: 3.32,
      roe: 9.60,
      marketCap: 40857600000,
      paidUpCapital: 7980000000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-20',
      revenue: 1250000000,
      revenuePreviousYear: 1210000000,
      netProfit: 1180000000,
      netProfitPreviousYear: 1120000000,
      epsAnnual: 14.80,
      epsTTM: 14.80,
      epsAnnualized: 14.80,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      cashDividendYield: 0.98,
      payoutRatio: 101.35,
      payoutRatioConvention: 'Total Declared Dividend (10% Bonus + 5% Cash) / Net Profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Chilime 27th Annual Report',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 1180000000, previousYearProfit: 1120000000, changePct: 5.36 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 10.0, cashDividendPercent: 5.0, bookClosureDate: '2081-09-02' },
        { fiscalYear: '2079/80', bonusSharePercent: 10.0, cashDividendPercent: 5.0, bookClosureDate: '2080-09-01' }
      ]
    },
    sectorMetrics: {
      sectorType: 'HYDROPOWER',
      hydropower: {
        operationalStatus: 'OPERATIONAL',
        installedCapacityMW: 22.1,
        actualGenerationGWh: 148,
        plantLoadFactorPct: 76.5,
        seasonalProductionNoteEn: 'Stable run-of-river flow supported by snow-fed Bhotekoshi tributaries. Stakes held in Sanjen, Rasuwagadhi, and Middle Bhotekoshi hydro projects.',
        seasonalProductionNoteNe: 'चिलिमेको आफ्नै २२.१ मेगावाट उत्पादन स्थिर छ भने सहायक आयोजनाहरू (सान्जेन, रसुवागढी) बाट थप प्रतिफल अपेक्षित छ।',
        projectDebt: 980000000,
        debtEquityRatio: '0.12:1',
        ppaDetails: 'Long-term Take-or-Pay PPA with NEA with regular dispatch and settled payments.',
        source: 'Chilime Corporate Desk'
      }
    },
    trendSummaryEn: 'CHCL is oscillating smoothly in an ascending channel, showing steady dividend investor interest.',
    trendSummaryNe: 'चिलिमे जलविद्युत दीर्घकालीन लगानीकर्ताको आकर्षणसहित माथितिर अग्रसर छ।'
  },
  {
    symbol: 'SHIVM',
    name: 'Shivam Cements Ltd',
    nameNe: 'शिवम सिमेन्ट्स लिमिटेड',
    sector: 'Manufacturing & Processing',
    sectorNe: 'उत्पादन तथा प्रशोधन',
    ltp: 615.0,
    change: 18.0,
    pChange: 3.02,
    high: 622.0,
    low: 594.0,
    volume: 310200,
    turnover: 189842400,
    previousClose: 597.0,
    week52High: 720.0,
    week52Low: 470.0,
    observedAtNPT: '2081-06-19 14:55 NPT',
    retrievedAtNPT: '2081-06-19 14:55 NPT',
    lastUpdated: '2081-06-19 14:55 NPT',
    listingDate: '2019-03-15',
    totalShares: 50270000,
    description: 'Shivam Cements is among Nepal’s largest manufacturing enterprises producing high-grade OPC cement.',
    descriptionNe: 'शिवम सिमेन्ट्स नेपालको ठूलो गुणस्तरीय सिमेन्ट उत्पादक कम्पनी हो।',
    fundamentals: {
      eps: 8.75,
      pe: 70.28,
      bookValue: 198.30,
      pb: 3.10,
      roe: 4.41,
      marketCap: 30916050000,
      paidUpCapital: 5027000000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-05-02',
      revenue: 8900000000,
      revenuePreviousYear: 9400000000,
      netProfit: 440000000,
      netProfitPreviousYear: 380000000,
      epsAnnual: 8.75,
      epsTTM: 8.75,
      epsAnnualized: 8.75,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Year-End Equity',
      debtToEquity: 0.42,
      interestCoverageRatio: 3.85,
      operatingCashFlow: 1180000000,
      cashDividendYield: 0.12,
      payoutRatio: 171.4,
      payoutRatioConvention: 'Bonus 14.25% + Cash 0.75% paid from reserves & current profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Shivam Cements FY 2080/81 Audited Financials',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 440000000, previousYearProfit: 380000000, changePct: 15.79 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 14.25, cashDividendPercent: 0.75, bookClosureDate: '2081-09-18' }
      ]
    },
    sectorMetrics: {
      sectorType: 'NON_FINANCIAL',
      nonFinancial: {
        debtToEquity: 0.42,
        interestCoverageRatio: 3.85,
        operatingCashFlow: 1180000000,
        source: 'Audited Balance Sheet FY 2080/81'
      }
    },
    trendSummaryEn: 'SHIVM is exhibiting strong turnover leadership in the manufacturing sector with expanding RSI.',
    trendSummaryNe: 'शिवम सिमेन्ट्सले उत्पादन क्षेत्रमा उच्च कारोबारका साथै बलियो खरिद चाप कायम राखेको छ।'
  },
  {
    symbol: 'HDL',
    name: 'Himalayan Distillery Ltd',
    nameNe: 'हिमालयन डिस्टिलरी लिमिटेड',
    sector: 'Manufacturing & Processing',
    sectorNe: 'उत्पादन तथा प्रशोधन',
    ltp: 1485.0,
    change: -25.0,
    pChange: -1.66,
    high: 1520.0,
    low: 1475.0,
    volume: 24100,
    turnover: 35909000,
    previousClose: 1510.0,
    week52High: 2150.0,
    week52Low: 1320.0,
    observedAtNPT: '2081-06-19 14:47 NPT',
    retrievedAtNPT: '2081-06-19 14:47 NPT',
    lastUpdated: '2081-06-19 14:47 NPT',
    listingDate: '2001-08-20',
    totalShares: 26732958,
    description: 'Leading beverage and distilled spirits producer known for its high ROE and past generous bonus distributions.',
    descriptionNe: 'हिमालयन डिस्टिलरी नेपालको प्रतिष्ठित मदिरा उत्पादक कम्पनी हो।',
    fundamentals: {
      eps: 28.50,
      pe: 52.10,
      bookValue: 172.80,
      pb: 8.59,
      roe: 16.49,
      marketCap: 39698442630,
      paidUpCapital: 2673295800,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-25',
      revenue: 5200000000,
      revenuePreviousYear: 5800000000,
      netProfit: 762000000,
      netProfitPreviousYear: 910000000,
      epsAnnual: 28.50,
      epsTTM: 28.50,
      epsAnnualized: 28.50,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      debtToEquity: 0.28,
      interestCoverageRatio: 5.60,
      operatingCashFlow: 920000000,
      cashDividendYield: 0.67,
      payoutRatio: 87.7,
      payoutRatioConvention: 'Bonus 15% + Cash 10% / Net profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Himalayan Distillery FY 2080/81 Audited Financials',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 762000000, previousYearProfit: 910000000, changePct: -16.26 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 15.0, cashDividendPercent: 10.0, bookClosureDate: '2081-09-22' },
        { fiscalYear: '2079/80', bonusSharePercent: 60.0, cashDividendPercent: 10.0, bookClosureDate: '2080-09-14' }
      ]
    },
    sectorMetrics: {
      sectorType: 'NON_FINANCIAL',
      nonFinancial: {
        debtToEquity: 0.28,
        interestCoverageRatio: 5.60,
        operatingCashFlow: 920000000,
        source: 'Annual Audited Report FY 2080/81'
      }
    },
    trendSummaryEn: 'HDL is testing major multi-month base support at NPR 1,450; watch for reversal candles.',
    trendSummaryNe: 'हिमालयन डिस्टिलरी १४५० रुपैयाँको आधार विन्दु नजिक अडिन खोजिरहेको छ।'
  },
  {
    symbol: 'NLIC',
    name: 'Nepal Life Insurance Co. Ltd',
    nameNe: 'नेपाल लाइफ इन्स्योरेन्स कम्पनी',
    sector: 'Life Insurance',
    sectorNe: 'जीवन बीमा',
    ltp: 742.0,
    change: 9.0,
    pChange: 1.23,
    high: 748.0,
    low: 731.0,
    volume: 64200,
    turnover: 47508000,
    previousClose: 733.0,
    week52High: 865.0,
    week52Low: 615.0,
    observedAtNPT: '2081-06-19 14:53 NPT',
    retrievedAtNPT: '2081-06-19 14:53 NPT',
    lastUpdated: '2081-06-19 14:53 NPT',
    listingDate: '2003-02-12',
    totalShares: 82079666,
    description: 'Nepal Life is the market share leader in life insurance premiums with the largest life fund in the country.',
    descriptionNe: 'नेपाल लाइफ इन्स्योरेन्स नेपालको जीवन बीमा क्षेत्रको सबैभन्दा ठूलो बजार हिस्सा भएको कम्पनी हो।',
    fundamentals: {
      eps: 8.20,
      pe: 90.48,
      bookValue: 142.10,
      pb: 5.22,
      roe: 5.77,
      marketCap: 60903112172,
      paidUpCapital: 8207966600,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-05-01',
      revenue: 38500000000,
      revenuePreviousYear: 35200000000,
      netProfit: 673000000,
      netProfitPreviousYear: 615000000,
      epsAnnual: 8.20,
      epsTTM: 8.20,
      epsAnnualized: 8.20,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      cashDividendYield: 0.47,
      payoutRatio: 189.0,
      payoutRatioConvention: 'Bonus 12% + Cash 3.5% based on actuarial valuation surplus',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Nepal Life Insurance 24th Annual Report & Actuarial Valuation',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 673000000, previousYearProfit: 615000000, changePct: 9.43 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 12.0, cashDividendPercent: 3.5, bookClosureDate: '2081-09-25' }
      ]
    },
    sectorMetrics: {
      sectorType: 'INSURANCE',
      insurance: {
        insuranceType: 'LIFE',
        solvencyRatio: 1.82,
        regulatorySolvencyMin: 1.50,
        claimsExperiencePct: 78.4,
        underwritingProfit: 712000000,
        persistencyRatioPct: 81.2,
        lifeInsuranceFund: 185000000000,
        source: 'Nepal Insurance Authority Directive Filing'
      }
    },
    trendSummaryEn: 'NLIC shows constructive rounding bottom accumulation above the 20-day SMA.',
    trendSummaryNe: 'नेपाल लाइफ २० दिने औसत मूल्यभन्दा माथि सुदृढ बनिरहेको देखिन्छ।'
  },
  {
    symbol: 'NTC',
    name: 'Nepal Doorsanchar Co. Ltd',
    nameNe: 'नेपाल टेलिकम (नेपाल दूरसञ्चार कम्पनी)',
    sector: 'Others',
    sectorNe: 'अन्य',
    ltp: 865.0,
    change: 3.0,
    pChange: 0.35,
    high: 870.0,
    low: 860.0,
    volume: 48900,
    turnover: 42298500,
    previousClose: 862.0,
    week52High: 940.0,
    week52Low: 780.0,
    observedAtNPT: '2081-06-19 14:51 NPT',
    retrievedAtNPT: '2081-06-19 14:51 NPT',
    lastUpdated: '2081-06-19 14:51 NPT',
    listingDate: '2008-03-24',
    totalShares: 180000000,
    description: 'State-backed telecommunications giant with steady dividend yield and nationwide fiber and 4G coverage.',
    descriptionNe: 'नेपालको राष्ट्रिय दूरसञ्चार सेवा प्रदायक, जसले निरन्तर नगद लाभांश प्रदान गर्दै आएको छ।',
    fundamentals: {
      eps: 44.15,
      pe: 19.59,
      bookValue: 495.20,
      pb: 1.75,
      roe: 8.92,
      marketCap: 155700000000,
      paidUpCapital: 18000000000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-22',
      revenue: 41200000000,
      revenuePreviousYear: 43500000000,
      netProfit: 7947000000,
      netProfitPreviousYear: 7800000000,
      epsAnnual: 44.15,
      epsTTM: 44.15,
      epsAnnualized: 44.15,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      debtToEquity: 0.05,
      interestCoverageRatio: 24.50,
      operatingCashFlow: 14200000000,
      cashDividendYield: 4.62,
      payoutRatio: 90.6,
      payoutRatioConvention: 'Pure Cash Dividend (Rs 40 per share) / Net Profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Nepal Telecom 16th AGM Audited Financial Reports',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 7947000000, previousYearProfit: 7800000000, changePct: 1.88 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 0.0, cashDividendPercent: 40.0, bookClosureDate: '2081-09-05' },
        { fiscalYear: '2079/80', bonusSharePercent: 0.0, cashDividendPercent: 40.0, bookClosureDate: '2080-09-08' }
      ]
    },
    sectorMetrics: {
      sectorType: 'NON_FINANCIAL',
      nonFinancial: {
        debtToEquity: 0.05,
        interestCoverageRatio: 24.50,
        operatingCashFlow: 14200000000,
        source: 'NTC Annual Financial Disclosure'
      }
    },
    trendSummaryEn: 'NTC trades as a defensive low-beta holding with low volatility and high book value backing.',
    trendSummaryNe: 'नेपाल टेलिकम न्यून उतारचढाव र स्थिर नगद लाभांशको भरपर्दो रक्षात्मक सेयर मानिन्छ।'
  },
  {
    symbol: 'CIT',
    name: 'Citizen Investment Trust',
    nameNe: 'नागरिक लगानी कोष',
    sector: 'Investment',
    sectorNe: 'लगानी',
    ltp: 2340.0,
    change: -15.0,
    pChange: -0.64,
    high: 2375.0,
    low: 2325.0,
    volume: 18900,
    turnover: 44226000,
    previousClose: 2355.0,
    week52High: 2750.0,
    week52Low: 2010.0,
    observedAtNPT: '2081-06-19 14:46 NPT',
    retrievedAtNPT: '2081-06-19 14:46 NPT',
    lastUpdated: '2081-06-19 14:46 NPT',
    listingDate: '2003-01-15',
    totalShares: 53137500,
    description: 'Statutory institutional fund manager handling employee retirement funds, mutual funds, and capital market investments.',
    descriptionNe: 'नागरिक लगानी कोष सरकारी तथा सार्वजनिक बचत संकलन र पूँजी परिचालन गर्ने प्रमुख कोष हो।',
    fundamentals: {
      eps: 24.30,
      pe: 96.30,
      bookValue: 242.00,
      pb: 9.67,
      roe: 10.04,
      marketCap: 124341750000,
      paidUpCapital: 5313750000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-04-26',
      revenue: 3400000000,
      revenuePreviousYear: 3100000000,
      netProfit: 1290000000,
      netProfitPreviousYear: 1190000000,
      epsAnnual: 24.30,
      epsTTM: 24.30,
      epsAnnualized: 24.30,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      cashDividendYield: 0.03,
      payoutRatio: 61.2,
      payoutRatioConvention: 'Bonus 14% + Cash 0.73% / Net profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Citizen Investment Trust FY 2080/81 Annual Report',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 1290000000, previousYearProfit: 1190000000, changePct: 8.40 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 14.0, cashDividendPercent: 0.73, bookClosureDate: '2081-09-14' }
      ]
    },
    sectorMetrics: {
      sectorType: 'OTHER'
    },
    trendSummaryEn: 'CIT is consolidating after a pullback, holding above its 100-day trend support.',
    trendSummaryNe: 'नागरिक लगानी कोष १०० दिने मध्यमकालीन सपोर्ट विन्दुभन्दा माथि स्थिर छ।'
  },
  {
    symbol: 'HATHY',
    name: 'Hathway Investment Nepal Ltd',
    nameNe: 'हाथवे इन्भेष्टमेन्ट नेपाल लिमिटेड',
    sector: 'Investment',
    sectorNe: 'लगानी',
    ltp: 1080.0,
    change: 45.0,
    pChange: 4.35,
    high: 1110.0,
    low: 1025.0,
    volume: 154000,
    turnover: 164780000,
    previousClose: 1035.0,
    week52High: 1240.0,
    week52Low: 480.0,
    observedAtNPT: '2081-06-19 14:54 NPT',
    retrievedAtNPT: '2081-06-19 14:54 NPT',
    lastUpdated: '2081-06-19 14:54 NPT',
    listingDate: '2023-09-28',
    totalShares: 26000000,
    description: 'Premier private-equity and venture investment company actively managing public equities and real-estate assets.',
    descriptionNe: 'हाथवे इन्भेष्टमेन्ट नेपालको तीव्र गतिमा लगानी विस्तार गरिरहेको निजी पूँजी लगानी कम्पनी हो।',
    fundamentals: {
      eps: 9.15,
      pe: 118.03,
      bookValue: 88.40,
      pb: 12.22,
      roe: 10.35,
      marketCap: 28080000000,
      paidUpCapital: 2600000000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-05-04',
      revenue: 620000000,
      revenuePreviousYear: 450000000,
      netProfit: 238000000,
      netProfitPreviousYear: 180000000,
      epsAnnual: 9.15,
      epsTTM: 9.15,
      epsAnnualized: 9.15,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      cashDividendYield: 0.05,
      payoutRatio: 114.7,
      payoutRatioConvention: 'Bonus 10% + Cash 0.526% / Net profit',
      oneTimeProfitDisclosed: true,
      oneTimeProfitDetails: 'Capital gains realized from secondary market equity divestment',
      auditStatus: 'AUDITED',
      sourceDoc: 'Hathway Investment Nepal FY 2080/81 Audited Financials',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 238000000, previousYearProfit: 180000000, changePct: 32.22 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 10.0, cashDividendPercent: 0.526, bookClosureDate: '2081-09-28' }
      ]
    },
    sectorMetrics: {
      sectorType: 'OTHER'
    },
    trendSummaryEn: 'HATHY is surging on high retail participation with RSI approaching overbought territory.',
    trendSummaryNe: 'हाथवे इन्भेष्टमेन्टमा उच्च कारोबारसहित तीव्र उत्साहजनक वृद्धि देखिएको छ।'
  },
  {
    symbol: 'SHL',
    name: 'Soaltee Hotel Limited',
    nameNe: 'सोल्टी होटल लिमिटेड',
    sector: 'Hotels & Tourism',
    sectorNe: 'होटल तथा पर्यटन',
    ltp: 488.0,
    change: 7.0,
    pChange: 1.46,
    high: 494.0,
    low: 479.0,
    volume: 112000,
    turnover: 54432000,
    previousClose: 481.0,
    week52High: 560.0,
    week52Low: 380.0,
    observedAtNPT: '2081-06-19 14:48 NPT',
    retrievedAtNPT: '2081-06-19 14:48 NPT',
    lastUpdated: '2081-06-19 14:48 NPT',
    listingDate: '1984-11-20',
    totalShares: 92892900,
    description: 'Iconic five-star luxury hotel in Kathmandu benefiting from Nepal tourism resurgence and international banqueting.',
    descriptionNe: 'काठमाडौंको प्रतिष्ठित पाँचतारे होटल, जसले पर्यटन विकाससँगै बलियो नाफा आर्जन गरिरहेको छ।',
    fundamentals: {
      eps: 6.40,
      pe: 76.25,
      bookValue: 34.50,
      pb: 14.14,
      roe: 18.55,
      marketCap: 45331735200,
      paidUpCapital: 928929000,
      quarterlyReportPeriod: 'Q4 2080/81',
      reportedDate: '2081-05-02',
      revenue: 2150000000,
      revenuePreviousYear: 1780000000,
      netProfit: 595000000,
      netProfitPreviousYear: 420000000,
      epsAnnual: 6.40,
      epsTTM: 6.40,
      epsAnnualized: 6.40,
      epsType: 'ANNUAL',
      roeConvention: 'Net Profit / Total Equity',
      debtToEquity: 0.18,
      interestCoverageRatio: 4.20,
      operatingCashFlow: 540000000,
      cashDividendYield: 0.28,
      payoutRatio: 43.2,
      payoutRatioConvention: 'Bonus 26.315% + Cash 1.385% / Net profit',
      oneTimeProfitDisclosed: false,
      auditStatus: 'AUDITED',
      sourceDoc: 'Soaltee Hotel Limited 49th Annual Report',
      quarterlyYoY: [
        { quarter: 'Q4 2080/81', currentProfit: 595000000, previousYearProfit: 420000000, changePct: 41.67 }
      ],
      dividendHistory: [
        { fiscalYear: '2080/81', bonusSharePercent: 26.315, cashDividendPercent: 1.385, bookClosureDate: '2081-09-10' }
      ]
    },
    sectorMetrics: {
      sectorType: 'NON_FINANCIAL',
      nonFinancial: {
        debtToEquity: 0.18,
        interestCoverageRatio: 4.20,
        operatingCashFlow: 540000000,
        source: 'SHL Audited Financials'
      }
    },
    trendSummaryEn: 'SHL holds steady above its NPR 475 support with seasonal tourist influx supporting outlook.',
    trendSummaryNe: 'सोल्टी होटल ४७५ रुपैयाँको सपोर्ट माथि पर्यटन सिजनको सकारात्मक प्रभावसहित कारोबार भइरहेको छ।'
  }
];

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    symbol: 'NABIL',
    companyName: 'Nabil Bank Limited',
    title: 'Proposed 10% Bonus Share and 4.5% Cash Dividend for FY 2080/81',
    titleNe: 'आर्थिक वर्ष २०८०/८१ का लागि १०% बोनस सेयर र ४.५% नगद लाभांश प्रस्ताव',
    summary: 'The 640th Board of Directors meeting has resolved to recommend a 10% bonus share and 4.5% cash dividend subject to approval by Nepal Rastra Bank and the upcoming 40th AGM.',
    summaryNe: 'नबिल बैंकको सञ्चालक समितिले नेपाल राष्ट्र बैंक र आगामी साधारण सभाको स्वीकृतिपछि लागु हुने गरी १० प्रतिशत बोनस सेयर र ४.५ प्रतिशत नगद लाभांश प्रस्ताव गरेको छ।',
    category: 'DIVIDEND',
    status: 'PROPOSED',
    date: '2081-06-18',
    sourceUrl: 'https://nepalstock.com.np/news',
    publisher: 'NEPSE / Company Disclosure',
    isVerifiedSource: true
  },
  {
    id: 'ann-2',
    symbol: 'UPPER',
    companyName: 'Upper Tamakoshi Hydropower Ltd',
    title: 'Notice Regarding Right Share Allotment and Demat Crediting',
    titleNe: 'हकप्रद सेयर बाँडफाँड तथा डिम्याट खातामा जम्मा सम्बन्धी सूचना',
    summary: 'Upper Tamakoshi Hydropower has completed the allotment of its 1:1 right issue. Approved shares are currently being credited to respective Demat accounts.',
    summaryNe: 'माथिल्लो तामाकोशी जलविद्युतले १:१ अनुपातको हकप्रद सेयर बाँडफाँड सम्पन्न गरी सेयरधनीहरूको डिम्याट खातामा पठाउन सुरु गरेको छ।',
    category: 'RIGHT_SHARE',
    status: 'COMPLETED',
    date: '2081-06-15',
    sourceUrl: 'https://nepalstock.com.np/notices',
    publisher: 'SEBON Disclosures',
    isVerifiedSource: true
  },
  {
    id: 'ann-3',
    symbol: 'SHIVM',
    companyName: 'Shivam Cements Ltd',
    title: 'Audited Financial Statement for Q4 2080/81 Published',
    titleNe: 'आर्थिक वर्ष २०८०/८१ को चौथो त्रैमासिक वित्तीय विवरण सार्वजनिक',
    summary: 'Shivam Cements posted net profit growth driven by operational efficiency and reduced thermal energy procurement costs.',
    summaryNe: 'उत्पादन लागत नियन्त्रण र क्लिङ्कर खपत सुधारसँगै शिवम सिमेन्ट्सले चौथो त्रैमासमा खुद नाफामा सुधार गरेको छ।',
    category: 'FINANCIAL_REPORT',
    status: 'APPROVED',
    date: '2081-06-10',
    sourceUrl: 'https://nepalstock.com.np/reports',
    publisher: 'NEPSE Corporate Portal',
    isVerifiedSource: true
  },
  {
    id: 'ann-4',
    symbol: 'GBIME',
    companyName: 'Global IME Bank Limited',
    title: 'Book Closure Announced for 18th Annual General Meeting',
    titleNe: '१८ औं वार्षिक साधारण सभा प्रयोजनार्थ बुक क्लोज मिति तय',
    summary: 'Global IME Bank has fixed the book closure date for eligible shareholders to participate in the upcoming AGM and receive the declared dividend.',
    summaryNe: 'ग्लोबल आइएमई बैंकले वार्षिक साधारण सभा र लाभांश प्राप्तिका लागि बुक क्लोजको मिति तय गरेको छ।',
    category: 'AGM',
    status: 'NOTICE',
    date: '2081-06-08',
    sourceUrl: 'https://nepalstock.com.np/notices',
    publisher: 'Company Secretary',
    isVerifiedSource: true
  },
  {
    id: 'ann-5',
    symbol: 'CIT',
    companyName: 'Citizen Investment Trust',
    title: 'Citizen Unit Scheme Declares Annual Return Distribution',
    titleNe: 'नागरिक एकाइ योजनाको वार्षिक प्रतिफल वितरण घोषणा',
    summary: 'Citizen Investment Trust approved 9% return distribution to all unit holders of Citizen Unit Scheme for the completed fiscal period.',
    summaryNe: 'नागरिक लगानी कोषले नागरिक एकाइ योजनाका इकाइधनीहरूलाई ९ प्रतिशत प्रतिफल वितरण गर्ने निर्णय गरेको छ।',
    category: 'DIVIDEND',
    status: 'APPROVED',
    date: '2081-06-05',
    sourceUrl: 'https://nepalstock.com.np/notices',
    publisher: 'CIT Investor Desk',
    isVerifiedSource: true
  }
];

export const DEMO_NEWS: MarketNews[] = [
  {
    id: 'news-1',
    title: 'NEPSE Index Consolidates Above 2,700 as Banking and Hydropower Drive Turnover',
    titleNe: 'बैंकिङ र जलविद्युत समूहमा आकर्षण बढ्दा नेप्से परिसूचक २,७०० विन्दु माथि सुदृढ',
    summary: 'Broad participation across commercial banks and select hydropower stocks propelled total market turnover above NPR 7.2 Billion in today’s session.',
    date: '2081-06-19',
    source: 'ShareSansar / NEPSE Daily',
    url: 'https://sharesansar.com'
  },
  {
    id: 'news-2',
    title: 'Nepal Rastra Bank Reviews Monetary Policy: Liquidity Stays Adequate in Banking Channel',
    titleNe: 'राष्ट्र बैंकको मौद्रिक नीति समीक्षा: बैंकिङ प्रणालीमा पर्याप्त तरलता कायमै',
    summary: 'Interbank interest rates remain under 3.5%, maintaining favorable borrowing conditions for secondary equity market participants.',
    date: '2081-06-17',
    source: 'NRB Financial Bulletin',
    url: 'https://nrb.org.np'
  },
  {
    id: 'news-3',
    title: 'SEBON Tightens Listing and Disclosure Requirements for Upcoming Initial Offerings',
    titleNe: 'धितोपत्र बोर्डद्वारा नयाँ प्राथमिक निष्कासन तथा वित्तीय पारदर्शिता नियम कडा',
    summary: 'The Securities Board of Nepal mandates standardized quarterly reporting timelines and heightened scrutiny on use of IPO proceeds.',
    date: '2081-06-12',
    source: 'SEBON Official Press',
    url: 'https://sebon.gov.np'
  }
];

// Pre-generate historical candles for all demo companies
const CANDLE_CACHE: Record<string, Candle[]> = {};

export function getCachedDemoCandles(symbol: string): Candle[] {
  if (CANDLE_CACHE[symbol]) {
    return CANDLE_CACHE[symbol];
  }

  const company = DEMO_COMPANIES.find(c => c.symbol === symbol);
  const basePrice = company ? company.ltp : 300;
  
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (['UPPER', 'HATHY', 'SHIVM', 'NABIL'].includes(symbol)) trend = 'bullish';
  else if (['HDL', 'GBIME'].includes(symbol)) trend = 'bearish';

  const candles = generateHistoricalCandles(basePrice, 0.022, trend, 90);
  CANDLE_CACHE[symbol] = candles;
  return candles;
}
