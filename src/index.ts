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
import { getStockQuote } from './clients/finnhubClient.js';
import { symbol } from 'zod';
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

app.get('/api/live/:symbol', async (req, res) => {
  // try {
  //   const {symbol} = req.params;
  //   const data = await getStockQuote(symbol);
  //   res.json({
  //     symbol,
  //     price: data.c,
  //     change: data.d,
  //     changePercent: data.dp
  //   })
  // } catch (err: any) {
  //   console.error("❌ Stock quote error:", err);
  //   res.status(500).json({
  //     ok: false,
  //     error: err.message
  //   });
  // }
  res.json({ok: true, symbol: req.params.symbol})
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

