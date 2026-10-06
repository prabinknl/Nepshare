import React, { useState } from 'react';
import { BeforeYouBuySummary as IBeforeYouBuySummary } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';

interface BeforeYouBuySummaryProps {
  symbol: string;
  summary: IBeforeYouBuySummary;
  onJumpToSection: (sectionId: string) => void;
}

export const BeforeYouBuySummary: React.FC<BeforeYouBuySummaryProps> = ({
  symbol,
  summary,
  onJumpToSection
}) => {
  const { lang, formatCurrency } = useLanguage();

  // Local state for interactive 5-item pre-purchase checklist
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const checklist = [
    {
      id: 1,
      textEn: 'Have I reviewed the latest financial results?',
      textNe: 'के मैले पछिल्लो त्रैमासिक वित्तीय विवरण र नाफा समीक्षा गरें?',
      jumpTarget: 'section-financial-health'
    },
    {
      id: 2,
      textEn: 'Is the valuation reasonable compared with similar companies?',
      textNe: 'के यसको मूल्याङ्कन (P/E, P/B) समकक्षी कम्पनीहरूसँग तुलना गर्दा उपयुक्त छ?',
      jumpTarget: 'section-valuation'
    },
    {
      id: 3,
      textEn: 'Can I sell the quantity I intend to buy without difficulty?',
      textNe: 'के मैले किन्न खोजेको कित्ता बजारमा पछि सहजै बिक्री गर्न सकिन्छ?',
      jumpTarget: 'section-price-volume'
    },
    {
      id: 4,
      textEn: 'Have I checked recent announcements?',
      textNe: 'के मैले पछिल्ला लाभांश, साधारण सभा वा हकप्रद सूचनाहरू हेरें?',
      jumpTarget: 'section-announcements'
    },
    {
      id: 5,
      textEn: 'Have I decided my holding period and maximum acceptable loss?',
      textNe: 'के मैले लगानी अवधि र अधिकतम सहन सक्ने जोखिम (स्टप-लस) तय गरें?',
      jumpTarget: 'section-trade-planner'
    }
  ];

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Improving':
      case 'High liquidity':
      case 'Low risk observed':
      case 'Fresh Data':
      case 'Discounted':
        return <span className="badge badge-emerald">● {status}</span>;
      case 'Fair':
      case 'Adequate':
      case 'Moderate risks':
      case 'Mixed':
      case 'Delayed':
        return <span className="badge badge-amber">◐ {status}</span>;
      case 'Needs attention':
      case 'Elevated':
      case 'Elevated risk concerns':
      case 'Low trading liquidity':
      case 'Stale':
        return <span className="badge badge-rose">▲ {status}</span>;
      case 'Insufficient data':
      case 'Demo data':
      default:
        return <span className="badge badge-slate">○ {status}</span>;
    }
  };

  return (
    <div className="card before-you-buy-card" style={{
      border: '2px solid var(--color-primary)',
      background: 'linear-gradient(180deg, rgba(0, 120, 215, 0.04) 0%, var(--bg-card) 100%)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem'
    }}>
      {/* Title & Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              {lang === 'ne' ? 'Nepshare “खरिद गर्नुअघि” विश्लेषण' : 'Nepshare “Before You Buy” Analysis'}
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {lang === 'ne'
              ? `${symbol} सेयर खरिद गर्नुपूर्व वित्तीय स्वास्थ्य, मूल्याङ्कन र जोखिमको पारदर्शी समीक्षा।`
              : `Objective pre-trade health check, valuation multiples, and risk evidence for ${symbol}.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onJumpToSection('section-trade-planner')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            🧮 {lang === 'ne' ? 'ट्रेड योजना क्यालकुलेटर' : 'Trade Planner'}
          </button>
        </div>
      </div>

      {/* 5 Core Dimensions Grid */}
      <div className="grid-5" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
        {/* 1. Financial Health */}
        <div className="byb-dimension-box" style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lang === 'ne' ? 'वित्तीय स्वास्थ्य' : 'Financial Health'}
            </span>
            {getStatusBadge(summary.financialHealth.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', minHeight: '42px', margin: 0 }}>
            {lang === 'ne' ? summary.financialHealth.explanationNe : summary.financialHealth.explanationEn}
          </p>
          <button
            className="btn-link"
            onClick={() => onJumpToSection('section-financial-health')}
            style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {lang === 'ne' ? 'विवरण हेर्नुहोस् →' : 'View details →'}
          </button>
        </div>

        {/* 2. Valuation */}
        <div className="byb-dimension-box" style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lang === 'ne' ? 'मूल्याङ्कन' : 'Valuation'}
            </span>
            {getStatusBadge(summary.valuation.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', minHeight: '42px', margin: 0 }}>
            {lang === 'ne' ? summary.valuation.explanationNe : summary.valuation.explanationEn}
          </p>
          <button
            className="btn-link"
            onClick={() => onJumpToSection('section-valuation')}
            style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {lang === 'ne' ? 'विवरण हेर्नुहोस् →' : 'View details →'}
          </button>
        </div>

        {/* 3. Liquidity */}
        <div className="byb-dimension-box" style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lang === 'ne' ? 'कारोबार तरलता' : 'Liquidity'}
            </span>
            {getStatusBadge(summary.liquidity.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', minHeight: '42px', margin: 0 }}>
            {lang === 'ne' ? summary.liquidity.explanationNe : summary.liquidity.explanationEn}
          </p>
          <button
            className="btn-link"
            onClick={() => onJumpToSection('section-price-volume')}
            style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {lang === 'ne' ? 'विवरण हेर्नुहोस् →' : 'View details →'}
          </button>
        </div>

        {/* 4. Key Risks */}
        <div className="byb-dimension-box" style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lang === 'ne' ? 'प्रमुख जोखिम' : 'Key Risks'}
            </span>
            {getStatusBadge(summary.keyRisks.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', minHeight: '42px', margin: 0 }}>
            {lang === 'ne' ? summary.keyRisks.explanationNe : summary.keyRisks.explanationEn}
          </p>
          <button
            className="btn-link"
            onClick={() => onJumpToSection('section-risks')}
            style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {lang === 'ne' ? 'विवरण हेर्नुहोस् →' : 'View details →'}
          </button>
        </div>

        {/* 5. Data Freshness */}
        <div className="byb-dimension-box" style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lang === 'ne' ? 'तथ्यांक ताजापन' : 'Data Freshness'}
            </span>
            {getStatusBadge(summary.dataFreshness.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', minHeight: '42px', margin: 0 }}>
            {lang === 'ne' ? summary.dataFreshness.explanationNe : summary.dataFreshness.explanationEn}
          </p>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Obs: {summary.dataFreshness.observedAtNPT}
          </div>
        </div>
      </div>

      {/* Interactive 5-Question Checklist */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        padding: '0.85rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📋</span>
            <span>{lang === 'ne' ? 'खरिदपूर्व लगानीकर्ता जाँचसूची (५ प्रश्न)' : 'Pre-Purchase Investor Checklist (5 Questions)'}</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: checkedCount === 5 ? 'var(--color-bull)' : 'var(--text-muted)', fontWeight: 600 }}>
            {checkedCount} / 5 {lang === 'ne' ? 'जाँच गरियो' : 'Confirmed'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
          {checklist.map((item, index) => {
            const isChecked = !!checkedItems[index];
            return (
              <div
                key={item.id}
                onClick={() => toggleCheck(index)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                  border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(index)}
                  style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, fontSize: '0.82rem', lineHeight: '1.35' }}>
                  <span style={{ textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? 'var(--text-muted)' : 'var(--text-main)' }}>
                    {lang === 'ne' ? item.textNe : item.textEn}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToSection(item.jumpTarget);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '0.72rem',
                      marginLeft: '0.4rem',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {lang === 'ne' ? 'जाँच गर्नुहोस् ↗' : 'Check ↗'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
