import { Router, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAuth, AuthRequest } from '../../platform/auth.middleware';

export const userRoutes = Router();

// GET /api/users/profile — Fetch current user's role and details
userRoutes.get('/profile', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const uid = authReq.firebaseUser.uid;
  const email = authReq.firebaseUser.email || '';
  const displayName = authReq.firebaseUser.name || email.split('@')[0] || 'User';

  try {
    // requireAuth has already confirmed users/{uid} exists (invite-only), so this
    // never creates a profile — that would let any sign-up invite itself.
    const snap = await getFirestore().collection('users').doc(uid).get();
    const data = snap.data();
    const role = data?.['role'] || 'agent';
    const department = data?.['department'] || 'Recruitment Operations';

    res.json({
      success: true,
      user: {
        uid,
        email,
        displayName,
        role,
        department,
        isAdmin: role === 'admin' || role === 'manager',
      },
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// POST /api/users/display-name — Update display name
userRoutes.post('/display-name', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const uid = authReq.firebaseUser.uid;

  const raw = req.body?.displayName;
  if (typeof raw !== 'string' || !raw.trim()) {
    res.status(400).json({ success: false, error: 'Display name is required' });
    return;
  }

  const trimmed = raw.trim().slice(0, 60);

  try {
    await getAuth().updateUser(uid, { displayName: trimmed });
    const db = getFirestore();
    await db.collection('users').doc(uid).set({ displayName: trimmed }, { merge: true });
    res.json({ success: true, displayName: trimmed });
  } catch (error) {
    console.error('Failed to update display name:', error);
    res.status(500).json({ success: false, error: 'Failed to update display name' });
  }
});
