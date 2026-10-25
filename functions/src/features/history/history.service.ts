import { getFirestore } from 'firebase-admin/firestore';
import { createHistoryEntry } from './create-entry';
import { CreateHistoryInput, HistoryEntry } from './history';
import {
  saveHistoryEntry,
  getAllHistory,
  getHistoryByUser,
  clearHistoryByUser,
} from './history.firestore';

export async function writeHistoryEntry(input: CreateHistoryInput): Promise<void> {
  const db = getFirestore();
  const entry = createHistoryEntry(input, new Date());
  await saveHistoryEntry(db, entry);
}

export async function fetchHistory(scope: string, userId: string): Promise<HistoryEntry[]> {
  const db = getFirestore();
  if (scope === 'all') {
    return await getAllHistory(db);
  }
  return await getHistoryByUser(db, userId);
}

export async function clearUserHistory(userId: string): Promise<number> {
  const db = getFirestore();
  return await clearHistoryByUser(db, userId);
}
