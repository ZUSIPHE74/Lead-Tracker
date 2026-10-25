import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistoryAction, HistoryScope, HistoryService } from '../../../core/services/historyService';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historyPage.html',
  styleUrl: './historyPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage implements OnInit {
  private readonly historyService = inject(HistoryService);
  public readonly router = inject(Router);

  selectedFilter = signal<HistoryAction | 'all'>('all');
  scope = signal<HistoryScope>('mine');
  loading = signal(false);

  allEntries = computed(() => this.historyService.getHistory()());

  filteredEntries = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return this.allEntries();
    return this.allEntries().filter((e) => e.action === filter);
  });

  filterOptions: { key: HistoryAction | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
    { key: 'status-changed', label: 'Status' },
    { key: 'deleted', label: 'Deleted' },
  ];

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    await this.historyService.load(this.scope());
    this.loading.set(false);
  }

  async setScope(scope: HistoryScope): Promise<void> {
    if (this.scope() === scope) return;
    this.scope.set(scope);
    this.loading.set(true);
    await this.historyService.load(scope);
    this.loading.set(false);
  }

  countByAction(action: HistoryAction): number {
    return this.allEntries().filter((e) => e.action === action).length;
  }

  setFilter(key: HistoryAction | 'all'): void {
    this.selectedFilter.set(key);
  }

  viewLead(id: string): void {
    this.router.navigate(['/leads', id]);
  }

  async clearMyHistory(): Promise<void> {
    if (this.scope() !== 'mine') return;
    if (!confirm('Clear your history? This cannot be undone.')) return;

    this.loading.set(true);
    try {
      const deleted = await this.historyService.clearMine();
      alert(`Cleared ${deleted} entries.`);
    } catch (err) {
      console.error('Failed to clear history', err);
      alert('Failed to clear history.');
    } finally {
      this.loading.set(false);
    }
  }

  formatAction(action: HistoryAction): string {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      case 'status-changed':
        return 'Status Changed';
      default:
        return action;
    }
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) {
      return value.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if (typeof value === 'string') return value;
    return String(value);
  }

  formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
