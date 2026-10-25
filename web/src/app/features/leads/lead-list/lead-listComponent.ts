import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LeadService } from '../../../core/services/leadService';
import { LeadStatus, STATUS_LABELS } from '../../../shared/models/lead';

type SortField =
  'displayNumber' | 'company' | 'industry' | 'status' | 'assignedTo' | 'nextFollowUp';
type SortDir = 'asc' | 'desc';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-lead-list',
  styleUrl: './lead-listComponent.css',
  templateUrl: './lead-listComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadListComponent {
  private readonly leadService = inject(LeadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly validStatuses = new Set([
    'new',
    'contacted',
    'follow-up',
    'converted',
    'lost',
    'OVERDUE',
    'DUE_TODAY',
  ]);

  private readonly allLeads = this.leadService.getLeads();

  searchTerm = signal('');
  selectedStatus = signal<string | null>(null);
  viewMode = signal<'table' | 'cards'>('table');
  sortField = signal<SortField>('displayNumber');
  sortDir = signal<SortDir>('asc');

  filteredLeads = computed(() => {
    const allLeads = this.allLeads();
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();
    const field = this.sortField();
    const dir = this.sortDir();

    const filtered = allLeads.filter((lead) => {
      if (status === 'OVERDUE') {
        if (lead.status === 'converted' || lead.status === 'lost') return false;
        if (!lead.nextFollowUp) return false;
        if (!this.isFollowUpOverdue(lead.nextFollowUp)) return false;
      } else if (status === 'DUE_TODAY') {
        if (lead.status === 'converted' || lead.status === 'lost') return false;
        if (!lead.nextFollowUp) return false;
        if (!this.isFollowUpToday(lead.nextFollowUp)) return false;
      } else if (status && lead.status !== status) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        lead.company,
        lead.email,
        lead.phone,
        lead.industry,
        lead.notes,
        lead.assignedTo,
        lead.status,
        lead.priority,
        lead.source,
        lead.id,
        String(lead.displayNumber),
        lead.createdAt ? new Date(lead.createdAt).toDateString() : '',
        lead.lastContacted ? new Date(lead.lastContacted).toDateString() : '',
        lead.nextFollowUp ? new Date(lead.nextFollowUp).toDateString() : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });

    return [...filtered].sort((a, b) => {
      const av = a[field];
      const bv = b[field];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  allCount = computed(() => this.allLeads().length);
  newCount = computed(() => this.allLeads().filter((l) => l.status === 'new').length);
  contactedCount = computed(() => this.allLeads().filter((l) => l.status === 'contacted').length);
  followUpCount = computed(() => this.allLeads().filter((l) => l.status === 'follow-up').length);
  convertedCount = computed(() => this.allLeads().filter((l) => l.status === 'converted').length);
  lostCount = computed(() => this.allLeads().filter((l) => l.status === 'lost').length);

  overdueCount = computed(() => {
    const today = this.toDayStart(new Date()).getTime();
    return this.allLeads().filter((l) => {
      if (l.status === 'converted' || l.status === 'lost') return false;
      if (!l.nextFollowUp) return false;
      return this.toDayStart(new Date(l.nextFollowUp)).getTime() < today;
    }).length;
  });

  dueTodayCount = computed(() => {
    const today = this.toDayStart(new Date()).getTime();
    return this.allLeads().filter((l) => {
      if (l.status === 'converted' || l.status === 'lost') return false;
      if (!l.nextFollowUp) return false;
      return this.toDayStart(new Date(l.nextFollowUp)).getTime() === today;
    }).length;
  });

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  filterByStatus(status: string | null): void {
    this.selectedStatus.set(status);
  }

  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode.set(mode);
  }

  toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'fa-sort';
    return this.sortDir() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  async deleteLead(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this lead?')) {
      await this.leadService.deleteLead(id);
    }
  }

  viewLead(id: string): void {
    this.router.navigate(['/leads', id]);
  }

  editLead(id: string): void {
    this.router.navigate(['/leads/edit', id]);
  }

  addLead(): void {
    this.router.navigate(['/leads/new']);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      new: 'badge-new',
      contacted: 'badge-contacted',
      'follow-up': 'badge-follow-up',
      converted: 'badge-converted',
      lost: 'badge-lost',
    };
    return classes[status] || 'badge-default';
  }

  statusLabel(status: LeadStatus | string): string {
    return STATUS_LABELS[status as LeadStatus] ?? status;
  }

  isFollowUpOverdue(date?: string | null): boolean {
    if (!date) return false;
    return this.toDayStart(new Date(date)).getTime() < this.toDayStart(new Date()).getTime();
  }

  isFollowUpToday(date?: string | null): boolean {
    if (!date) return false;
    return this.toDayStart(new Date(date)).getTime() === this.toDayStart(new Date()).getTime();
  }

  private toDayStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('status');
      this.selectedStatus.set(status && this.validStatuses.has(status) ? status : null);
    });
  }
}
