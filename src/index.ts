import express from 'express';
import { env } from './config/env.js';
import { analysisRouter } from './routes/analysisRoutes.js';
import sectorRouter from './routes/sectorRoutes.js';
import tradingRouter from './routes/tradingRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { apiKeyAuth } from './middleware/authMiddleware.js';
import { startScheduler } from './services/scheduler.js';
import { sendWhatsAppMessage } from './clients/twilioClient.js';
// import connectDB from './config/db.js';
import { getMarketNews } from './clients/finnhubClient.js';

import {
  getPrices,
  mapNewsToStocks,
  STOCKS,
  type MappedNews,
  type NewsArticle,
  type PriceInfo,
  type StockInfo,
} from './services/newsStockMapper.js';
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 100 requests per windowMs
});

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    endpoints: {
      health: 'GET /health',
      analyze: 'POST /analyze',
      sectorAnalysis: 'GET /sector-analysis',
      trading: {
        preOpen: 'GET /api/trading/pre-open',
        topGainers: 'GET /api/trading/top-gainers',
        candidates: 'GET /api/trading/candidates',
      },
    },
  });
});

app.use("/api/",limiter);
app.get('/api/alert-test', async (_req, res) => {
  try {
    const result = await sendWhatsAppMessage('🚀 MarketSignal test alert');

    res.status(200).json({
      ok: true,
      sid: result.sid,
      status: result.status
    });

  } catch (err: any) {
    console.error("❌ Twilio error:", err);

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const news = await getMarketNews();
    const topNews: NewsArticle[] = (news as NewsArticle[]).slice(0, 3);

    const mapped = mapNewsToStocks(topNews, STOCKS);

    // ✅ use mapped data
    const message = `
📰 Smart Market News

${mapped.map((n: MappedNews) => `${n.stock}: ${n.headline}`).join("\n")}
`;

    await sendWhatsAppMessage(message);

    res.json({
      ok: true,
      mapped,
    });

  } catch (err: any) {
    console.error('❌ Finnhub news error:', err);
    res.status(500).json({
      ok: false,
      error: err?.message ?? 'Unknown error',
    });
  }
});

app.get("/api/smart-alert", async (req, res) => {
  try {
    const news = await getMarketNews();
    const topNews: NewsArticle[] = (news as NewsArticle[]).slice(0, 5);

    const mappedNews = mapNewsToStocks(topNews, STOCKS);
    const prices = await getPrices(STOCKS);

    // 🔥 combine
    const insights = prices.map((stock: PriceInfo) => {
      const relatedNews = mappedNews.find((n: MappedNews) => n.stock === stock.name);

      let reason = "No major news";

      if (relatedNews) {
        reason = relatedNews.headline;
      }

      return {
        ...stock,
        reason,
      };
    });

    // 🔥 format message
    const message = `
📊 Smart Market Insights

${insights
  .map(
    (s: PriceInfo & { reason: string }) => `
${s.name}: ${s.change !== null ? s.change.toFixed(2) : '-'}%
📰 ${s.reason}
`
  )
  .join("\n")}
`;

    await sendWhatsAppMessage(message);

    res.json({ ok: true, insights });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/trading', tradingRouter);
app.use(analysisRouter);
app.use(sectorRouter);
app.use(errorHandler);
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
  startScheduler();
});

// connectDB();

