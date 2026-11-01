import { getFirestore } from 'firebase-admin/firestore';

/**
 * Opens the Firestore connection straight after start-up. The first query on a fresh
 * process takes several seconds (channel set-up and credentials), so doing it here
 * means the person who woke the free Render instance does not wait for it at sign-in.
 */
export async function warmUpFirestore(): Promise<void> {
  // A missing document still opens the connection, for the cost of a single read.
  await getFirestore().collection('users').doc('_warm-up').get();
}
