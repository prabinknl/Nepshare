import React, { useState, useEffect } from 'react';
import { MarketSummary, TopMovers, Announcement, MarketNews, CompanySummary } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';

interface HomeViewProps {
  onSelectCompany: (symbol: string) => void;
  onExploreSector?: (sector: string) => void;
  onOpenAiAnalysis?: (symbol?: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectCompany,
  onExploreSector,
  onOpenAiAnalysis,
  onRefresh,
  isRefreshing
}) => {
  const { lang, t, formatCurrency } = useLanguage();
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [movers, setMovers] = useState<TopMovers | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);
  
  // Widget tab states matching NEPSE
  const [moverTab, setMoverTab] = useState<'gainers' | 'losers'>('gainers');
  const [activityTab, setActivityTab] = useState<'turnover' | 'volume'>('turnover');
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'todaysPrice'>('overview');
  
  // Filter for Today's Price
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);

  const loadHomeData = async () => {
    try {
      const [sumRes, movRes, compRes, annRes, newsRes] = await Promise.all([
        api.getMarketSummary(),
        api.getTopMovers(),
        api.getCompanies(),
        api.getAnnouncements(),
        api.getMarketNews()
      ]);
      setSummary(sumRes);
      setMovers(movRes);
      setCompanies(compRes);
      setAnnouncements(annRes);
      setNews(newsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const handleManualRefresh = () => {
    if (onRefresh) onRefresh();
    loadHomeData();
  };

  if (isLoading && !summary) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--nepse-blue)' }}>
          🇳🇵 Connecting to NEPSE Market Data Stream...
        </div>
        <p style={{ fontSize: '0.88rem' }}>Loading verified market summary, active scrips, and breadth indicators</p>
      </div>
    );
  }

  // Calculate Market Breadth
  let advancersCount = 0;
  let declinersCount = 0;
  let unchangedCount = 0;

  companies.forEach((c) => {
    if (c.change > 0) advancersCount++;
    else if (c.change < 0) declinersCount++;
    else unchangedCount++;
  });

  const isUp = summary ? summary.pointChange >= 0 : true;
  const isMarketOpen = summary?.session.status === 'OPEN';

  // Filtered list for Today's Price table
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch = c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || c.sector.toLowerCase() === selectedSector.toLowerCase();
    return matchesSearch && matchesSector;
  });

  // Extract distinct sectors
  const sectors = ['ALL', ...Array.from(new Set(companies.map((c) => c.sector)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* View Switcher: NEPSE Dashboard Overview vs Today's Price */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', background: '#ffffff', padding: '0 1rem', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveMainTab('overview')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeMainTab === 'overview' ? '3px solid #0078d7' : '3px solid transparent',
              color: activeMainTab === 'overview' ? '#0078d7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer'
            }}
          >
            📊 {lang === 'ne' ? 'बजार अवलोकन (Market Overview)' : 'Market Overview'}
          </button>

          <button
            onClick={() => setActiveMainTab('todaysPrice')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeMainTab === 'todaysPrice' ? '3px solid #0078d7' : '3px solid transparent',
              color: activeMainTab === 'todaysPrice' ? '#0078d7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer'
            }}
          >
            📋 {lang === 'ne' ? 'आजको मूल्य (Today’s Price / Live Market)' : 'Today’s Price / Live Market'} ({companies.length})
          </button>
        </div>

        {/* Action Button Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {onOpenAiAnalysis && (
            <button
              className="btn-ai-glow"
              onClick={() => onOpenAiAnalysis()}
              title="Launch NEPSE AI Intelligence"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            >
              <span>✨</span>
              <span>{lang === 'ne' ? 'एआई विश्लेषण' : 'AI Analysis'}</span>
            </button>
          )}

          <button
            className={`btn-nepse-refresh ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleManualRefresh}
            title="Refresh quotes"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            <svg className="refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>{lang === 'ne' ? 'रिफ्रेस' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {activeMainTab === 'overview' ? (
        <>
          {/* 1. Hero Section: NEPSE Index Card (Left) & AI Market Summary (Right) */}
          <div className="grid-2" style={{ gap: '1.25rem' }}>
            {/* Left: Authentic NEPSE Index Card */}
            {summary && (
              <div className="card" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d2238' }}>
                      {lang === 'ne' ? 'नेप्से परिसूचक' : 'NEPSE Index'}
                    </h3>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isMarketOpen ? '#009032' : '#fe6767',
                        color: '#ffffff'
                      }}
                    >
                      {isMarketOpen ? (lang === 'ne' ? 'बजार खुला' : 'MARKET OPEN') : (lang === 'ne' ? 'बजार बन्द' : 'MARKET CLOSED')}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {summary.dataSource.observedAtNPT || summary.session.currentTimeNPT}
                  </span>
                </div>

                {/* Big Index Value & Movement */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0d2238', letterSpacing: '-0.02em' }}>
                    {summary.nepseIndex.toFixed(2)}
                  </div>
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: isUp ? '#009032' : '#ff3332',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>{isUp ? '▲ +' : '▼ '}{summary.pointChange.toFixed(2)}</span>
                    <span>({isUp ? '+' : ''}{summary.percentChange.toFixed(2)}%)</span>
                  </div>
                </div>

                {/* Intraday Index Trajectory Area Curve */}
                <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <svg width="100%" height="80" viewBox="0 0 400 80" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="indexGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isUp ? '#009032' : '#ff3332'} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={isUp ? '#009032' : '#ff3332'} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 50 Q 80 40, 140 45 T 240 30 T 320 35 T 400 20 L 400 80 L 0 80 Z"
                      fill="url(#indexGrad)"
                    />
                    <path
                      d="M 0 50 Q 80 40, 140 45 T 240 30 T 320 35 T 400 20"
                      fill="none"
                      stroke={isUp ? '#009032' : '#ff3332'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Key Summary Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>{lang === 'ne' ? 'कुल कारोबार:' : 'Turnover:'} </span>
                    <strong style={{ color: '#0d2238' }}>{formatCurrency(summary.totalTurnover)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>{lang === 'ne' ? 'कित्ता:' : 'Shares:'} </span>
                    <strong style={{ color: '#0d2238' }}>{summary.totalSharesTraded.toLocaleString()}</strong>
                  </div>
                </div>

                {/* NEPSE Official 3-Way Breadth Indicator Box */}
                <div className="nepse-breadth-box">
                  <div className="nepse-breadth-item advancers">
                    <div className="nepse-breadth-title">{lang === 'ne' ? 'बढेका' : 'ADVANCED'}</div>
                    <div className="nepse-breadth-num">{advancersCount}</div>
                  </div>
                  <div className="nepse-breadth-item decliners">
                    <div className="nepse-breadth-title">{lang === 'ne' ? 'घटेका' : 'DECLINED'}</div>
                    <div className="nepse-breadth-num">{declinersCount}</div>
                  </div>
                  <div className="nepse-breadth-item unchanged">
                    <div className="nepse-breadth-title">{lang === 'ne' ? 'स्थिर' : 'UNCHANGED'}</div>
                    <div className="nepse-breadth-num">{unchangedCount}</div>
                  </div>
                </div>

                {/* Buttons Row */}
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {onOpenAiAnalysis && (
                    <button
                      className="btn-ai-glow"
                      onClick={() => onOpenAiAnalysis()}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <span>✨</span>
                      <span>{lang === 'ne' ? 'एआई बजार विश्लेषण' : 'AI Market Analysis'}</span>
                    </button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveMainTab('todaysPrice')}
                    style={{ background: '#f1f5f9', color: '#0f172a', borderColor: '#cbd5e1' }}
                  >
                    📋 {lang === 'ne' ? 'आजको मूल्य तालिका' : 'View Today’s Price'}
                  </button>
                </div>
              </div>
            )}

            {/* Right: AI Market Summary & Disclosures */}
            <div className="card" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🤖</span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d2238', margin: 0 }}>
                      {lang === 'ne' ? 'दैनिक बजार समीक्षा' : 'AI Market Synthesis'}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {summary?.dataSource.providerName || 'NEPSE Verified Data'}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', lineHeight: '1.65', color: '#334155', marginBottom: '1rem' }}>
                  {summary ? (lang === 'ne' ? summary.plainLanguageSummaryNe : summary.plainLanguageSummaryEn) : ''}
                </p>

                {/* Latest Disclosures / Notices Preview */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#0078d7', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    📢 {lang === 'ne' ? 'ताजा सूचना तथा लाभांश (Notices)' : 'Latest Corporate Notices'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {announcements.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        style={{
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.5rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => onSelectCompany(a.symbol)}
                      >
                        <span style={{ fontWeight: 700, color: '#0078d7', flexShrink: 0 }}>{a.symbol}</span>
                        <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom attribution */}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                {summary?.dataSource.disclaimer}
              </div>
            </div>
          </div>

          {/* 2. Three-Column Content Widgets (Identical to NEPSE Layout) */}
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            {/* Widget 1: Top Gainers / Losers */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <div className="nepse-card-header-tabs">
                <button
                  className={`nepse-tab-btn ${moverTab === 'gainers' ? 'active' : ''}`}
                  onClick={() => setMoverTab('gainers')}
                >
                  📈 {lang === 'ne' ? 'धेरै बढेका' : 'Top Gainers'}
                </button>
                <button
                  className={`nepse-tab-btn ${moverTab === 'losers' ? 'active' : ''}`}
                  onClick={() => setMoverTab('losers')}
                >
                  📉 {lang === 'ne' ? 'धेरै घटेका' : 'Top Losers'}
                </button>
              </div>

              <div className="table-responsive">
                <table className="custom-table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.75rem' }}>
                    <tr>
                      <th style={{ padding: '0.55rem 0.75rem' }}>Symbol</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>LTP (Rs.)</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Change</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(moverTab === 'gainers' ? movers?.topGainers : movers?.topLosers)?.map((c) => {
                      const isRowUp = c.change >= 0;
                      return (
                        <tr
                          key={c.symbol}
                          style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          onClick={() => onSelectCompany(c.symbol)}
                        >
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0078d7' }}>
                            {c.symbol}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {formatCurrency(c.ltp, false)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: isRowUp ? '#009032' : '#ff3332' }}>
                            {isRowUp ? `+${c.change.toFixed(1)}` : c.change.toFixed(1)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: isRowUp ? '#009032' : '#ff3332' }}>
                            {isRowUp ? `+${c.pChange.toFixed(2)}%` : `${c.pChange.toFixed(2)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Widget 2: Top Turnover / Volume */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <div className="nepse-card-header-tabs">
                <button
                  className={`nepse-tab-btn ${activityTab === 'turnover' ? 'active' : ''}`}
                  onClick={() => setActivityTab('turnover')}
                >
                  💰 {lang === 'ne' ? 'रकमका आधारमा' : 'Top Turnover'}
                </button>
                <button
                  className={`nepse-tab-btn ${activityTab === 'volume' ? 'active' : ''}`}
                  onClick={() => setActivityTab('volume')}
                >
                  📦 {lang === 'ne' ? 'कित्ताका आधारमा' : 'Top Volume'}
                </button>
              </div>

              <div className="table-responsive">
                <table className="custom-table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.75rem' }}>
                    <tr>
                      <th style={{ padding: '0.55rem 0.75rem' }}>Symbol</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>
                        {activityTab === 'turnover' ? 'Turnover (Rs.)' : 'Volume (Kitta)'}
                      </th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>LTP (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activityTab === 'turnover' ? movers?.mostActiveByTurnover : movers?.mostActiveByVolume)?.map((c) => (
                      <tr
                        key={c.symbol}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onClick={() => onSelectCompany(c.symbol)}
                      >
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0078d7' }}>
                          {c.symbol}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          {activityTab === 'turnover'
                            ? `Rs. ${(c.turnover / 1e7).toFixed(2)} Cr`
                            : c.volume.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(c.ltp, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Widget 3: Sky-Blue Market Summary Card (Matching NEPSE) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <div className="nepse-summary-header">
                <h3>{lang === 'ne' ? 'बजार सारांश' : 'Market Summary'}</h3>
                <span style={{ fontSize: '0.74rem', background: 'rgba(255, 255, 255, 0.25)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  {summary?.session.currentTimeNPT.split(' ')[0]}
                </span>
              </div>

              {summary && (
                <table className="nepse-summary-table">
                  <tbody>
                    <tr>
                      <td className="label">TOTAL TURNOVER RS</td>
                      <td className="val">{formatCurrency(summary.totalTurnover)}</td>
                    </tr>
                    <tr>
                      <td className="label">TOTAL TRADED SHARES</td>
                      <td className="val">{summary.totalSharesTraded.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="label">TOTAL TRANSACTIONS</td>
                      <td className="val">{summary.totalTransactions.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="label">TOTAL SCRIPS TRADED</td>
                      <td className="val">{companies.length || 284}</td>
                    </tr>
                    <tr>
                      <td className="label">TOTAL MARKET CAPITALIZATION</td>
                      <td className="val">NPR 43.64 Kharba</td>
                    </tr>
                    <tr>
                      <td className="label">TOTAL FLOAT MARKET CAP</td>
                      <td className="val">NPR 15.22 Kharba</td>
                    </tr>
                    <tr>
                      <td className="label">FEED STATUS</td>
                      <td className="val" style={{ color: '#0078d7' }}>
                        {summary.dataSource.dataStatus} ({summary.dataSource.providerName})
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Today's Price / Live Market Tab */
        <div className="card" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d2238' }}>
                📋 {lang === 'ne' ? 'आजको मूल्य सूची (Today’s Price)' : 'Today’s Price / Live Market'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {filteredCompanies.length} {lang === 'ne' ? 'कम्पनीहरू सूचीबद्ध' : 'companies traded in session'}
              </p>
            </div>

            {/* Filter and Search controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ne' ? 'प्रतीक वा नाम खोज्नुहोस्...' : 'Filter symbol (e.g. NABIL, UPPER)...'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              />

              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                {sectors.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead style={{ background: '#0078d7', color: '#ffffff', fontSize: '0.78rem' }}>
                <tr>
                  <th style={{ padding: '0.65rem 0.75rem' }}>S.N.</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Symbol</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Company Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>LTP (Rs.)</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Change</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>%</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>High</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Low</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Volume</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Turnover (Rs.)</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c, idx) => {
                  const isRowUp = c.change >= 0;
                  return (
                    <tr
                      key={c.symbol}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onClick={() => onSelectCompany(c.symbol)}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 800, color: '#0078d7' }}>
                        {c.symbol}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(c.ltp, false)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: isRowUp ? '#009032' : '#ff3332' }}>
                        {isRowUp ? `+${c.change.toFixed(1)}` : c.change.toFixed(1)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: isRowUp ? '#009032' : '#ff3332' }}>
                        {isRowUp ? `+${c.pChange.toFixed(2)}%` : `${c.pChange.toFixed(2)}%`}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b' }}>
                        {formatCurrency(c.high, false)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b' }}>
                        {formatCurrency(c.low, false)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a' }}>
                        {c.volume.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                        {formatCurrency(c.turnover, false)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        {onOpenAiAnalysis && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAiAnalysis(c.symbol);
                            }}
                            title={`AI Analysis for ${c.symbol}`}
                            style={{ padding: '0.2rem 0.5rem', color: '#6366f1', fontWeight: 700 }}
                          >
                            ✨ AI
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
