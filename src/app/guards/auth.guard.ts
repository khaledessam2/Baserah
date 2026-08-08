import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import type { UserRole } from '@/models/api.model';

/**
 * Port of `ProtectedRoute` in App.tsx.
 *
 * The React version rendered a spinner while the session was being restored;
 * here the guard returns the restore observable and decides on its completion,
 * so a page refresh never bounces an authenticated user to /auth.
 */
export function authGuard(allowedRoles?: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.restoreSession().pipe(
      map(() => {
        if (!auth.token()) {
          return router.createUrlTree(['/auth']);
        }

        const user = auth.user();
        if (allowedRoles && user && !allowedRoles.includes(user.role)) {
          // Logged in but wrong role — send them to their own dashboard.
          if (user.role === 'employee') {
            return router.createUrlTree(['/app/employee-dashboard']);
          }
          return router.createUrlTree(['/app/dashboard']);
        }

        return true;
      })
    );
  };
}
