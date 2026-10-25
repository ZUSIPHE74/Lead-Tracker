import { InjectionToken } from '@angular/core';
import { Lead, NewLead, LeadUpdate } from '../../shared/models/lead';

export const LEAD_API = new InjectionToken<LeadApi>('LEAD_API');

export interface LeadApi {
  getLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: NewLead, clientRequestId: string): Promise<Lead>;
  updateLead(id: string, updates: LeadUpdate): Promise<void>;
  deleteLead(id: string): Promise<void>;
}

export type { NewLead, LeadUpdate };
