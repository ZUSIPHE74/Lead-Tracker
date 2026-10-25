export type LeadStatus = 'new' | 'contacted' | 'follow-up' | 'converted' | 'lost';
export type LeadSource = 'website' | 'referral' | 'social-media' | 'advertisement' | 'other';
export type Priority = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  displayNumber: number;
  company: string;
  industry: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: string;
  createdBy: string;
  notes: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  lastContacted: string | null;
  nextFollowUp: string | null;
  clientRequestId?: string;
}

export type NewLead = Omit<
  Lead,
  'id' | 'displayNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'clientRequestId'
>;

export type LeadUpdate = Partial<
  Pick<
    Lead,
    | 'company'
    | 'industry'
    | 'email'
    | 'phone'
    | 'source'
    | 'status'
    | 'assignedTo'
    | 'notes'
    | 'priority'
    | 'lastContacted'
    | 'nextFollowUp'
  >
>;

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  converted: 'Converted',
  lost: 'Lost',
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  'social-media': 'Social Media',
  advertisement: 'Advertisement',
  other: 'Other',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
