export type HistoryAction = 'created' | 'updated' | 'deleted' | 'status-changed';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: HistoryAction;
  leadId: string;
  leadDisplayNumber: number;
  leadCompany: string;
  userId: string;
  userEmail: string;
  userName: string;
  field?: string;
  fromValue?: unknown;
  toValue?: unknown;
  clearedBy?: string[];
}

export interface CreateHistoryInput {
  action: HistoryAction;
  leadId: string;
  leadDisplayNumber: number;
  leadCompany: string;
  userId: string;
  userEmail: string;
  userName: string;
  field?: string;
  fromValue?: unknown;
  toValue?: unknown;
}
