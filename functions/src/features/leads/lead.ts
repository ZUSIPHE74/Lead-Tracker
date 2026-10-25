export type LeadStatus = 'new' | 'contacted' | 'follow-up' | 'converted' | 'lost';
export type LeadSource = 'website' | 'referral' | 'social-media' | 'advertisement' | 'other';
export type Priority = 'low' | 'medium' | 'high';

export interface Lead {
  id: string; // Firestore document ID (random string)
  displayNumber: number; // Human-readable number
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
    | 'updatedAt'
    | 'lastContacted'
    | 'nextFollowUp'
  >
>;

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
