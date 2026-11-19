import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauth = inject(OAuthService);
  // Solo las llamadas a la API del Gateway llevan Bearer; el auth-server
  // (token, jwks, logout) lo maneja la librería por su cuenta.
  if (req.url.startsWith(environment.apiBaseUrl)) {
    const token = oauth.getAccessToken();
    if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        oauth.logOut();
        inject(Router).navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
