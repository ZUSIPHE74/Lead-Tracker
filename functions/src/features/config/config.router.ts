import { Router } from 'express';
import { accessPolicy } from '../../platform/access-config';

export const configRoutes = Router();

// GET /api/config — public, unauthenticated. Lets the login page know whether to
// show the demo shortcuts, so one frontend build serves staging and production.
configRoutes.get('/', (_req, res) => {
  res.json({ success: true, demoMode: accessPolicy.demoMode });
});
