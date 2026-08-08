import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';

@Injectable({ providedIn: 'root' })
export class SkillsGapService {
  private readonly api = inject(ApiService);

  getFilters(orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/filters', {
      params: { organization_name: orgName },
    });
  }

  getOverview(orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/overview', {
      params: { organization_name: orgName },
    });
  }

  getHeatmap(orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/heatmap', {
      params: { organization_name: orgName },
    });
  }

  getRoleGap(jobTitle: string, orgName?: string): Observable<any> {
    return this.api.get(`/skills-gap/role/${encodeURIComponent(jobTitle)}`, {
      params: { organization_name: orgName },
    });
  }

  getDepartmentGap(department?: string, orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/department', {
      params: { department, organization_name: orgName },
    });
  }

  getEmployeeGap(nationalId: string): Observable<any> {
    return this.api.get(
      `/skills-gap/employee/${encodeURIComponent(nationalId)}`
    );
  }

  getCriticalRisks(orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/critical-risks', {
      params: { organization_name: orgName },
    });
  }

  getTrend(orgName?: string): Observable<any> {
    return this.api.get('/skills-gap/trend', {
      params: { organization_name: orgName },
    });
  }
}
