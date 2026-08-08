import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';

@Injectable({ providedIn: 'root' })
export class ManagerAssessmentService {
  private readonly api = inject(ApiService);

  getManagersWithSubordinates(organizationName?: string): Observable<any> {
    return this.api.get('/manager-assessment/managers-with-subordinates', {
      params: { organization_name: organizationName },
    });
  }

  getManagerStatus(managerId: string): Observable<any> {
    return this.api.get(`/manager-assessment/status/${managerId}`);
  }

  getQuestions(): Observable<any> {
    return this.api.get('/manager-assessment/questions');
  }

  getEvaluations(managerId: string): Observable<any> {
    return this.api.get(`/manager-assessment/evaluations/${managerId}`);
  }

  generateReport(managerId: string): Observable<any> {
    return this.api.post(`/manager-assessment/generate-report/${managerId}`);
  }

  sendToSuperior(reportId: string): Observable<any> {
    return this.api.post(`/manager-assessment/send-to-superior/${reportId}`);
  }
}
