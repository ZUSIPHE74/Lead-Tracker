import { Lead, DomainError } from './lead';

export function deleteLead(id: string, lead: Lead | null): void {
  if (!id || !id.trim()) {
    throw new DomainError('lead.id-required', 'Lead ID is required');
  }
  if (!lead) {
    throw new DomainError('lead.not-found', 'Lead not found');
  }
}
