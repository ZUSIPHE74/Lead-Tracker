import { Session } from './session';
import { randomUUID } from 'crypto';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
export const WARNING_BEFORE_MS = 60 * 1000;
export function createSession(userId: string, email: string, now: Date): Session {
  const nowIso = now.toISOString();
  return {
    id: userId,
    userId,
    email,
    sessionToken: randomUUID(),
    loginTime: nowIso,
    lastActivity: nowIso,
    expiresAt: new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS).toISOString(),
    active: true,
  };
}

export function isSessionExpired(session: Session, now: Date): boolean {
  const lastActivityMs = new Date(session.lastActivity).getTime();
  const expiresAtMs = new Date(session.expiresAt).getTime();
  const nowMs = now.getTime();

  if (nowMs - lastActivityMs > IDLE_TIMEOUT_MS) return true;
  if (nowMs > expiresAtMs) return true;
  return false;
}

export function msUntilIdleExpiry(session: Session, now: Date): number {
  const lastActivityMs = new Date(session.lastActivity).getTime();
  const idleExpiryMs = lastActivityMs + IDLE_TIMEOUT_MS;
  return idleExpiryMs - now.getTime();
}

export function touchSession(session: Session, now: Date): Session {
  return { ...session, lastActivity: now.toISOString() };
}
