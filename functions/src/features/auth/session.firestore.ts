import { Firestore } from 'firebase-admin/firestore';
import { Session } from './session';

function getSessionsCollection(db: Firestore) {
  return db.collection('sessions');
}

export async function getSession(db: Firestore, userId: string): Promise<Session | null> {
  const doc = await getSessionsCollection(db).doc(userId).get();
  if (!doc.exists) return null;
  return doc.data() as Session;
}

export async function saveSession(db: Firestore, session: Session): Promise<void> {
  await getSessionsCollection(db).doc(session.id).set(session);
}

export async function deleteSession(db: Firestore, userId: string): Promise<void> {
  await getSessionsCollection(db).doc(userId).delete();
}
