import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { getDataProvider } from '../providers/index.js';
import {
  estimateNepseFees,
  processPortfolioTransactions,
  TransactionInput
} from '../engine/portfolioEngine.js';

const router = Router();

interface DbTransactionRow {
  id: string;
  user_id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  transaction_date: string;
  broker_fee: number;
  sebon_fee: number;
  dp_fee: number;
  cgt_fee: number;
  total_amount: number;
  is_custom_fee: number;
  notes: string | null;
  created_at: string;
}

// Preview NEPSE fee calculation
router.post('/calculate-fees', (req, res: Response) => {
  try {
    const { quantity, price, isSell } = req.body;
    const qty = Number(quantity);
    const prc = Number(price);

    if (!qty || !prc || qty <= 0 || prc <= 0) {
      res.status(400).json({ error: 'Valid quantity and price are required.' });
      return;
    }

    const turnover = Math.round(qty * prc * 100) / 100;
    const breakdown = estimateNepseFees(turnover, Boolean(isSell));
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Fee calculation failed.' });
  }
});

// Get portfolio overview & holdings
router.get('/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txRows = db.prepare<[string], DbTransactionRow>(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date ASC
    `).all(userId);

    const transactions: TransactionInput[] = txRows.map(r => ({
      id: r.id,
      userId: r.user_id,
      symbol: r.symbol,
      type: r.type as 'BUY' | 'SELL',
      quantity: r.quantity,
      price: r.price,
      transactionDate: r.transaction_date,
      brokerFee: r.broker_fee,
      sebonFee: r.sebon_fee,
      dpFee: r.dp_fee,
      cgtFee: r.cgt_fee,
      totalAmount: r.total_amount,
      isCustomFee: r.is_custom_fee === 1,
      notes: r.notes || undefined
    }));

    // Fetch current quotes for all traded symbols
    const provider = getDataProvider();
    const symbols = Array.from(new Set(transactions.map(t => t.symbol)));
    const quoteMap: Record<string, { ltp: number; change: number; sector: string }> = {};

    await Promise.all(
      symbols.map(async sym => {
        const details = await provider.getCompanyDetails(sym);
        if (details) {
          quoteMap[sym] = {
            ltp: details.ltp,
            change: details.change,
            sector: details.sector
          };
        }
      })
    );

    const summary = processPortfolioTransactions(transactions, quoteMap);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate portfolio summary.' });
  }
});

// Get user transaction history
router.get('/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transactions = db.prepare<[string], DbTransactionRow>(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, created_at DESC
    `).all(userId);

    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transactions.' });
  }
});

// Add transaction (BUY or SELL)
router.post('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      symbol,
      type,
      quantity,
      price,
      transactionDate,
      isCustomFee,
      brokerFee,
      sebonFee,
      dpFee,
      cgtFee,
      notes
    } = req.body;

    if (!symbol || !type || !quantity || !price || !transactionDate) {
      res.status(400).json({ error: 'Symbol, type (BUY/SELL), quantity, price, and transactionDate are required.' });
      return;
    }

    if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
      res.status(400).json({ error: 'Type must be BUY or SELL.' });
      return;
    }

    const sym = symbol.trim().toUpperCase();
    const qty = parseInt(quantity, 10);
    const prc = parseFloat(price);

    if (qty <= 0 || prc <= 0) {
      res.status(400).json({ error: 'Quantity and price must be greater than zero.' });
      return;
    }

    const turnover = Math.round(qty * prc * 100) / 100;
    let bFee = 0;
    let sFee = 0;
    let dFee = 0;
    let cgt = 0;
    let totalAmt = 0;

    if (isCustomFee) {
      bFee = Number(brokerFee) || 0;
      sFee = Number(sebonFee) || 0;
      dFee = Number(dpFee) || 0;
      cgt = Number(cgtFee) || 0;
      const totalFees = bFee + sFee + dFee + cgt;
      totalAmt = type.toUpperCase() === 'BUY' ? (turnover + totalFees) : (turnover - totalFees);
    } else {
      const estimated = estimateNepseFees(turnover, type.toUpperCase() === 'SELL');
      bFee = estimated.brokerFee;
      sFee = estimated.sebonFee;
      dFee = estimated.dpFee;
      cgt = 0; // standard estimated before user confirms CGT
      const totalFees = bFee + sFee + dFee;
      totalAmt = type.toUpperCase() === 'BUY' ? (turnover + totalFees) : (turnover - totalFees);
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO transactions (
        id, user_id, symbol, type, quantity, price, transaction_date,
        broker_fee, sebon_fee, dp_fee, cgt_fee, total_amount, is_custom_fee, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      sym,
      type.toUpperCase(),
      qty,
      prc,
      transactionDate,
      bFee,
      sFee,
      dFee,
      cgt,
      Math.round(totalAmt * 100) / 100,
      isCustomFee ? 1 : 0,
      notes ? notes.trim() : null
    );

    res.status(201).json({
      message: `${type.toUpperCase()} transaction for ${qty} shares of ${sym} recorded.`,
      id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record transaction.' });
  }
});

// Delete a transaction
router.delete('/transactions/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const info = db.prepare(`
      DELETE FROM transactions WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (info.changes === 0) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    res.json({ message: 'Transaction removed from portfolio.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete transaction.' });
  }
});

export default router;
