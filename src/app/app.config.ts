// File: src/app/app.config.ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http'; // ✅ Added withFetch for SSR

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Handles browser-level error logging
    provideBrowserGlobalErrorListeners(),

    // Enables faster, zone-less change detection
    provideZonelessChangeDetection(),

    // Configures client-side routing
    provideRouter(routes),

    // Enables client hydration for Angular SSR (Server-Side Rendering)
    provideClientHydration(withEventReplay()),

    // ✅ Enables HttpClient across all standalone components with fetch API for SSR
    provideHttpClient(withFetch())
  ]
};
