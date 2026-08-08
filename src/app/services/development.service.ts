import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type {
  DevelopmentCourseInput,
  DevelopmentCoursesResponse,
} from '@/models/api.model';
import type { CourseSuggestion } from '@/models/development.model';

@Injectable({ providedIn: 'root' })
export class DevelopmentService {
  private readonly api = inject(ApiService);

  getEmployeeCourses(
    employeeNationalId: string
  ): Observable<DevelopmentCoursesResponse> {
    return this.api.get<DevelopmentCoursesResponse>(
      `/development-plan/${employeeNationalId}`
    );
  }

  addCourse(
    data: DevelopmentCourseInput
  ): Observable<{ success: boolean; course_id: string }> {
    return this.api.post('/development-plan', data);
  }

  markAsCompleted(
    courseId: string
  ): Observable<{ success: boolean; message: string }> {
    return this.api.put(`/development-plan/${courseId}/complete`);
  }

  suggestCourses(
    reportContent: string
  ): Observable<{ success: boolean; suggestions: CourseSuggestion[] }> {
    return this.api.post('/development-plan/suggest', {
      report_content: reportContent,
    });
  }
}
