import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioSummary } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { AddTransactionModal } from '../components/AddTransactionModal.js';
import { Tooltip } from '../components/Tooltip.js';

interface PortfolioViewProps {
  onSelectCompany: (symbol: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onSelectCompany }) => {
  const { t, formatCurrency } = useLanguage();
  const { isAuthenticated, openAuthModal, demoLogin } = useAuth();

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');
  const [isLoading, setIsLoading] = useState(true);

  const loadPortfolio = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [sumData, txData] = await Promise.all([
        api.getPortfolioSummary(),
        api.getTransactions()
      ]);
      setSummary(sumData);
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Are you sure you want to remove this transaction record?')) return;
    try {
      await api.deleteTransaction(id);
      loadPortfolio();
    } catch (err: any) {
      alert(err.message || 'Failed to remove transaction.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💼</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.65rem' }}>Private NEPSE Portfolio Tracker</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          Track share quantities, WACC purchase costs, realized profit across partial sales, and overall portfolio net worth.
          Calculates accurate NEPSE broker commission slabs, SEBON fees, and DP charges automatically.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => openAuthModal('login')}>
            {t.nav.signIn} / Register
          </button>
          <button className="btn btn-secondary" onClick={() => demoLogin()}>
            🚀 Try Pre-Seeded Demo Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Portfolio Top Overview */}
      <div className="card" style={{ background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(14, 21, 36, 0.95) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>My Portfolio</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.portfolio.privateNotice}
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + {t.portfolio.addTransaction}
          </button>
        </div>

        {summary && (
          <div className="grid-4" style={{ gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.portfolio.totalValue}</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {formatCurrency(summary.currentMarketValue)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Based on current NEPSE LTP
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.portfolio.totalInvestment}</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--color-primary)' }}>
                {formatCurrency(summary.totalInvestment)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Includes buy commissions & fees
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.portfolio.unrealizedPnL}</span>
              <div
                style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.2rem' }}
                className={summary.totalUnrealizedPnL >= 0 ? 'text-bull' : 'text-bear'}
              >
                {summary.totalUnrealizedPnL >= 0 ? `+${formatCurrency(summary.totalUnrealizedPnL)}` : formatCurrency(summary.totalUnrealizedPnL)}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600 }} className={summary.totalUnrealizedPnLPct >= 0 ? 'text-bull' : 'text-bear'}>
                {summary.totalUnrealizedPnLPct >= 0 ? `+${summary.totalUnrealizedPnLPct.toFixed(2)}%` : `${summary.totalUnrealizedPnLPct.toFixed(2)}%`}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.portfolio.realizedPnL}</span>
              <div
                style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.2rem' }}
                className={summary.totalRealizedPnL >= 0 ? 'text-bull' : 'text-bear'}
              >
                {summary.totalRealizedPnL >= 0 ? `+${formatCurrency(summary.totalRealizedPnL)}` : formatCurrency(summary.totalRealizedPnL)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                From closed / partial sales
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs: Active Holdings vs Transaction History */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'holdings' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('holdings')}
            >
              {t.portfolio.holdings} ({summary?.holdingsCount || 0})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('history')}
            >
              {t.portfolio.history} ({transactions.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating WACC and holdings...
          </div>
        ) : activeTab === 'holdings' ? (
          !summary || summary.holdings.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                {t.portfolio.emptyTitle}
              </p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {t.portfolio.emptyDesc}
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
                + Record Your First Buy
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>{t.portfolio.kitta}</th>
                    <th><Tooltip content={t.tooltips.wacc}>{t.portfolio.wacc} (NPR)</Tooltip></th>
                    <th>Total Cost (NPR)</th>
                    <th>Current LTP</th>
                    <th>Current Value</th>
                    <th>Unrealized P&L</th>
                    <th>Day Gain</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.holdings.map(h => {
                    const isGain = h.unrealizedPnL >= 0;
                    return (
                      <tr
                        key={h.symbol}
                        onClick={() => onSelectCompany(h.symbol)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>{h.symbol}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{h.sector}</div>
                        </td>
                        <td><strong>{h.totalQuantity.toLocaleString()}</strong></td>
                        <td>{formatCurrency(h.wacc)}</td>
                        <td>{formatCurrency(h.totalCost)}</td>
                        <td><strong>{formatCurrency(h.currentLtp)}</strong></td>
                        <td><strong>{formatCurrency(h.currentMarketValue)}</strong></td>
                        <td>
                          <div className={isGain ? 'text-bull' : 'text-bear'} style={{ fontWeight: 700 }}>
                            {isGain ? `+${formatCurrency(h.unrealizedPnL)}` : formatCurrency(h.unrealizedPnL)}
                          </div>
                          <div className={isGain ? 'text-bull' : 'text-bear'} style={{ fontSize: '0.78rem' }}>
                            {isGain ? `+${h.unrealizedPnLPct.toFixed(2)}%` : `${h.unrealizedPnLPct.toFixed(2)}%`}
                          </div>
                        </td>
                        <td>
                          <span className={h.dayGain >= 0 ? 'text-bull' : 'text-bear'} style={{ fontWeight: 600 }}>
                            {h.dayGain >= 0 ? `+${formatCurrency(h.dayGain)}` : formatCurrency(h.dayGain)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={e => {
                              e.stopPropagation();
                              onSelectCompany(h.symbol);
                            }}
                          >
                            Analyze →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Transaction History Table */
          transactions.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No transaction records found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Symbol</th>
                    <th>Quantity</th>
                    <th>Rate (NPR)</th>
                    <th>Turnover</th>
                    <th>Fees (Broker/SEBON/DP)</th>
                    <th>Total Settlement</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const isBuy = tx.type === 'BUY';
                    const turnover = tx.quantity * tx.price;
                    const totalFees = (tx.broker_fee || 0) + (tx.sebon_fee || 0) + (tx.dp_fee || 0) + (tx.cgt_fee || 0);

                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {tx.transaction_date}
                        </td>
                        <td>
                          <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`} style={{ fontSize: '0.72rem' }}>
                            {tx.type}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>{tx.symbol}</strong>
                        </td>
                        <td>{tx.quantity.toLocaleString()}</td>
                        <td>{formatCurrency(tx.price)}</td>
                        <td>{formatCurrency(turnover)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatCurrency(totalFees)} {tx.is_custom_fee ? '(custom)' : '(auto)'}
                        </td>
                        <td>
                          <strong style={{ color: isBuy ? 'var(--text-main)' : 'var(--color-bull)' }}>
                            {formatCurrency(tx.total_amount)}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {tx.notes || '—'}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-bear)', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteTx(tx.id)}
                            title="Remove transaction"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadPortfolio()}
      />
    </div>
  );
};
