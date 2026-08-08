import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type {
  TokenResponse,
  UserLogin,
  UserRegister,
  UserResponse,
  EmployeeProfileResponse,
} from '@/models/api.model';

const AUTH_BASE = '/auth';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiService);

  login(credentials: UserLogin): Observable<TokenResponse> {
    return this.api.post<TokenResponse>(`${AUTH_BASE}/login`, credentials);
  }

  register(userData: UserRegister): Observable<TokenResponse> {
    return this.api.post<TokenResponse>(`${AUTH_BASE}/register`, userData);
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.api.get<UserResponse>(`${AUTH_BASE}/me`);
  }

  logout(): Observable<void> {
    return this.api.post(`${AUTH_BASE}/logout`).pipe(map(() => undefined));
  }

  getEmployeeProfile(): Observable<EmployeeProfileResponse> {
    return this.api.get<EmployeeProfileResponse>(`${AUTH_BASE}/me/profile`);
  }

  updateOrganization(organizationName: string): Observable<any> {
    return this.api.post('/agent/organization-info', {
      organization_name: organizationName,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<any> {
    return this.api.post(`${AUTH_BASE}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  updateOnboardingStep(step: number): Observable<void> {
    return this.api
      .put(`${AUTH_BASE}/me/onboarding-step`, { step })
      .pipe(map(() => undefined));
  }

  resetPassword(userId: string, newPassword: string): Observable<any> {
    return this.api.post(`${AUTH_BASE}/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  }
}
