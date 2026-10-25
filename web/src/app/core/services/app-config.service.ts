import { Injectable, signal } from '@angular/core';
import { apiConfig } from '../api-config';

/**
 * Runtime settings published by the API (GET /api/config), so one frontend build
 * works for staging and production. The backend's DEMO_MODE is the single source.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly demoModeState = signal(false);
  private loaded: Promise<void> | null = null;

  /** False until the API confirms demo mode, so production never flashes demo UI. */
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
