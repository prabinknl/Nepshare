import React from 'react';
import { PredictiveOutlookResult } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';

interface PredictiveOutlookProps {
  predictions: PredictiveOutlookResult | null;
  onRefresh?: () => void;
}

export const PredictiveOutlook: React.FC<PredictiveOutlookProps> = ({ predictions, onRefresh }) => {
  const { lang, t, formatCurrency } = useLanguage();

  if (!predictions) return null;

  if (!predictions.isAvailable) {
    return (
      <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--color-neutral)' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-neutral)' }}>
          {t.predictions.unavailable}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {lang === 'ne' ? predictions.descriptiveTrendNe : predictions.descriptiveTrendEn}
        </p>
      </div>
    );
  }

  const { nextSession, next5Sessions, validation } = predictions;

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem' }}>{t.predictions.title}</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Generated: {predictions.generatedAtNPT}
          </span>
        </div>

        {onRefresh && (
          <button className="btn btn-secondary btn-sm" onClick={onRefresh} title="Refresh statistical scenario projections">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Descriptive Trend */}
      <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', color: 'var(--text-main)', borderLeft: '3px solid var(--color-primary)' }}>
        {lang === 'ne' ? predictions.descriptiveTrendNe : predictions.descriptiveTrendEn}
      </div>

      {/* Horizons Grid (1-Day vs 5-Day) */}
      <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Next Session (1 Day) */}
        {nextSession && (
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{lang === 'ne' ? nextSession.horizonLabelNe : nextSession.horizonLabelEn}</span>
              <span className="badge badge-slate" style={{ fontSize: '0.68rem' }}>1 Session</span>
            </div>

            {/* Bullish */}
            <div style={{ marginBottom: '0.75rem', padding: '0.65rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-bull)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-bull">▲ {t.predictions.bullishScenario}</span>
                <span>{nextSession.bullish.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(nextSession.bullish.range.low)} - {formatCurrency(nextSession.bullish.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? nextSession.bullish.descriptionNe : nextSession.bullish.descriptionEn}
              </div>
            </div>

            {/* Neutral */}
            <div style={{ marginBottom: '0.75rem', padding: '0.65rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-neutral)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-muted">■ {t.predictions.neutralScenario}</span>
                <span>{nextSession.neutral.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(nextSession.neutral.range.low)} - {formatCurrency(nextSession.neutral.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? nextSession.neutral.descriptionNe : nextSession.neutral.descriptionEn}
              </div>
            </div>

            {/* Bearish */}
            <div style={{ padding: '0.65rem', background: 'rgba(244, 63, 94, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-bear)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-bear">▼ {t.predictions.bearishScenario}</span>
                <span>{nextSession.bearish.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(nextSession.bearish.range.low)} - {formatCurrency(nextSession.bearish.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? nextSession.bearish.descriptionNe : nextSession.bearish.descriptionEn}
              </div>
            </div>
          </div>
        )}

        {/* Next 5 Sessions (1 Week) */}
        {next5Sessions && (
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-purple)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{lang === 'ne' ? next5Sessions.horizonLabelNe : next5Sessions.horizonLabelEn}</span>
              <span className="badge badge-slate" style={{ fontSize: '0.68rem' }}>5 Sessions</span>
            </div>

            {/* Bullish */}
            <div style={{ marginBottom: '0.75rem', padding: '0.65rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-bull)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-bull">▲ {t.predictions.bullishScenario}</span>
                <span>{next5Sessions.bullish.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(next5Sessions.bullish.range.low)} - {formatCurrency(next5Sessions.bullish.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? next5Sessions.bullish.descriptionNe : next5Sessions.bullish.descriptionEn}
              </div>
            </div>

            {/* Neutral */}
            <div style={{ marginBottom: '0.75rem', padding: '0.65rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-neutral)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-muted">■ {t.predictions.neutralScenario}</span>
                <span>{next5Sessions.neutral.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(next5Sessions.neutral.range.low)} - {formatCurrency(next5Sessions.neutral.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? next5Sessions.neutral.descriptionNe : next5Sessions.neutral.descriptionEn}
              </div>
            </div>

            {/* Bearish */}
            <div style={{ padding: '0.65rem', background: 'rgba(244, 63, 94, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-bear)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                <span className="text-bear">▼ {t.predictions.bearishScenario}</span>
                <span>{next5Sessions.bearish.probabilityCalibratedPct}% {t.predictions.calibratedChance}</span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {formatCurrency(next5Sessions.bearish.range.low)} - {formatCurrency(next5Sessions.bearish.range.high)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {lang === 'ne' ? next5Sessions.bearish.descriptionNe : next5Sessions.bearish.descriptionEn}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Walk-Forward Validation & Benchmark Results */}
      {validation && (
        <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid var(--color-primary-border)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', marginBottom: '0.65rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>{t.predictions.validationTitle}</span>
          </div>

          <div className="grid-3" style={{ gap: '0.85rem', marginBottom: '0.65rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.predictions.outOfSampleAccuracy}</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {validation.directionalAccuracyPct}% ({validation.testSessionsCount} Sessions)
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Net Return (Net of NEPSE Fees)</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }} className={validation.modelStrategyNetReturnPct >= 0 ? 'text-bull' : 'text-bear'}>
                {validation.modelStrategyNetReturnPct >= 0 ? `+${validation.modelStrategyNetReturnPct}%` : `${validation.modelStrategyNetReturnPct}%`}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.predictions.baselineComparison}</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }} className={validation.baselineBuyAndHoldReturnPct >= 0 ? 'text-bull' : 'text-bear'}>
                {validation.baselineBuyAndHoldReturnPct >= 0 ? `+${validation.baselineBuyAndHoldReturnPct}%` : `${validation.baselineBuyAndHoldReturnPct}%`}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {lang === 'ne' ? validation.methodologyNe : validation.methodologyEn}
          </p>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        ⚠️ {lang === 'ne' ? predictions.disclaimerNe : predictions.disclaimerEn}
      </div>
    </div>
  );
};
