import cron from 'node-cron';
import { getTopMovers } from '../clients/nseClient.js';
import { filterCandidates, filterTopGainers } from './filterService.js';
import { checkMultipleBreakouts } from './breakoutService.js';
import { alertEngine } from './alertService.js';

// Pre-market analysis (8:55 AM)
cron.schedule('55 8 * * 1-5', async () => {
  console.log('🌅 Pre-market analysis started...');
  
  try {
    const movers = await getTopMovers();
    const candidates = filterCandidates(movers);
    
    console.log(`📊 Found ${candidates.length} potential candidates`);
    
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
}, ({
  scheduled: false, // Don't start immediately
  timezone: 'Asia/Kolkata'
} as any));

// Market hours breakout detection (every 2 minutes)
cron.schedule('*/2 * * * 1-5', async () => {
  const now = new Date();
  const hour = now.getHours();
  
  // Only run during market hours (9:15 AM - 3:30 PM)
  if (hour < 9 || hour > 15 || (hour === 15 && now.getMinutes() > 30)) {
    return;
  }
  
  console.log('🔍 Scanning for breakouts...');
  
  try {
    const movers = await getTopMovers();
    const topGainers = filterTopGainers(movers);
    const symbols = topGainers.map(gainer => gainer.symbol);
    
    if (symbols.length === 0) {
      console.log('No symbols to scan');
      return;
    }
    
    const breakouts = await checkMultipleBreakouts(symbols);
    
    if (breakouts.length > 0) {
      console.log(`🚀 Found ${breakouts.length} breakouts!`);
      
      for (const breakout of breakouts) {
        await alertEngine.sendBreakoutAlert(breakout);
      }
    } else {
      console.log('No breakouts detected');
    }
  } catch (error) {
    console.error('Breakout scan failed:', error);
  }
}, ({
  scheduled: false,
  timezone: 'Asia/Kolkata'
} as any));

// End-of-day summary (3:35 PM)
cron.schedule('35 15 * * 1-5', async () => {
  console.log('📊 Generating end-of-day summary...');
  
  const alerts = alertEngine.getRecentAlerts(6 * 60); // Last 6 hours
  
  console.log(`📈 Today's Summary:`);
  console.log(`- Total Alerts: ${alerts.length}`);
  console.log(`- Breakouts: ${alerts.filter(a => a.type === 'BREAKOUT').length}`);
  console.log(`- Momentum: ${alerts.filter(a => a.type === 'MOMENTUM').length}`);
  
  const topPerformers = alerts
    .filter(a => a.type === 'BREAKOUT')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
    
  if (topPerformers.length > 0) {
    console.log('🏆 Top Performers:');
    topPerformers.forEach(alert => {
      console.log(`  ${alert.symbol}: ₹${alert.price} (${alert.confidence}% confidence)`);
    });
  }
}, ({
  scheduled: false,
  timezone: 'Asia/Kolkata'
} as any));

export function startScheduler(): void {
  console.log('🚀 Trading scheduler started...');
  cron.getTasks().forEach((task: { start: () => void }) => task.start());
}

export function stopScheduler(): void {
  console.log('⏹️ Trading scheduler stopped...');
  cron.getTasks().forEach((task: { stop: () => void }) => task.stop());
}
