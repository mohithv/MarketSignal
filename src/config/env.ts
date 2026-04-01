import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();
// Backward compatibility: load env values from src/.env when present.
// Use absolute path and override to avoid stale/empty values from a different .env source.
dotenv.config({ path: path.resolve(process.cwd(), 'src/.env'), override: true });

type Env = {
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
  PORT: number;
};

function optionalString(name: string, fallback: string): string {
  const val = process.env[name];
  if (!val || val.trim().length === 0) return fallback;
  return val;
}

function optionalNumber(name: string, fallback: number): number {
  const val = process.env[name];
  if (!val || val.trim().length === 0) return fallback;
  const parsed = Number(val);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number env var: ${name}`);
  return parsed;
}

export const env: Env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: optionalString('GROQ_MODEL', 'llama-3.3-70b-versatile'),
  PORT: optionalNumber('PORT', 3000),
};
