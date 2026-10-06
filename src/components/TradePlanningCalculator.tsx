import React, { useState, useEffect } from 'react';
import { TradePlanResult } from '../types/index.js';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';

interface TradePlanningCalculatorProps {
  symbol: string;
  currentPrice: number;
}

export const TradePlanningCalculator: React.FC<TradePlanningCalculatorProps> = ({
  symbol,
  currentPrice
}) => {
  const { lang, formatCurrency } = useLanguage();
  const { isAuthenticated, openAuthModal } = useAuth();

  // Inputs
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice || 100);
  const [quantity, setQuantity] = useState<number>(100);
  const [targetPrice, setTargetPrice] = useState<number>(Math.round(currentPrice * 1.15 * 10) / 10);
  const [stopLossPrice, setStopLossPrice] = useState<number>(Math.round(currentPrice * 0.93 * 10) / 10);

  // Configurable fees
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [useCustomBroker, setUseCustomBroker] = useState<boolean>(false);
  const [customBrokerRate, setCustomBrokerRate] = useState<number>(0.34);
  const [cgtRate, setCgtRate] = useState<number>(7.5); // 7.5% (< 365 days) or 5.0% (> 365 days)
  const [dpFee, setDpFee] = useState<number>(25.0);
  const [sebonFeeRate, setSebonFeeRate] = useState<number>(0.015);

  // Calculation output state
  const [result, setResult] = useState<TradePlanResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Synchronize when currentPrice changes
  useEffect(() => {
    if (currentPrice > 0) {
      setEntryPrice(currentPrice);
      setTargetPrice(Math.round(currentPrice * 1.15 * 10) / 10);
      setStopLossPrice(Math.round(currentPrice * 0.93 * 10) / 10);
    }
  }, [currentPrice]);

  // Recalculate whenever inputs change
  useEffect(() => {
    if (entryPrice <= 0 || quantity <= 0) {
      setCalcError('Entry price and quantity must be positive.');
      setResult(null);
      return;
    }
    if (targetPrice <= entryPrice) {
      setCalcError('Target price should be higher than planned purchase price for long setups.');
    } else if (stopLossPrice >= entryPrice) {
      setCalcError('Stop-loss price should be lower than planned purchase price.');
    } else {
      setCalcError(null);
    }

    try {
      const { calculateTradePlan } = require('../../server/engine/beforeYouBuyEngine.js');
      // If client cannot require directly, call backend
    } catch {
      // Use client-side calculation or fetch
    }

    // Call API calculate plan
    let active = true;
    api.calculatePlan(symbol, {
      entryPrice,
      quantity,
      targetPrice,
      stopLossPrice,
      brokerRatePct: useCustomBroker ? customBrokerRate : undefined,
      sebonRatePct: sebonFeeRate,
      dpFee,
      cgtRatePct: cgtRate
    })
      .then(res => {
        if (active) setResult(res);
      })
      .catch(err => {
        if (active) setCalcError(err.message || 'Calculation error');
      });

    return () => {
      active = false;
    };
  }, [symbol, entryPrice, quantity, targetPrice, stopLossPrice, useCustomBroker, customBrokerRate, cgtRate, dpFee, sebonFeeRate]);

  const handleSavePlan = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!result) return;

    setIsSaving(true);
    setSaveSuccess(null);
    try {
      await api.saveTradePlan({
        symbol,
        entryPrice,
        quantity,
        targetPrice,
        stopLossPrice,
        brokerRatePct: useCustomBroker ? customBrokerRate : undefined,
        sebonRatePct: sebonFeeRate,
        dpFee,
        cgtRatePct: cgtRate,
        notes: `Trade plan for ${symbol} @ NPR ${entryPrice}`
      });
      setSaveSuccess(`Plan for ${symbol} saved to your profile!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save trade plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRrBadge = (rr: number) => {
    if (rr >= 2.0) {
      return <span className="badge badge-emerald" style={{ fontSize: '0.85rem' }}>🎯 Excellent R:R ({rr}:1)</span>;
    }
    if (rr >= 1.2) {
      return <span className="badge badge-amber" style={{ fontSize: '0.85rem' }}>⚖️ Acceptable R:R ({rr}:1)</span>;
    }
    return <span className="badge badge-rose" style={{ fontSize: '0.85rem' }}>⚠️ Poor R:R ({rr}:1)</span>;
  };

  return (
    <div className="card trade-planner-card" id="section-trade-planner" style={{
      borderTop: '3px solid #10b981'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span>🧮</span>
            <span>{lang === 'ne' ? `${symbol} ट्रेड योजना क्यालकुलेटर` : `${symbol} Trade-Planning Calculator`}</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {lang === 'ne'
              ? 'खरिद, नाफा लक्ष्य र स्टप-लस निर्धारण गरी जोखिम-प्रतिफल (R:R) अनुपात हिसाब गर्नुहोस्।'
              : 'Model entry cost, target net gains, and downside risk with official NEPSE fees & taxes.'}
          </p>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowConfig(!showConfig)}
          style={{ fontSize: '0.78rem' }}
        >
          ⚙️ {showConfig ? (lang === 'ne' ? 'शुल्क लुकाउनुहोस्' : 'Hide Fee Settings') : (lang === 'ne' ? 'शुल्क/कर सेटिङ' : 'Configure Fees & Tax')}
        </button>
      </div>

      {/* Config Drawer */}
      {showConfig && (
        <div style={{
          background: 'var(--bg-surface)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            ⚙️ {lang === 'ne' ? 'नेप्से कारोबार शुल्क तथा पुँजीगत लाभकर सेटिङ' : 'NEPSE Commission & Tax Configuration'}
          </div>
          <div className="grid-4" style={{ gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Broker Commission
              </label>
              <select
                value={useCustomBroker ? 'custom' : 'tiered'}
                onChange={(e) => setUseCustomBroker(e.target.value === 'custom')}
                style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
              >
                <option value="tiered">SEBON Tiered (0.27% - 0.40%)</option>
                <option value="custom">Custom Flat Rate %</option>
              </select>
              {useCustomBroker && (
                <input
                  type="number"
                  step="0.01"
                  value={customBrokerRate}
                  onChange={(e) => setCustomBrokerRate(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.3rem', marginTop: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                  placeholder="e.g. 0.34"
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Capital Gains Tax (CGT)
              </label>
              <select
                value={cgtRate}
                onChange={(e) => setCgtRate(Number(e.target.value))}
                style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
              >
                <option value={7.5}>7.5% (Short-term &lt; 365 Days)</option>
                <option value={5.0}>5.0% (Long-term &gt;= 365 Days)</option>
                <option value={10.0}>10.0% (Institutional Rate)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                SEBON Regulatory Fee
              </label>
              <input
                type="number"
                step="0.001"
                value={sebonFeeRate}
                onChange={(e) => setSebonFeeRate(Number(e.target.value))}
                style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Official rate: 0.015%</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                DP Fee (Per Leg)
              </label>
              <input
                type="number"
                value={dpFee}
                onChange={(e) => setDpFee(Number(e.target.value))}
                style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Flat NPR 25.00</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Fields Grid */}
      <div className="grid-4" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
            {lang === 'ne' ? 'प्रस्तावित खरिद मूल्य (NPR)' : 'Planned Purchase Price (NPR)'}
          </label>
          <input
            type="number"
            step="0.1"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1rem' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Latest LTP: NPR {currentPrice}</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
            {lang === 'ne' ? 'कित्ता (Quantity)' : 'Quantity (Shares)'}
          </label>
          <input
            type="number"
            step="10"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1rem' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Minimum standard lot: 10 kitta</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-bull)', marginBottom: '0.3rem' }}>
            {lang === 'ne' ? 'नाफा लक्ष्य मूल्य (Target NPR)' : 'Target Sell Price (NPR)'}
          </label>
          <input
            type="number"
            step="0.5"
            value={targetPrice}
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-bull)' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Gain: +{entryPrice > 0 ? (((targetPrice - entryPrice) / entryPrice) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-bear)', marginBottom: '0.3rem' }}>
            {lang === 'ne' ? 'स्टप-लस मूल्य (Stop-Loss NPR)' : 'Planned Stop-Loss (NPR)'}
          </label>
          <input
            type="number"
            step="0.5"
            value={stopLossPrice}
            onChange={(e) => setStopLossPrice(Number(e.target.value))}
            style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-bear)' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Cut: {entryPrice > 0 ? (((stopLossPrice - entryPrice) / entryPrice) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      {/* Validation alert */}
      {calcError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-bear)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          ⚠️ {calcError}
        </div>
      )}

      {/* Calculated Results Box */}
      {result && (
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1rem'
        }}>
          {/* Header R:R summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'ne' ? 'जोखिम-प्रतिफल अनुपात' : 'Reward-to-Risk (R:R) Ratio'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: result.rewardToRiskRatio >= 1.5 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                  {result.rewardToRiskRatio > 0 ? `${result.rewardToRiskRatio}:1` : 'N/A'}
                </span>
                {getRrBadge(result.rewardToRiskRatio)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'ne' ? 'कुल खरिद लगानी (सबै शुल्क सहित)' : 'Total Purchase Investment (All Fees Included)'}
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                {formatCurrency(result.totalPurchaseCost)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Break-even: NPR {result.breakEvenPrice.toFixed(1)} / share
              </div>
            </div>
          </div>

          {/* Target vs Stop Comparison Grid */}
          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Target Outcome */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-bull)', marginBottom: '0.4rem' }}>
                🎯 {lang === 'ne' ? 'लक्ष्य प्राप्त भएमा (Target Outcome)' : 'If Target Reached'} @ NPR {result.targetPrice}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Selling Amount:</span>
                <span>{formatCurrency(result.targetTurnover)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selling Fees (Broker+SEBON+DP):</span>
                <span>- {formatCurrency(result.targetTotalSellFees)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Capital Gains Tax (CGT {cgtRate}%):</span>
                <span>- {formatCurrency(result.targetCgt)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Estimated Net Profit:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-bull)' }}>
                  +{formatCurrency(result.targetNetProfit)} (+{result.targetRoiPct}%)
                </span>
              </div>
            </div>

            {/* Stop Loss Outcome */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-bear)', marginBottom: '0.4rem' }}>
                🛑 {lang === 'ne' ? 'स्टप-लसमा बाहिरिँदा (Stop Outcome)' : 'If Stop-Loss Triggered'} @ NPR {result.stopLossPrice}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Exit Turnover:</span>
                <span>{formatCurrency(result.stopTurnover)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Exit Fees (Broker+SEBON+DP):</span>
                <span>- {formatCurrency(result.stopTotalSellFees)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Capital Gains Tax:</span>
                <span>NPR 0.00 (No gain)</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Total Net Loss:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-bear)' }}>
                  -{formatCurrency(result.stopNetLoss)} (-{result.stopLossPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Save plan */}
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {saveSuccess && (
              <span style={{ color: 'var(--color-bull)', fontSize: '0.82rem', fontWeight: 600 }}>
                ✓ {saveSuccess}
              </span>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSavePlan}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (lang === 'ne' ? 'यो योजना सेभ गर्नुहोस्' : 'Save Plan to My Profile')}
            </button>
          </div>
        </div>
      )}

      {/* Critical Stop-Loss Caveat Notice */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem 1rem',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        lineHeight: '1.5'
      }}>
        <strong>⚠️ {lang === 'ne' ? 'महत्वपूर्ण योजनागत सतर्कता:' : 'Critical Trade Planning Caveat:'}</strong>
        <ul style={{ margin: '0.35rem 0 0 1.1rem', padding: 0 }}>
          <li>
            {lang === 'ne'
              ? 'स्टप-लस मूल्य एक योजनागत सीमा मात्र हो, ग्यारेन्टी गरिएको कार्यान्वयन मूल्य होइन। नेप्से प्रणालीमा स्वचालित स्टप-लस अर्डर हुँदैन; आफ्नो ब्रोकर टीएमएस (TMS) मा म्यानुअल रुपमा अर्डर दिनुपर्छ।'
              : 'A stop-loss price is a risk planning boundary, NOT a guaranteed execution price. NEPSE trading system does not support automatic stop-market execution; orders must be monitored and entered manually in TMS.'}
          </li>
          <li>
            {lang === 'ne'
              ? 'न्यून तरलता भएका कम्पनी वा मूल्य ग्याप-डाउन भएको अवस्थामा वास्तविक बिक्री मूल्य स्टप-लस भन्दा निकै कम हुन सक्छ।'
              : 'Actual execution prices may gap lower during circuit breaks, market freezes, or in thinly traded scrips.'}
          </li>
          <li>
            {lang === 'ne'
              ? 'यो क्यालकुलेटर व्यक्तिगत अध्ययन र योजनाका लागि मात्र हो, यसले कुनै पनि सेयर खरिदबिक्री गर्दैन।'
              : 'This calculator is strictly an educational planning aid and does not place or guarantee trades.'}
          </li>
        </ul>
      </div>
    </div>
  );
};
