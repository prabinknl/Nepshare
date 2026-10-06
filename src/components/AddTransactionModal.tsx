import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Tooltip } from './Tooltip.js';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillSymbol?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillSymbol
}) => {
  const { t, formatCurrency } = useLanguage();

  const [symbol, setSymbol] = useState(prefillSymbol || '');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(100);
  const [price, setPrice] = useState<number>(500);
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Configurable fees
  const [isCustomFee, setIsCustomFee] = useState(false);
  const [customBrokerFee, setCustomBrokerFee] = useState<number>(0);
  const [customSebonFee, setCustomSebonFee] = useState<number>(0);
  const [customDpFee, setCustomDpFee] = useState<number>(25);
  const [customCgtFee, setCustomCgtFee] = useState<number>(0);

  // Estimated fees preview
  const [estimatedFees, setEstimatedFees] = useState<{
    turnover: number;
    brokerFee: number;
    sebonFee: number;
    dpFee: number;
    totalFees: number;
    effectiveRatePct: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prefillSymbol) setSymbol(prefillSymbol);
  }, [prefillSymbol]);

  useEffect(() => {
    if (quantity > 0 && price > 0) {
      api.calculateFeesPreview(quantity, price, type === 'SELL')
        .then(res => setEstimatedFees(res))
        .catch(() => {});
    }
  }, [quantity, price, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      setError('Please provide a valid company symbol (e.g. NABIL, UPPER).');
      return;
    }
    if (quantity <= 0 || price <= 0) {
      setError('Quantity and price must be greater than zero.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await api.addTransaction({
        symbol: symbol.trim().toUpperCase(),
        type,
        quantity,
        price,
        transactionDate,
        isCustomFee,
        brokerFee: isCustomFee ? customBrokerFee : undefined,
        sebonFee: isCustomFee ? customSebonFee : undefined,
        dpFee: isCustomFee ? customDpFee : undefined,
        cgtFee: isCustomFee ? customCgtFee : undefined,
        notes: notes ? notes.trim() : undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const turnover = quantity * price;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>{t.portfolio.addTransaction}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Standard NEPSE fee slabs applied automatically
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          {error && (
            <div style={{ background: 'var(--color-bear-subtle)', border: '1px solid var(--color-bear-border)', color: 'var(--color-bear)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Type Toggle: BUY / SELL */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${type === 'BUY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, background: type === 'BUY' ? 'var(--color-bull)' : undefined, color: type === 'BUY' ? '#fff' : undefined }}
              onClick={() => setType('BUY')}
            >
              ▲ {t.portfolio.buy}
            </button>
            <button
              type="button"
              className={`btn ${type === 'SELL' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setType('SELL')}
            >
              ▼ {t.portfolio.sell}
            </button>
          </div>

          {/* Symbol */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Company Symbol
            </label>
            <input
              type="text"
              required
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="NABIL, UPPER, SHIVM..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}
            />
          </div>

          {/* Quantity & Price */}
          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {t.portfolio.kitta}
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {t.portfolio.pricePerShare} (NPR)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={price}
                onChange={e => setPrice(Math.max(1, parseFloat(e.target.value || '1')))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              {t.portfolio.date}
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={e => setTransactionDate(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          {/* Fee Configuration Breakdown */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>Fee Calculation Breakdown</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--color-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isCustomFee}
                  onChange={e => setIsCustomFee(e.target.checked)}
                />
                <span>Custom Fee Override</span>
              </label>
            </div>

            {!isCustomFee && estimatedFees ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>Gross Turnover:</span>
                  <span style={{ color: 'var(--text-main)' }}>{formatCurrency(turnover)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span><Tooltip content={t.tooltips.brokerFee}>Broker Commission</Tooltip> (Tiered):</span>
                  <span>{formatCurrency(estimatedFees.brokerFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span><Tooltip content={t.tooltips.sebonFee}>SEBON Fee</Tooltip> (0.015%):</span>
                  <span>{formatCurrency(estimatedFees.sebonFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span><Tooltip content={t.tooltips.dpFee}>DP Charge</Tooltip>:</span>
                  <span>{formatCurrency(estimatedFees.dpFee)}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)' }}>
                  <span>Estimated Total Settlement:</span>
                  <span style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                    {formatCurrency(type === 'BUY' ? turnover + estimatedFees.totalFees : turnover - estimatedFees.totalFees)}
                  </span>
                </div>
              </div>
            ) : isCustomFee ? (
              <div className="grid-2" style={{ gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Broker Fee (NPR)</label>
                  <input
                    type="number"
                    value={customBrokerFee}
                    onChange={e => setCustomBrokerFee(parseFloat(e.target.value || '0'))}
                    style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>SEBON Fee (NPR)</label>
                  <input
                    type="number"
                    value={customSebonFee}
                    onChange={e => setCustomSebonFee(parseFloat(e.target.value || '0'))}
                    style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>DP Fee (NPR)</label>
                  <input
                    type="number"
                    value={customDpFee}
                    onChange={e => setCustomDpFee(parseFloat(e.target.value || '0'))}
                    style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
                {type === 'SELL' && (
                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>CGT Tax (NPR)</label>
                    <input
                      type="number"
                      value={customCgtFee}
                      onChange={e => setCustomCgtFee(parseFloat(e.target.value || '0'))}
                      style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. IPO allotment, long term hold..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.88rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Recording...' : `Record ${type} Transaction`}
          </button>
        </form>
      </div>
    </div>
  );
};
