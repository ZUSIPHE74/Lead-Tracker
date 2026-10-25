import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import jsPDF from 'jspdf';
import { LeadService } from '../../../core/services/leadService';
import { Lead, STATUS_LABELS, PRIORITY_LABELS, LeadStatus } from '../../../shared/models/lead';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lead-detailComponent.html',
  styleUrl: './lead-detailComponent.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly leadService = inject(LeadService);

  lead = signal<Lead | null>(null);
  isLoading = signal(true);
  error = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Lead not found.');
      this.isLoading.set(false);
      return;
    }
    try {
      const found = await this.leadService.getLeadById(id);
      if (!found) {
        this.error.set('Lead not found.');
      } else {
        this.lead.set(found);
      }
    } catch {
      this.error.set('Could not load this lead. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/leads']);
  }

  editLead(): void {
    const lead = this.lead();
    if (lead) this.router.navigate(['/leads/edit', lead.id]);
  }

  async deleteLead(): Promise<void> {
    const lead = this.lead();
    if (lead && confirm('Are you sure you want to delete this lead?')) {
      await this.leadService.deleteLead(lead.id);
      this.router.navigate(['/leads']);
    }
  }

  formatDate(date?: string | null): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusLabel(status: LeadStatus | string): string {
    return STATUS_LABELS[status as LeadStatus] ?? status;
  }

  priorityLabel(priority: string | null | undefined): string {
    if (!priority) return 'Medium';
    return PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority;
  }

  downloadPdf(): void {
    const lead = this.lead();
    if (!lead) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;

    doc.setFillColor(83, 171, 233);
    doc.rect(0, 0, pageWidth, 70, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Lead Report', margin, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('ModernTech HR  •  Lead Tracker', pageWidth - margin, 42, { align: 'right' });

    let y = 110;

    doc.setTextColor(25, 28, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(lead.company || 'Untitled Lead', margin, y);

    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(112, 120, 129);
    doc.text(
      `Lead #${lead.displayNumber}  •  Report generated: ${new Date().toLocaleString('en-ZA')}`,
      margin,
      y,
    );

    y += 30;

    const statusColor = this.getStatusColor(lead.status);
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 6, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Status: ${this.statusLabel(lead.status) || 'Unknown'}`, margin + 16, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.text(`Priority: ${this.priorityLabel(lead.priority)}`, pageWidth - margin - 16, y + 22, {
      align: 'right',
    });

    y += 60;

    y = this.addSectionHeader(doc, 'Lead Information', margin, y);
    y = this.addField(doc, 'Company', lead.company, margin, y);
    y = this.addField(doc, 'Industry', lead.industry, margin, y);
    y = this.addField(doc, 'Email', lead.email, margin, y);
    y = this.addField(doc, 'Phone', lead.phone, margin, y);
    y = this.addField(doc, 'Lead Source', lead.source, margin, y);

    y = this.addSectionHeader(doc, 'Assignment', margin, y);
    y = this.addField(doc, 'Assigned To', lead.assignedTo, margin, y);

    y = this.addSectionHeader(doc, 'Timeline', margin, y);
    y = this.addField(doc, 'Created', this.formatDate(lead.createdAt), margin, y);
    y = this.addField(doc, 'Last Contacted', this.formatDate(lead.lastContacted), margin, y);

    const followUpText =
      lead.status === 'converted' || lead.status === 'lost'
        ? 'Not applicable'
        : lead.nextFollowUp
          ? `${this.formatDate(lead.nextFollowUp)}${
              this.isFollowUpOverdue(lead.nextFollowUp) ? ' (OVERDUE)' : ''
            }`
          : 'Not scheduled';

    y = this.addField(doc, 'Next Follow-up', followUpText, margin, y);

    if (lead.notes) {
      y = this.addSectionHeader(doc, 'Notes', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(64, 72, 80);
      const notes = doc.splitTextToSize(lead.notes, pageWidth - margin * 2);
      doc.text(notes, margin, y);
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(112, 120, 129);
    doc.text('Generated by ModernTech HR Lead Tracker', margin, pageHeight - 30);
    doc.text('Confidential', pageWidth - margin, pageHeight - 30, { align: 'right' });

    const safeName = (lead.company || 'lead').replace(/[^a-z0-9]/gi, '_');
    doc.save(`Lead-Report-${safeName}.pdf`);
  }

  private addSectionHeader(doc: jsPDF, title: string, x: number, y: number): number {
    if (y > 720) {
      doc.addPage();
      return 60;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 100, 149);
    doc.text(title.toUpperCase(), x, y);
    doc.setDrawColor(203, 230, 255);
    doc.line(x, y + 6, x + 520, y + 6);
    return y + 26;
  }

  private addField(doc: jsPDF, label: string, value: unknown, x: number, y: number): number {
    if (y > 760) {
      doc.addPage();
      return 60;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(112, 120, 129);
    doc.text(label, x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(25, 28, 30);

    const safeValue = value === null || value === undefined || value === '' ? '—' : String(value);
    const wrapped = doc.splitTextToSize(safeValue, 340);
    doc.text(wrapped, x + 150, y);

    return y + Math.max(20, wrapped.length * 14 + 6);
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case 'new':
        return [34, 197, 94];
      case 'contacted':
        return [59, 130, 246];
      case 'follow-up':
        return [245, 158, 11];
      case 'converted':
        return [83, 171, 233];
      case 'lost':
        return [186, 26, 26];
      default:
        return [112, 120, 129];
    }
  }

  isFollowUpOverdue(date?: string | null): boolean {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }

  isFollowUpToday(date?: string | null): boolean {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      new: 'fa-plus-circle',
      contacted: 'fa-phone',
      'follow-up': 'fa-clock',
      converted: 'fa-check-circle',
      lost: 'fa-times-circle',
    };
    return icons[status] ?? 'fa-circle';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority.toLowerCase()}`;
  }
}
