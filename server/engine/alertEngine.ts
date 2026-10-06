import { db } from '../db/database.js';
import { getDataProvider } from '../providers/index.js';
import { analyzeTechnicalSetup } from './technicalAnalysis.js';
import { randomUUID } from 'node:crypto';

export interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: string; // PRICE_ABOVE, PRICE_BELOW, SIGNAL_CHANGE
  target_value: number | null;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string;
}

export async function checkUserAlerts(userId: string) {
  const provider = getDataProvider();
  const dsInfo = provider.getDataSourceInfo();

  // If market data is stale, suppress alert evaluation per spec
  if (dsInfo.isStale) {
    return;
  }

  const alerts = db.prepare<[string], AlertRow>(`
    SELECT * FROM alerts WHERE user_id = ? AND is_active = 1
  `).all(userId);

  if (!alerts || alerts.length === 0) return;

  const demoNotice = provider.isDemo() ? ' [Demo Feed]' : '';

  for (const alert of alerts) {
    const details = await provider.getCompanyDetails(alert.symbol);
    if (!details || details.dataStatus === 'STALE' || details.dataStatus === 'UNAVAILABLE') {
      continue;
    }

    const candles = await provider.getHistoricalCandles(alert.symbol, '3M');
    const technical = analyzeTechnicalSetup(alert.symbol, candles, { isStale: false });
    const ltp = details.ltp;

    let shouldTrigger = false;
    let title = '';
    let message = '';

    if (alert.alert_type === 'PRICE_ABOVE' && alert.target_value !== null) {
      if (ltp >= alert.target_value) {
        shouldTrigger = true;
        title = `Price Target Reached: ${alert.symbol}${demoNotice}`;
        message = `${alert.symbol} traded at NPR ${ltp}, crossing your above target of NPR ${alert.target_value}.`;
      }
    } else if (alert.alert_type === 'PRICE_BELOW' && alert.target_value !== null) {
      if (ltp <= alert.target_value) {
        shouldTrigger = true;
        title = `Price Dip Alert: ${alert.symbol}${demoNotice}`;
        message = `${alert.symbol} touched NPR ${ltp}, dipping below your alert threshold of NPR ${alert.target_value}.`;
      }
    } else if (alert.alert_type === 'SIGNAL_CHANGE') {
      if (technical.signal === 'POTENTIAL_BUY_SETUP' || technical.signal === 'POTENTIAL_SELL_SETUP') {
        shouldTrigger = true;
        title = `Technical Signal Alert: ${alert.symbol}${demoNotice}`;
        message = `${alert.symbol} generated a "${technical.signalLabelEn}" setup (${technical.reasonsEn[0] || ''}).`;
      }
    }

    if (shouldTrigger) {
      // Deduplication: check if triggered within the last 8 hours
      if (alert.last_triggered_at) {
        const lastTrigger = new Date(alert.last_triggered_at).getTime();
        const now = Date.now();
        if (now - lastTrigger < 8 * 3600 * 1000) {
          // Already notified recently; avoid spam
          continue;
        }
      }

      // Record notification
      const notifId = randomUUID();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, symbol, alert_type, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(notifId, userId, title, message, alert.symbol, alert.alert_type);

      // Update last_triggered_at
      db.prepare(`
        UPDATE alerts SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(alert.id);
    }
  }
}
