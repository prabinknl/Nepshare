import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { getDataProvider } from '../providers/index.js';
import { analyzeTechnicalSetup } from '../engine/technicalAnalysis.js';

const router = Router();

interface WatchlistRow {
  id: string;
  user_id: string;
  symbol: string;
  notes: string | null;
  created_at: string;
}

// Get user watchlist
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = db.prepare<[string], WatchlistRow>(`
      SELECT * FROM watchlist WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);

    const provider = getDataProvider();
    const enriched = await Promise.all(
      items.map(async item => {
        const details = await provider.getCompanyDetails(item.symbol);
        const candles = await provider.getHistoricalCandles(item.symbol, '3M');
        const technical = analyzeTechnicalSetup(item.symbol, candles);

        return {
          id: item.id,
          symbol: item.symbol,
          notes: item.notes,
          addedAt: item.created_at,
          company: details ? {
            name: details.name,
            nameNe: details.nameNe,
            sector: details.sector,
            ltp: details.ltp,
            change: details.change,
            pChange: details.pChange,
            volume: details.volume
          } : null,
          signal: technical.signal,
          signalLabelEn: technical.signalLabelEn,
          signalLabelNe: technical.signalLabelNe,
          badgeColor: technical.badgeColor
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch watchlist.' });
  }
});

// Add to watchlist
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { symbol, notes } = req.body;

    if (!symbol) {
      res.status(400).json({ error: 'Company symbol is required.' });
      return;
    }

    const sym = symbol.trim().toUpperCase();
    const provider = getDataProvider();
    const exists = await provider.getCompanyDetails(sym);
    if (!exists) {
      res.status(404).json({ error: `Company symbol "${sym}" is not recognized in the active feed.` });
      return;
    }

    const id = randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO watchlist (id, user_id, symbol, notes)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, sym, notes ? notes.trim() : null);

    res.status(201).json({ message: `${sym} added to your watchlist.`, id, symbol: sym });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save to watchlist.' });
  }
});

// Remove from watchlist
router.delete('/:symbol', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sym = req.params.symbol.trim().toUpperCase();

    const info = db.prepare(`
      DELETE FROM watchlist WHERE user_id = ? AND symbol = ?
    `).run(userId, sym);

    if (info.changes === 0) {
      res.status(404).json({ error: `${sym} was not in your watchlist.` });
      return;
    }

    res.json({ message: `${sym} removed from your watchlist.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove from watchlist.' });
  }
});

export default router;
