import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAuth, AuthRequest } from '../../platform/auth.middleware';
import { createLead } from './create-lead';
import {
  getAllLeads,
  getLeadById,
  updateLead as updateLeadInDb,
  deleteLead as deleteLeadFromDb,
} from './leads.firestore';
import { DomainError } from './lead';
import { deleteLead } from './delete-lead';
import { updateLead } from './update-lead';
import { fetchLeads } from './fetch-leads';
import {
  parseCreateLeadRequest,
  parseFetchLeadsRequest,
  parseUpdateLeadRequest,
} from './lead-request';
import { writeHistoryEntry } from '../history/history.service';

export const leadRoutes = Router();

function userNameFromRequest(req: AuthRequest): string {
  const token = req.firebaseUser as { name?: string; email?: string } | undefined;
  return token?.name || token?.email || 'unknown';
}

function handleRouteError(error: unknown, res: Response, fallback: string): void {
  console.error(fallback, error);
  if (error instanceof DomainError) {
    const status = error.code === 'lead.not-found' ? 404 : 400;
    res.status(status).json({ success: false, error: error.message, code: error.code });
    return;
  }
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, error: message });
}

// GET /api/leads
leadRoutes.get('/', requireAuth, async (req, res: Response) => {
  try {
    const db = getFirestore();
    const input = parseFetchLeadsRequest(req.query);
    const leads = fetchLeads(await getAllLeads(db), input);
    res.json({ success: true, leads });
  } catch (error) {
    handleRouteError(error, res, 'Failed to fetch leads');
  }
});

// POST /api/leads
leadRoutes.post('/', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const currentUserId = authReq.firebaseUser.uid;
  const currentEmail = authReq.firebaseUser.email ?? '';

  try {
    const db = getFirestore();
    const input = parseCreateLeadRequest(req.body);

    const { lead, isNew } = await db.runTransaction(async (transaction) => {
      if (input.clientRequestId) {
        const existingSnapshot = await transaction.get(
          db.collection('leads').where('clientRequestId', '==', input.clientRequestId).limit(1),
        );
        if (!existingSnapshot.empty) {
          return { lead: existingSnapshot.docs[0].data(), isNew: false };
        }
      }

      const latestSnapshot = await transaction.get(
        db.collection('leads').orderBy('displayNumber', 'desc').limit(1),
      );
      const highest = latestSnapshot.empty ? 0 : latestSnapshot.docs[0].data().displayNumber;
      const nextDisplayNumber = typeof highest === 'number' ? highest + 1 : 1;

      const newLead = createLead(input, {
        now: new Date(),
        newId: randomUUID,
        nextDisplayNumber,
        currentUserId,
      });

      transaction.set(db.collection('leads').doc(newLead.id), newLead);
      return { lead: newLead, isNew: true };
    });

    // A retried request (same clientRequestId) returns the existing lead and must
    // not log a second "created" entry.
    if (isNew) {
      await writeHistoryEntry({
        action: 'created',
        leadId: lead.id,
        leadDisplayNumber: lead.displayNumber,
        leadCompany: lead.company,
        userId: currentUserId,
        userEmail: currentEmail,
        userName: userNameFromRequest(authReq),
      });
    }

    res.json({ success: true, lead });
  } catch (error) {
    handleRouteError(error, res, 'Failed to create lead');
  }
});

// PUT /api/leads/:id
leadRoutes.put('/:id', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const currentUserId = authReq.firebaseUser.uid;
  const currentEmail = authReq.firebaseUser.email ?? '';
  const leadId = req.params['id'];

  try {
    const db = getFirestore();
    const input = parseUpdateLeadRequest({ ...req.body, id: leadId });
    const existing = await getLeadById(db, input.id);
    const updates = updateLead(existing, input, { now: new Date() });
    await updateLeadInDb(db, input.id, updates);

    if (existing) {
      const skipFields = new Set(['updatedAt']);
      const fields = Object.keys(updates);
      for (const field of fields) {
        if (skipFields.has(field)) continue;
        const fromValue = (existing as unknown as Record<string, unknown>)[field];
        const toValue = (updates as unknown as Record<string, unknown>)[field];
        if (fromValue === toValue) continue;

        await writeHistoryEntry({
          action: field === 'status' ? 'status-changed' : 'updated',
          leadId: existing.id,
          leadDisplayNumber: existing.displayNumber,
          leadCompany: existing.company,
          userId: currentUserId,
          userEmail: currentEmail,
          userName: userNameFromRequest(authReq),
          field,
          fromValue,
          toValue,
        });
      }
    }

    res.json({ success: true, id: input.id });
  } catch (error) {
    handleRouteError(error, res, 'Failed to update lead');
  }
});

// DELETE /api/leads/:id
leadRoutes.delete('/:id', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const currentUserId = authReq.firebaseUser.uid;
  const currentEmail = authReq.firebaseUser.email ?? '';
  const id = req.params['id'];

  try {
    const db = getFirestore();
    const existing = await getLeadById(db, id);
    deleteLead(id, existing);
    await deleteLeadFromDb(db, id);

    if (existing) {
      await writeHistoryEntry({
        action: 'deleted',
        leadId: existing.id,
        leadDisplayNumber: existing.displayNumber,
        leadCompany: existing.company,
        userId: currentUserId,
        userEmail: currentEmail,
        userName: userNameFromRequest(authReq),
      });
    }

    res.json({ success: true });
  } catch (error) {
    handleRouteError(error, res, 'Failed to delete lead');
  }
});
