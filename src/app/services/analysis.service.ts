import { Injectable, inject } from '@angular/core';
import {
  catchError,
  defer,
  map,
  of,
  switchMap,
  tap,
  throwError,
  timer,
  type Observable,
} from 'rxjs';
import { ApiService } from '@/services/api.service';
import type {
  JobAnalysisRequest,
  AnalysisResponse,
  TaskStatusResponse,
} from '@/models/api.model';
import type { SelectedCompetencies } from '@/models/analysis.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly api = inject(ApiService);

  analyzeJob(
    data: JobAnalysisRequest
  ): Observable<TaskStatusResponse | AnalysisResponse> {
    return this.api.post<TaskStatusResponse | AnalysisResponse>(
      '/agent/analyze',
      data
    );
  }

  getTaskStatus(taskId: string): Observable<TaskStatusResponse> {
    return this.api.get<TaskStatusResponse>(`/agent/analyze/status/${taskId}`);
  }

  getMockData(): Observable<AnalysisResponse> {
    return this.api.get<AnalysisResponse>('/agent/test-mock-data');
  }

  /**
   * Polling helper. Waits `interval` ms *between* responses, like the previous
   * setTimeout loop; unsubscribing now also stops the polling and aborts the
   * request in flight, which the promise version could not do.
   */
  pollAnalysis(
    taskId: string,
    onProgress?: (progress: number) => void,
    interval = 2000,
    maxAttempts = 60
  ): Observable<AnalysisResponse> {
    const attempt = (attempts: number): Observable<AnalysisResponse> =>
      this.getTaskStatus(taskId).pipe(
        tap((status) => {
          if (status.progress !== undefined && onProgress) {
            onProgress(status.progress);
          }
        }),
        switchMap((status) => {
          if (status.status === 'completed' && status.result) {
            return of(status.result);
          }
          if (status.status === 'failed') {
            return throwError(
              () => new Error(status.error || 'Analysis failed')
            );
          }
          if (attempts >= maxAttempts) {
            return throwError(() => new Error('Analysis timed out'));
          }
          return timer(interval).pipe(switchMap(() => attempt(attempts + 1)));
        })
      );

    return defer(() => attempt(1));
  }

  uploadCompanyData(file: File, companyName: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_name', companyName);

    // HttpClient sets the multipart boundary itself when handed a FormData body.
    return this.api.post('/file/upload-company-data', formData);
  }

  getJobTitles(
    organizationName?: string,
    userId?: string
  ): Observable<string[]> {
    // Try fetching from file endpoint first as it seems to be the source
    return this.api
      .get<{ job_titles?: string[] }>('/file/job-titles', {
        params: { organization_name: organizationName, user_id: userId },
      })
      .pipe(
        map((data) => data?.job_titles ?? []),
        catchError((error) => {
          console.error('Failed to fetch job titles', error);
          return of<string[]>([]);
        })
      );
  }

  saveJobTitles(
    titles: string[],
    organizationName: string,
    userId?: string
  ): Observable<boolean> {
    return this.api
      .post<{ success: boolean }>('/dashboard/save-generated-titles', {
        organization_name: organizationName,
        titles: titles,
        user_id: userId,
      })
      .pipe(
        map((data) => data.success),
        catchError((error) => {
          console.error('Failed to save job titles', error);
          return of(false);
        })
      );
  }

  generateJobDescription(jobTitle: string): Observable<string> {
    return this.api
      .post<{ job_description: string }>('/agent/generate-description', {
        job_title: jobTitle,
      })
      .pipe(
        map((data) => data.job_description),
        tap({
          error: (error) =>
            console.error('Failed to generate description', error),
        })
      );
  }

  saveAnalysisResults(data: any): Observable<any> {
    return this.api.post('/competencies/save', data);
  }

  getJobTitlesWithJD(
    organizationName: string,
    userId?: string
  ): Observable<Record<string, boolean>> {
    return this.api
      .get<{ data?: Record<string, boolean> }>(
        `/org/job-titles-with-jd/${organizationName}`,
        { params: userId ? { user_id: userId } : {} }
      )
      .pipe(
        map((data) => data.data || {}),
        catchError((error) => {
          console.error('Failed to fetch job titles with JD:', error);
          return of<Record<string, boolean>>({});
        })
      );
  }

  getExistingJobDescription(
    organizationName: string,
    jobTitle: string,
    userId?: string
  ): Observable<any> {
    return this.api
      .get(
        `/org/job-description/${organizationName}/${encodeURIComponent(
          jobTitle
        )}`,
        { params: userId ? { user_id: userId } : {} }
      )
      .pipe(
        tap({
          error: (error) =>
            console.error('Failed to fetch existing job description:', error),
        })
      );
  }

  saveJobDescription(data: {
    organization_name: string;
    job_title: string;
    job_description: string;
    user_id?: string;
    department?: string;
    section?: string;
  }): Observable<any> {
    return this.api.post('/org/job-descriptions/save', data).pipe(
      tap({
        error: (error) =>
          console.error('Failed to save job description:', error),
      })
    );
  }

  getAnalyzedTitles(): Observable<any> {
    return this.api.get('/competencies/analyzed-titles');
  }

  getCompetenciesByTitle(
    jobTitle: string,
    orgName?: string,
    userId?: string
  ): Observable<any> {
    return this.api.get(`/competencies/${encodeURIComponent(jobTitle)}`, {
      params: { organization_name: orgName, user_id: userId },
    });
  }

  saveCompetency(
    originalJobTitle: string,
    originalCompetencyName: string,
    data: any
  ): Observable<any> {
    // Logic for Edit (PUT) vs Add (POST)
    //   Edit: PUT  /api/v1/competencies/:title/:compName
    //   Add:  POST /api/v1/competencies/add-competency
    const request$: Observable<any> = data.isNew
      ? this.api.post('/competencies/add-competency', data)
      : this.api.put(
          `/competencies/${encodeURIComponent(
            originalJobTitle
          )}/${encodeURIComponent(originalCompetencyName)}`,
          data
        );

    return request$.pipe(
      tap({
        error: (error) => console.error('Failed to save competency', error),
      })
    );
  }

  deleteCompetency(
    jobTitle: string,
    competencyName: string
  ): Observable<any> {
    return this.api
      .delete(
        `/competencies/${encodeURIComponent(jobTitle)}/${encodeURIComponent(
          competencyName
        )}`
      )
      .pipe(
        tap({
          error: (error) => console.error('Failed to delete competency', error),
        })
      );
  }

  generateKpis(
    jobTitle: string,
    organizationName: string,
    userId: string,
    selectedCompetencies?: SelectedCompetencies,
    jobDescription?: string
  ): Observable<any> {
    return this.api
      .post('/kpis/generate', {
        job_title: jobTitle,
        organization_name: organizationName,
        user_id: userId,
        selected_competencies: selectedCompetencies,
        job_description: jobDescription
          ? { description: jobDescription }
          : undefined,
      })
      .pipe(
        tap({
          error: (error) => console.error('Failed to generate KPIs', error),
        })
      );
  }

  getKpisByJobTitle(
    jobTitle: string,
    organizationName?: string,
    userId?: string
  ): Observable<any> {
    return this.api
      .get(`/kpis/job-title/${encodeURIComponent(jobTitle)}`, {
        params: {
          organization_name: organizationName,
          user_id: userId,
        },
      })
      .pipe(
        tap({ error: (error) => console.error('Failed to fetch KPIs', error) })
      );
  }

  saveKpis(data: any): Observable<any> {
    return this.api.post('/kpis/save', data).pipe(
      tap({ error: (error) => console.error('Failed to save KPIs', error) })
    );
  }

  reweightCompetencies(data: {
    job_title: string;
    job_description: { description: string };
    user_id: string;
    organization_name: string;
    competencies?: any[]; // Optional: send current competencies for reweighting
  }): Observable<any> {
    console.log('[AnalysisService] reweightCompetencies payload:', data);
    return this.api.post('/competencies/reweight-competencies', data);
  }

  saveWeights(data: {
    job_title: string;
    weights: Record<string, number>;
    user_id?: string;
    organization_name: string;
  }): Observable<any> {
    return this.api.post('/competencies/save-weights', data);
  }

  addKpi(data: {
    job_title: string;
    kpi_text: string;
    performance_dimension?: string;
    measurement_type?: string;
    target_period?: string;
    competency?: string;
    competency_type?: string;
    organization_name?: string;
    user_id?: string;
  }): Observable<any> {
    return this.api.post('/kpis/add', data).pipe(
      tap({ error: (error) => console.error('Failed to add KPI', error) })
    );
  }

  updateKpi(data: {
    job_title: string;
    kpi_id?: string;
    kpi_text?: string;
    performance_dimension?: string;
    measurement_type?: string;
    target_period?: string;
    organization_name?: string;
    user_id?: string;
  }): Observable<any> {
    return this.api.put('/kpis/update', data).pipe(
      tap({ error: (error) => console.error('Failed to update KPI', error) })
    );
  }

  deleteKpi(
    jobTitle: string,
    kpiText: string,
    userId?: string,
    organizationName?: string
  ): Observable<any> {
    return this.api
      .delete(
        `/kpis/delete/${encodeURIComponent(jobTitle)}/${encodeURIComponent(
          kpiText
        )}`,
        {
          params: {
            user_id: userId,
            organization_name: organizationName,
          },
        }
      )
      .pipe(
        tap({ error: (error) => console.error('Failed to delete KPI', error) })
      );
  }

  generateAssessment(
    jobTitle: string,
    organizationName: string,
    userId: string
  ): Observable<any> {
    return this.api
      .post('/assessment/generate', {
        job_title: jobTitle,
        organization_name: organizationName,
        user_id: userId,
      })
      .pipe(
        tap({
          error: (error) =>
            console.error('Failed to generate assessment', error),
        })
      );
  }
}
