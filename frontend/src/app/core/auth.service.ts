import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private oauth: OAuthService) {}

  /** Inicia el flujo Authorization Code + PKCE contra el auth-server. */
  async login(): Promise<void> {
    try {
      // initCodeFlow necesita el discovery document cargado; si falló en el
      // arranque (auth-server caído), se reintenta aquí para ver el error.
      if (!this.oauth.discoveryDocumentLoaded) {
        await this.oauth.loadDiscoveryDocument();
      }
      this.oauth.initCodeFlow();
    } catch (e) {
      throw new Error('No se pudo contactar al Authorization Server. Verifica que auth-server esté ejecutándose en ' + environment.authServerUrl);
    }
  }

  /** Cierra sesión local y en el Authorization Server (OIDC RP-Initiated Logout). */
  logout(): void {
    const idToken = this.oauth.getIdToken();
    this.oauth.logOut(true);
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: environment.postLogoutRedirectUri,
      client_id: environment.clientId
    });
    window.location.href = `${environment.authServerUrl}/connect/logout?${params.toString()}`;
  }

  token(): string {
    return this.oauth.getAccessToken();
  }

  isLoggedIn(): boolean {
    return this.oauth.hasValidAccessToken();
  }

  username(): string {
    try {
      const claims = this.oauth.getIdentityClaims();
      return claims?.['preferred_username'] ?? claims?.['sub'] ?? '';
    } catch {
      return '';
    }
  }
}
