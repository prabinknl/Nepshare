import React, { useState, useEffect, useCallback } from 'react';
import {
  CompanyDetails,
  Candle,
  TechnicalSignalResult,
  PredictiveOutlookResult,
  Announcement
} from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { StockChart } from '../components/StockChart.js';
import { TechnicalSignalBadge } from '../components/TechnicalSignalBadge.js';
import { AdvancedAnalysis } from '../components/AdvancedAnalysis.js';
import { PredictiveOutlook } from '../components/PredictiveOutlook.js';
import { Tooltip } from '../components/Tooltip.js';
import { AddAlertModal } from '../components/AddAlertModal.js';
import { AddTransactionModal } from '../components/AddTransactionModal.js';
import { BeforeYouBuySummary } from '../components/BeforeYouBuySummary.js';
import { SectorAnalysisCard } from '../components/SectorAnalysisCard.js';
import { TradePlanningCalculator } from '../components/TradePlanningCalculator.js';
import { PredictAiCard } from '../components/PredictAiCard.js';

interface CompanyDetailViewProps {
  symbol: string;
  onBack: () => void;
  onOpenAiAnalysis?: (symbol: string) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({ symbol, onBack, onOpenAiAnalysis }) => {
  const { lang, t, formatCurrency } = useLanguage();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [technical, setTechnical] = useState<TechnicalSignalResult | null>(null);
  const [predictions, setPredictions] = useState<PredictiveOutlookResult | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [beforeYouBuy, setBeforeYouBuy] = useState<any | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('3M');
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompanyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [compRes, candleRes, techRes, predRes, annRes, bybRes] = await Promise.all([
        api.getCompanyDetails(symbol),
        api.getCandles(symbol, selectedPeriod),
        api.getTechnicalAnalysis(symbol),
        api.getPredictions(symbol),
        api.getAnnouncements(symbol),
        api.getBeforeYouBuy(symbol).catch(() => null)
      ]);

      setCompany(compRes);
      setCandles(candleRes);
      setTechnical(techRes);
      setPredictions(predRes);
      setAnnouncements(annRes);
      setBeforeYouBuy(bybRes);

      // Check watchlist status if authenticated
      if (isAuthenticated) {
        try {
          const wl = await api.getWatchlist();
          setIsInWatchlist(wl.some(w => w.symbol === symbol.toUpperCase()));
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load company details.');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, selectedPeriod, isAuthenticated]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    try {
      const newCandles = await api.getCandles(symbol, period);
      setCandles(newCandles);
    } catch {
      // ignore
    }
  };

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    try {
      if (isInWatchlist) {
        await api.removeFromWatchlist(symbol);
        setIsInWatchlist(false);
      } else {
        await api.addToWatchlist(symbol);
        setIsInWatchlist(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update watchlist.');
    }
  };

  const handleOpenAlert = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setIsAlertModalOpen(true);
  };

  const handleOpenTrade = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setIsTxModalOpen(true);
  };

  const handleJumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          Loading {symbol.toUpperCase()} Nepshare Profile & Analysis...
        </div>
        <p style={{ fontSize: '0.88rem' }}>Evaluating financial health, valuation multiples, liquidity, and risks</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-bear)', fontWeight: 600, marginBottom: '1rem' }}>
          {error || `Company with symbol "${symbol}" could not be found.`}
        </p>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Overview
        </button>
      </div>
    );
  }

  const isUp = company.change >= 0;
  const companyName = lang === 'ne' && company.nameNe ? company.nameNe : company.name;
  const sectorName = lang === 'ne' && company.sectorNe ? company.sectorNe : company.sector;
  const description = lang === 'ne' && company.descriptionNe ? company.descriptionNe : company.description;
  const trendSummary = lang === 'ne' && company.trendSummaryNe ? company.trendSummaryNe : company.trendSummaryEn;
  const funds = company.fundamentals;
  const peerComparison = beforeYouBuy?.peerComparison;
  const risks = beforeYouBuy?.risks || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '0.2rem 0.5rem' }}>
            ← Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Predict AI Stock Analysis */}
            <button
              className="btn-ai-glow"
              onClick={() => {
                const el = document.getElementById('section-predict-ai');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (onOpenAiAnalysis) {
                  onOpenAiAnalysis(company.symbol);
                }
              }}
              title="Run combined Predict AI Analysis decision engine"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
            >
              <span>✨</span>
              <span>{lang === 'ne' ? 'प्रिडिक्ट एआई विश्लेषण' : 'Predict AI Analysis'}</span>
            </button>

            {/* Refresh Quote */}
            <button
              className="btn-nepse-refresh"
              onClick={loadCompanyData}
              title="Refresh company quotes and analysis"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <svg className="refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>{lang === 'ne' ? 'रिफ्रेस' : 'Refresh'}</span>
            </button>

            {/* Watchlist Toggle */}
            <button
              className={`btn btn-sm ${isInWatchlist ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleToggleWatchlist}
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isInWatchlist ? '★ In Watchlist' : '☆ Add to Watchlist'}
            </button>

            {/* Set Alert */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleOpenAlert}
              title="Set Price or Signal Alert"
            >
              🔔 Set Alert
            </button>

            {/* Trade / Record Transaction */}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleOpenTrade}
              title="Record transaction in your portfolio"
            >
              + Record Trade
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>{company.symbol}</h1>
              <span className="badge badge-slate">{sectorName}</span>
              {company.dataStatus && (
                <span className={`badge ${
                  company.dataStatus === 'LIVE' ? 'badge-emerald' :
                  company.dataStatus === 'DELAYED' ? 'badge-amber' :
                  company.dataStatus === 'STALE' ? 'badge-rose' :
                  company.dataStatus === 'END_OF_DAY' ? 'badge-slate' : 'badge-slate'
                }`} style={{ fontSize: '0.72rem' }}>
                  {company.dataStatus === 'LIVE' ? '● LIVE' :
                   company.dataStatus === 'DELAYED' ? `DELAYED (${company.applicableDelayMinutes || 15}m)` :
                   company.dataStatus === 'STALE' ? 'STALE' :
                   company.dataStatus === 'END_OF_DAY' ? 'END-OF-DAY' : 'DEMO FEED'}
                </span>
              )}
              {technical && (
                <TechnicalSignalBadge
                  signal={technical.signal}
                  label={lang === 'ne' ? technical.signalLabelNe : technical.signalLabelEn}
                />
              )}
            </div>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.2rem' }}>
              {companyName}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem', maxWidth: '650px', lineHeight: '1.5' }}>
              {description}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>
              {formatCurrency(company.ltp)}
            </div>
            <div className={isUp ? 'text-bull' : 'text-bear'} style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              {isUp ? `+${company.change.toFixed(1)}` : company.change.toFixed(1)} ({isUp ? `+${company.pChange.toFixed(2)}%` : `${company.pChange.toFixed(2)}%`})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              <span>Observed: {company.observedAtNPT || company.lastUpdated}</span>
              {company.retrievedAtNPT && <span> • Retrieved: {company.retrievedAtNPT}</span>}
            </div>
          </div>
        </div>

        {/* Section Navigation Quick Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginTop: '1.25rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.25rem' }}>
            Jump to:
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-financial-health')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            A. Financial Health
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-valuation')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            B. Valuation
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-price-volume')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            C. Price & Volume
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-announcements')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            D. Announcements
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-risks')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            E. Risks
          </button>
          {company.sectorMetrics && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-sector-metrics')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
              🏢 Sector Analysis
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-predict-ai')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
            ✨ Predict AI
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleJumpToSection('section-trade-planner')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            🧮 Trade Planner
          </button>
        </div>
      </div>

      {/* COMBINED "PREDICT AI ANALYSIS" DECISION ENGINE */}
      <div id="section-predict-ai">
        <PredictAiCard symbol={company.symbol} />
      </div>

      {/* COMPACT "BEFORE YOU BUY" SUMMARY CARD */}
      {beforeYouBuy?.summary && (
        <BeforeYouBuySummary
          symbol={company.symbol}
          summary={beforeYouBuy.summary}
          onJumpToSection={handleJumpToSection}
        />
      )}

      {/* SECTION A: FINANCIAL HEALTH */}
      <div className="card" id="section-financial-health" style={{ borderLeft: '4px solid #0078d7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'क. वित्तीय स्वास्थ्य (Section A: Financial Health)' : 'Section A: Financial Health'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {lang === 'ne'
                ? 'आधिकारिक त्रैमासिक तथा वार्षिक प्रतिवेदनमा आधारित आम्दानी, नाफा, नगद प्रवाह र लाभांश'
                : 'Earnings, cash flow, historical YoY growth, and payout track record from verified disclosures.'}
            </p>
          </div>
          {funds && funds.auditStatus && (
            <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
              <span className={`badge ${funds.auditStatus === 'AUDITED' ? 'badge-emerald' : 'badge-amber'}`}>
                {funds.auditStatus}
              </span>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {funds.sourceDoc || funds.quarterlyReportPeriod}
              </div>
            </div>
          )}
        </div>

        {company.fundamentalsAvailable === false || !funds || !funds.isAvailable ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <p>Financial statements and balance sheet metrics are not available from this market data feed tier.</p>
          </div>
        ) : (
          <div>
            {/* Core Metrics Grid */}
            <div className="grid-3" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Revenue & Profit YoY */}
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue & Net Profit</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {funds.netProfit !== undefined && funds.netProfit !== null ? formatCurrency(funds.netProfit) : 'Not available'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Revenue: {funds.revenue ? formatCurrency(funds.revenue) : 'Not available'}
                  {funds.netProfitPreviousYear && (
                    <span style={{ display: 'block', color: (funds.netProfit || 0) >= funds.netProfitPreviousYear ? 'var(--color-bull)' : 'var(--color-bear)', fontWeight: 600 }}>
                      YoY Growth: {funds.netProfitPreviousYear > 0 ? `${((( (funds.netProfit || 0) - funds.netProfitPreviousYear) / funds.netProfitPreviousYear) * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  )}
                </div>
              </div>

              {/* EPS - Distinguishing Annual, TTM, Annualized */}
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.eps}>Earnings Per Share (EPS)</Tooltip>
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: funds.eps >= 0 ? 'var(--text-main)' : 'var(--color-bear)', marginTop: '0.2rem' }}>
                  {funds.eps >= 0 ? formatCurrency(funds.eps) : `NPR ${funds.eps.toFixed(2)} (Loss)`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Type: <strong>{funds.epsType || 'ANNUAL'}</strong>
                  {funds.epsTTM && <span> • TTM: NPR {funds.epsTTM.toFixed(2)}</span>}
                </div>
              </div>

              {/* ROE with labeled convention */}
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.roe}>Return on Equity (ROE)</Tooltip>
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {funds.roe.toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Basis: {funds.roeConvention || 'Net Profit / Total Equity'}
                </div>
              </div>

              {/* Non-financial: Debt & Interest Coverage */}
              {funds.debtToEquity !== undefined && funds.debtToEquity !== null && (
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Debt & Interest Coverage</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    D/E: {funds.debtToEquity.toFixed(2)}x
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Interest Coverage: {funds.interestCoverageRatio ? `${funds.interestCoverageRatio.toFixed(2)}x` : 'Not available'}
                  </div>
                </div>
              )}

              {/* Operating Cash Flow */}
              {funds.operatingCashFlow !== undefined && funds.operatingCashFlow !== null && (
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operating Cash Flow</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: funds.operatingCashFlow > 0 ? 'var(--color-bull)' : 'var(--color-bear)', marginTop: '0.2rem' }}>
                    {formatCurrency(funds.operatingCashFlow)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Cash generation from core operations
                  </div>
                </div>
              )}

              {/* Dividend Payout Ratio */}
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dividend Payout Ratio</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {funds.payoutRatio !== undefined && funds.payoutRatio !== null ? `${funds.payoutRatio.toFixed(1)}%` : 'Not available'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {funds.payoutRatioConvention || 'Total Dividends Distributed / Net Profit'}
                </div>
              </div>
            </div>

            {/* Disclosed One-Time Profit Notice */}
            {funds.oneTimeProfitDisclosed && (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#fbbf24', marginBottom: '1.25rem' }}>
                ℹ️ <strong>One-Time Profit Disclosed:</strong> {funds.oneTimeProfitDetails || 'Company disclosures note exceptional or non-recurring items affecting this reporting period. Do not project one-time gains forward.'}
              </div>
            )}

            {/* Quarterly YoY & Annual Historical Comparison Table */}
            {funds.quarterlyYoY && funds.quarterlyYoY.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  📊 Quarterly Results (Compared with Same Quarter of Previous Year)
                </h4>
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Quarter Period</th>
                        <th>Current Profit (NPR)</th>
                        <th>Previous Year (NPR)</th>
                        <th>YoY Change %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds.quarterlyYoY.map((q, idx) => (
                        <tr key={idx}>
                          <td><strong>{q.quarter}</strong></td>
                          <td>{formatCurrency(q.currentProfit)}</td>
                          <td>{formatCurrency(q.previousYearProfit)}</td>
                          <td style={{ fontWeight: 700, color: q.changePct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                            {q.changePct >= 0 ? `+${q.changePct.toFixed(2)}%` : `${q.changePct.toFixed(2)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dividend History Table */}
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                🎁 Dividend Track Record (Bonus Shares vs Cash Dividends)
              </h4>
              {funds.dividendHistory.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No dividend distributions declared in recent fiscal years.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Fiscal Year</th>
                        <th>Bonus Share %</th>
                        <th>Cash Dividend %</th>
                        <th>Total %</th>
                        <th>Book Closure Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds.dividendHistory.map((d, i) => (
                        <tr key={i}>
                          <td><strong>{d.fiscalYear}</strong></td>
                          <td className="text-bull">{d.bonusSharePercent.toFixed(2)}%</td>
                          <td>{d.cashDividendPercent.toFixed(2)}%</td>
                          <td style={{ fontWeight: 700 }}>
                            {(d.bonusSharePercent + d.cashDividendPercent).toFixed(2)}%
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {d.bookClosureDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: VALUATION */}
      <div className="card" id="section-valuation" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'ख. मूल्याङ्कन (Section B: Valuation)' : 'Section B: Valuation'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {lang === 'ne'
                ? 'सेयर मूल्य, P/E, P/B, नगद लाभांश प्रतिफल र समान क्षेत्रका समकक्षी कम्पनीहरूसँग तुलना।'
                : 'Current multiples, cash dividend yield, and peer-group benchmarks. Never assume low P/E equals value.'}
            </p>
          </div>
        </div>

        {/* 4 Core Valuation Metric Cards */}
        <div className="grid-4" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest Share Price (LTP)</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {formatCurrency(company.ltp)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Observed: {company.observedAtNPT || 'Latest session'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Tooltip content={t.tooltips.pe}>Price-to-Earnings (P/E)</Tooltip>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {funds && funds.eps > 0 ? `${funds.pe.toFixed(2)}x` : 'Not meaningful'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {funds && funds.eps <= 0 ? 'Negative earnings (losses)' : `Sector avg: ${peerComparison?.sectorAvgPe ? `${peerComparison.sectorAvgPe}x` : 'N/A'}`}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Tooltip content={t.tooltips.bookValue}>Book Value & P/B Ratio</Tooltip>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {funds ? `${funds.pb.toFixed(2)}x` : 'Not available'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              BVPS: {funds ? formatCurrency(funds.bookValue) : 'N/A'} • Sector avg: {peerComparison?.sectorAvgPb ? `${peerComparison.sectorAvgPb}x` : 'N/A'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cash Dividend Yield</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {funds?.cashDividendYield !== undefined && funds.cashDividendYield !== null ? `${funds.cashDividendYield.toFixed(2)}%` : 'Not available'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Pure cash yield (excludes bonus share dilution)
            </div>
          </div>
        </div>

        {/* Plain Language Metric & Nuance Explanation Box */}
        <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.82rem', lineHeight: '1.55' }}>
          <strong>💡 Plain-Language Valuation Rules:</strong>
          <ul style={{ margin: '0.35rem 0 0 1.1rem', padding: 0 }}>
            <li>
              <strong>P/E Caution:</strong> A low P/E ratio does not automatically make a company cheap. Cyclical companies often trade at low P/E multiples at the top of their earnings cycle, and companies facing permanent business declines can be “value traps.” When earnings are negative, P/E is mathematically not meaningful.
            </li>
            <li>
              <strong>Bonus Shares vs Cash:</strong> Bonus shares do not provide immediate economic cash to the shareholder; they capitalize accumulated reserves, split existing value across more shares, and dilute subsequent EPS. Only cash dividends represent immediate cash yields.
            </li>
          </ul>
        </div>

        {/* Peer Group Comparison Table */}
        {peerComparison && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                🏢 Peer Group Comparison ({peerComparison.peerGroup})
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Comparison Date: {peerComparison.comparisonDate}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {peerComparison.calculationBasis}
            </div>
            <div className="table-responsive">
              <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company Name</th>
                    <th>LTP (NPR)</th>
                    <th>P/E Ratio</th>
                    <th>P/B Ratio</th>
                    <th>ROE %</th>
                    <th>Cash Yield %</th>
                  </tr>
                </thead>
                <tbody>
                  {peerComparison.peers.map((p: any) => {
                    const isSelf = p.symbol === company.symbol;
                    return (
                      <tr key={p.symbol} style={{ background: isSelf ? 'rgba(0, 120, 215, 0.08)' : undefined }}>
                        <td>
                          <strong>{p.symbol}</strong> {isSelf && <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>THIS STOCK</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{p.name}</td>
                        <td><strong>{formatCurrency(p.ltp)}</strong></td>
                        <td style={{ fontWeight: 600 }}>{p.peDisplay}</td>
                        <td>{p.pb.toFixed(2)}x</td>
                        <td>{p.roe.toFixed(1)}%</td>
                        <td>{p.cashDividendYield.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                  {/* Sector Averages Row */}
                  <tr style={{ background: 'var(--bg-surface)', fontWeight: 700, borderTop: '2px solid var(--border-subtle)' }}>
                    <td colSpan={2}>Sector Average</td>
                    <td>—</td>
                    <td>{peerComparison.sectorAvgPe ? `${peerComparison.sectorAvgPe}x` : 'N/A'}</td>
                    <td>{peerComparison.sectorAvgPb}x</td>
                    <td>{peerComparison.sectorAvgRoe}%</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECTION C: PRICE & VOLUME */}
      <div className="card" id="section-price-volume" style={{ borderLeft: '4px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'ग. मूल्य तथा कारोबार परिमाण (Section C: Price & Volume)' : 'Section C: Price & Volume'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Historical candlestick series, daily turnover, 20-day liquidity depth, and volatility metrics.
            </p>
          </div>
        </div>

        {/* Interactive Stock Chart */}
        <div style={{ marginBottom: '1.25rem' }}>
          <StockChart
            candles={candles}
            symbol={company.symbol}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* Price & Volume Statistics Bar */}
        <div className="grid-4" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Price Range</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>
              {formatCurrency(company.high)} / {formatCurrency(company.low)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Prev Close: {formatCurrency(company.previousClose)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Volume & Turnover</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>
              {company.volume.toLocaleString()} kitta
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Turnover: {formatCurrency(company.turnover)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>20-Day Average Volume</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>
              {beforeYouBuy?.summary?.liquidity?.avgDailyVolume20D ? `${beforeYouBuy.summary.liquidity.avgDailyVolume20D.toLocaleString()} kitta` : 'Calculating...'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Avg Turnover: {beforeYouBuy?.summary?.liquidity?.avgDailyTurnover20D ? formatCurrency(beforeYouBuy.summary.liquidity.avgDailyTurnover20D) : 'N/A'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Volatility & Bid-Ask Status</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>
              {beforeYouBuy?.summary?.liquidity?.volatilityAnnualizedPct ? `${beforeYouBuy.summary.liquidity.volatilityAnnualizedPct}% annualized` : 'N/A'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Level 1 Feed: Top-of-book spread not supplied
            </div>
          </div>
        </div>

        {/* Recent Trend Narrative */}
        <div style={{ background: 'rgba(0, 120, 215, 0.04)', borderLeft: '3px solid var(--color-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
            📈 Price Trend Observation
          </div>
          <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: '1.5' }}>
            {trendSummary}
          </p>
        </div>

        {/* Technical Signals & Indicators */}
        {technical && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TechnicalSignalBadge
                  signal={technical.signal}
                  label={lang === 'ne' ? technical.signalLabelNe : technical.signalLabelEn}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {technical.intendedHoldingPeriodEn}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Analyzed at: {technical.analysisTimeNPT}
              </span>
            </div>

            {/* Expandable Advanced Technical Indicators */}
            <AdvancedAnalysis technical={technical} />
          </div>
        )}

        {/* Walk-forward Predictive Horizons */}
        <PredictiveOutlook
          predictions={predictions}
          onRefresh={() => loadCompanyData()}
        />
      </div>

      {/* SECTION D: ANNOUNCEMENTS */}
      <div className="card" id="section-announcements" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'घ. आधिकारिक सूचना तथा घोषणाहरू (Section D: Announcements)' : 'Section D: Verified Announcements'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Official company disclosures with verified dates and sources. Distinguishes proposed vs approved actions. Never inferred from price moves.
            </p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No verified announcements recorded in this observation window for {company.symbol}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {announcements.map(a => (
              <div
                key={a.id}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-slate" style={{ fontSize: '0.68rem' }}>{a.category}</span>
                    {a.status && (
                      <span className={`badge ${
                        a.status === 'PROPOSED' ? 'badge-amber' :
                        a.status === 'APPROVED' || a.status === 'COMPLETED' ? 'badge-emerald' : 'badge-slate'
                      }`} style={{ fontSize: '0.68rem' }}>
                        {a.status === 'PROPOSED' ? 'PROPOSED (Pending Approval)' : a.status}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Published: {a.date}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.92rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  {lang === 'ne' && a.titleNe ? a.titleNe : a.title}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '0.4rem', margin: 0 }}>
                  {lang === 'ne' && a.summaryNe ? a.summaryNe : a.summary}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Publisher: {a.publisher}</span>
                  <a
                    href={a.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                  >
                    View official disclosure ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION E: RISKS */}
      <div className="card" id="section-risks" style={{ borderLeft: '4px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'ङ. जोखिम विश्लेषण (Section E: Risks)' : 'Section E: Evidence-Backed Risks'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Identified concerns backed by balance sheet data, liquidity observations, or regulatory notices. Missing data is never treated as low risk.
            </p>
          </div>
          <span className={`badge ${risks.length >= 3 ? 'badge-rose' : risks.length > 0 ? 'badge-amber' : 'badge-emerald'}`}>
            {risks.length} Risk Flag{risks.length !== 1 ? 's' : ''} Observed
          </span>
        </div>

        {risks.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-bull)', fontSize: '0.88rem' }}>
            ✓ No acute regulatory, earnings decline, or balance-sheet stress warnings observed in verified reports.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {risks.map((r: any) => (
              <div
                key={r.id}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${r.severity === 'HIGH' ? 'var(--color-bear)' : 'var(--color-amber)'}`,
                  borderTop: '1px solid var(--border-subtle)',
                  borderRight: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${r.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                      {r.severity} PRIORITY
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Category: {r.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    As of: {r.reportingDate}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.92rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  {lang === 'ne' ? r.titleNe : r.titleEn}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                  {lang === 'ne' ? r.reasonNe : r.reasonEn}
                </p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Source: {r.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTOR-SPECIFIC ANALYSIS CARD */}
      <SectorAnalysisCard
        sectorMetrics={company.sectorMetrics || beforeYouBuy?.sectorMetrics}
        sectorName={sectorName}
      />

      {/* TRADE-PLANNING CALCULATOR */}
      <TradePlanningCalculator
        symbol={company.symbol}
        currentPrice={company.ltp}
      />

      {/* Modals */}
      <AddAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onSuccess={() => alert(`Alert set for ${company.symbol}!`)}
        symbol={company.symbol}
        currentLtp={company.ltp}
      />

      <AddTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => alert(`Transaction for ${company.symbol} recorded to your portfolio!`)}
        prefillSymbol={company.symbol}
      />
    </div>
  );
};
