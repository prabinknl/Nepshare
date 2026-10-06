import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';

interface AddAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  symbol: string;
  currentLtp: number;
}

export const AddAlertModal: React.FC<AddAlertModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  symbol,
  currentLtp
}) => {
  const { formatCurrency } = useLanguage();
  const [alertType, setAlertType] = useState<'PRICE_ABOVE' | 'PRICE_BELOW' | 'SIGNAL_CHANGE'>('PRICE_ABOVE');
  const [targetValue, setTargetValue] = useState<number>(() => Math.round(currentLtp * 1.05));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.createAlert({
        symbol,
        alertType,
        targetValue: alertType === 'SIGNAL_CHANGE' ? undefined : targetValue
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Set Alert for {symbol}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Current Price: {formatCurrency(currentLtp)}
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Trigger Condition
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: alertType === 'PRICE_ABOVE' ? 'var(--bg-card-hover)' : 'var(--bg-surface)', border: '1px solid', borderColor: alertType === 'PRICE_ABOVE' ? 'var(--color-primary)' : 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="alertType"
                  checked={alertType === 'PRICE_ABOVE'}
                  onChange={() => {
                    setAlertType('PRICE_ABOVE');
                    setTargetValue(Math.round(currentLtp * 1.05));
                  }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Price Rises Above Target</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: alertType === 'PRICE_BELOW' ? 'var(--bg-card-hover)' : 'var(--bg-surface)', border: '1px solid', borderColor: alertType === 'PRICE_BELOW' ? 'var(--color-primary)' : 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="alertType"
                  checked={alertType === 'PRICE_BELOW'}
                  onChange={() => {
                    setAlertType('PRICE_BELOW');
                    setTargetValue(Math.round(currentLtp * 0.95));
                  }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Price Dips Below Target</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: alertType === 'SIGNAL_CHANGE' ? 'var(--bg-card-hover)' : 'var(--bg-surface)', border: '1px solid', borderColor: alertType === 'SIGNAL_CHANGE' ? 'var(--color-primary)' : 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="alertType"
                  checked={alertType === 'SIGNAL_CHANGE'}
                  onChange={() => setAlertType('SIGNAL_CHANGE')}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Technical Signal Changes (Buy/Sell Setup)</span>
              </label>
            </div>
          </div>

          {alertType !== 'SIGNAL_CHANGE' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Target Price (NPR)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={targetValue}
                onChange={e => setTargetValue(parseFloat(e.target.value || '0'))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Alert...' : 'Create Alert'}
          </button>
        </form>
      </div>
    </div>
  );
};
