/**
 * Demo shortcuts shown on the login page. Clicking one fills the form; the user
 * still presses Sign In. Keep in sync with functions/src/features/admin/demo-accounts.ts,
 * which seeds these accounts (SEED_DEMO_ACCOUNTS=true).
 */
export interface DemoAccount {
  label: string;
  role: string;
  icon: string;
  email: string;
  password: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Demo Admin',
    role: 'admin',
    icon: 'fa-solid fa-shield-halved',
    email: 'demo.admin@moderntech.co.za',
    password: 'DemoAdmin123!',
  },
  {
    label: 'Demo Manager',
    role: 'manager',
    icon: 'fa-solid fa-user-tie',
    email: 'demo.manager@moderntech.co.za',
    password: 'DemoManager123!',
  },
  {
    label: 'Demo Agent',
    role: 'agent',
    icon: 'fa-solid fa-user-check',
    email: 'demo.agent@moderntech.co.za',
    password: 'DemoAgent123!',
  },
];
