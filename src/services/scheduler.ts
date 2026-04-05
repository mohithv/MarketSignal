import cron from 'node-cron';
import { getTopMovers } from '../clients/nseClient.js';
import { getMarketNews } from '../clients/finnhubClient.js';
import { filterCandidates, filterTopGainers } from './filterService.js';
import { checkMultipleBreakouts } from './breakoutService.js';
import { alertEngine } from './alertService.js';
import { runWarAnalysis } from './warService.js';
import { mapNewsToStocks, STOCKS, type MappedNews, type NewsArticle } from './newsStockMapper.js';

export type CronJobTimeline = {
  id: string;
  name: string;
  expression: string;
  timezone: string;
  notes: string;
  nextRuns: string[];
};

export const CRON_JOBS = [
  {
    id: 'news_alerts',
    name: 'News alerts',
    expression: '* * * * 1-5',
    timezone: 'Asia/Kolkata',
    notes: 'Sends WhatsApp news summary every minute on weekdays.',
  },
  {
    id: 'pre_market',
    name: 'Pre-market analysis',
    expression: '55 8 * * 1-5',
    timezone: 'Asia/Kolkata',
    notes: 'Runs at 08:55 on weekdays.',
  },
  {
    id: 'breakout_scan',
    name: 'Breakout scan',
    expression: '* * * * 1-5',
    timezone: 'Asia/Kolkata',
    notes: 'Runs every minute on weekdays; returns early outside 09:00–15:30.',
  },
  {
    id: 'war_detection',
    name: 'WAR detection',
    expression: '* * * * 1-5',
    timezone: 'Asia/Kolkata',
    notes: 'Runs every minute on weekdays; returns early outside 09:00–15:30 and has anti-spam cooldown.',
  },
  {
    id: 'eod_summary',
    name: 'End-of-day summary',
    expression: '35 15 * * 1-5',
    timezone: 'Asia/Kolkata',
    notes: 'Runs at 15:35 on weekdays.',
  },
] as const;

function matchesField(value: number, field: string): boolean {
  if (field === '*') return true;
  const step = field.match(/^\*\/(\d+)$/);
  if (step) {
    const n = Number(step[1]);
    return Number.isFinite(n) && n > 0 ? value % n === 0 : false;
  }
  const range = field.match(/^(\d+)-(\d+)$/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return value >= a && value <= b;
  }
  const num = Number(field);
  return Number.isFinite(num) ? value === num : false;
}

function matchesCron(date: Date, expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minF, hourF, domF, monF, dowF] = parts as [string, string, string, string, string];

  const minute = date.getMinutes();
  const hour = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1;
  const dow = date.getDay();
  const cronDow = dow === 0 ? 0 : dow;

  return (
    matchesField(minute, minF) &&
    matchesField(hour, hourF) &&
    matchesField(dom, domF) &&
    matchesField(mon, monF) &&
    matchesField(cronDow, dowF)
  );
}

export function getCronTimeline(options?: {
  now?: Date;
  countPerJob?: number;
  lookaheadMinutes?: number;
}): CronJobTimeline[] {
  const now = options?.now ?? new Date();
  const countPerJob = options?.countPerJob ?? 8;
  const lookaheadMinutes = options?.lookaheadMinutes ?? 7 * 24 * 60;

  return CRON_JOBS.map((job) => {
    const nextRuns: string[] = [];
    const cursor = new Date(now.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    for (let i = 0; i < lookaheadMinutes && nextRuns.length < countPerJob; i += 1) {
      if (matchesCron(cursor, job.expression)) {
        nextRuns.push(cursor.toISOString());
      }
      cursor.setMinutes(cursor.getMinutes() + 1);
    }

    return {
      ...job,
      nextRuns,
    };
  });
}

// 🔥 Anti-spam variables
let lastWarAlertTime = 0;
let lastWarScore = 0;
const WAR_COOLDOWN = 60 * 60 * 1000; // 1 hour

// 📰 News alerts (every 1 min)
cron.schedule('* * * * 1-5', async () => {
  try {
    const news = await getMarketNews();
    const topNews: NewsArticle[] = (news as NewsArticle[]).slice(0, 3);

    const mapped = mapNewsToStocks(topNews, STOCKS);

    const message = `
📰 Smart Market News

${mapped.map((n: MappedNews) => `${n.stock}: ${n.headline}`).join("\n")}
`;

    await alertEngine.sendCustomAlert('CUSTOM', message);
  } catch (error) {
    console.error('News alert failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

// Pre-market analysis (8:55 AM)
cron.schedule('55 8 * * 1-5', async () => {
  console.log('🌅 Pre-market analysis started...');
  
  try {
    const movers = await getTopMovers();
    const candidates = filterCandidates(movers);
    
    for (const candidate of candidates) {
      await alertEngine.sendMomentumAlert(
        candidate.symbol,
        candidate.price,
        candidate.change
      );
    }
  } catch (error) {
    console.error('Pre-market analysis failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

// Breakout detection (every 2 min)
cron.schedule('* * * * 1-5', async () => {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 9 || hour > 15 || (hour === 15 && now.getMinutes() > 30)) {
    return;
  }

  try {
    const movers = await getTopMovers();
    const topGainers = filterTopGainers(movers);
    const symbols = topGainers.map(g => g.symbol);

    if (!symbols.length) return;

    const breakouts = await checkMultipleBreakouts(symbols);

    for (const breakout of breakouts) {
      await alertEngine.sendBreakoutAlert(breakout);
    }
  } catch (error) {
    console.error('Breakout scan failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

// 🌍 WAR detection (every 30 min)
cron.schedule('* * * * 1-5', async () => {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 9 || hour > 15 || (hour === 15 && now.getMinutes() > 30)) {
    return;
  }

  console.log('🌍 Checking war/news impact...');

  try {
    const result = await runWarAnalysis();

    if (!result.isWar) return;

    const currentTime = Date.now();

    // 🔥 Anti-spam logic
    if (
      currentTime - lastWarAlertTime < WAR_COOLDOWN &&
      result.score <= lastWarScore
    ) {
      console.log('⏳ Skipping duplicate WAR alert');
      return;
    }

    const message = `
🚨 WAR IMPACT ALERT

📈 Gainers:
${result.gainers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change !== null ? `${s.change >= 0 ? '🟢⬆️' : '🔴⬇️'} ${s.change.toFixed(2)}%` : "NA"}`).join("\n")}

📉 Losers:
${result.losers.map((s: { name: string; change: number | null }) => `${s.name}: ${s.change !== null ? `${s.change >= 0 ? '🟢⬆️' : '🔴⬇️'} ${s.change.toFixed(2)}%` : "NA"}`).join("\n")}

🧠 Reason:
Geopolitical tension → Oil ↑ → Defense ↑ → IT/Bank ↓
`;

    await alertEngine.sendCustomAlert("WAR", message);

    lastWarAlertTime = currentTime;
    lastWarScore = result.score;

  } catch (error) {
    console.error('War detection failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

// End-of-day summary
cron.schedule('35 15 * * 1-5', async () => {
  console.log('📊 End-of-day summary');

  const alerts = alertEngine.getRecentAlerts(6 * 60);

  console.log(`Total Alerts: ${alerts.length}`);
}, {
  timezone: 'Asia/Kolkata'
});

export function startScheduler(): void {
  console.log('🚀 Scheduler started...');
  cron.getTasks().forEach((task: any) => task.start());
}

export function stopScheduler(): void {
  console.log('⏹️ Scheduler stopped...');
  cron.getTasks().forEach((task: any) => task.stop());
}