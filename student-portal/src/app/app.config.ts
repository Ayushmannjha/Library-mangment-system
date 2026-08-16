import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Use stable Zoneless Change Detection for Angular v22
    provideZonelessChangeDetection(),

    // App routing provide karta hai
    provideRouter(routes),

    // HTTP Client provide karta hai aur authInterceptor ko register karta hai
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
