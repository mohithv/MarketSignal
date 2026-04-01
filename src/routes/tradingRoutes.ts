import express from 'express';
import { getPreOpenData, getTopGainers, getFilteredCandidates } from '../clients/nseClient.js';

const router = express.Router();

router.get('/pre-open', async (req, res) => {
  try {
    const data = await getPreOpenData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pre-open data' });
  }
});

router.get('/top-gainers', async (req, res) => {
  try {
    const gainers = await getTopGainers();
    res.json(gainers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top gainers' });
  }
});

router.get('/candidates', async (req, res) => {
  try {
    const candidates = await getFilteredCandidates();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

export default router;
