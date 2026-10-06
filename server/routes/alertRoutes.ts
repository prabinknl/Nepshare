import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { checkUserAlerts, AlertRow } from '../engine/alertEngine.js';

const router = Router();

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  symbol: string | null;
  alert_type: string | null;
  is_read: number;
  created_at: string;
}

// Get user alerts
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Evaluate alerts to ensure fresh state
    await checkUserAlerts(userId);

    const alerts = db.prepare<[string], AlertRow>(`
      SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);

    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch alerts.' });
  }
});

// Create new alert
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { symbol, alertType, targetValue } = req.body;

    if (!symbol || !alertType) {
      res.status(400).json({ error: 'Symbol and alertType are required.' });
      return;
    }

    if (!['PRICE_ABOVE', 'PRICE_BELOW', 'SIGNAL_CHANGE'].includes(alertType)) {
      res.status(400).json({ error: 'Invalid alertType. Must be PRICE_ABOVE, PRICE_BELOW, or SIGNAL_CHANGE.' });
      return;
    }

    if (alertType !== 'SIGNAL_CHANGE' && (targetValue === undefined || targetValue === null || Number(targetValue) <= 0)) {
      res.status(400).json({ error: 'A positive target price is required for price alerts.' });
      return;
    }

    const sym = symbol.trim().toUpperCase();
    const id = randomUUID();
    const val = alertType === 'SIGNAL_CHANGE' ? null : Number(targetValue);

    db.prepare(`
      INSERT INTO alerts (id, user_id, symbol, alert_type, target_value, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, userId, sym, alertType, val);

    // Evaluate immediately
    await checkUserAlerts(userId);

    res.status(201).json({ message: 'Alert created successfully.', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create alert.' });
  }
});

// Toggle alert active state
router.patch('/:id/toggle', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const alert = db.prepare<[string, string], AlertRow>(`
      SELECT * FROM alerts WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }

    const newActive = alert.is_active === 1 ? 0 : 1;
    db.prepare(`UPDATE alerts SET is_active = ? WHERE id = ?`).run(newActive, id);

    res.json({ message: `Alert ${newActive ? 'enabled' : 'disabled'}.`, isActive: newActive === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to toggle alert.' });
  }
});

// Delete alert
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const info = db.prepare(`
      DELETE FROM alerts WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (info.changes === 0) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }

    res.json({ message: 'Alert deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete alert.' });
  }
});

// Get user notifications
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = db.prepare<[string], NotificationRow>(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(userId);

    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications.' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
    `).run(id, userId);

    res.json({ message: 'Marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update notification.' });
  }
});

// Clear all notifications
router.post('/notifications/clear-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(userId);
    res.json({ message: 'All notifications cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear notifications.' });
  }
});

export default router;
