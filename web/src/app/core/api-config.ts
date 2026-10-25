// Backend API configuration for ModernTech HR Lead Tracker.
// The URL is chosen at build time: environment.development.ts for `ng serve`,
// environment.ts (the Render.com service) for production builds.
import { environment } from '../../environments/environment';

export const apiConfig = {
  baseUrl: environment.apiBaseUrl,
};
