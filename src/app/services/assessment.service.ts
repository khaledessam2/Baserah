import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type {
  AssessmentListResponse,
  SingleAssessmentResponse,
  DetailedAssessmentResult,
  DetailedAssessmentResultResponse,
} from '@/models/api.model';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly api = inject(ApiService);

  getEmployeeAssessments(
    nationalId: string
  ): Observable<AssessmentListResponse> {
    return this.api.get<AssessmentListResponse>(
      `/assessment/employee/${nationalId}`
    );
  }

  getAssessmentById(assessmentId: string): Observable<SingleAssessmentResponse> {
    return this.api.get<SingleAssessmentResponse>(
      `/assessment/get-by-id/${assessmentId}`
    );
  }

  submitTechnicalAssessment(
    assessmentId: string,
    answers: any,
    questions?: any
  ): Observable<any> {
    return this.api.post('/assessment/technical/submit', {
      assessment_id: assessmentId,
      answers,
      questions,
    });
  }

  submitManagerAssessment(
    assessmentId: string,
    answers: any,
    questions?: any
  ): Observable<any> {
    return this.api.post('/assessment/manager/submit', {
      assessment_id: assessmentId,
      answers,
      questions,
    });
  }

  generateAssessment(
    jobTitle: string,
    userId: string,
    organizationName: string
  ): Observable<any> {
    return this.api.post('/assessment/generate', {
      job_title: jobTitle,
      user_id: userId,
      organization_name: organizationName,
    });
  }

  retrieveAssessment(
    jobTitle: string,
    organizationName: string
  ): Observable<any> {
    return this.api.get(
      `/assessment/retrieve/${encodeURIComponent(jobTitle)}`,
      { params: { organization_name: organizationName } }
    );
  }

  getAllCompletedAssessments(status: string = 'completed'): Observable<any> {
    return this.api.get('/assessment/all-completed', { params: { status } });
  }

  getAssessmentResults(
    assessmentId: string
  ): Observable<DetailedAssessmentResultResponse> {
    return this.api
      .get<DetailedAssessmentResult>(`/assessment/get-answers/${assessmentId}`)
      .pipe(map((results) => ({ success: true, results })));
  }
}
