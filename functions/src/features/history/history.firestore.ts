import { Firestore } from 'firebase-admin/firestore';
import { HistoryEntry } from './history';

function collection(db: Firestore) {
  return db.collection('history');
}

export async function saveHistoryEntry(db: Firestore, entry: HistoryEntry): Promise<void> {
  await collection(db).doc(entry.id).set(entry);
}

export async function getAllHistory(db: Firestore): Promise<HistoryEntry[]> {
  const snapshot = await collection(db).orderBy('timestamp', 'desc').limit(500).get();
  const entries: HistoryEntry[] = [];
  snapshot.forEach((doc) => entries.push(doc.data() as HistoryEntry));
  return entries;
}

export async function getHistoryByUser(db: Firestore, userId: string): Promise<HistoryEntry[]> {
  const snapshot = await collection(db)
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get();
  const entries: HistoryEntry[] = [];
  snapshot.forEach((doc) => {
    const entry = doc.data() as HistoryEntry;
    const clearedBy = entry.clearedBy ?? [];
    if (!clearedBy.includes(userId)) {
      entries.push(entry);
    }
  });
  return entries;
}

export async function clearHistoryByUser(db: Firestore, userId: string): Promise<number> {
  const snapshot = await collection(db).where('userId', '==', userId).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  let updatedCount = 0;
  snapshot.docs.forEach((doc) => {
    const entry = doc.data() as HistoryEntry;
    const clearedBy = entry.clearedBy ?? [];
    if (clearedBy.includes(userId)) return;

    batch.update(doc.ref, { clearedBy: [...clearedBy, userId] });
    updatedCount++;
  });

  if (updatedCount > 0) {
    await batch.commit();
  }
  return updatedCount;
}
