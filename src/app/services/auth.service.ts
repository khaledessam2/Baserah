import { Injectable, computed, inject, signal } from '@angular/core';
import {
  catchError,
  map,
  of,
  shareReplay,
  tap,
  type Observable,
} from 'rxjs';
import { AuthApi } from '@/services/auth.api';
import type { UserLogin, UserRegister, UserResponse } from '@/models/api.model';

/**
 * Port of `contexts/AuthContext.tsx`.
 *
 * `isLoading` starts true and flips once the stored token has been validated
 * against /auth/me, exactly as the React provider did — the route guard waits
 * on it so a refresh does not bounce an authenticated user to /auth.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);

  private readonly userState = signal<UserResponse | null>(null);
  private readonly tokenState = signal<string | null>(
    localStorage.getItem('access_token')
  );
  private readonly loadingState = signal(true);

  readonly user = this.userState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenState());

  private restore$: Observable<void> | null = null;

  /**
   * Emits once the initial token check has finished. `shareReplay` keeps the
   * check to a single request no matter how many guards subscribe, and replays
   * the result to anyone subscribing after it settled.
   */
  restoreSession(): Observable<void> {
    this.restore$ ??= this.checkAuth().pipe(
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.restore$;
  }

  private checkAuth(): Observable<void> {
    const savedToken = localStorage.getItem('access_token');
    if (!savedToken) {
      this.loadingState.set(false);
      return of(undefined);
    }

    this.tokenState.set(savedToken);
    return this.authApi.getCurrentUser().pipe(
      tap((userData) => {
        this.userState.set(userData);
        if (userData.organization_name) {
          localStorage.setItem('companyName', userData.organization_name);
        }
      }),
      catchError((error) => {
        console.error('Failed to authenticate with token', error);
        this.logout();
        return of(null);
      }),
      tap(() => this.loadingState.set(false)),
      map(() => undefined)
    );
  }

  login(credentials: UserLogin): Observable<UserResponse> {
    return this.authApi.login(credentials).pipe(
      map((response) => {
        this.tokenState.set(response.access_token);
        this.userState.set(response.user);
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('userData', JSON.stringify(response.user));
        if (response.user.organization_name) {
          localStorage.setItem('companyName', response.user.organization_name);
        }
        return response.user;
      })
    );
  }

  register(credentials: UserRegister): Observable<UserResponse> {
    return this.authApi.register(credentials).pipe(
      map((response) => {
        this.tokenState.set(response.access_token);
        this.userState.set(response.user);
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('userData', JSON.stringify(response.user));
        return response.user;
      })
    );
  }

  logout(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('userData');
    localStorage.removeItem('companyName');
    localStorage.removeItem('companyInfo');
    localStorage.removeItem('jobDescriptionUrls');
    localStorage.removeItem('manualJobDescription');
    localStorage.removeItem('currentAnalysisSetup');
  }

  updateOrganization(name: string): Observable<void> {
    const user = this.userState();
    if (!this.tokenState() || !user) return of(undefined);

    return this.authApi.updateOrganization(name).pipe(
      map(() => {
        const updatedUser = { ...user, organization_name: name };
        this.userState.set(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        localStorage.setItem('companyName', name);
      }),
      tap({
        error: (error) =>
          console.error('Failed to update organization', error),
      })
    );
  }

  /** Used after onboarding-step / profile mutations that happen in pages. */
  patchUser(patch: Partial<UserResponse>): void {
    const user = this.userState();
    if (!user) return;
    const updated = { ...user, ...patch };
    this.userState.set(updated);
    localStorage.setItem('userData', JSON.stringify(updated));
  }
}
