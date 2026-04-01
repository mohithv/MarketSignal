# Stock Screener + Claude Analysis Service

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

Create a `.env` file (see `.env.example`) and set:

- `LLM_PROVIDER` (`groq` or `anthropic`)
- `GROQ_API_KEY` (if using Groq)
- `ANTHROPIC_API_KEY` (if using Anthropic)
- `PORT` (optional, default `3000`)

## Run (dev)

```bash
npm run dev
```

## Build + Run (prod)

```bash
npm run build
npm start
```

## API

### POST /analyze

Request body:

```json
{
  "filters": {
    "marketCapMin": 1000000000,
    "epsMin": 1,
    "limit": 50
  },
  "analysisPreferences": {
    "riskTolerance": "medium",
    "focus": "momentum",
    "timeHorizon": "short"
  }
}
```

Response:

```json
{
  "filters": {"...": "..."},
  "screenerResults": [],
  "claudeAnalysis": "..."
}
```

## Tests

```bash
npm test
```
