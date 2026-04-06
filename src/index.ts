import express from 'express';
import { env } from './config/env.js';
import { analysisRouter } from './routes/analysisRoutes.js';
import sectorRouter from './routes/sectorRoutes.js';
import tradingRouter from './routes/tradingRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { apiKeyAuth } from './middleware/authMiddleware.js';
import { startScheduler } from './services/scheduler.js';
import { getCronTimeline } from './services/scheduler.js';
import { sendWhatsAppMessage } from './clients/twilioClient.js';
import { runWarAnalysis } from "./services/warService.js";
// import connectDB from './config/db.js';
const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = new Set([
    'https://market-signal-cmhb.vercel.app/',
    'http://localhost:3000',
  ]);

  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key'
  );

  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
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
      root: 'GET /',
      health: 'GET /health',
      alertTest: 'GET /api/alert-test',
      warAlert: 'GET /api/war-alert',
      whatsappWebhook: 'POST /webhook/whatsapp',
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
app.get('/api/cron-timeline', (_req, res) => {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    jobs: getCronTimeline({ countPerJob: 10 }),
  });
});

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
  const incomingMsg = req.body.Body?.toLowerCase();
  const from = req.body.From;

  console.log("📩 Incoming WhatsApp:", incomingMsg);

  let reply = "Welcome to MarketSignal 🚀";

  if (incomingMsg === "start" || incomingMsg === "hi") {
    reply = "✅ Alerts are enabled.";
  }

  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
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
${result.gainers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change !== null ? `${s.change >= 0 ? '🟢⬆️' : '🔴⬇️'} ${s.change.toFixed(2)}%` : "NA"}`).join("\n")}

📉 Likely Losers:
${result.losers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change !== null ? `${s.change >= 0 ? '🟢⬆️' : '🔴⬇️'} ${s.change.toFixed(2)}%` : "NA"}`).join("\n")}

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

