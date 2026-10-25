/**
 * Permanent demo accounts, created/reset by seedDemoAccounts() when
 * SEED_DEMO_ACCOUNTS=true. Keep in sync with web/src/app/features/login/demo-accounts.ts.
 */
export const DEMO_ACCOUNTS = [
  {
    email: 'demo.admin@moderntech.co.za',
    password: 'DemoAdmin123!',
    displayName: 'Demo Admin',
    role: 'admin',
    department: 'Executive Management',
  },
  {
    email: 'demo.manager@moderntech.co.za',
    password: 'DemoManager123!',
    displayName: 'Demo Manager',
    role: 'manager',
    department: 'HR Management',
  },
  {
    email: 'demo.agent@moderntech.co.za',
    password: 'DemoAgent123!',
    displayName: 'Demo Agent',
    role: 'agent',
    department: 'Talent Acquisition',
  },
] as const;
