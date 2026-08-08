import { Injectable, inject } from '@angular/core';
import { catchError, map, of, type Observable } from 'rxjs';
import { ApiService } from '@/services/api.service';
import type { Employee, EmployeesResult, MutationResult, SendAssessmentResult, TeamAssessmentResult } from '@/models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api = inject(ApiService);

  getEmployees(
    organizationName: string,
    userId?: string
  ): Observable<EmployeesResult> {
    // ✨ Uses the endpoint exposed by file_upload.py
    return this.api
      .get<{ data?: Employee[] }>(
        `/file/employees-by-organization/${encodeURIComponent(
          organizationName
        )}`,
        { params: { user_id: userId } }
      )
      .pipe(
        map((response) => {
          // ✨ Backend returns data in response.data
          const employees = response.data || [];

          // Calculate basic stats
          const departments = new Set(
            employees.map(
              (e: Employee) =>
                e.الإدارة_التابع_لها_الموظف ||
                e.department ||
                e.القسم ||
                'غير محدد'
            )
          ).size;
          const jobTitles = new Set(
            employees.map(
              (e: Employee) => e.المسمى_الوظيفي || e.job_title || 'غير محدد'
            )
          ).size;

          return {
            success: true,
            employees,
            stats: {
              total_employees: employees.length,
              active_employees: employees.filter((e) => e.status !== 'inactive')
                .length,
              departments_count: departments,
              job_titles_count: jobTitles,
            },
          } satisfies EmployeesResult;
        }),
        catchError((error) => {
          console.error('Failed to fetch employees:', error);
          return of<EmployeesResult>({
            success: false,
            employees: [],
            stats: {
              total_employees: 0,
              active_employees: 0,
              departments_count: 0,
              job_titles_count: 0,
            },
          });
        })
      );
  }

  addEmployee(
    organizationName: string,
    employeeData: Partial<Employee>,
    userId?: string
  ): Observable<MutationResult> {
    const formData = new FormData();
    formData.append('organization_name', organizationName);
    formData.append('employee_data', JSON.stringify(employeeData));
    if (userId) formData.append('user_id', userId);

    return this.api
      .post<MutationResult>('/file/add-employee', formData)
      .pipe(
        map((data) => ({ success: data.success, message: data.message })),
        catchError((error) => {
          console.error('Failed to add employee:', error);
          return of<MutationResult>({ success: false });
        })
      );
  }

  updateEmployee(
    organizationName: string,
    nationalId: string,
    employeeData: Partial<Employee>,
    userId?: string
  ): Observable<MutationResult> {
    return this.api
      .put<MutationResult>(
        `/file/update-employee/${encodeURIComponent(
          organizationName
        )}/${nationalId}`,
        employeeData,
        { params: { user_id: userId } }
      )
      .pipe(
        map((data) => ({ success: data.success, message: data.message })),
        catchError((error) => {
          console.error('Failed to update employee:', error);
          return of<MutationResult>({ success: false });
        })
      );
  }

  deleteEmployee(
    organizationName: string,
    nationalId: string,
    userId?: string
  ): Observable<MutationResult> {
    return this.api
      .delete<MutationResult>(
        `/file/delete-employee/${encodeURIComponent(
          organizationName
        )}/${nationalId}`,
        { params: { user_id: userId } }
      )
      .pipe(
        map((data) => ({ success: data.success, message: data.message })),
        catchError((error) => {
          console.error('Failed to delete employee:', error);
          return of<MutationResult>({ success: false });
        })
      );
  }

  sendTechnicalAssessment(
    organizationName: string,
    employee: Employee
  ): Observable<SendAssessmentResult> {
    const payload = {
      job_title: employee.المسمى_الوظيفي || employee.job_title || '',
      user_id: employee.user_id || '',
      organization_name: organizationName,
      assessment_type: 'technical',
      employee_name: employee.اسم_الموظف || '',
      employee_national_id: employee.الهوية_الوطنية,
      department:
        employee.الإدارة_التابع_لها_الموظف ||
        employee.department ||
        employee.القسم ||
        '',
    };

    return this.api
      .post<SendAssessmentResult>('/assessment/send-to-employee', payload)
      .pipe(
        map((data) => ({
          success: data.success,
          message: data.message,
          already_sent: data.already_sent,
        })),
        catchError((error: any) => {
          console.error('Failed to send technical assessment:', error);
          return of<SendAssessmentResult>({
            success: false,
            message: error.error?.detail || 'فشل إرسال التقييم التقني',
          });
        })
      );
  }

  sendManagerAssessment(
    organizationName: string,
    employee: Employee,
    manager: Employee
  ): Observable<SendAssessmentResult> {
    const payload = {
      job_title: employee.المسمى_الوظيفي || employee.job_title || '',
      user_id: manager.user_id || '', // Send to manager
      organization_name: organizationName,
      assessment_type: 'manager',
      employee_name: employee.اسم_الموظف || '',
      employee_national_id: employee.الهوية_الوطنية,
      manager_name:
        manager.اسم_الموظف || employee.اسم_المدير_المباشر || 'المدير المباشر',
      manager_national_id:
        manager.الهوية_الوطنية ||
        employee.manager_national_id ||
        employee.رقم_الهوية_الوطنية_للمدير_المباشر,
      department:
        employee.الإدارة_التابع_لها_الموظف ||
        employee.department ||
        employee.القسم ||
        '',
    };

    return this.api
      .post<SendAssessmentResult>('/assessment/send-to-employee', payload)
      .pipe(
        map((data) => ({
          success: data.success,
          message: data.message,
          already_sent: data.already_sent,
        })),
        catchError((error: any) => {
          console.error('Failed to send manager assessment:', error);
          return of<SendAssessmentResult>({
            success: false,
            message: error.error?.detail || 'فشل إرسال تقييم المدير',
          });
        })
      );
  }

  sendTeamAssessment(managerId: string): Observable<TeamAssessmentResult> {
    return this.api
      .post<TeamAssessmentResult>(`/manager-assessment/assign/${managerId}`)
      .pipe(
        map((data) => ({
          success: data.success,
          message: data.message,
          newly_assigned: data.newly_assigned,
          total_team_size: data.total_team_size,
          skipped_count: data.skipped_count,
        })),
        catchError((error: any) => {
          console.error('Failed to send team assessment:', error);
          return of<TeamAssessmentResult>({
            success: false,
            message: error.error?.detail || 'فشل تعيين تقييمات الفريق',
          });
        })
      );
  }
}
