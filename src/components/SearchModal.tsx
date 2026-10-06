import React, { useState, useEffect, useRef } from 'react';
import { CompanySummary } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (symbol: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectCompany }) => {
  const { lang, t, formatCurrency } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchCompanies('');
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchCompanies = async (q: string) => {
    setIsLoading(true);
    try {
      const data = await api.getCompanies(q);
      setResults(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    searchCompanies(val);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={t.nav.searchPlaceholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1.1rem',
              color: 'var(--text-main)',
              fontWeight: 500
            }}
          />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0.5rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading NEPSE listings...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No companies found</p>
              <p style={{ fontSize: '0.85rem' }}>Try searching by scrip symbol (e.g. NABIL, UPPER, CIT) or company name.</p>
            </div>
          ) : (
            results.map(c => {
              const isBull = c.change >= 0;
              const companyName = lang === 'ne' && c.nameNe ? c.nameNe : c.name;
              const sectorName = lang === 'ne' && c.sectorNe ? c.sectorNe : c.sector;

              return (
                <div
                  key={c.symbol}
                  onClick={() => {
                    onSelectCompany(c.symbol);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)'
                  }}
                  className="search-result-item"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>{c.symbol}</strong>
                      <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>
                        {sectorName}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {companyName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                      {formatCurrency(c.ltp)}
                    </div>
                    <div className={isBull ? 'text-bull' : 'text-bear'} style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {isBull ? `+${c.change.toFixed(1)}` : c.change.toFixed(1)} ({isBull ? `+${c.pChange.toFixed(2)}%` : `${c.pChange.toFixed(2)}%`})
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
