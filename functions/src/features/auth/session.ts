export interface Session {
  id: string;
  userId: string;
  email: string;
  sessionToken: string;
  loginTime: string;
  lastActivity: string;
  expiresAt: string;
  active: boolean;
}
