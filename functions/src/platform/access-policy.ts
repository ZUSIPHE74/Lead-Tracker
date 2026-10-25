import { hasAllowedDomain } from './allowed-email';

export interface AccessPolicy {
  /** e.g. "@moderntech.co.za"; empty allows any domain. */
  allowedEmailDomain: string;
  /** When false, demo.* accounts are refused. */
  demoMode: boolean;
}

export interface AccessDenial {
  status: 403;
  code: 'auth/domain-not-permitted' | 'auth/demo-disabled' | 'auth/not-invited';
  error: string;
}

export function isDemoEmail(email: string | undefined): boolean {
  return !!email && email.trim().toLowerCase().startsWith('demo.');
}

/**
 * Checks that need only the token's email. Run before any database lookup so
 * foreign or disabled-demo accounts cost nothing.
 */
export function checkEmailAccess(
  email: string | undefined,
  policy: AccessPolicy,
): AccessDenial | null {
  if (!hasAllowedDomain(email, policy.allowedEmailDomain)) {
    return { status: 403, code: 'auth/domain-not-permitted', error: 'Email domain not permitted' };
  }
  if (!policy.demoMode && isDemoEmail(email)) {
    return {
      status: 403,
      code: 'auth/demo-disabled',
      error: 'Demo accounts are disabled in this environment.',
    };
  }
  return null;
}

/** Sign-up is invite-only: an account is usable only once it has a users/{uid} profile. */
export function checkInvited(invited: boolean): AccessDenial | null {
  if (invited) return null;
  return {
    status: 403,
    code: 'auth/not-invited',
    error: 'This account has not been invited. Contact your admin to be invited.',
  };
}
