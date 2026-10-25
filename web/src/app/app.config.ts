import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator, Auth } from '@angular/fire/auth';
import { firebaseConfig, useEmulators } from './core/firebase-config';
import { routes } from './app.routes';
import { LEAD_API } from './core/services/lead-api';
import { FirebaseLeadApi } from './core/services/firebase-lead-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),

    provideAppInitializer(() => {
      if (!useEmulators) return;

      const auth = inject(Auth);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

      console.log('Connected to Firebase Auth emulator');
    }),

    { provide: LEAD_API, useClass: FirebaseLeadApi },
  ],
};
