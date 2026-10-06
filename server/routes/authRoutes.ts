import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { signToken, requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
}

// User Registration
router.post('/register', async (req, res: Response) => {
  try {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password || !fullName) {
      res.status(400).json({ error: 'All fields (username, email, password, fullName) are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = db.prepare<[string, string], UserRow>(`
      SELECT * FROM users WHERE username = ? OR email = ?
    `).get(username.trim().toLowerCase(), email.trim().toLowerCase());

    if (existing) {
      res.status(409).json({ error: 'Username or email is already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = randomUUID();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username.trim().toLowerCase(), email.trim().toLowerCase(), passwordHash, fullName.trim());

    const token = signToken({
      id: userId,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      fullName: fullName.trim()
    });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        fullName: fullName.trim()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register user.' });
  }
});

// User Login
router.post('/login', async (req, res: Response) => {
  try {
    const { loginIdentifier, password } = req.body;
    if (!loginIdentifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const identifier = loginIdentifier.trim().toLowerCase();
    const user = db.prepare<[string, string], UserRow>(`
      SELECT * FROM users WHERE username = ? OR email = ?
    `).get(identifier, identifier);

    if (!user) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name
    });

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to authenticate.' });
  }
});

// Demo Account Instant Sign-In (Creates or returns a pre-configured demo investor account)
router.post('/demo-login', async (_req, res: Response) => {
  try {
    const demoUsername = 'demoinvestor';
    const demoEmail = 'investor@sharenep.demo';
    
    let user = db.prepare<[string], UserRow>(`
      SELECT * FROM users WHERE username = ?
    `).get(demoUsername);

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('DemoInvestor2081!', salt);
      const userId = randomUUID();
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, demoUsername, demoEmail, hash, 'Demo Investor');

      // Pre-seed some demo watchlist items
      db.prepare(`INSERT OR IGNORE INTO watchlist (id, user_id, symbol, notes) VALUES (?, ?, ?, ?)`).run(randomUUID(), userId, 'NABIL', 'Core banking holding');
      db.prepare(`INSERT OR IGNORE INTO watchlist (id, user_id, symbol, notes) VALUES (?, ?, ?, ?)`).run(randomUUID(), userId, 'UPPER', 'Hydropower breakout watch');
      db.prepare(`INSERT OR IGNORE INTO watchlist (id, user_id, symbol, notes) VALUES (?, ?, ?, ?)`).run(randomUUID(), userId, 'SHIVM', 'Manufacturing play');

      // Pre-seed some demo transactions
      db.prepare(`
        INSERT INTO transactions (id, user_id, symbol, type, quantity, price, transaction_date, broker_fee, sebon_fee, dp_fee, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), userId, 'NABIL', 'BUY', 100, 520.0, '2024-05-10', 185.0, 7.8, 25.0, 52217.8);

      db.prepare(`
        INSERT INTO transactions (id, user_id, symbol, type, quantity, price, transaction_date, broker_fee, sebon_fee, dp_fee, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), userId, 'CHCL', 'BUY', 150, 480.0, '2024-06-15', 255.0, 10.8, 25.0, 72290.8);

      db.prepare(`
        INSERT INTO transactions (id, user_id, symbol, type, quantity, price, transaction_date, broker_fee, sebon_fee, dp_fee, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), userId, 'NICA', 'BUY', 100, 410.0, '2024-07-02', 151.7, 6.15, 25.0, 41182.85);

      // Pre-seed an alert
      db.prepare(`
        INSERT INTO alerts (id, user_id, symbol, alert_type, target_value, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(randomUUID(), userId, 'NABIL', 'PRICE_ABOVE', 560.0);

      user = db.prepare<[string], UserRow>(`SELECT * FROM users WHERE username = ?`).get(demoUsername);
    }

    if (!user) {
      res.status(500).json({ error: 'Could not initialize demo user.' });
      return;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name
    });

    res.json({
      message: 'Demo investor session established.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo login failed.' });
  }
});

// Current User Profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
