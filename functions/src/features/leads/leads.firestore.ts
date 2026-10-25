import { Lead } from './lead';
import { Firestore, CollectionReference } from 'firebase-admin/firestore';

export function getLeadsCollection(db: Firestore): CollectionReference {
  return db.collection('leads');
}

export async function getNextDisplayNumber(db: Firestore): Promise<number> {
  const snapshot = await getLeadsCollection(db).orderBy('displayNumber', 'desc').limit(1).get();

  if (snapshot.empty) return 1;

  const highest = snapshot.docs[0].data().displayNumber;
  return typeof highest === 'number' ? highest + 1 : 1;
}

export async function saveLead(db: Firestore, lead: Lead): Promise<void> {
  await getLeadsCollection(db).doc(lead.id).set(lead);
}

export async function updateLead(db: Firestore, id: string, data: Partial<Lead>): Promise<void> {
  await getLeadsCollection(db).doc(id).update(data);
}

export async function deleteLead(db: Firestore, id: string): Promise<void> {
  await getLeadsCollection(db).doc(id).delete();
}

export async function getLeadById(db: Firestore, id: string): Promise<Lead | null> {
  const doc = await getLeadsCollection(db).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Lead;
}

export async function getAllLeads(db: Firestore): Promise<Lead[]> {
  const snapshot = await getLeadsCollection(db).orderBy('displayNumber', 'desc').get();

  const leads: Lead[] = [];
  snapshot.forEach((doc) => {
    leads.push(doc.data() as Lead);
  });
  return leads;
}
