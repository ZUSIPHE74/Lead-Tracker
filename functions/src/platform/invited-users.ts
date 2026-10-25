import { getFirestore } from 'firebase-admin/firestore';

// Positive results are cached briefly so the per-request invite check (heartbeats
// every 60 s per user) doesn't eat the Spark plan's daily Firestore read quota.
const CACHE_TTL_MS = 60_000;
const confirmedUntil = new Map<string, number>();

/** True when users/{uid} exists, i.e. an admin or the seeder created the account. */
export async function isInvitedUser(uid: string): Promise<boolean> {
  const now = Date.now();
  if ((confirmedUntil.get(uid) ?? 0) > now) return true;

  const snap = await getFirestore().collection('users').doc(uid).get();
  if (snap.exists) confirmedUntil.set(uid, now + CACHE_TTL_MS);
  return snap.exists;
}
