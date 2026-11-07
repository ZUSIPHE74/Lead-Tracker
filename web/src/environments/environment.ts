// Production build. Must match the Render service URL (see docs/deployment.md).
export const environment = {
  apiBaseUrl: 'https://moderntech-hr-api.onrender.com/api',
  // Show the demo shortcuts before GET /api/config answers, so they don't wait on a
  // Render cold start. The API still decides. Set false for a build that serves real
  // client data, so its login page never flashes demo UI.
  demoModeDefault: true,
};
