import { Lead, LeadSource, LeadStatus } from './lead';

export interface FetchLeadsInput {
  status?: LeadStatus;
  source?: LeadSource;
}

export function fetchLeads(leads: Lead[], input: FetchLeadsInput = {}): Lead[] {
  return leads.filter((lead) => {
    if (input.status && lead.status !== input.status) return false;
    if (input.source && lead.source !== input.source) return false;
    return true;
  });
}
