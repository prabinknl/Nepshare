import React, { useState } from 'react';
import { TechnicalSignalResult } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Tooltip } from './Tooltip.js';

interface AdvancedAnalysisProps {
  technical: TechnicalSignalResult | null;
}

export const AdvancedAnalysis: React.FC<AdvancedAnalysisProps> = ({ technical }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, t, formatCurrency } = useLanguage();

  if (!technical) return null;

  const reasons = lang === 'ne' ? technical.reasonsNe : technical.reasonsEn;
  const risks = lang === 'ne' ? technical.risksNe : technical.risksEn;
  const invalidation = lang === 'ne' ? technical.invalidationNe : technical.invalidationEn;
  const holdingPeriod = lang === 'ne' ? technical.intendedHoldingPeriodNe : technical.intendedHoldingPeriodEn;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <button
        className="advanced-accordion-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>{t.company.advancedAnalysis}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isOpen ? 'Collapse' : 'Expand indicators & levels'}
          </span>
          <svg
            className={`accordion-arrow ${isOpen ? 'open' : ''}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          className="card"
          style={{
            marginTop: '0.5rem',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderTop: 'none',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Key Indicators Grid */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Indicator Matrix (Rule Inputs)
            </h4>
            <div className="grid-4">
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.rsi}>RSI (14)</Tooltip>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {technical.indicators.rsi14 !== null ? technical.indicators.rsi14 : 'N/A'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.macd}>MACD Hist</Tooltip>
                </div>
                <div
                  style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}
                  className={technical.indicators.macd && technical.indicators.macd.histogram >= 0 ? 'text-bull' : 'text-bear'}
                >
                  {technical.indicators.macd ? technical.indicators.macd.histogram : 'N/A'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.sma20}>SMA 20</Tooltip>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {technical.indicators.sma20 ? formatCurrency(technical.indicators.sma20) : 'N/A'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.sma50}>SMA 50</Tooltip>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {technical.indicators.sma50 ? formatCurrency(technical.indicators.sma50) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Numerical Setup Boundaries (When supported by data) */}
          <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Execution Levels & Holding Horizon
            </h4>
            <div className="grid-3" style={{ gap: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.support}>{t.predictions.neutralScenario} Support</Tooltip>
                </span>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                  {technical.supportLevel ? formatCurrency(technical.supportLevel) : 'N/A'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Tooltip content={t.tooltips.resistance}>{t.predictions.bullishScenario} Resistance</Tooltip>
                </span>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-neutral)' }}>
                  {technical.resistanceLevel ? formatCurrency(technical.resistanceLevel) : 'N/A'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {t.signals.holdingPeriod}
                </span>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {holdingPeriod}
                </div>
              </div>

              {technical.entryRange && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-bull)' }}>
                    {t.signals.entryRange}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-bull)' }}>
                    {formatCurrency(technical.entryRange.min)} - {formatCurrency(technical.entryRange.max)}
                  </div>
                </div>
              )}

              {technical.stopLoss && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-bear)' }}>
                    <Tooltip content={t.tooltips.stopLoss}>{t.signals.stopLoss}</Tooltip>
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-bear)' }}>
                    {formatCurrency(technical.stopLoss)}
                  </div>
                </div>
              )}

              {technical.exitTarget && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)' }}>
                    {t.signals.exitTarget}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                    {formatCurrency(technical.exitTarget)}
                  </div>
                </div>
              )}

              {technical.riskRewardRatio && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t.signals.riskReward}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {technical.riskRewardRatio}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Triggered Rules Explanation */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {t.signals.whyAppeared}
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Risks & Invalidation */}
          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid var(--color-bear-border)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-bear)', marginBottom: '0.35rem' }}>
                ⚠️ {t.signals.mainRisks}
              </div>
              <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--color-neutral-border)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral)', marginBottom: '0.35rem' }}>
                🛑 {t.signals.invalidation}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {invalidation}
              </p>
            </div>
          </div>

          {/* Non-profit probability disclaimer */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>{t.signals.ruleBasedNotice}</span>
          </div>
        </div>
      )}
    </div>
  );
};
