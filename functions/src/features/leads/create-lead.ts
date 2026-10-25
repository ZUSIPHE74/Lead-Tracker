import { Lead, LeadSource, LeadStatus, Priority, DomainError } from './lead';

export interface CreateLeadInput {
  company: string;
  industry: string;
  email: string;
  phone?: string;
  source?: LeadSource;
  assignedTo?: string;
  notes?: string;
  priority?: Priority;
  nextFollowUp?: string | null;
  lastContacted?: string | null;
  status?: LeadStatus;
  clientRequestId?: string;
}

export interface CreateLeadDeps {
  now: Date;
  newId: () => string;
  nextDisplayNumber: number;
  currentUserId: string;
}

export function createLead(input: CreateLeadInput, deps: CreateLeadDeps): Lead {
  if (!input.company || !input.company.trim()) {
    throw new DomainError('lead.company-required', 'Company name is required');
  }

  if (!input.industry || !input.industry.trim()) {
    throw new DomainError('lead.industry-required', 'Industry is required');
  }

  const email = input.email?.trim().toLowerCase() || '';
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainError('lead.invalid-email', 'Invalid email format');
    }
  }

  const now = deps.now.toISOString();

  return {
    id: deps.newId(),
    displayNumber: deps.nextDisplayNumber,
    company: input.company.trim(),
    industry: input.industry.trim(),
    email,
    phone: input.phone?.trim() || '',
    source: input.source || 'website',
    status: input.status || 'new',
    assignedTo: input.assignedTo || deps.currentUserId,
    createdBy: deps.currentUserId,
    notes: input.notes?.trim() || '',
    priority: input.priority || 'medium',
    createdAt: now,
    updatedAt: now,
    lastContacted: input.lastContacted ?? null,
    nextFollowUp: input.nextFollowUp ?? null,
    ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
  };
}
