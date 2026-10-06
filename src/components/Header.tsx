import React from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useAlerts } from '../context/AlertContext.js';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  onRefresh?: () => void;
  onOpenAiAnalysis?: () => void;
  isRefreshing?: boolean;
  lastRefreshedTime?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onRefresh,
  onOpenAiAnalysis,
  isRefreshing,
  lastRefreshedTime
}) => {
  const { lang, toggleLang, t } = useLanguage();
  const { user, isAuthenticated, logout, openAuthModal, demoLogin } = useAuth();
  const { unreadCount, toggleDrawer } = useAlerts();

  return (
    <header style={{ width: '100%', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
      {/* 1. Official NEPSE Style Top Bar (Clean White Utility Header) */}
      <div className="nepse-top-bar">
        {/* Brand & Seal */}
        <div className="nepse-brand-wrapper" onClick={() => onSelectTab('home')}>
          <div className="nepse-seal-logo" title="Nepshare Terminal">
            <span>NP</span>
          </div>
          <div>
            <div className="nepse-brand-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d2238', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              {lang === 'ne' ? 'नेपशेयर टर्मिनल' : 'Nepshare Terminal'}
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <button
          className="search-trigger-btn"
          onClick={onOpenSearch}
          title="Search scrip or symbol"
          style={{ maxWidth: '380px', flex: 1, minWidth: '220px', background: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.nav.searchPlaceholder}
          </span>
          <span className="kbd-shortcut" style={{ background: '#e2e8f0', color: '#475569' }}>Ctrl+K</span>
        </button>

        {/* Action Controls: Refresh, AI Analysis, Language & User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Refresh Button */}
          {onRefresh && (
            <button
              className={`btn-nepse-refresh ${isRefreshing ? 'refreshing' : ''}`}
              onClick={onRefresh}
              title={lastRefreshedTime ? `Last refreshed: ${lastRefreshedTime}` : 'Refresh live market quotes'}
            >
              <svg className="refresh-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>{isRefreshing ? (lang === 'ne' ? 'अपडेट हुँदै...' : 'Refreshing...') : (lang === 'ne' ? 'रिफ्रेस' : 'Refresh')}</span>
            </button>
          )}

          {/* AI Analysis Button */}
          {onOpenAiAnalysis && (
            <button
              className="btn-ai-glow"
              onClick={onOpenAiAnalysis}
              title="Launch NEPSE AI Market Intelligence"
            >
              <span style={{ fontSize: '0.95rem' }}>✨</span>
              <span>{lang === 'ne' ? 'एआई विश्लेषण' : 'AI Analysis'}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={toggleLang}
            title="Switch Language (English / नेपाली)"
            style={{ fontWeight: 700, padding: '0.35rem 0.65rem' }}
          >
            {lang === 'en' ? '🇳🇵 नेपाली' : '🇬🇧 EN'}
          </button>

          {/* Notifications Bell */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleDrawer}
            title="In-App Notifications"
            style={{ position: 'relative', padding: '0.35rem', color: '#1e293b' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '1px',
                  right: '1px',
                  background: 'var(--color-bear)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Account / Auth */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={logout}
                title={t.nav.signOut}
              >
                <span>{t.nav.signOut}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => demoLogin()}
                title="Try full features with pre-seeded demo portfolio and watchlist"
                style={{ color: '#0078d7', fontWeight: 600 }}
              >
                {t.nav.demoAccount}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openAuthModal('login')}
              >
                {t.nav.signIn}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Official NEPSE Signature Royal Blue Navigation Bar */}
      <nav className="nepse-main-navbar" aria-label="NEPSE Main Navigation">
        <ul className="nepse-nav-list">
          <li>
            <button
              className={`nepse-nav-btn ${currentTab === 'home' ? 'active' : ''}`}
              onClick={() => onSelectTab('home')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{lang === 'ne' ? 'गृहपृष्ठ (Home)' : 'Home'}</span>
            </button>
          </li>

          <li>
            <button
              className={`nepse-nav-btn ${currentTab === 'explore' ? 'active' : ''}`}
              onClick={() => onSelectTab('explore')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>{lang === 'ne' ? 'आजको मूल्य (Today’s Price)' : 'Today’s Price / Live Market'}</span>
            </button>
          </li>

          <li>
            <button
              className={`nepse-nav-btn ${currentTab === 'watchlist' ? 'active' : ''}`}
              onClick={() => onSelectTab('watchlist')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{lang === 'ne' ? 'वाचलिस्ट (Watchlist)' : 'Watchlist'}</span>
            </button>
          </li>

          <li>
            <button
              className={`nepse-nav-btn ${currentTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => onSelectTab('portfolio')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>{lang === 'ne' ? 'पोर्टफोलियो (Portfolio)' : 'Portfolio'}</span>
            </button>
          </li>

          {onOpenAiAnalysis && (
            <li>
              <button
                className="nepse-nav-btn"
                onClick={onOpenAiAnalysis}
                style={{ background: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.3)' }}
              >
                <span>✨</span>
                <span>{lang === 'ne' ? 'एआई विश्लेषण (AI Analysis)' : 'AI Market Intelligence'}</span>
              </button>
            </li>
          )}
        </ul>

        {lastRefreshedTime && (
          <div style={{ fontSize: '0.74rem', color: '#bfdbfe', paddingRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>⏱️ {lang === 'ne' ? 'अन्तिम अद्यावधिक' : 'Updated'}:</span>
            <strong style={{ color: '#ffffff' }}>{lastRefreshedTime}</strong>
          </div>
        )}
      </nav>
    </header>
  );
};
