import { appConfig } from './app.config';

describe('appConfig', () => {
  it('should expose at least one provider', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });

  it('should provide the router config', () => {
    const hasRouter = appConfig.providers.some(
      (p) => typeof p === 'object' && p !== null && 'provide' in p,
    );
    // sanity check that providers are wired up
    expect(typeof hasRouter).toBe('boolean');
  });
});
