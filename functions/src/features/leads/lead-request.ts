import { CreateLeadInput } from './create-lead';
import { DomainError, LeadSource, LeadStatus, LeadUpdate, Priority } from './lead';
import { FetchLeadsInput } from './fetch-leads';
import { UpdateLeadInput } from './update-lead';

const leadSources: LeadSource[] = ['website', 'referral', 'social-media', 'advertisement', 'other'];
const priorities: Priority[] = ['low', 'medium', 'high'];
const leadStatuses: LeadStatus[] = ['new', 'contacted', 'follow-up', 'converted', 'lost'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DomainError('lead.invalid-request', `${field} is required`);
  }
  return value;
}

export function parseCreateLeadRequest(data: unknown): CreateLeadInput {
  if (!isRecord(data)) throw new DomainError('lead.invalid-request', 'Lead data is required');

  const input = {
    company: requiredString(data.company, 'Company name'),
    industry: requiredString(data.industry, 'Industry'),
    email: typeof data.email === 'string' ? data.email : '',
    phone: data.phone,
    source: data.source,
    assignedTo: data.assignedTo,
    notes: data.notes,
    priority: data.priority,
    nextFollowUp: data.nextFollowUp,
    lastContacted: data.lastContacted,
    status: data.status,
    clientRequestId: data.clientRequestId,
  };

  if (input.phone !== undefined && typeof input.phone !== 'string') {
    throw new DomainError('lead.invalid-request', 'Phone must be a string');
  }
  if (input.source !== undefined && !leadSources.includes(input.source as LeadSource)) {
    throw new DomainError('lead.invalid-request', 'Invalid lead source');
  }
  if (input.assignedTo !== undefined && typeof input.assignedTo !== 'string') {
    throw new DomainError('lead.invalid-request', 'Assigned user must be a string');
  }
  if (input.notes !== undefined && typeof input.notes !== 'string') {
    throw new DomainError('lead.invalid-request', 'Notes must be a string');
  }
  if (input.priority !== undefined && !priorities.includes(input.priority as Priority)) {
    throw new DomainError('lead.invalid-request', 'Invalid priority');
  }
  if (
    input.nextFollowUp !== undefined &&
    input.nextFollowUp !== null &&
    typeof input.nextFollowUp !== 'string'
  ) {
    throw new DomainError('lead.invalid-request', 'Next follow-up must be a date string');
  }
  if (
    input.lastContacted !== undefined &&
    input.lastContacted !== null &&
    typeof input.lastContacted !== 'string'
  ) {
    throw new DomainError('lead.invalid-request', 'Last contacted must be a date string');
  }
  if (input.status !== undefined && !leadStatuses.includes(input.status as LeadStatus)) {
    throw new DomainError('lead.invalid-request', 'Invalid status');
  }
  if (
    input.clientRequestId !== undefined &&
    (typeof input.clientRequestId !== 'string' || !input.clientRequestId.trim())
  ) {
    throw new DomainError('lead.invalid-request', 'Client request ID must be a non-empty string');
  }

  return input as CreateLeadInput;
}

export function parseUpdateLeadRequest(data: unknown): UpdateLeadInput {
  if (!isRecord(data)) throw new DomainError('lead.invalid-request', 'Lead data is required');
  const id = requiredString(data.id, 'Lead ID');
  const updates: Record<string, unknown> = { ...data };
  delete updates.id;
  delete updates.displayNumber;
  return { id, updates: updates as LeadUpdate };
}

export function parseDeleteLeadRequest(data: unknown): string {
  if (!isRecord(data)) throw new DomainError('lead.invalid-request', 'Lead data is required');
  return requiredString(data.id, 'Lead ID');
}

export function parseFetchLeadsRequest(data: unknown): FetchLeadsInput {
  if (data === undefined || data === null) return {};
  if (!isRecord(data))
    throw new DomainError('lead.invalid-request', 'Lead filters must be an object');

  if (data.status !== undefined && !leadStatuses.includes(data.status as LeadStatus)) {
    throw new DomainError('lead.invalid-request', 'Invalid lead status');
  }
  if (data.source !== undefined && !leadSources.includes(data.source as LeadSource)) {
    throw new DomainError('lead.invalid-request', 'Invalid lead source');
  }

  return {
    status: data.status as LeadStatus | undefined,
    source: data.source as LeadSource | undefined,
  };
}
