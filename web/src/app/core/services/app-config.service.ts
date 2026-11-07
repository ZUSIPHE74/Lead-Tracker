import { Injectable, signal } from '@angular/core';
import { apiConfig } from '../api-config';

/**
 * Runtime settings published by the API (GET /api/config), so one frontend build
 * works for staging and production. The backend's DEMO_MODE is the single source.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly demoModeState = signal(apiConfig.demoModeDefault);
  private loaded: Promise<void> | null = null;

  /**
   * Starts at the build's demoModeDefault, then follows the API's answer. If the API
   * can't be reached the default stands; demo sign-in is still refused server-side
   * when DEMO_MODE is off.
   */
  readonly demoMode = this.demoModeState.asReadonly();

  load(): Promise<void> {
    this.loaded ??= (async () => {
      try {
        const res = await fetch(`${apiConfig.baseUrl}/config`);
        if (res.ok) {
          const data = await res.json();
          this.demoModeState.set(data.demoMode === true);
        }
      } catch (err) {
        console.warn('Could not load app config from the API:', err);
      }
    })();
    return this.loaded;
  }
}
