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
import { runWarAnalysis } from "./services/warService.js";
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

app.use(express.urlencoded({ extended: false }));
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

app.post("/webhook/whatsapp", async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Incoming WhatsApp:", incomingMsg);

  let reply = "Welcome to MarketSignal 🚀";

  if (incomingMsg.toLowerCase() === "start") {
    reply = "✅ You will now receive trading alerts!";
  }

  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
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

// src/index.ts



app.get("/api/war-alert", async (req, res) => {
  try {
    const result = await runWarAnalysis();

    if (!result.isWar) {
      return res.json({
        ok: true,
        message: "No war event detected",
        score: result.score,
      });
    }

    const message = `
🚨 WAR IMPACT ALERT

📈 Likely Gainers:
${result.gainers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change?.toFixed(2) ?? "NA"}%`).join("\n")}

📉 Likely Losers:
${result.losers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change?.toFixed(2) ?? "NA"}%`).join("\n")}

🧠 Reason:
Geopolitical tension → Oil ↑ → Defense ↑ → IT/Bank ↓
`;

    await sendWhatsAppMessage(message);

    res.json({
      ok: true,
      ...result,
    });

  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
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

