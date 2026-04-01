import twilio from 'twilio';

let cached:
  | {
      accountSid: string;
      authToken: string;
      client: ReturnType<typeof twilio>;
    }
  | undefined;

function asWhatsAppAddress(val: string): string {
  const v = val.trim();
  if (v.toLowerCase().startsWith('whatsapp:')) return v;
  return `whatsapp:${v}`;
}

function getClient(): ReturnType<typeof twilio> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || accountSid.trim().length === 0) {
    throw new Error('Missing TWILIO_ACCOUNT_SID');
  }
  if (!authToken || authToken.trim().length === 0) {
    throw new Error('Missing TWILIO_AUTH_TOKEN');
  }

  if (cached && cached.accountSid === accountSid && cached.authToken === authToken) {
    return cached.client;
  }

  const client = twilio(accountSid, authToken);
  cached = { accountSid, authToken, client };
  return client;
}

export async function sendWhatsAppMessage(message: string): Promise<void> {
  const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER;
  const toRaw = process.env.YOUR_PHONE;

  if (!fromRaw || fromRaw.trim().length === 0) {
    throw new Error('Missing TWILIO_WHATSAPP_NUMBER');
  }
  if (!toRaw || toRaw.trim().length === 0) {
    throw new Error('Missing YOUR_PHONE');
  }

  const client = getClient();

  await client.messages.create({
    body: message,
    from: asWhatsAppAddress(fromRaw),
    to: asWhatsAppAddress(toRaw),
  });
}
