import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LeadService } from '../../../core/services/leadService';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboardPage.html',
  styleUrl: './dashboardPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly leadService = inject(LeadService);
  public readonly router = inject(Router);

  get leads() {
    return this.leadService.getLeads();
  }

  totalLeads = computed(() => this.leads().length);

  newLeads = computed(() => this.leads().filter((l) => l.status === 'new').length);
  contactedLeads = computed(() => this.leads().filter((l) => l.status === 'contacted').length);
  followUpLeads = computed(() => this.leads().filter((l) => l.status === 'follow-up').length);
  convertedLeads = computed(() => this.leads().filter((l) => l.status === 'converted').length);
  lostLeads = computed(() => this.leads().filter((l) => l.status === 'lost').length);

  overdueFollowUps = computed(() => {
    const todayStart = this.toDayStart(new Date()).getTime();
    return this.leads().filter((lead) => {
      if (lead.status === 'converted' || lead.status === 'lost') return false;
      if (!lead.nextFollowUp) return false;
      return this.toDayStart(new Date(lead.nextFollowUp)).getTime() < todayStart;
    });
  });

  followUpsToday = computed(() => {
    const todayStart = this.toDayStart(new Date()).getTime();
    return this.leads().filter((lead) => {
      if (lead.status === 'converted' || lead.status === 'lost') return false;
      if (!lead.nextFollowUp) return false;
      return this.toDayStart(new Date(lead.nextFollowUp)).getTime() === todayStart;
    });
  });

  conversionRate = computed(() => {
    const total = this.totalLeads();
    if (total === 0) return 0;
    return Math.round((this.convertedLeads() / total) * 100);
  });

  recentLeads = computed(() =>
    [...this.leads()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  );

  leadsBySource = computed(() => {
    const sources: Record<string, number> = {};
    this.leads().forEach((lead) => {
      const source = lead.source || 'other';
      sources[source] = (sources[source] || 0) + 1;
    });
    return sources;
  });

  viewLead(id: string): void {
    this.router.navigate(['/leads', id]);
  }

  viewLeadsByStatus(status: string): void {
    this.router.navigate(['/leads'], { queryParams: { status } });
  }

  private toDayStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
