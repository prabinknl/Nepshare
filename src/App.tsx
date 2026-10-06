import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { AlertProvider } from './context/AlertContext.js';
import { Header } from './components/Header.js';
import { Navigation } from './components/Navigation.js';
import { MarketStatusBar } from './components/MarketStatusBar.js';
import { NepseTicker } from './components/NepseTicker.js';
import { SearchModal } from './components/SearchModal.js';
import { NotificationCenter } from './components/NotificationCenter.js';
import { AuthModal } from './components/AuthModal.js';
import { AiAnalysisModal } from './components/AiAnalysisModal.js';
import { HomeView } from './views/HomeView.js';
import { ExploreView } from './views/ExploreView.js';
import { WatchlistView } from './views/WatchlistView.js';
import { PortfolioView } from './views/PortfolioView.js';
import { CompanyDetailView } from './views/CompanyDetailView.js';
import { MarketSummary, CompanySummary } from './types/index.js';
import { api } from './api/client.js';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'watchlist' | 'portfolio'>('home');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetSymbol, setAiTargetSymbol] = useState<string | null>(null);
  
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');

  const loadMarketData = useCallback(async () => {
    try {
      const [sumRes, compRes] = await Promise.all([
        api.getMarketSummary(),
        api.getCompanies()
      ]);
      setMarketSummary(sumRes);
      setCompanies(compRes);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setLastRefreshedTime(`${timeStr} NPT`);
    } catch (err) {
      console.error('Failed to load market data:', err);
    }
  }, []);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 60000);
    return () => clearInterval(interval);
  }, [loadMarketData]);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await loadMarketData();
    setIsRefreshing(false);
  };

  const handleOpenAiAnalysis = (symbol?: string) => {
    setAiTargetSymbol(symbol || null);
    setIsAiModalOpen(true);
  };

  const handleSelectTab = (tab: string) => {
    setSelectedSymbol(null);
    setCurrentTab(tab as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCompany = (symbol: string) => {
    setSelectedSymbol(symbol.toUpperCase());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetail = () => {
    setSelectedSymbol(null);
  };

  return (
    <div className="app-container">
      {/* 1. Official NEPSE Style Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onRefresh={handleGlobalRefresh}
        onOpenAiAnalysis={() => handleOpenAiAnalysis()}
        isRefreshing={isRefreshing}
        lastRefreshedTime={lastRefreshedTime}
      />

      {/* 2. Running Live Market Ticker Marquee */}
      <NepseTicker
        summary={marketSummary}
        companies={companies}
        onSelectCompany={handleSelectCompany}
      />

      {/* 3. NEPSE Market Status Bar & Verified Provider Attribution */}
      <MarketStatusBar summary={marketSummary} />

      {/* 4. Main View Area */}
      <main className="main-content">
        {selectedSymbol ? (
          <CompanyDetailView
            symbol={selectedSymbol}
            onBack={handleBackFromDetail}
            onOpenAiAnalysis={handleOpenAiAnalysis}
          />
        ) : currentTab === 'home' ? (
          <HomeView
            onSelectCompany={handleSelectCompany}
            onOpenAiAnalysis={handleOpenAiAnalysis}
            onRefresh={handleGlobalRefresh}
            isRefreshing={isRefreshing}
          />
        ) : currentTab === 'explore' ? (
          <ExploreView onSelectCompany={handleSelectCompany} />
        ) : currentTab === 'watchlist' ? (
          <WatchlistView onSelectCompany={handleSelectCompany} />
        ) : (
          <PortfolioView onSelectCompany={handleSelectCompany} />
        )}
      </main>

      {/* 5. Mobile Navigation Bar */}
      <Navigation
        currentTab={selectedSymbol ? '' : currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* 6. Global Modals & AI Analysis Drawer */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectCompany={handleSelectCompany}
      />

      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialSymbol={aiTargetSymbol}
        onSelectCompany={handleSelectCompany}
      />

      <NotificationCenter />
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
