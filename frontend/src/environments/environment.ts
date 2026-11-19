export const environment = {
  production: false,
  // Gateway RATE (único punto de entrada a los microservicios)
  apiBaseUrl: 'http://localhost:8080/api',
  // Authorization Server (OIDC: authorize, token, jwks, logout)
  authServerUrl: 'http://localhost:9000',
  clientId: 'frontend-client',
  redirectUri: 'http://localhost:4200/',
  postLogoutRedirectUri: 'http://localhost:4200/',
  scope: 'openid profile entity-a.read entity-a.write entity-b.read entity-b.write'
};
