import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { TechnicalSignalBadge } from '../components/TechnicalSignalBadge.js';
import { AlertItem } from '../types/index.js';
import { AddAlertModal } from '../components/AddAlertModal.js';

interface WatchlistViewProps {
  onSelectCompany: (symbol: string) => void;
}

interface EnrichedWatchlistItem {
  id: string;
  symbol: string;
  notes: string | null;
  addedAt: string;
  company: {
    name: string;
    nameNe?: string;
    sector: string;
    ltp: number;
    change: number;
    pChange: number;
    volume: number;
  } | null;
  signal: 'POTENTIAL_BUY_SETUP' | 'HOLD_WATCH' | 'POTENTIAL_SELL_SETUP' | 'INSUFFICIENT_DATA';
  signalLabelEn: string;
  signalLabelNe: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({ onSelectCompany }) => {
  const { lang, t, formatCurrency } = useLanguage();
  const { isAuthenticated, openAuthModal, demoLogin } = useAuth();

  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlertSymbol, setSelectedAlertSymbol] = useState<string | null>(null);
  const [selectedAlertLtp, setSelectedAlertLtp] = useState<number>(0);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [wlData, alertData] = await Promise.all([
        api.getWatchlist(),
        api.getAlerts()
      ]);
      setWatchlist(wlData);
      setAlerts(alertData);
    } catch (err) {
      console.error('Failed to load watchlist/alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (symbol: string) => {
    try {
      await api.removeFromWatchlist(symbol);
      setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    } catch (err: any) {
      alert(err.message || 'Failed to remove from watchlist.');
    }
  };

  const handleToggleAlert = async (id: string) => {
    try {
      const res = await api.toggleAlert(id);
      setAlerts(prev =>
        prev.map(a => (a.id === id ? { ...a, is_active: res.isActive ? 1 : 0 } : a))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle alert.');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete alert.');
    }
  };

  const handleCreateAlertForSymbol = (symbol: string, ltp: number) => {
    setSelectedAlertSymbol(symbol);
    setSelectedAlertLtp(ltp);
    setIsAlertModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>Track Companies & Price Alerts</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          Visitors can explore all NEPSE company fundamentals, prices, and technical signals freely without an account.
          Sign in or launch an instant demo session to save scrips, set price alerts, and monitor signal changes.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => openAuthModal('login')}>
            {t.nav.signIn} / Register
          </button>
          <button className="btn btn-secondary" onClick={() => demoLogin()}>
            🚀 Try with Demo Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Watchlist Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>{t.watchlist.title}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Monitoring {watchlist.length} saved companies with live signals and price alerts
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading your saved scrips...
          </div>
        ) : watchlist.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              {t.watchlist.emptyTitle}
            </p>
            <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
              {t.watchlist.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company Name</th>
                  <th>LTP</th>
                  <th>Day Change</th>
                  <th>Current Setup</th>
                  <th>Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(item => {
                  const comp = item.company;
                  const isUp = comp ? comp.change >= 0 : false;
                  const compName = comp ? (lang === 'ne' && comp.nameNe ? comp.nameNe : comp.name) : item.symbol;
                  const activeSymbolAlerts = alerts.filter(a => a.symbol === item.symbol && a.is_active === 1);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectCompany(item.symbol)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{item.symbol}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{compName}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.95rem' }}>
                          {comp ? formatCurrency(comp.ltp) : '—'}
                        </strong>
                      </td>
                      <td>
                        {comp ? (
                          <span className={isUp ? 'text-bull' : 'text-bear'} style={{ fontWeight: 700 }}>
                            {isUp ? `+${comp.change.toFixed(1)}` : comp.change.toFixed(1)} ({isUp ? `+${comp.pChange.toFixed(2)}%` : `${comp.pChange.toFixed(2)}%`})
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <TechnicalSignalBadge
                          signal={item.signal}
                          label={lang === 'ne' ? item.signalLabelNe : item.signalLabelEn}
                        />
                      </td>
                      <td>
                        <span className={`badge ${activeSymbolAlerts.length > 0 ? 'badge-bull' : 'badge-slate'}`} style={{ fontSize: '0.72rem' }}>
                          🔔 {activeSymbolAlerts.length} Active
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCreateAlertForSymbol(item.symbol, comp ? comp.ltp : 500)}
                            title="Set Target Alert"
                          >
                            + Alert
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-bear)' }}
                            onClick={() => handleRemove(item.symbol)}
                            title="Remove from Watchlist"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Alerts Management */}
      <div className="card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t.watchlist.activeAlerts}</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Configured price thresholds and signal monitors. Fired alerts are automatically deduplicated.
        </p>

        {alerts.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No active alerts configured. Add alerts to any watchlist scrip to receive in-app notifications.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Condition</th>
                  <th>Target Level</th>
                  <th>Status</th>
                  <th>Last Triggered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>{a.symbol}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {a.alert_type === 'PRICE_ABOVE'
                          ? 'Price rises above target'
                          : a.alert_type === 'PRICE_BELOW'
                          ? 'Price drops below target'
                          : 'Technical signal changes'}
                      </span>
                    </td>
                    <td>
                      <strong>{a.target_value ? formatCurrency(a.target_value) : 'Setup Change'}</strong>
                    </td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-bull' : 'badge-slate'}`} style={{ fontSize: '0.72rem' }}>
                        {a.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {a.last_triggered_at ? new Date(a.last_triggered_at).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleAlert(a.id)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {a.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-bear)', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteAlert(a.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedAlertSymbol && (
        <AddAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => {
            setIsAlertModalOpen(false);
            setSelectedAlertSymbol(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          symbol={selectedAlertSymbol}
          currentLtp={selectedAlertLtp}
        />
      )}
    </div>
  );
};
