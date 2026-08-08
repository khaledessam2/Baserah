import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type {
  ReportListResponse,
  SingleReportResponse,
  ReEvaluationRequest,
  ReEvaluationResponse,
} from '@/models/api.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  getMyReports(): Observable<ReportListResponse> {
    return this.api.get<ReportListResponse>('/reports/my-reports');
  }

  getReportById(reportId: string): Observable<SingleReportResponse> {
    return this.api.get<SingleReportResponse>(`/reports/${reportId}`);
  }

  generateCombinedReport(
    employeeNationalId: string,
    jobTitle: string,
    organizationName: string
  ): Observable<SingleReportResponse> {
    return this.api.post<SingleReportResponse>(
      '/reports/generate-combined',
      null,
      {
        params: {
          employee_national_id: employeeNationalId,
          job_title: jobTitle,
          organization_name: organizationName,
        },
      }
    );
  }

  sendReportToEmployee(
    reportId: string,
    employeeNationalId: string,
    employeeName: string
  ): Observable<any> {
    return this.api.post(`/reports/${reportId}/send-to-employee`, {
      employee_national_id: employeeNationalId,
      employee_name: employeeName,
    });
  }

  reevaluateEmployee(
    data: ReEvaluationRequest
  ): Observable<ReEvaluationResponse> {
    return this.api.post<ReEvaluationResponse>('/reports/re-evaluate', data);
  }

  getEmployeeProgress(employeeNationalId: string): Observable<any> {
    return this.api.get(`/reports/progress/${employeeNationalId}`);
  }
}
