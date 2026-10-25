import { Lead, LeadUpdate, DomainError } from './lead';

export interface UpdateLeadInput {
  id: string;
  updates: LeadUpdate;
}

export interface UpdateLeadDeps {
  now: Date;
}

export function updateLead(
  existingLead: Lead | null,
  input: UpdateLeadInput,
  deps: UpdateLeadDeps,
): LeadUpdate {
  if (!existingLead) {
    throw new DomainError('lead.not-found', 'Lead not found');
  }

  return {
    ...input.updates,
    updatedAt: deps.now.toISOString(),
  };
}
