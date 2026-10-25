import { Request, Response, NextFunction } from 'express';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { accessPolicy } from './access-config';
import { checkEmailAccess, checkInvited, AccessDenial } from './access-policy';
import { isInvitedUser } from './invited-users';

// Extend Express Request to carry the verified Firebase token
export interface AuthRequest extends Request {
  firebaseUser: DecodedIdToken;
}

function deny(res: Response, denial: AccessDenial): void {
  res.status(denial.status).json({ success: false, error: denial.error, code: denial.code });
}

/**
 * Middleware that verifies the Firebase ID token sent as a Bearer token in
 * the Authorization header. Rejects with 401 if missing, invalid or expired,
 * and 403 if the email is outside ALLOWED_EMAIL_DOMAIN, is a demo account while
 * DEMO_MODE is off, or the account was never invited (no users/{uid} profile).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization token' });
    return;
  }

  const idToken = header.slice(7);
  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    console.warn(`Token verification failed (${code})`);
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Firebase Auth sign-up is open to anyone holding the public web API key, so
  // the domain, demo and invite rules must be enforced here, not only in the UI.
  const emailDenial = checkEmailAccess(decoded.email, accessPolicy);
  if (emailDenial) {
    deny(res, emailDenial);
    return;
  }

  let invited: boolean;
  try {
    invited = await isInvitedUser(decoded.uid);
  } catch (err) {
    console.error('Invite lookup failed:', err);
    res.status(503).json({ success: false, error: 'Could not verify account access' });
    return;
  }
  const inviteDenial = checkInvited(invited);
  if (inviteDenial) {
    deny(res, inviteDenial);
    return;
  }

  (req as AuthRequest).firebaseUser = decoded;
  next();
}
