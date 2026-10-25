import { Router, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAuth, AuthRequest } from '../../platform/auth.middleware';
import { createSession, isSessionExpired, touchSession, msUntilIdleExpiry } from './session-logic';
import { saveSession, getSession, deleteSession } from './session.firestore';

export const sessionRoutes = Router();

// POST /api/session/start
sessionRoutes.post('/start', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const user = authReq.firebaseUser;

  try {
    const db = getFirestore();
    const session = createSession(user.uid, user.email || '', new Date());
    await saveSession(db, session);
    res.json({ success: true, sessionToken: session.sessionToken });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start session';
    console.error('startSession failed:', err);
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/session/heartbeat
sessionRoutes.post('/heartbeat', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const user = authReq.firebaseUser;

  const clientToken = req.body?.sessionToken;
  if (!clientToken) {
    res.status(401).json({ success: false, error: 'No session token provided' });
    return;
  }

  const db = getFirestore();
  const existing = await getSession(db, user.uid);

  if (!existing) {
    res.status(401).json({ success: false, error: 'Session not found' });
    return;
  }

  if (existing.sessionToken !== clientToken) {
    res.status(401).json({ success: false, error: 'Session invalidated by a newer login' });
    return;
  }

  const now = new Date();
  if (isSessionExpired(existing, now)) {
    await deleteSession(db, user.uid);
    res.status(401).json({ success: false, error: 'Session expired' });
    return;
  }

  const updated = touchSession(existing, now);
  await saveSession(db, updated);

  res.json({
    success: true,
    session: updated,
    msUntilIdleExpiry: msUntilIdleExpiry(updated, now),
  });
});

// POST /api/session/end
sessionRoutes.post('/end', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const user = authReq.firebaseUser;

  try {
    const db = getFirestore();
    await deleteSession(db, user.uid);
    res.json({ success: true });
  } catch (err) {
    console.error('endSession failed:', err);
    res.status(500).json({ success: false, error: 'Failed to end session' });
  }
});
