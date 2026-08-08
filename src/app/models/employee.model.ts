/** Models for employee.service. */

export interface Employee {
  الهوية_الوطنية: string;
  اسم_الموظف: string;
  المسمى_الوظيفي: string;
  الإدارة_التابع_لها_الموظف: string;
  القسم: string;
  اسم_المدير_المباشر: string;
  المرتبة_الوظيفية: string;
  الموقع: string;
  المسمى_الوظيفي_للمدير_المباشر: string;
  تاريخ_المباشرة: string;
  email?: string;
  status?: string;
  department?: string; // Fallback field
  job_title?: string; // Fallback field
  user_id?: string;
  national_id?: string;
  manager_national_id?: string;
  رقم_الهوية_الوطنية_للمدير_المباشر?: string;
  full_name?: string;
  section?: string;
  manager_name?: string;
  manager_job_title?: string;
  account_user_id?: string;
}

export interface OrganizationStats {
  total_employees: number;
  active_employees: number;
  departments_count: number;
  job_titles_count: number;
}

export interface EmployeesResult {
  success: boolean;
  employees: Employee[];
  stats: OrganizationStats;
}

export interface MutationResult {
  success: boolean;
  message?: string;
}

export interface SendAssessmentResult extends MutationResult {
  already_sent?: boolean;
}

export interface TeamAssessmentResult extends MutationResult {
  newly_assigned?: number;
  total_team_size?: number;
  skipped_count?: number;
}

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
}
