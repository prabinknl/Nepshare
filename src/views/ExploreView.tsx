import React, { useState, useEffect } from 'react';
import { CompanySummary } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';

interface ExploreViewProps {
  onSelectCompany: (symbol: string) => void;
  initialSector?: string;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectCompany, initialSector = 'ALL' }) => {
  const { lang, t, formatCurrency } = useLanguage();
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [sectors, setSectors] = useState<Array<{ name: string; nameNe?: string; companyCount: number }>>([]);
  const [selectedSector, setSelectedSector] = useState<string>(initialSector);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'turnover' | 'pChange' | 'ltp' | 'volume'>('turnover');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [compData, secData] = await Promise.all([
          api.getCompanies(),
          api.getSectors()
        ]);
        setCompanies(compData);
        setSectors(secData);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSort = (field: 'turnover' | 'pChange' | 'ltp' | 'volume') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort companies
  let filtered = companies.filter(c => {
    const matchesSector = selectedSector === 'ALL' || c.sector.toLowerCase() === selectedSector.toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.nameNe && c.nameNe.toLowerCase().includes(q));
    return matchesSector && matchesSearch;
  });

  filtered.sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Sector Bar */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>NEPSE Listed Companies</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Filter by sector, search symbols, and evaluate live scrip indicators
            </p>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter company or symbol..."
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        {/* Sector Chips */}
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          <button
            className={`btn btn-sm ${selectedSector === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSector('ALL')}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}
          >
            {t.market.allSectors} ({companies.length})
          </button>
          {sectors.map(sec => {
            const secName = lang === 'ne' && sec.nameNe ? sec.nameNe : sec.name;
            return (
              <button
                key={sec.name}
                className={`btn btn-sm ${selectedSector === sec.name ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedSector(sec.name)}
                style={{ borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}
              >
                {secName} ({sec.companyCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Screener Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading market scrips...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No scrips match your criteria</p>
            <p style={{ fontSize: '0.85rem' }}>Clear your search query or switch sectors to view more companies.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company Name</th>
                  <th>Sector</th>
                  <th onClick={() => handleSort('ltp')} style={{ cursor: 'pointer' }}>
                    LTP {sortBy === 'ltp' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleSort('pChange')} style={{ cursor: 'pointer' }}>
                    Change % {sortBy === 'pChange' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleSort('volume')} style={{ cursor: 'pointer' }}>
                    Volume {sortBy === 'volume' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleSort('turnover')} style={{ cursor: 'pointer' }}>
                    Turnover (NPR) {sortBy === 'turnover' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isUp = c.change >= 0;
                  const companyName = lang === 'ne' && c.nameNe ? c.nameNe : c.name;
                  const sectorName = lang === 'ne' && c.sectorNe ? c.sectorNe : c.sector;

                  return (
                    <tr
                      key={c.symbol}
                      onClick={() => onSelectCompany(c.symbol)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>{c.symbol}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{companyName}</span>
                      </td>
                      <td>
                        <span className="badge badge-slate" style={{ fontSize: '0.72rem' }}>
                          {sectorName}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.95rem' }}>{formatCurrency(c.ltp)}</strong>
                      </td>
                      <td>
                        <span className={isUp ? 'text-bull' : 'text-bear'} style={{ fontWeight: 700 }}>
                          {isUp ? `+${c.change.toFixed(1)}` : c.change.toFixed(1)} ({isUp ? `+${c.pChange.toFixed(2)}%` : `${c.pChange.toFixed(2)}%`})
                        </span>
                      </td>
                      <td>{c.volume.toLocaleString()}</td>
                      <td>{formatCurrency(c.turnover)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={e => {
                            e.stopPropagation();
                            onSelectCompany(c.symbol);
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
        )}
      </div>
    </div>
  );
};
