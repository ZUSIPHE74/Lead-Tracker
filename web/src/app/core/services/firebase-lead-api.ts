import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Lead, LeadUpdate, NewLead } from '../../shared/models/lead';
import { LeadApi } from './lead-api';
import { apiConfig } from '../api-config';

interface LeadsResponse {
  success: boolean;
  leads: Lead[];
}

interface LeadResponse {
  success: boolean;
  lead: Lead;
}

@Injectable({ providedIn: 'root' })
export class FirebaseLeadApi implements LeadApi {
  private readonly auth = inject(Auth);

  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.auth.authStateReady();
    const token = await this.auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getLeads(): Promise<Lead[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${apiConfig.baseUrl}/leads`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch leads');
    }
    const data: LeadsResponse = await res.json();
    return data.leads || [];
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const leads = await this.getLeads();
    return leads.find((lead) => lead.id === id);
  }

  async createLead(lead: NewLead, clientRequestId: string): Promise<Lead> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${apiConfig.baseUrl}/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...lead, clientRequestId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create lead');
    }
    const data: LeadResponse = await res.json();
    return data.lead;
  }

  async updateLead(id: string, updates: LeadUpdate): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${apiConfig.baseUrl}/leads/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update lead');
    }
  }

  async deleteLead(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${apiConfig.baseUrl}/leads/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete lead');
    }
  }
}
