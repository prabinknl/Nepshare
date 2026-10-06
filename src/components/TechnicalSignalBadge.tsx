import React from 'react';

interface TechnicalSignalBadgeProps {
  signal: 'POTENTIAL_BUY_SETUP' | 'HOLD_WATCH' | 'POTENTIAL_SELL_SETUP' | 'INSUFFICIENT_DATA';
  label: string;
}

export const TechnicalSignalBadge: React.FC<TechnicalSignalBadgeProps> = ({ signal, label }) => {
  let badgeClass = 'badge-neutral';
  let icon = '⏸';

  if (signal === 'POTENTIAL_BUY_SETUP') {
    badgeClass = 'badge-bull';
    icon = '▲';
  } else if (signal === 'POTENTIAL_SELL_SETUP') {
    badgeClass = 'badge-bear';
    icon = '▼';
  } else if (signal === 'INSUFFICIENT_DATA') {
    badgeClass = 'badge-slate';
    icon = '—';
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}>
      <span style={{ fontSize: '0.75rem' }}>{icon}</span>
      <span>{label}</span>
    </span>
  );
};
