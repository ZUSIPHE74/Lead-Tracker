import { Firestore, getFirestore } from 'firebase-admin/firestore';

export function getDb(): Firestore {
  return getFirestore();
}

export type { Firestore };
