import React, { useState, useEffect, useRef } from 'react';
import {
  PredictAiDecisionResult,
  TimeframeSessions,
  HoldingContext,
  CompanySummary
} from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';

interface PredictAiCardProps {
  symbol: string;
  initialTimeframe?: TimeframeSessions;
  initialHoldingContext?: HoldingContext;
  onSelectCompany?: (symbol: string) => void;
  availableCompanies?: CompanySummary[];
  isCompact?: boolean;
}

export const PredictAiCard: React.FC<PredictAiCardProps> = ({
  symbol,
  initialTimeframe = 10,
  initialHoldingContext,
  onSelectCompany,
  availableCompanies = [],
  isCompact = false
}) => {
  const { lang, formatCurrency } = useLanguage();
  const { user } = useAuth();

  const [timeframe, setTimeframe] = useState<TimeframeSessions>(initialTimeframe);
  const [holdingContext, setHoldingContext] = useState<HoldingContext>(initialHoldingContext || 'PLANNING_TO_BUY');
  const [hasUserToggledHolding, setHasUserToggledHolding] = useState<boolean>(Boolean(initialHoldingContext));

  const [data, setData] = useState<PredictAiDecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Expandable Indicator Breakdown state
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trend' | 'momentum' | 'volume' | 'volatility' | 'structure' | 'market' | 'financial'>('trend');

  // Anti-race condition reference
  const currentSymbolRef = useRef<string>(symbol);

  // Auto-detect portfolio holding if user is logged in
  useEffect(() => {
    let isMounted = true;
    currentSymbolRef.current = symbol;

    async function checkPortfolioAndLoad() {
      setIsLoading(true);
      setError(null);

      let contextToUse = holdingContext;

      if (!hasUserToggledHolding && user) {
        try {
          const portfolio = await api.getPortfolioSummary();
          if (isMounted && portfolio && portfolio.holdings) {
            const holding = portfolio.holdings.find(
              (h: any) => h.symbol.toUpperCase() === symbol.toUpperCase() && h.totalQuantity > 0
            );
            if (holding) {
              contextToUse = 'ALREADY_HOLDING';
              setHoldingContext('ALREADY_HOLDING');
            } else {
              contextToUse = 'PLANNING_TO_BUY';
              setHoldingContext('PLANNING_TO_BUY');
            }
          }
        } catch {
          // If portfolio fetch fails, continue with default context
        }
      }

      try {
        const res = await api.getPredictAiAnalysis(symbol, timeframe, contextToUse);
        if (isMounted && currentSymbolRef.current === symbol) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted && currentSymbolRef.current === symbol) {
          setError(err.message || 'Failed to generate Predict AI Analysis.');
        }
      } finally {
        if (isMounted && currentSymbolRef.current === symbol) {
          setIsLoading(false);
        }
      }
    }

    checkPortfolioAndLoad();

    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe, holdingContext, user, hasUserToggledHolding]);

  const handleTimeframeChange = (tf: TimeframeSessions) => {
    setTimeframe(tf);
  };

  const handleHoldingContextChange = (ctx: HoldingContext) => {
    setHasUserToggledHolding(true);
    setHoldingContext(ctx);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await api.getPredictAiAnalysis(symbol, timeframe, holdingContext, true);
      if (currentSymbolRef.current === symbol) {
        setData(res);
      }
    } catch (err: any) {
      if (currentSymbolRef.current === symbol) {
        setError(err.message || 'Refresh failed.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper color for score
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 50) return '#38bdf8'; // Blue
    if (score >= 40) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  // Badge class name
  const getBadgeClassName = (action: string) => {
    switch (action) {
      case 'BUY': return 'predict-ai-badge-buy';
      case 'WAIT': return 'predict-ai-badge-wait';
      case 'HOLD': return 'predict-ai-badge-hold';
      case 'CONSIDER_SELLING': return 'predict-ai-badge-sell';
      default: return 'predict-ai-badge-slate';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="predict-ai-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spinIcon 1.5s linear infinite' }}>⚙️</div>
        <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginBottom: '0.35rem' }}>
          {lang === 'ne' ? `${symbol} को एआई निर्णय विश्लेषण गणना हुँदैछ...` : `Evaluating Predict AI Decision for ${symbol}...`}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {lang === 'ne'
            ? '७ प्राविधिक तथा वित्तीय सूचकहरू, तरलता, सपोर्ट/प्रतिरोध र समूहगत तुलना एकीकृत गरिँदै...'
            : 'Synthesizing trend, momentum, liquidity participation, support/resistance & sector health...'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="predict-ai-card" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fb7185', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {lang === 'ne' ? 'विश्लेषण लोड गर्न सकिएन' : 'Analysis Unavailable'}
          </h3>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          {error || 'Unable to retrieve verified analytics for this symbol.'}
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleRefresh}>
          🔄 {lang === 'ne' ? 'पुनः प्रयास गर्नुहोस्' : 'Retry Analysis'}
        </button>
      </div>
    );
  }

  return (
    <div className="predict-ai-card" id="predict-ai-section">
      {/* 1. Header with Controls: Company Switcher, Timeframe & Holding Context */}
      <div className="predict-ai-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem' }}>✨</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {lang === 'ne' ? 'प्रिडिक्ट एआई निर्णय विश्लेषण' : 'Predict AI Decision Engine'}
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              {data.methodologyVersion}
            </span>
            <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>
              {lang === 'ne' ? 'प्रयोगात्मक' : 'Experimental'}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {data.companyName} ({data.symbol}) • {data.sector} • LTP {formatCurrency(data.currentLtp)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Refresh button */}
          <button
            className={`btn-nepse-refresh ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            title="Recalculate with fresh quotes"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          >
            <svg className="refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>{isRefreshing ? (lang === 'ne' ? 'अपडेट हुँदै...' : 'Recalculating...') : (lang === 'ne' ? 'रिफ्रेस' : 'Recalculate')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Interactive Selectors: Timeframe & Holding Context */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#141e33',
        padding: '0.85rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Holding Context Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {lang === 'ne' ? 'लगानीकर्ता अवस्था:' : 'Holding Context:'}
          </span>
          <div className="predict-ai-toggle-group">
            <button
              className={`predict-ai-toggle-btn ${holdingContext === 'PLANNING_TO_BUY' ? 'active' : ''}`}
              onClick={() => handleHoldingContextChange('PLANNING_TO_BUY')}
            >
              <span>🛒</span>
              <span>{lang === 'ne' ? 'खरिद योजना (Planning to buy)' : 'Planning to buy'}</span>
            </button>
            <button
              className={`predict-ai-toggle-btn ${holdingContext === 'ALREADY_HOLDING' ? 'active' : ''}`}
              onClick={() => handleHoldingContextChange('ALREADY_HOLDING')}
            >
              <span>💼</span>
              <span>{lang === 'ne' ? 'स्वामित्वमा (Already holding)' : 'Already holding'}</span>
            </button>
          </div>
          {data.userHoldingDetected && (
            <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }} title="Detected in your recorded transactions">
              ✓ {lang === 'ne' ? 'पोर्टफोलियोबाट पहिचान' : 'Portfolio Detected'}
            </span>
          )}
        </div>

        {/* Timeframe Selector (5, 10, 20 sessions) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {lang === 'ne' ? 'समयसीमा:' : 'Horizon Timeframe:'}
          </span>
          <div className="predict-ai-toggle-group">
            <button
              className={`predict-ai-toggle-btn ${timeframe === 5 ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(5)}
            >
              5 {lang === 'ne' ? 'दिन' : 'Sessions'}
            </button>
            <button
              className={`predict-ai-toggle-btn ${timeframe === 10 ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(10)}
            >
              10 {lang === 'ne' ? 'दिन (Default)' : 'Sessions (Default)'}
            </button>
            <button
              className={`predict-ai-toggle-btn ${timeframe === 20 ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(20)}
            >
              20 {lang === 'ne' ? 'दिन' : 'Sessions'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Primary Decision Hero: Big Badge, Score & Additional Investment */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 30, 51, 0.95) 0%, rgba(14, 21, 36, 0.95) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        {/* Left: Prominent Decision Badge & Context Tag */}
        <div>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
            {lang === 'ne' ? 'सिफारिस गरिएको निर्णय (Action Decision)' : 'Synthesized Action Decision'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div className={`predict-ai-badge ${getBadgeClassName(data.action)}`}>
              <span>{data.badgeIcon}</span>
              <span>{lang === 'ne' ? data.actionLabelNe : data.actionLabelEn}</span>
            </div>

            {/* Context meta beside result */}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div><strong>{data.symbol}</strong> • {timeframe} Trading Sessions</div>
              <div style={{ color: 'var(--text-muted)' }}>
                {holdingContext === 'PLANNING_TO_BUY'
                  ? (lang === 'ne' ? 'खरिद योजनाकारका लागि' : 'Context: Planning to buy')
                  : (lang === 'ne' ? 'अवस्थित लगानीकर्ताका लागि' : 'Context: Already holding')}
              </div>
            </div>
          </div>

          {/* For existing holders: Additional Investment field */}
          {holdingContext === 'ALREADY_HOLDING' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {lang === 'ne' ? 'थप लगानी सम्भावना:' : 'Additional Investment:'}
              </span>
              <span className={`badge ${data.additionalInvestmentAction === 'BUY' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontWeight: 700 }}>
                {data.additionalInvestmentAction === 'BUY' ? '🟢 BUY (खरिद योग्य)' : '🟡 WAIT (थप खरिदमा प्रतीक्षा)'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Opportunity Score Meter */}
        <div style={{ minWidth: '220px', flex: 1, maxWidth: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {lang === 'ne' ? 'अवसर स्कोर (Opportunity Score)' : 'Opportunity Score'}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: getScoreColor(data.opportunityScore) }}>
              {data.opportunityScore}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/100</span>
            </span>
          </div>

          <div className="predict-ai-score-bar-bg">
            <div
              className="predict-ai-score-bar-fill"
              style={{
                width: `${data.opportunityScore}%`,
                background: `linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #10b981 100%)`
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            <span>0 (Sell Barrier)</span>
            <span style={{ color: getScoreColor(data.opportunityScore), fontWeight: 700 }}>{data.scoreGrade}</span>
            <span>70 (Buy Barrier)</span>
            <span>100</span>
          </div>
        </div>

        {/* Right: Separate Risk Assessment Badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
            {lang === 'ne' ? 'अलग जोखिम मूल्याङ्कन' : 'Separate Risk Assessment'}
          </div>
          <span className={`badge ${
            data.riskAssessment.level === 'LOW' ? 'badge-emerald' :
            data.riskAssessment.level === 'MODERATE' ? 'badge-amber' :
            data.riskAssessment.level === 'HIGH' ? 'badge-rose' : 'badge-rose'
          }`} style={{ fontSize: '0.84rem', padding: '0.35rem 0.8rem' }}>
            {data.riskAssessment.level === 'LOW' ? '🛡️ Low Risk' :
             data.riskAssessment.level === 'MODERATE' ? '⚠️ Moderate Risk' :
             data.riskAssessment.level === 'HIGH' ? '🚨 High Risk' : '🛑 Critical Risk'}
          </span>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {data.riskAssessment.materialRiskCount > 0
              ? `${data.riskAssessment.materialRiskCount} ${lang === 'ne' ? 'गम्भीर जोखिम पहिचान' : 'Material Risk Flag(s)'}`
              : (lang === 'ne' ? 'कुनै गम्भीर जोखिम छैन' : 'No Critical Flags')}
          </div>
        </div>
      </div>

      {/* 4. Three Main Reasons & Key Risks Grid */}
      <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Three Main Reasons Card */}
        <div style={{ background: '#141e33', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h4 style={{ fontSize: '0.88rem', color: '#38bdf8', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📌</span>
            <span>{lang === 'ne' ? 'मुख्य ३ आधारहरू (3 Main Reasons)' : '3 Primary Rationale Drivers'}</span>
          </h4>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            {(lang === 'ne' ? data.threeMainReasonsNe : data.threeMainReasonsEn).map((reason, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Main Downside Risks Card */}
        <div style={{ background: 'rgba(244, 63, 94, 0.06)', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
          <h4 style={{ fontSize: '0.88rem', color: '#fb7185', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⚠️</span>
            <span>{lang === 'ne' ? 'मुख्य जोखिम तथा सतर्कता (Main Risks)' : 'Key Downside & Volatility Risks'}</span>
          </h4>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.84rem', color: '#e2e8f0', lineHeight: '1.6' }}>
            {(lang === 'ne' ? data.mainRisksNe : data.mainRisksEn).map((risk, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                {risk}
              </li>
            ))}
          </ul>
          {data.liquidityConstraintNoteEn && (
            <div style={{ marginTop: '0.65rem', padding: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', borderRadius: 'var(--radius-xs)', fontSize: '0.78rem', color: '#fecdd3' }}>
              ℹ️ {lang === 'ne' ? data.liquidityConstraintNoteNe : data.liquidityConstraintNoteEn}
            </div>
          )}
        </div>
      </div>

      {/* 5. Conditions That Would Change The Result */}
      <div style={{
        background: '#141e33',
        padding: '1rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <h4 style={{ fontSize: '0.88rem', color: '#a78bfa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🔄</span>
          <span>{lang === 'ne' ? 'निर्णय परिवर्तन हुने सर्तहरू (Conditions to Change Result)' : 'Conditions That Would Change The Result'}</span>
        </h4>
        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.83rem', color: '#cbd5e1', lineHeight: '1.55' }}>
          {(lang === 'ne' ? data.conditionsToChangeNe : data.conditionsToChangeEn).map((cond, idx) => (
            <li key={idx} style={{ marginBottom: '0.25rem' }}>
              {cond}
            </li>
          ))}
        </ul>
      </div>

      {/* 6. Expandable Indicator Breakdown Accordion Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <span>📊</span>
            <span>{lang === 'ne' ? '७ वटा सूचकहरूको विस्तृत विश्लेषण (Expandable Indicator Breakdown)' : 'Expandable Indicator Breakdown (7 Verified Dimensions)'}</span>
          </span>
          <span>{isBreakdownOpen ? '▲ Hide' : '▼ View Breakdown'}</span>
        </button>

        {/* Indicator Breakdown Body */}
        {isBreakdownOpen && data.breakdown && (
          <div style={{ marginTop: '0.85rem', background: '#0e1524', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Dimension Selection Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'trend' ? 'active' : ''}`}
                onClick={() => setActiveTab('trend')}
              >
                1. Trend (25%)
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'momentum' ? 'active' : ''}`}
                onClick={() => setActiveTab('momentum')}
              >
                2. Momentum (20%)
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'volume' ? 'active' : ''}`}
                onClick={() => setActiveTab('volume')}
              >
                3. Volume (15%)
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'volatility' ? 'active' : ''}`}
                onClick={() => setActiveTab('volatility')}
              >
                4. Volatility Risk
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'structure' ? 'active' : ''}`}
                onClick={() => setActiveTab('structure')}
              >
                5. Price Structure (10%)
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'market' ? 'active' : ''}`}
                onClick={() => setActiveTab('market')}
              >
                6. Market/Sector (15%)
              </button>
              <button
                className={`predict-ai-indicator-tab ${activeTab === 'financial' ? 'active' : ''}`}
                onClick={() => setActiveTab('financial')}
              >
                7. Financial Health (15%)
              </button>
            </div>

            {/* Tab 1: Trend */}
            {activeTab === 'trend' && data.breakdown.trend && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Trend Component (Weight: 25%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.trend.score}/100</span>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EMA 20 & EMA 50</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      NPR {data.breakdown.trend.ema20 || 'N/A'} / {data.breakdown.trend.ema50 || 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>20-EMA Slope ({timeframe} sessions)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: data.breakdown.trend.ema20SlopePct >= 0 ? '#4ade80' : '#fb7185' }}>
                      {data.breakdown.trend.ema20SlopePct >= 0 ? `+${data.breakdown.trend.ema20SlopePct}%` : `${data.breakdown.trend.ema20SlopePct}%`}
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Trend Persistence</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {data.breakdown.trend.trendPersistenceSessions}/{timeframe} sessions ({data.breakdown.trend.persistenceRatioPct}%)
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {lang === 'ne' ? data.breakdown.trend.positionLabelNe : data.breakdown.trend.positionLabelEn}
                </div>
              </div>
            )}

            {/* Tab 2: Momentum */}
            {activeTab === 'momentum' && data.breakdown.momentum && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Momentum Component (Weight: 20%, split RSI 10% & MACD 10%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.momentum.score}/100</span>
                </div>
                <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RSI(14) Level & Slope</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{data.breakdown.momentum.rsi14 || 'N/A'}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {lang === 'ne' ? data.breakdown.momentum.rsiAssessmentNe : data.breakdown.momentum.rsiAssessmentEn}
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MACD (12, 26, 9) Histogram</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      Hist: {data.breakdown.momentum.macd?.histogram || 0}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {lang === 'ne' ? data.breakdown.momentum.macd?.stateLabelNe : data.breakdown.momentum.macd?.stateLabelEn}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  * Non-overlapping limiter enforced: moving averages and MACD do not count as independent confirmations.
                </div>
              </div>
            )}

            {/* Tab 3: Volume & Liquidity */}
            {activeTab === 'volume' && data.breakdown.volumeLiquidity && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Volume & Liquidity Component (Weight: 15%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.volumeLiquidity.score}/100</span>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Volume vs 20D Avg</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{data.breakdown.volumeLiquidity.volumeRatio}x</div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>20-Day Avg Turnover</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      NPR {(data.breakdown.volumeLiquidity.avgDailyTurnover20D / 1e7).toFixed(2)} Cr
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Zero Volume Days (20D)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: data.breakdown.volumeLiquidity.zeroVolumeSessionsCount > 0 ? '#fb7185' : '#4ade80' }}>
                      {data.breakdown.volumeLiquidity.zeroVolumeSessionsCount}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                  {lang === 'ne' ? data.breakdown.volumeLiquidity.participationLabelNe : data.breakdown.volumeLiquidity.participationLabelEn}
                </div>
              </div>
            )}

            {/* Tab 4: Volatility & Downside Risk */}
            {activeTab === 'volatility' && data.breakdown.volatilityRisk && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Volatility & Downside Risk Assessment</h4>
                  <span className={`badge ${data.breakdown.volatilityRisk.volatilityRiskLevel === 'LOW' ? 'badge-emerald' : 'badge-amber'}`}>
                    {data.breakdown.volatilityRisk.volatilityRiskLevel}
                  </span>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ATR (14) % of Price</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{data.breakdown.volatilityRisk.atrPctOfPrice}%</div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Drawdown from 20D High</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fb7185' }}>{data.breakdown.volatilityRisk.recentDrawdownPct}%</div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Abnormal / Circuit Moves</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{data.breakdown.volatilityRisk.largeMovementsCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  * Used strictly for risk checks and downside buffer estimation; volatility alone does not determine directional score.
                </div>
              </div>
            )}

            {/* Tab 5: Price Structure */}
            {activeTab === 'structure' && data.breakdown.priceStructure && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Price Structure & S/R (Weight: 10%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.priceStructure.score}/100</span>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Confirmed Support</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4ade80' }}>
                      NPR {data.breakdown.priceStructure.supportLevel} (-{data.breakdown.priceStructure.distanceToSupportPct}%)
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Confirmed Resistance</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fb7185' }}>
                      NPR {data.breakdown.priceStructure.resistanceLevel} (+{data.breakdown.priceStructure.distanceToResistancePct}%)
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reward-to-Risk Ratio</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{data.breakdown.priceStructure.rewardToRiskRatio}x</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                  {lang === 'ne' ? data.breakdown.priceStructure.statusLabelNe : data.breakdown.priceStructure.statusLabelEn}
                </div>
              </div>
            )}

            {/* Tab 6: Market & Sector */}
            {activeTab === 'market' && data.breakdown.marketSector && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Market & Sector Relative Strength (Weight: 15%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.marketSector.score}/100</span>
                </div>
                <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Performance vs NEPSE ({timeframe} sessions)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: data.breakdown.marketSector.alphaVsNepsePct >= 0 ? '#4ade80' : '#fb7185' }}>
                      Alpha: {data.breakdown.marketSector.alphaVsNepsePct >= 0 ? `+${data.breakdown.marketSector.alphaVsNepsePct}%` : `${data.breakdown.marketSector.alphaVsNepsePct}%`}
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Performance vs Sector ({timeframe} sessions)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: data.breakdown.marketSector.alphaVsSectorPct >= 0 ? '#4ade80' : '#fb7185' }}>
                      Alpha: {data.breakdown.marketSector.alphaVsSectorPct >= 0 ? `+${data.breakdown.marketSector.alphaVsSectorPct}%` : `${data.breakdown.marketSector.alphaVsSectorPct}%`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                  NEPSE Trend: {data.breakdown.marketSector.nepseTrend} • Sector Rotation: {data.breakdown.marketSector.sectorTrend}
                </div>
              </div>
            )}

            {/* Tab 7: Financial Health */}
            {activeTab === 'financial' && data.breakdown.financialHealth && (
              <div className="predict-ai-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#38bdf8' }}>Financial Health & Fundamentals (Weight: 15%)</h4>
                  <span className="badge badge-primary">Score: {data.breakdown.financialHealth.score}/100</span>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EPS & Loss Status</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: data.breakdown.financialHealth.isLossMaking ? '#fb7185' : '#4ade80' }}>
                      {data.breakdown.financialHealth.eps !== null ? `NPR ${data.breakdown.financialHealth.eps.toFixed(2)}` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>P/E vs Sector Peer Benchmark</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      {data.breakdown.financialHealth.companyPe ? `${data.breakdown.financialHealth.companyPe.toFixed(1)}x` : 'N/A'} (Sector ~{data.breakdown.financialHealth.sectorAvgPe || 20}x)
                    </div>
                  </div>
                  <div style={{ background: '#0e1524', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reporting Period & Audit</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {data.breakdown.financialHealth.reportingPeriod} ({data.breakdown.financialHealth.auditStatus})
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                  {lang === 'ne' ? data.breakdown.financialHealth.peComparisonNoteNe : data.breakdown.financialHealth.peComparisonNoteEn}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Walk-Forward Chronological Backtest Summary */}
      {data.backtest && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                {lang === 'ne' ? 'ऐतिहासिक वाक-फर्वार्ड परीक्षण (Chronological Backtest)' : 'Chronological Walk-Forward Backtest'}
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>EXPERIMENTAL</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {lang === 'ne' ? data.backtest.notesNe : data.backtest.notesEn}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Win Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>{data.backtest.winRatePct}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Model Net Return</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: data.backtest.strategyReturnNetPct >= 0 ? '#4ade80' : '#fb7185' }}>
                {data.backtest.strategyReturnNetPct >= 0 ? `+${data.backtest.strategyReturnNetPct}%` : `${data.backtest.strategyReturnNetPct}%`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Buy & Hold Net</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {data.backtest.benchmarkBuyAndHoldReturnPct >= 0 ? `+${data.backtest.benchmarkBuyAndHoldReturnPct}%` : `${data.backtest.benchmarkBuyAndHoldReturnPct}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Sources & Kathmandu Timestamps */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div>
          <span>Data observed: <strong>{data.dataObservedAtNPT}</strong> (Asia/Kathmandu)</span>
          <span> • Source: {data.dataSourceTier}</span>
        </div>
        <div>
          <span>Filing Period: {data.sources.reportingPeriod} ({data.sources.auditStatus})</span>
        </div>
      </div>

      {/* 9. Prominent Analytical Disclaimer */}
      <div style={{
        marginTop: '0.75rem',
        padding: '0.65rem 0.85rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--radius-xs)',
        fontSize: '0.74rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        {lang === 'ne' ? data.disclaimerNe : data.disclaimerEn}
      </div>
    </div>
  );
};
