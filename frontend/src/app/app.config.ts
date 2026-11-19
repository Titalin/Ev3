import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthConfig, OAuthService, provideOAuthClient } from 'angular-oauth2-oidc';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { environment } from '../environments/environment';

export const authConfig: AuthConfig = {
  issuer: environment.authServerUrl,
  clientId: environment.clientId,
  redirectUri: environment.redirectUri,
  postLogoutRedirectUri: environment.postLogoutRedirectUri,
  responseType: 'code',
  scope: environment.scope,
  requireHttps: false,
  showDebugInformation: false
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideOAuthClient(),
    provideAppInitializer(() => {
      const oauth = inject(OAuthService);
      oauth.configure(authConfig);
      oauth.setupAutomaticSilentRefresh();
      // Carga /.well-known/openid-configuration y luego procesa el callback (?code=...)
      return oauth.loadDiscoveryDocument().then(() => oauth.tryLoginCodeFlow());
    })
  ]
};
