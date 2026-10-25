/**
 * True when `email` belongs to `domain` (e.g. "@moderntech.co.za").
 * Case-insensitive; an empty domain allows any email.
 */
export function hasAllowedDomain(email: string | undefined, domain: string): boolean {
  if (!domain) return true;
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(domain.trim().toLowerCase());
}
