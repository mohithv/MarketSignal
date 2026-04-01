import { TradingAlert, BreakoutResult } from '../types/trading.js';

export class AlertEngine {
  private alerts: TradingAlert[] = [];

  async sendBreakoutAlert(breakout: BreakoutResult): Promise<void> {
    const alert: TradingAlert = {
      type: 'BREAKOUT',
      symbol: breakout.symbol,
      price: breakout.price,
      change: 0, // Will be calculated
      confidence: 85, // Base confidence for volume-confirmed breakouts
      timestamp: new Date()
    };

    this.alerts.push(alert);
    
    // Console alert (for now)
    console.log(`🔥 BREAKOUT ALERT: ${alert.symbol} at ₹${alert.price}`);
    console.log(`⏰ Time: ${alert.timestamp.toLocaleString('en-IN')}`);
    console.log(`📊 Confidence: ${alert.confidence}%`);
    console.log('---');
    
    // TODO: Add WhatsApp integration here
    // await this.sendWhatsAppAlert(alert);
  }

  async sendMomentumAlert(symbol: string, price: number, change: number): Promise<void> {
    const alert: TradingAlert = {
      type: 'MOMENTUM',
      symbol,
      price,
      change,
      confidence: Math.min(50 + change * 10, 90),
      timestamp: new Date()
    };

    this.alerts.push(alert);
    
    console.log(`📈 MOMENTUM ALERT: ${alert.symbol} +${change.toFixed(2)}% at ₹${price}`);
    console.log(`⏰ Time: ${alert.timestamp.toLocaleString('en-IN')}`);
    console.log('---');
  }

  getRecentAlerts(minutes: number = 60): TradingAlert[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  // Future WhatsApp integration
  private async sendWhatsAppAlert(alert: TradingAlert): Promise<void> {
    // TODO: Implement Twilio WhatsApp API
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    
    // await client.messages.create({
    //   body: this.formatWhatsAppMessage(alert),
    //   from: 'whatsapp:+14155238886',
    //   to: `whatsapp:${process.env.YOUR_PHONE_NUMBER}`
    // });
  }

  private formatWhatsAppMessage(alert: TradingAlert): string {
    const emoji = alert.type === 'BREAKOUT' ? '🔥' : '📈';
    return `${emoji} ${alert.type}: ${alert.symbol} at ₹${alert.price}`;
  }
}

export const alertEngine = new AlertEngine();
