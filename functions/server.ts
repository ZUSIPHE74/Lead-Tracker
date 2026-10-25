import express from 'express';
import cors from 'cors';
import { initializeApp, getApps } from 'firebase-admin/app';
import { leadRoutes } from './src/features/leads/leads.router';
import { sessionRoutes } from './src/features/auth/session.router';
import { historyRoutes } from './src/features/history/history.router';
import { userRoutes } from './src/features/users/users.router';
import { adminRoutes, seedDemoAccounts } from './src/features/admin/admin.router';
import { configRoutes } from './src/features/config/config.router';

// Initialise Firebase Admin SDK once.
// Credentials: set GOOGLE_APPLICATION_CREDENTIALS to the path of a service-account
// JSON key (on Render: a Secret File at /etc/secrets/service-account.json).
// FIREBASE_PROJECT_ID lets ID-token verification work even before credentials load.
if (!getApps().length) {
  const projectId = process.env['FIREBASE_PROJECT_ID'];
  initializeApp(projectId ? { projectId } : undefined);
}

const app = express();

// ---------------------------------------------------------------------------
// CORS — only the configured frontend origins may call the API from a browser.
// ALLOWED_ORIGINS is a comma-separated list. Outside production, the Angular dev
// server is allowed by default.
// ---------------------------------------------------------------------------
const isProduction = process.env['NODE_ENV'] === 'production';
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
if (!isProduction) {
  allowedOrigins.push('http://localhost:4200', 'http://127.0.0.1:4200');
}

app.use(
  cors({
    // Requests without an Origin header (curl, health checks) carry no browser
    // credentials, so they are left to the auth middleware.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Friendly Root Landing Page — Never display "Cannot GET /"
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>ModernTech HR — API Gateway</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b132b; color: #f0f4f8; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .card { background: #1c2541; border: 1px solid #3a506b; border-radius: 16px; padding: 36px 44px; max-width: 620px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        h1 { color: #5bc0be; margin-top: 0; display: flex; align-items: center; gap: 10px; }
        .badge { display: inline-block; padding: 4px 12px; background: #06d6a0; color: #0b132b; font-weight: bold; font-size: 13px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; }
        p { color: #c5d3e8; line-height: 1.6; font-size: 15px; }
        .endpoints { background: #0b132b; border-radius: 10px; padding: 16px 20px; font-family: monospace; font-size: 13px; color: #6fffe9; margin-top: 20px; }
        .endpoints div { margin: 6px 0; }
        .btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #5bc0be; color: #0b132b; font-weight: bold; text-decoration: none; border-radius: 8px; transition: background 0.2s; }
        .btn:hover { background: #6fffe9; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Online & Operational</span>
        <h1>ModernTech HR API Server</h1>
        <p>The backend REST service is up and running. It manages all lead tracking transactions, audit trails, user access control, and executive management analytics.</p>
        <div class="endpoints">
          <div>✓ GET  /health — Ping & Keep-Alive</div>
          <div>✓ API  /api/leads — Leads Management & Transactions</div>
          <div>✓ API  /api/session — Session Heartbeats & Idle Security</div>
          <div>✓ API  /api/history — Audit Log History</div>
          <div>✓ API  /api/users — User Profiles & Roles</div>
          <div>✓ API  /api/admin — Management System & Analytics</div>
        </div>
        <a class="btn" href="${allowedOrigins[0] ?? '#'}" target="_blank">Open ModernTech HR Web App →</a>
      </div>
    </body>
    </html>
  `);
});

// ---------------------------------------------------------------------------
// Health check — useful for Render.com free tier keep-alive pings
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ModernTech HR API', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Feature routers
// ---------------------------------------------------------------------------
app.use('/api/leads', leadRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = Number(process.env['PORT'] ?? 4000);
app.listen(PORT, () => {
  console.log(`ModernTech HR API running on port ${PORT}`);
  // Seeding resets the demo accounts to known passwords, so it is opt-in only.
  if (process.env['SEED_DEMO_ACCOUNTS'] === 'true') {
    seedDemoAccounts().catch((err) => {
      console.warn(
        'Could not seed demo accounts (service-account credentials required):',
        err.message,
      );
    });
  }
});

export default app;
