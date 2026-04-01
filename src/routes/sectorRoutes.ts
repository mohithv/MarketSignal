import express from 'express';
import { fetchNews } from '../clients/newsClient.js';
import { analyzeSentiment } from '../clients/sentimentClient.js';
import { scoreSectors } from '../services/sectorService.js';

const router = express.Router();

router.get("/sector-analysis", async (req, res, next) => {
  try {
    const news = await fetchNews();

    const sentimentResults = await Promise.all(
      news.slice(0, 10).map(async (text) => {
        const sentiment = await analyzeSentiment(text);
        return { text, ...sentiment };
      })
    );

    const ranked = scoreSectors(sentimentResults);

    res.json({
      topSector: ranked[0],
      allSectors: ranked
    });
  } catch (err) {
    next(err);
  }
});

export default router;