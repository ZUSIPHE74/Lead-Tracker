import { randomUUID } from 'crypto';
import { CreateHistoryInput, HistoryEntry } from './history';

export function createHistoryEntry(input: CreateHistoryInput, now: Date): HistoryEntry {
  const entry: HistoryEntry = {
    id: randomUUID(),
    timestamp: now.toISOString(),
    action: input.action,
    leadId: input.leadId,
    leadDisplayNumber: input.leadDisplayNumber,
    leadCompany: input.leadCompany,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
  };

  if (input.field !== undefined) entry.field = input.field;
  if (input.fromValue !== undefined) entry.fromValue = input.fromValue;
  if (input.toValue !== undefined) entry.toValue = input.toValue;

  return entry;
}
