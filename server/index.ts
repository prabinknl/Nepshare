import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/authRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import tradePlanRoutes from './routes/tradePlanRoutes.js';
import { getDataProvider } from './providers/index.js';

// Initialize persistent SQLite tables
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  const provider = getDataProvider();
  res.json({
    status: 'healthy',
    app: 'Nepshare',
    version: '1.0.0',
    dataSource: provider.getDataSourceInfo()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trade-plans', tradePlanRoutes);

// In production, serve frontend client build
const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Express 5 SPA fallback
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🇳🇵 Nepshare Server running at http://localhost:${PORT}`);
  console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'} | Data Provider: ${getDataProvider().getDataSourceInfo().providerName}`);
});
