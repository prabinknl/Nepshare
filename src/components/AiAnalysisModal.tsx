import React, { useState, useEffect } from 'react';
import { AiMarketAnalysisResult, CompanySummary, TechnicalSignalResult, PredictiveOutlookResult } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { TechnicalSignalBadge } from './TechnicalSignalBadge.js';
import { PredictAiCard } from './PredictAiCard.js';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string | null;
  onSelectCompany?: (symbol: string) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  initialSymbol,
  onSelectCompany
}) => {
  const { lang, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState<'market' | 'stock'>('market');
  const [marketAnalysis, setMarketAnalysis] = useState<AiMarketAnalysisResult | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>(initialSymbol || 'NABIL');
  const [stockTechnical, setStockTechnical] = useState<TechnicalSignalResult | null>(null);
  const [stockPredictions, setStockPredictions] = useState<PredictiveOutlookResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (initialSymbol) {
      setSelectedStock(initialSymbol.toUpperCase());
      setActiveTab('stock');
    }
  }, [initialSymbol]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [aiRes, compRes] = await Promise.all([
          api.getAiMarketAnalysis(),
          api.getCompanies()
        ]);
        setMarketAnalysis(aiRes);
        setCompanies(compRes);
      } catch (err) {
        console.error('Failed to load AI market analysis:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedStock) return;

    async function loadStockAnalysis() {
      setStockLoading(true);
      try {
        const [techRes, predRes] = await Promise.all([
          api.getTechnicalAnalysis(selectedStock),
          api.getPredictions(selectedStock)
        ]);
        setStockTechnical(techRes);
        setStockPredictions(predRes);
      } catch (err) {
        console.error('Failed to load stock AI analysis:', err);
      } finally {
        setStockLoading(false);
      }
    }

    loadStockAnalysis();
  }, [isOpen, selectedStock]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [aiRes, techRes, predRes] = await Promise.all([
        api.getAiMarketAnalysis(),
        api.getTechnicalAnalysis(selectedStock),
        api.getPredictions(selectedStock)
      ]);
      setMarketAnalysis(aiRes);
      setStockTechnical(techRes);
      setStockPredictions(predRes);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '820px', width: '95%', padding: '0', background: '#0e1524', border: '1px solid #38bdf8' }}
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f2a4a 0%, #0078d7 100%)',
          color: '#ffffff',
          padding: '1.1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>✨</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {lang === 'ne' ? 'नेप्से एआई बजार विश्लेषण' : 'NEPSE AI Market Intelligence'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                {lang === 'ne' ? 'प्रमाणित कारोबार तथ्याङ्कमा आधारित वस्तुनिष्ठ विश्लेषण' : 'Objective multi-factor analysis grounded in verified exchange data'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className={`btn-nepse-refresh ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              title="Re-run AI Analysis with fresh quotes"
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.3)' }}
            >
              <svg className="refresh-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>{isRefreshing ? (lang === 'ne' ? 'विश्लेषण हुँदै...' : 'Analyzing...') : (lang === 'ne' ? 'पुनः विश्लेषण' : 'Re-Analyze')}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: '#141e33', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setActiveTab('market')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              background: activeTab === 'market' ? '#1e2c47' : 'transparent',
              color: activeTab === 'market' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'market' ? '3px solid #38bdf8' : '3px solid transparent',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📊</span>
            <span>{lang === 'ne' ? 'समग्र बजार दृष्टिकोण' : 'Market-Wide AI Synthesis'}</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              background: activeTab === 'stock' ? '#1e2c47' : 'transparent',
              color: activeTab === 'stock' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'stock' ? '3px solid #38bdf8' : '3px solid transparent',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>🎯</span>
            <span>{lang === 'ne' ? 'कम्पनी विश्लेषण (Deep Dive)' : 'Stock Deep Dive Analyzer'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {isLoading && !marketAnalysis ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>{lang === 'ne' ? 'एआई विश्लेषण तयार हुँदैछ...' : 'Synthesizing market breadth & predictive models...'}</p>
            </div>
          ) : activeTab === 'market' && marketAnalysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Regime Banner */}
              <div style={{
                background: marketAnalysis.regime === 'BULLISH_EXPANSION'
                  ? 'rgba(0, 144, 50, 0.15)'
                  : marketAnalysis.regime === 'BEARISH_PRESSURE'
                  ? 'rgba(255, 51, 50, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${
                  marketAnalysis.regime === 'BULLISH_EXPANSION'
                    ? '#009032'
                    : marketAnalysis.regime === 'BEARISH_PRESSURE'
                    ? '#ff3332'
                    : '#f59e0b'
                }`,
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8' }}>
                    {lang === 'ne' ? 'वर्तमान बजार अवस्था' : 'Current Market Regime'}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                    {lang === 'ne' ? marketAnalysis.regimeLabelNe : marketAnalysis.regimeLabelEn}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lang === 'ne' ? 'नेप्से परिसूचक' : 'NEPSE Index'}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                    {marketAnalysis.pivots.nepseIndex.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Breadth & Pivots Grid */}
              <div className="grid-2" style={{ gap: '1rem' }}>
                {/* Market Breadth Box */}
                <div style={{ background: '#141e33', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    {lang === 'ne' ? 'बजार चौडाइ (Market Breadth)' : 'Market Breadth Distribution'}
                  </h4>
                  <div className="nepse-breadth-box" style={{ marginTop: '0', background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="nepse-breadth-item advancers">
                      <div className="nepse-breadth-title">{lang === 'ne' ? 'बढेका' : 'Advancing'}</div>
                      <div className="nepse-breadth-num">{marketAnalysis.breadth.advancers}</div>
                    </div>
                    <div className="nepse-breadth-item decliners">
                      <div className="nepse-breadth-title">{lang === 'ne' ? 'घटेका' : 'Declining'}</div>
                      <div className="nepse-breadth-num">{marketAnalysis.breadth.decliners}</div>
                    </div>
                    <div className="nepse-breadth-item unchanged">
                      <div className="nepse-breadth-title">{lang === 'ne' ? 'स्थिर' : 'Unchanged'}</div>
                      <div className="nepse-breadth-num">{marketAnalysis.breadth.unchanged}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.65rem', textAlign: 'center' }}>
                    {lang === 'ne' ? `अग्रगामी/घट्दो अनुपात (A/D Ratio): ${marketAnalysis.breadth.advanceDeclineRatio}` : `Advance / Decline Ratio: ${marketAnalysis.breadth.advanceDeclineRatio}`}
                  </div>
                </div>

                {/* Key Technical Pivots */}
                <div style={{ background: '#141e33', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    {lang === 'ne' ? 'प्राविधिक सिमाना (Index Pivots)' : 'Key Technical Index Pivots'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                      <span style={{ color: '#94a3b8' }}>{lang === 'ne' ? 'नजिकको प्रतिरोध (Resistance)' : 'Overhead Resistance'}:</span>
                      <strong style={{ color: '#ff3332' }}>{marketAnalysis.pivots.immediateResistance.toFixed(1)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                      <span style={{ color: '#94a3b8' }}>{lang === 'ne' ? 'नजिकको समर्थन (Support)' : 'Immediate Support'}:</span>
                      <strong style={{ color: '#009032' }}>{marketAnalysis.pivots.immediateSupport.toFixed(1)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                      <span style={{ color: '#94a3b8' }}>{lang === 'ne' ? 'दैनिक उतारचढाव (Daily Vol)' : 'Est. Daily Volatility'}:</span>
                      <span style={{ color: '#ffffff' }}>±{marketAnalysis.pivots.dailyVolatilityPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Narrative Commentary */}
              <div style={{ background: '#141e33', padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #0078d7' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>🤖</span>
                  <span>{lang === 'ne' ? 'एआई बजार संश्लेषण' : 'AI Market Synthesis'}</span>
                </h4>
                <p style={{ fontSize: '0.92rem', lineHeight: '1.65', color: '#f8fafc' }}>
                  {lang === 'ne' ? marketAnalysis.aiSynthesisNe : marketAnalysis.aiSynthesisEn}
                </p>

                <h4 style={{ fontSize: '0.88rem', color: '#75b6e9', marginTop: '1rem', marginBottom: '0.35rem' }}>
                  {lang === 'ne' ? 'समूहगत पुँजी प्रवाह (Sector Rotation)' : 'Sector Liquidity Rotation'}
                </h4>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#cbd5e1' }}>
                  {lang === 'ne' ? marketAnalysis.sectorRotationNe : marketAnalysis.sectorRotationEn}
                </p>
              </div>

              {/* Actionable Risk Alerts */}
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                <h4 style={{ fontSize: '0.88rem', color: '#fb7185', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>⚠️</span>
                  <span>{lang === 'ne' ? 'जोखिम तथा सतर्कता' : 'Risk Considerations & Vigilance'}</span>
                </h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.84rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                  {(lang === 'ne' ? marketAnalysis.keyRisksNe : marketAnalysis.keyRisksEn).map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* Stock Deep Dive Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Company Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>
                  {lang === 'ne' ? 'कम्पनी छान्नुहोस्:' : 'Select Company:'}
                </label>
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  style={{
                    background: '#141e33',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                  }}
                >
                  {companies.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name} ({formatCurrency(c.ltp)})
                    </option>
                  ))}
                </select>

                {onSelectCompany && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onSelectCompany(selectedStock);
                      onClose();
                    }}
                  >
                    {lang === 'ne' ? 'विस्तृत पृष्ठ खोल्नुहोस् →' : 'View Full Profile →'}
                  </button>
                )}
              </div>

              {/* Combined Predict AI Analysis Decision Engine */}
              <PredictAiCard
                symbol={selectedStock}
                onSelectCompany={onSelectCompany}
                availableCompanies={companies}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
