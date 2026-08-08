import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../api-error';
import { environment } from '@environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

/**
 * Port of `lib/api-client.ts`:
 *   - attaches the bearer token from localStorage on every request
 *   - on 401, clears the token and bounces to /auth (unless already there)
 *   - rethrows failures in the axios-compatible `ApiError` shape
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiCall = req.url.startsWith(API_BASE_URL);

  let request = req;
  if (isApiCall) {
    const token = localStorage.getItem('access_token');
    if (token) {
      request = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (isApiCall && error.status === 401) {
        localStorage.removeItem('access_token');
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
      }

      console.error('API Error:', error);
      return throwError(() => new ApiError(error));
    })
  );
};
