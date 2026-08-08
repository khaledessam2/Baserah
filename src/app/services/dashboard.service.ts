import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type { JobTitlesDashboardResponse } from '@/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getJobTitlesDashboard(
    userId: string,
    organizationName?: string
  ): Observable<JobTitlesDashboardResponse> {
    return this.api.get<JobTitlesDashboardResponse>(
      '/dashboard/job-titles-dashboard',
      { params: { user_id: userId, organization_name: organizationName } }
    );
  }
}
