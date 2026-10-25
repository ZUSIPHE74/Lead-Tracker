import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { LeadService } from '../../../core/services/leadService';
import { Lead, LeadSource, LeadStatus, NewLead, Priority } from '../../../shared/models/lead';
import {
  CountryOption,
  getCountryList,
  formatAsYouType,
  toE164,
  detectCountry,
  nationalDigits,
  flagEmoji,
} from '../../../shared/utils/phone';
import { CountryCode } from 'libphonenumber-js';

@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lead-formComponent.html',
  styleUrl: './lead-formComponent.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadFormComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);

  countries: CountryOption[] = getCountryList();
  selectedCountry: CountryCode = 'ZA';
  selectedDialCode = '+27';
  selectedFlag = flagEmoji('ZA');
  phoneDisplay = '';
  countrySearch = '';
  showCountryDropdown = false;

  lead: Partial<Lead> = {
    assignedTo: '',
    company: '',
    industry: '',
    email: '',
    phone: '',
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    status: 'new',
    priority: 'medium',
    source: 'other',
  };

  isEditMode = false;
  leadId: string | null = null;
  submitted = false;
  isSaving = false;
  error = '';

  statusOptions: { value: LeadStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ];

  priorityOptions: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  sourceOptions: { value: LeadSource; label: string }[] = [
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'social-media', label: 'Social Media' },
    { value: 'advertisement', label: 'Advertisement' },
    { value: 'other', label: 'Other' },
  ];

  industries = [
    'Accounting & Tax',
    'Advertising & PR',
    'Aerospace & Defense',
    'Agriculture & Farming',
    'Architecture',
    'Automotive',
    'Banking',
    'Biotechnology',
    'Broadcasting',
    'Chemicals',
    'Construction',
    'Consulting',
    'Consumer Electronics',
    'Consumer Goods',
    'Cybersecurity',
    'E-Commerce',
    'Education',
    'Energy & Utilities',
    'Engineering',
    'Entertainment',
    'Environmental Services',
    'Fashion & Apparel',
    'Film & TV',
    'Financial Services',
    'Fishing & Aquaculture',
    'Food & Beverage',
    'Forestry & Logging',
    'Gaming & Esports',
    'Government & Public Sector',
    'Healthcare',
    'Hospitality & Tourism',
    'HR & Recruitment',
    'Import & Export',
    'Insurance',
    'IT Services',
    'Legal Services',
    'Logistics & Supply Chain',
    'Manufacturing',
    'Marketing & Digital',
    'Media & Publishing',
    'Mining & Metals',
    'Music',
    'Non-Profit & NGO',
    'Oil & Gas',
    'Pharmaceuticals',
    'Real Estate',
    'Recreation & Leisure',
    'Restaurants & Catering',
    'Retail',
    'SaaS & Software',
    'Shipping & Maritime',
    'Sports',
    'Telecommunications',
    'Textiles',
    'Transportation',
    'Venture Capital & Private Equity',
    'Veterinary',
    'Warehousing',
    'Wholesale & Distribution',
    'Other',
  ];

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser;
    const currentUserName = user ? user.displayName || user.email || user.uid : 'Unknown User';

    const routeId = this.route.snapshot.paramMap.get('id');
    this.leadId = routeId || null;

    if (this.leadId) {
      this.isEditMode = true;
      const existingLead = await this.leadService.getLeadById(this.leadId);
      if (existingLead) {
        this.lead = { ...existingLead };

        if (this.lead.phone) {
          const detected = detectCountry(this.lead.phone);
          if (detected) {
            this.selectedCountry = detected;
            this.selectedDialCode = this.dialCodeFor(detected);
            this.selectedFlag = flagEmoji(detected);
          }
          this.phoneDisplay = nationalDigits(this.lead.phone, this.selectedCountry);
        }
      }
    } else {
      this.lead.assignedTo = currentUserName;
    }
  }

  private dialCodeFor(code: CountryCode): string {
    const found = this.countries.find((c) => c.code === code);
    return found ? found.dialCode : '+27';
  }

  get filteredCountries(): CountryOption[] {
    const q = this.countrySearch.trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  }

  toggleCountryDropdown(): void {
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) this.countrySearch = '';
  }

  selectCountry(country: CountryOption): void {
    this.selectedCountry = country.code;
    this.selectedDialCode = country.dialCode;
    this.selectedFlag = country.flag;
    this.showCountryDropdown = false;
    this.countrySearch = '';

    const digits = this.phoneDisplay.replace(/\D/g, '');
    this.phoneDisplay = formatAsYouType(digits, this.selectedCountry);
    this.lead.phone = toE164(this.phoneDisplay, this.selectedCountry);
  }

  onPhoneInput(value: string): void {
    const formatted = formatAsYouType(value, this.selectedCountry);
    this.phoneDisplay = formatted;
    this.lead.phone = toE164(formatted, this.selectedCountry);
  }

  formatDateForInput(date?: string | null): string {
    if (!date) return '';
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`;
  }

  saveDateField(field: 'lastContacted' | 'nextFollowUp', value: string): void {
    this.lead[field] = value ? new Date(`${value}T00:00:00`).toISOString() : null;
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.submitted = true;
    this.error = '';
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    try {
      if (this.isEditMode && this.leadId) {
        await this.leadService.updateLead(this.leadId, this.lead);
      } else {
        await this.leadService.addLead(this.lead as NewLead);
      }
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      console.error('Lead save failed', error);
      const err = error as { message?: string; code?: string };
      const backendMessage = err?.message || err?.code || '';
      this.error = backendMessage
        ? `Save failed: ${backendMessage}`
        : 'Lead could not be saved. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/leads']);
  }
}
