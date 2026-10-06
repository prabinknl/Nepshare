import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { calculateTradePlan } from '../engine/beforeYouBuyEngine.js';
import { getDataProvider } from '../providers/index.js';

const router = Router();

interface TradePlanRow {
  id: string;
  user_id: string;
  symbol: string;
  entry_price: number;
  quantity: number;
  target_price: number;
  stop_loss_price: number;
  total_purchase_cost: number;
  target_net_profit: number;
  stop_net_loss: number;
  reward_to_risk_ratio: number;
  notes: string | null;
  created_at: string;
}

// Get user saved trade plans
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rows = db.prepare<[string], TradePlanRow>(`
      SELECT * FROM trade_plans WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);

    const provider = getDataProvider();
    const enriched = await Promise.all(
      rows.map(async r => {
        const details = await provider.getCompanyDetails(r.symbol);
        return {
          id: r.id,
          userId: r.user_id,
          symbol: r.symbol,
          entryPrice: r.entry_price,
          quantity: r.quantity,
          targetPrice: r.target_price,
          stopLossPrice: r.stop_loss_price,
          totalPurchaseCost: r.total_purchase_cost,
          targetNetProfit: r.target_net_profit,
          stopNetLoss: r.stop_net_loss,
          rewardToRiskRatio: r.reward_to_risk_ratio,
          notes: r.notes,
          createdAt: r.created_at,
          currentLtp: details ? details.ltp : r.entry_price,
          currentChange: details ? details.change : 0,
          currentPChange: details ? details.pChange : 0
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch trade plans.' });
  }
});

// Save a trade plan
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      symbol,
      entryPrice,
      quantity,
      targetPrice,
      stopLossPrice,
      brokerRatePct,
      sebonRatePct,
      dpFee,
      cgtRatePct,
      notes
    } = req.body;

    if (!symbol || !entryPrice || !quantity || !targetPrice || !stopLossPrice) {
      res.status(400).json({ error: 'Symbol, entry price, quantity, target price, and stop loss price are required.' });
      return;
    }

    const calculated = calculateTradePlan({
      symbol: symbol.trim().toUpperCase(),
      entryPrice: Number(entryPrice),
      quantity: Number(quantity),
      targetPrice: Number(targetPrice),
      stopLossPrice: Number(stopLossPrice),
      brokerRatePct: brokerRatePct ? Number(brokerRatePct) : undefined,
      sebonRatePct: sebonRatePct ? Number(sebonRatePct) : undefined,
      dpFee: dpFee ? Number(dpFee) : undefined,
      cgtRatePct: cgtRatePct ? Number(cgtRatePct) : undefined
    });

    const id = randomUUID();
    db.prepare(`
      INSERT INTO trade_plans (
        id, user_id, symbol, entry_price, quantity, target_price, stop_loss_price,
        total_purchase_cost, target_net_profit, stop_net_loss, reward_to_risk_ratio, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      calculated.symbol,
      calculated.entryPrice,
      calculated.quantity,
      calculated.targetPrice,
      calculated.stopLossPrice,
      calculated.totalPurchaseCost,
      calculated.targetNetProfit,
      calculated.stopNetLoss,
      calculated.rewardToRiskRatio,
      notes ? notes.trim() : null
    );

    res.status(201).json({
      message: `Trade plan for ${calculated.symbol} saved successfully.`,
      plan: {
        id,
        ...calculated,
        notes: notes || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save trade plan.' });
  }
});

// Delete a saved trade plan
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;

    const info = db.prepare(`
      DELETE FROM trade_plans WHERE id = ? AND user_id = ?
    `).run(planId, userId);

    if (info.changes === 0) {
      res.status(404).json({ error: 'Trade plan not found.' });
      return;
    }

    res.json({ message: 'Trade plan removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete trade plan.' });
  }
});

export default router;
