import { Injectable, inject, signal } from '@angular/core';
import { Lead, LeadUpdate, NewLead } from '../../shared/models/lead';
import { LEAD_API, LeadApi } from './lead-api';

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private leads = signal<Lead[]>([]);
  private readonly leadApi: LeadApi = inject(LEAD_API);

  constructor() {
    void this.loadLeads();
  }

  getLeads() {
    return this.leads.asReadonly();
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const cached = this.leads().find((lead) => lead.id === id);
    if (cached) return cached;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const found = this.leads().find((lead) => lead.id === id);
      if (found) return found;
    }

    try {
      return await this.leadApi.getLeadById(id);
    } catch {
      return undefined;
    }
  }

  async addLead(lead: NewLead): Promise<Lead> {
    const cleaned = this.normalizeFollowUp({ ...lead });
    const newLead = await this.leadApi.createLead(cleaned, crypto.randomUUID());
    this.leads.update((current) => [...current, newLead]);
    return newLead;
  }

  async updateLead(id: string, updates: LeadUpdate): Promise<void> {
    const cleaned = this.normalizeFollowUp(updates);
    await this.leadApi.updateLead(id, cleaned);
    this.leads.update((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...cleaned } : lead)),
    );
  }

  async deleteLead(id: string): Promise<void> {
    await this.leadApi.deleteLead(id);
    this.leads.update((current) => current.filter((lead) => lead.id !== id));
  }

  getLeadsByStatus(status: string): Lead[] {
    return this.leads().filter((lead) => lead.status === status);
  }

  getOverdueFollowUps(): Lead[] {
    const todayStart = this.toDayStart(new Date()).getTime();
    return this.leads().filter((lead) => {
      if (lead.status === 'converted' || lead.status === 'lost') return false;
      if (!lead.nextFollowUp) return false;
      return this.toDayStart(new Date(lead.nextFollowUp)).getTime() < todayStart;
    });
  }

  private async loadLeads(): Promise<void> {
    try {
      this.leads.set(await this.leadApi.getLeads());
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  }

  private toDayStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private normalizeFollowUp<T extends Partial<Lead>>(updates: T): T {
    if (updates.status === 'converted' || updates.status === 'lost') {
      return { ...updates, nextFollowUp: null };
    }
    return updates;
  }
}
