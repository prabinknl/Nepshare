import React from 'react';
import { SectorSpecificMetrics } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';

interface SectorAnalysisCardProps {
  sectorMetrics: SectorSpecificMetrics | null;
  sectorName: string;
}

export const SectorAnalysisCard: React.FC<SectorAnalysisCardProps> = ({ sectorMetrics, sectorName }) => {
  const { lang, formatCurrency } = useLanguage();

  if (!sectorMetrics) {
    return null;
  }

  const { sectorType, banking, hydropower, insurance, nonFinancial } = sectorMetrics;

  return (
    <div className="card sector-analysis-card" id="section-sector-metrics" style={{
      borderTop: '3px solid var(--color-primary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span>🏢</span>
            <span>
              {lang === 'ne'
                ? `क्षेत्रगत विशिष्ट विश्लेषण (${sectorName})`
                : `Sector-Specific Analysis (${sectorName})`}
            </span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {lang === 'ne'
              ? 'यस क्षेत्रका लागि मात्र सान्दर्भिक नियामक तथा सञ्चालन सूचकहरू (बैंक तथा बीमामा सामान्य ऋण-पूँजी अनुपात लागू हुँदैन)।'
              : 'Metrics tailored specifically to this sector. Traditional non-financial ratios are excluded where inapplicable.'}
          </p>
        </div>
      </div>

      {/* 1. BANKING METRICS */}
      {sectorType === 'BANKING' && banking && (
        <div>
          <div className="grid-4" style={{ gap: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'खराब कर्जा अनुपात (NPL)' : 'Non-Performing Loan (NPL)'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: banking.nplRatio > 4.0 ? 'var(--color-bear)' : banking.nplRatio < 2.0 ? 'var(--color-bull)' : 'var(--text-main)' }}>
                {banking.nplRatio.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {banking.nplRatio < 2.5 ? (lang === 'ne' ? 'न्यून जोखिम' : 'Healthy credit quality') : (lang === 'ne' ? 'थप प्रोभिजनिङ जोखिम' : 'Watch provision strain')}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'पूँजी कोष पर्याप्तता (CAR)' : 'Capital Adequacy Ratio (CAR)'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: banking.capitalAdequacyRatio < banking.regulatoryCarMin + 0.5 ? 'var(--color-bear)' : 'var(--color-bull)' }}>
                {banking.capitalAdequacyRatio.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                NRB Minimum: {banking.regulatoryCarMin.toFixed(1)}% (Unified Directive 2080)
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'कर्जा नोक्सानी व्यवस्था' : 'Loan Loss Provisions'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {formatCurrency(banking.loanLossProvision)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Total impairment buffer held
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'वितरणयोग्य नाफा / ईपीएस' : 'Distributable Profit / EPS'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                NPR {banking.distributableEps.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Total: {formatCurrency(banking.distributableProfit)}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 120, 215, 0.04)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            ℹ️ <strong>Banking Context:</strong> Commercial banks maintain customer deposits as liabilities and customer loans as assets; traditional non-financial Debt-to-Equity or EBITDA multiples are not applicable under NRB accounting standards.
          </div>
        </div>
      )}

      {/* 2. HYDROPOWER METRICS */}
      {sectorType === 'HYDROPOWER' && hydropower && (
        <div>
          <div className="grid-3" style={{ gap: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'सञ्चालन स्थिति र क्षमता' : 'Status & Installed Capacity'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: hydropower.operationalStatus === 'OPERATIONAL' ? 'var(--color-bull)' : 'var(--color-amber)' }}>
                {hydropower.installedCapacityMW} MW
              </div>
              <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                <span className={`badge ${hydropower.operationalStatus === 'OPERATIONAL' ? 'badge-emerald' : 'badge-amber'}`}>
                  {hydropower.operationalStatus}
                </span>
                {hydropower.projectProgressPct && <span> ({hydropower.projectProgressPct}% done)</span>}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'आयोजना ऋण र पूँजी अनुपात' : 'Project Borrowing & Debt-Equity'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {formatCurrency(hydropower.projectDebt)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Debt-to-Equity: {hydropower.debtEquityRatio}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'वार्षिक उत्पादन र भार क्षमता' : 'Generation & Plant Load Factor'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {hydropower.actualGenerationGWh ? `${hydropower.actualGenerationGWh} GWh` : 'Under commissioning'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                PLF: {hydropower.plantLoadFactorPct ? `${hydropower.plantLoadFactorPct}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Seasonal River Flow Profile */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--color-bull)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-bull)', marginBottom: '0.25rem' }}>
              🌊 {lang === 'ne' ? 'मौसमी उत्पादन चक्र (Run-of-River)' : 'Seasonal Run-of-River Production Cycle'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
              {lang === 'ne' ? hydropower.seasonalProductionNoteNe : hydropower.seasonalProductionNoteEn}
            </p>
          </div>

          {/* PPA Details */}
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
            <strong>⚡ {lang === 'ne' ? 'विद्युत खरिद सम्झौता (PPA):' : 'Power Purchase Agreement (PPA):'}</strong> {hydropower.ppaDetails}
            {hydropower.materialDisruptions && (
              <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                <strong>⚠️ Grid / Outage Notice:</strong> {hydropower.materialDisruptions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. INSURANCE METRICS */}
      {sectorType === 'INSURANCE' && insurance && (
        <div>
          <div className="grid-4" style={{ gap: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'सल्भेन्सी अनुपात' : 'Solvency Margin Ratio'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: insurance.solvencyRatio < insurance.regulatorySolvencyMin ? 'var(--color-bear)' : 'var(--color-bull)' }}>
                {insurance.solvencyRatio.toFixed(2)}x
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Insurance Authority Min: {insurance.regulatorySolvencyMin.toFixed(2)}x
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'दाबी भुक्तानी अनुभव' : 'Claims Experience Ratio'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {insurance.claimsExperiencePct.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Net claims incurred / Net premium
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {insurance.insuranceType === 'LIFE'
                  ? (lang === 'ne' ? 'जीवन बीमा कोष' : 'Life Insurance Fund')
                  : (lang === 'ne' ? 'संयुक्त अनुपात' : 'Combined Ratio')}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {insurance.lifeInsuranceFund ? formatCurrency(insurance.lifeInsuranceFund) : `${insurance.combinedRatioPct || 92.4}%`}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {insurance.insuranceType === 'LIFE' ? 'Actuarial policyholder reserve' : 'Underwriting efficiency'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'बीमालेख निरन्तरता' : 'Persistency / Underwriting'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {insurance.persistencyRatioPct ? `${insurance.persistencyRatioPct}%` : formatCurrency(insurance.underwritingProfit)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {insurance.persistencyRatioPct ? '13th month renewal rate' : 'Net underwriting profit'}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 120, 215, 0.04)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            ℹ️ <strong>Insurance Context:</strong> Evaluated under Nepal Insurance Authority (Bima Samiti) directives. Life insurance earnings depend primarily on periodic actuarial valuation surpluses rather than quarterly operating EBITDA.
          </div>
        </div>
      )}

      {/* 4. NON-FINANCIAL / MANUFACTURING */}
      {sectorType === 'NON_FINANCIAL' && nonFinancial && (
        <div>
          <div className="grid-3" style={{ gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'ऋण र पूँजी अनुपात (Debt/Equity)' : 'Debt-to-Equity Ratio'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: nonFinancial.debtToEquity > 1.5 ? 'var(--color-bear)' : 'var(--color-bull)' }}>
                {nonFinancial.debtToEquity.toFixed(2)}x
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {nonFinancial.debtToEquity < 1.0 ? 'Conservative debt leverage' : 'Leveraged balance sheet'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'ब्याज कभरेज अनुपात' : 'Interest Coverage Ratio'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: nonFinancial.interestCoverageRatio < 1.8 ? 'var(--color-bear)' : 'var(--color-bull)' }}>
                {nonFinancial.interestCoverageRatio.toFixed(2)}x
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                EBITDA / Annual interest charges
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {lang === 'ne' ? 'सञ्चालन नगद प्रवाह (OCF)' : 'Operating Cash Flow'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: nonFinancial.operatingCashFlow > 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                {formatCurrency(nonFinancial.operatingCashFlow)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Actual cash generated from sales
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
