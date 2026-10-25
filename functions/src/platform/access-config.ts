import { AccessPolicy } from './access-policy';

/** Access policy from the environment. DEMO_MODE=true only for staging/demos. */
export const accessPolicy: AccessPolicy = {
  allowedEmailDomain: process.env['ALLOWED_EMAIL_DOMAIN'] ?? '@moderntech.co.za',
  demoMode: process.env['DEMO_MODE'] === 'true',
};
