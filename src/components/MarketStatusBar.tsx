import React from 'react';
import { MarketSummary } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';

interface MarketStatusBarProps {
  summary: MarketSummary | null;
}

export const MarketStatusBar: React.FC<MarketStatusBarProps> = ({ summary }) => {
  const { lang, t } = useLanguage();

  if (!summary) return null;

  const isBullish = summary.pointChange >= 0;
  const statusColor = summary.session.status === 'OPEN' ? 'text-bull' : 'text-secondary';
  const statusLabel = lang === 'ne' ? summary.session.statusLabelNe : summary.session.statusLabelEn;

  const dataStatus = summary.dataSource.dataStatus || (summary.dataSource.isDemo ? 'DEMO' : 'LIVE');
  const isStale = summary.dataSource.isStale || dataStatus === 'STALE';

  const getStatusBadge = () => {
    switch (dataStatus) {
      case 'LIVE':
        return { cls: 'badge badge-emerald', label: lang === 'ne' ? 'प्रत्यक्ष फिड (Live)' : '● LIVE (NEPSE)' };
      case 'DELAYED':
        return { cls: 'badge badge-amber', label: lang === 'ne' ? `ढिलो (${summary.dataSource.applicableDelayMinutes || 15} मिनेट)` : `DELAYED (${summary.dataSource.applicableDelayMinutes || 15}m)` };
      case 'END_OF_DAY':
        return { cls: 'badge badge-slate', label: lang === 'ne' ? 'दिनको अन्त्य (EOD)' : 'END-OF-DAY' };
      case 'STALE':
        return { cls: 'badge badge-rose', label: lang === 'ne' ? 'अपडेट नभएको (Stale)' : 'STALE DATA' };
      case 'UNAVAILABLE':
        return { cls: 'badge badge-rose', label: lang === 'ne' ? 'अनुपलब्ध' : 'UNAVAILABLE' };
      case 'DEMO':
      default:
        return { cls: 'badge badge-slate', label: lang === 'ne' ? 'डेमो फिड' : 'SAMPLE FEED' };
    }
  };

  const badge = getStatusBadge();

  return (
    <aside aria-label="Market status and data notices">
      {summary.dataSource.isDemo && (
        <div className="demo-data-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <strong>{t.market.demoNotice}</strong>
          </span>
        </div>
      )}

      {isStale && !summary.dataSource.isDemo && (
        <div 
          className="stale-data-banner" 
          style={{ 
            background: 'rgba(245, 158, 11, 0.12)', 
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)', 
            color: '#fbbf24', 
            padding: '0.55rem 1.25rem', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.65rem' 
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>{t.market.staleNotice} {summary.dataSource.observedAtNPT || summary.session.currentTimeNPT}.</strong>{' '}
            {summary.dataSource.staleReason ? `(${summary.dataSource.staleReason}) ` : ''}
            Signals and predictions are suspended until verified feed resumes.
          </span>
        </div>
      )}

      <div className="market-status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: summary.session.status === 'OPEN' ? '#10b981' : '#64748b',
                boxShadow: summary.session.status === 'OPEN' ? '0 0 8px #10b981' : 'none'
              }}
            />
            <span style={{ fontWeight: 600 }} className={statusColor}>
              {statusLabel}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {summary.session.nextSessionText}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t.market.nepseIndex}:</span>
            <strong style={{ fontSize: '0.95rem' }}>{summary.nepseIndex.toFixed(2)}</strong>
            <span className={isBullish ? 'text-bull' : 'text-bear'} style={{ fontWeight: 600 }}>
              {isBullish ? `+${summary.pointChange.toFixed(2)}` : summary.pointChange.toFixed(2)} ({isBullish ? `+${summary.percentChange.toFixed(2)}%` : `${summary.percentChange.toFixed(2)}%`})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>
              {t.market.observedAt}: <strong style={{ color: 'var(--text-secondary)' }}>{summary.dataSource.observedAtNPT || summary.session.currentTimeNPT}</strong>
            </span>
            {summary.dataSource.retrievedAtNPT && (
              <span>
                • {t.market.retrievedAt}: <span style={{ color: 'var(--text-secondary)' }}>{summary.dataSource.retrievedAtNPT}</span>
              </span>
            )}
            {summary.dataSource.applicableDelayMinutes > 0 && (
              <span style={{ color: '#fbbf24' }}>
                ({summary.dataSource.applicableDelayMinutes}m {t.market.delayedBy})
              </span>
            )}
          </div>

          <span
            className={badge.cls}
            style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}
            title={summary.dataSource.disclaimer}
          >
            {badge.label}
          </span>

          <span 
            style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.6rem' }}
            title={summary.dataSource.licensingInfo?.attributionNotice || summary.dataSource.providerName}
          >
            {summary.dataSource.providerName}
          </span>
        </div>
      </div>
    </aside>
  );
};
