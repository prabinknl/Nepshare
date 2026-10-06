import React from 'react';
import { MarketSummary, CompanySummary } from '../types/index.js';

interface NepseTickerProps {
  summary: MarketSummary | null;
  companies: CompanySummary[];
  onSelectCompany: (symbol: string) => void;
}

export const NepseTicker: React.FC<NepseTickerProps> = ({ summary, companies, onSelectCompany }) => {
  const isIndexBull = summary ? summary.pointChange >= 0 : true;

  // Selected marquee scrips to display
  const marqueeScrips = companies.slice(0, 15);

  return (
    <div className="nepse-ticker-wrap" aria-label="NEPSE Live Market Ticker">
      <div className="nepse-ticker-label">
        <span>🔴 NEPSE LIVE</span>
      </div>

      <div className="nepse-ticker-track">
        {/* First Loop */}
        {summary && (
          <div className={`nepse-ticker-item ${isIndexBull ? 'up' : 'down'}`}>
            <span className="sym">NEPSE INDEX</span>
            <span className="price">{summary.nepseIndex.toFixed(2)}</span>
            <span className="change">
              {isIndexBull ? '▲ +' : '▼ '}{summary.pointChange.toFixed(2)} ({isIndexBull ? '+' : ''}{summary.percentChange.toFixed(2)}%)
            </span>
          </div>
        )}

        {summary && (
          <div className="nepse-ticker-item">
            <span className="sym">TURNOVER:</span>
            <span className="price">NPR {(summary.totalTurnover / 1e7).toFixed(2)} Cr</span>
          </div>
        )}

        {marqueeScrips.map((c) => {
          const isUp = c.change >= 0;
          return (
            <div
              key={c.symbol}
              className={`nepse-ticker-item ${isUp ? 'up' : 'down'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectCompany(c.symbol)}
              title={`Click to view ${c.name}`}
            >
              <span className="sym">{c.symbol}</span>
              <span className="price">{c.ltp.toFixed(2)}</span>
              <span className="change">
                {isUp ? '▲ +' : '▼ '}{c.change.toFixed(1)} ({isUp ? '+' : ''}{c.pChange.toFixed(2)}%)
              </span>
            </div>
          );
        })}

        {/* Duplicate Track for Smooth Infinite Loop */}
        {summary && (
          <div className={`nepse-ticker-item ${isIndexBull ? 'up' : 'down'}`}>
            <span className="sym">NEPSE INDEX</span>
            <span className="price">{summary.nepseIndex.toFixed(2)}</span>
            <span className="change">
              {isIndexBull ? '▲ +' : '▼ '}{summary.pointChange.toFixed(2)} ({isIndexBull ? '+' : ''}{summary.percentChange.toFixed(2)}%)
            </span>
          </div>
        )}

        {summary && (
          <div className="nepse-ticker-item">
            <span className="sym">TURNOVER:</span>
            <span className="price">NPR {(summary.totalTurnover / 1e7).toFixed(2)} Cr</span>
          </div>
        )}

        {marqueeScrips.map((c) => {
          const isUp = c.change >= 0;
          return (
            <div
              key={`dup-${c.symbol}`}
              className={`nepse-ticker-item ${isUp ? 'up' : 'down'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectCompany(c.symbol)}
              title={`Click to view ${c.name}`}
            >
              <span className="sym">{c.symbol}</span>
              <span className="price">{c.ltp.toFixed(2)}</span>
              <span className="change">
                {isUp ? '▲ +' : '▼ '}{c.change.toFixed(1)} ({isUp ? '+' : ''}{c.pChange.toFixed(2)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
