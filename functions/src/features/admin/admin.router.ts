import { Router, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { requireAuth, AuthRequest } from '../../platform/auth.middleware';
import { accessPolicy } from '../../platform/access-config';
import { isDemoEmail } from '../../platform/access-policy';
import { hasAllowedDomain } from '../../platform/allowed-email';
import { DEMO_ACCOUNTS } from './demo-accounts';

export const adminRoutes = Router();

// Helper to determine if a user has admin/management privileges.
// The role comes only from the users/{uid} Firestore document (writable solely by
// the Admin SDK) — never from the email address, which anyone can choose at sign-up.
export async function isUserAdminOrManager(uid?: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const role = userDoc.data()?.['role'];
    return role === 'admin' || role === 'manager';
  } catch {
    return false;
  }
}

// Admin authorization middleware
export async function requireAdmin(req: any, res: Response, next: any): Promise<void> {
  const authReq = req as AuthRequest;
  const uid = authReq.firebaseUser?.uid;

  const allowed = await isUserAdminOrManager(uid);
  if (!allowed) {
    res
      .status(403)
      .json({ success: false, error: 'Forbidden: Admin or Management privileges required.' });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// GET /api/admin/stats — Executive & Management Dashboard Statistics
// ---------------------------------------------------------------------------
adminRoutes.get('/stats', requireAuth, requireAdmin, async (_req, res: Response) => {
  try {
    const db = getFirestore();
    const leadsSnap = await db.collection('leads').get();
    const leads = leadsSnap.docs.map((doc) => doc.data());

    const totalLeads = leads.length;
    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      'follow-up': 0,
      converted: 0,
      lost: 0,
    };

    const priorityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    const recruiterMap: Record<string, number> = {};

    for (const lead of leads) {
      const status = lead['status'] || 'new';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const priority = lead['priority'] || 'medium';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

      const assigned = lead['assignedTo'] || 'Unassigned';
      recruiterMap[assigned] = (recruiterMap[assigned] || 0) + 1;
    }

    const conversionRate =
      totalLeads > 0 ? Math.round(((statusCounts['converted'] || 0) / totalLeads) * 100) : 0;

    // Fetch team count from users collection
    const usersSnap = await db.collection('users').get();
    const totalTeam = usersSnap.size || 3;

    res.json({
      success: true,
      stats: {
        totalLeads,
        conversionRate,
        statusCounts,
        priorityCounts,
        recruiterWorkload: recruiterMap,
        totalTeam,
      },
    });
  } catch (error) {
    console.error('Failed to load admin stats:', error);
    res.status(500).json({ success: false, error: 'Failed to compute management stats' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/team — List team members & roles
// ---------------------------------------------------------------------------
adminRoutes.get('/team', requireAuth, requireAdmin, async (_req, res: Response) => {
  try {
    const db = getFirestore();
    const usersSnap = await db.collection('users').get();
    const team: any[] = [];

    // Also get leads to count assignments per recruiter
    const leadsSnap = await db.collection('leads').get();
    const leadCounts: Record<string, number> = {};
    leadsSnap.docs.forEach((doc) => {
      const assigned = doc.data()['assignedTo'];
      if (assigned) {
        leadCounts[assigned] = (leadCounts[assigned] || 0) + 1;
      }
    });

    usersSnap.forEach((doc) => {
      const data = doc.data();
      const identifier = data['displayName'] || data['email'];
      team.push({
        id: doc.id,
        uid: data['uid'] || doc.id,
        email: data['email'],
        displayName: data['displayName'] || 'User',
        role: data['role'] || 'agent',
        department: data['department'] || 'Recruitment',
        leadsAssigned: leadCounts[identifier] || leadCounts[data['email']] || 0,
        createdAt: data['createdAt'] || new Date().toISOString(),
      });
    });

    // If Firestore has no users yet, return default demo staff
    if (team.length === 0) {
      team.push(
        {
          id: 'demo-admin',
          uid: 'demo-admin',
          email: 'demo.admin@moderntech.co.za',
          displayName: 'Admin Director',
          role: 'admin',
          department: 'Executive Management',
          leadsAssigned: leadCounts['demo.admin@moderntech.co.za'] || 0,
        },
        {
          id: 'demo-manager',
          uid: 'demo-manager',
          email: 'demo.manager@moderntech.co.za',
          displayName: 'HR Manager',
          role: 'manager',
          department: 'HR Management',
          leadsAssigned: leadCounts['demo.manager@moderntech.co.za'] || 0,
        },
        {
          id: 'demo-agent',
          uid: 'demo-agent',
          email: 'demo.agent@moderntech.co.za',
          displayName: 'Sarah Khumalo (Senior Agent)',
          role: 'agent',
          department: 'Talent Acquisition',
          leadsAssigned: leadCounts['demo.agent@moderntech.co.za'] || 0,
        },
      );
    }

    res.json({ success: true, team });
  } catch (error) {
    console.error('Failed to load team:', error);
    res.status(500).json({ success: false, error: 'Failed to load team members' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/role — Change a user's role (admin, manager, agent)
// ---------------------------------------------------------------------------
adminRoutes.post('/users/role', requireAuth, requireAdmin, async (req, res: Response) => {
  const { userId, role } = req.body;
  if (!userId || !['admin', 'manager', 'agent'].includes(role)) {
    res.status(400).json({ success: false, error: 'Invalid userId or role' });
    return;
  }

  try {
    const ref = getFirestore().collection('users').doc(userId);
    // update(), not set(): changing a role must never create a profile, because a
    // profile is what makes an account invited.
    if (!(await ref.get()).exists) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    await ref.update({ role, updatedAt: new Date().toISOString() });
    res.json({ success: true, userId, role });
  } catch (error) {
    console.error('Failed to update role:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/invite — Invite a team member (sign-up is invite-only)
// Body: { email, displayName?, role? }. Returns a one-time password-setup link
// for the admin to send to the invitee.
// ---------------------------------------------------------------------------
adminRoutes.post('/users/invite', requireAuth, requireAdmin, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = req.body?.role ?? 'agent';
  const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ success: false, error: 'A valid email is required' });
    return;
  }
  if (!hasAllowedDomain(email, accessPolicy.allowedEmailDomain)) {
    res.status(400).json({
      success: false,
      error: `Only ${accessPolicy.allowedEmailDomain} addresses can be invited`,
    });
    return;
  }
  if (isDemoEmail(email)) {
    res.status(400).json({ success: false, error: 'Demo accounts are managed by the seeder' });
    return;
  }
  if (!['admin', 'manager', 'agent'].includes(role)) {
    res.status(400).json({ success: false, error: 'Invalid role' });
    return;
  }
  const displayName = (rawName || email.split('@')[0]).slice(0, 60);

  try {
    const auth = getAuth();
    const db = getFirestore();
    let user = await auth.getUserByEmail(email).catch(() => null);

    if (user && (await db.collection('users').doc(user.uid).get()).exists) {
      res.status(409).json({ success: false, error: 'This person is already invited' });
      return;
    }

    const hadSelfCreatedAccount = !!user;
    if (user) {
      // Someone signed this address up before it was invited. Wipe that password and
      // sign out its sessions, so only the holder of the setup link can get in.
      await auth.updateUser(user.uid, { password: `${randomUUID()}Aa1!`, displayName });
      await auth.revokeRefreshTokens(user.uid);
    } else {
      user = await auth.createUser({ email, displayName, emailVerified: false });
    }

    await db
      .collection('users')
      .doc(user.uid)
      .set({
        uid: user.uid,
        email,
        displayName,
        role,
        department: role === 'agent' ? 'Recruitment Operations' : 'Management',
        createdAt: new Date().toISOString(),
        invitedBy: authReq.firebaseUser.email ?? authReq.firebaseUser.uid,
      });

    const setupLink = await auth.generatePasswordResetLink(email);
    res.json({
      success: true,
      user: { uid: user.uid, email, displayName, role },
      setupLink,
      hadSelfCreatedAccount,
    });
  } catch (error) {
    console.error('Failed to invite user:', error);
    res.status(500).json({ success: false, error: 'Failed to invite user' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/reassign — Reassign all leads from one recruiter to another
// ---------------------------------------------------------------------------
adminRoutes.post('/reassign', requireAuth, requireAdmin, async (req, res: Response) => {
  const { fromRecruiter, toRecruiter } = req.body;
  if (!fromRecruiter || !toRecruiter) {
    res.status(400).json({ success: false, error: 'fromRecruiter and toRecruiter required' });
    return;
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection('leads').where('assignedTo', '==', fromRecruiter).get();
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        assignedTo: toRecruiter,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    res.json({ success: true, count: snapshot.size });
  } catch (error) {
    console.error('Failed to reassign leads:', error);
    res.status(500).json({ success: false, error: 'Failed to reassign leads' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/seed-demo — Ensures demo accounts exist in Firebase Auth & Firestore
// ---------------------------------------------------------------------------
export async function seedDemoAccounts(): Promise<void> {
  const demoUsers = DEMO_ACCOUNTS;

  const auth = getAuth();
  const db = getFirestore();

  for (const demo of demoUsers) {
    let uid = '';
    try {
      const existing = await auth.getUserByEmail(demo.email);
      uid = existing.uid;
      // Ensure password is reset to known standard
      await auth.updateUser(uid, {
        password: demo.password,
        displayName: demo.displayName,
        emailVerified: true,
      });
    } catch {
      // User doesn't exist, create it
      const created = await auth.createUser({
        email: demo.email,
        password: demo.password,
        displayName: demo.displayName,
        emailVerified: true,
      });
      uid = created.uid;
    }

    // Save profile with role in Firestore
    if (uid) {
      await db.collection('users').doc(uid).set(
        {
          uid,
          email: demo.email,
          displayName: demo.displayName,
          role: demo.role,
          department: demo.department,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }
  }
  console.log(
    'Demo accounts verified and ready (demo.admin@, demo.manager@, demo.agent@moderntech.co.za)',
  );
}

adminRoutes.post('/seed-demo', requireAuth, requireAdmin, async (_req, res: Response) => {
  try {
    await seedDemoAccounts();
    res.json({
      success: true,
      message:
        'Demo accounts seeded successfully. You can now login with demo.admin@, demo.manager@ or demo.agent@moderntech.co.za',
    });
  } catch (error) {
    console.error('Failed to seed demo accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to seed demo accounts' });
  }
});
