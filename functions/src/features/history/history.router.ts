import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../platform/auth.middleware';
import { fetchHistory, clearUserHistory } from './history.service';

export const historyRoutes = Router();

// GET /api/history?scope=mine|all
historyRoutes.get('/', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.firebaseUser.uid;
  const scope = (req.query['scope'] as string) ?? 'mine';

  try {
    const entries = await fetchHistory(scope, userId);
    res.json({ success: true, entries });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// POST /api/history/clear-mine
historyRoutes.post('/clear-mine', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.firebaseUser.uid;

  try {
    const deleted = await clearUserHistory(userId);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Failed to clear history:', error);
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
});
