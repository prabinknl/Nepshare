import { Router, Response } from 'express';
import { getDataProvider } from '../providers/index.js';

const router = Router();

router.get('/summary', async (_req, res: Response) => {
  try {
    const provider = getDataProvider();
    const summary = await provider.getMarketSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch market summary.' });
  }
});

router.get('/top-movers', async (_req, res: Response) => {
  try {
    const provider = getDataProvider();
    const movers = await provider.getTopMovers();
    res.json(movers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch top movers.' });
  }
});

router.get('/announcements', async (req, res: Response) => {
  try {
    const provider = getDataProvider();
    const symbol = req.query.symbol as string | undefined;
    const announcements = await provider.getAnnouncements(symbol);
    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch announcements.' });
  }
});

router.get('/news', async (_req, res: Response) => {
  try {
    const provider = getDataProvider();
    const news = await provider.getMarketNews();
    res.json(news);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch market news.' });
  }
});

router.get('/sectors', async (_req, res: Response) => {
  try {
    const provider = getDataProvider();
    const companies = await provider.getCompanies();
    const sectorMap: Record<string, { count: number; totalTurnover: number; sectorNe?: string }> = {};

    for (const c of companies) {
      if (!sectorMap[c.sector]) {
        sectorMap[c.sector] = { count: 0, totalTurnover: 0, sectorNe: c.sectorNe };
      }
      sectorMap[c.sector].count += 1;
      sectorMap[c.sector].totalTurnover += c.turnover;
    }

    const sectors = Object.entries(sectorMap).map(([sector, data]) => ({
      name: sector,
      nameNe: data.sectorNe,
      companyCount: data.count,
      totalTurnover: data.totalTurnover
    }));

    res.json(sectors);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sectors.' });
  }
});

// AI Market Breadth & Sentiment Synthesis
router.get('/ai-analysis', async (_req, res: Response) => {
  try {
    const { generateAiMarketAnalysis } = await import('../engine/aiMarketAnalysis.js');
    const analysis = await generateAiMarketAnalysis();
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate AI market analysis.' });
  }
});

export default router;
