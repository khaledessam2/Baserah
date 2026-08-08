export interface JobAnalysisRequest {
  job_description_id: string;
  job_title: string;
  job_description: {
    الوصف_الكامل?: string;
    النص?: string;
    [key: string]: any;
  };
  job_level: number;
  competencies?: any;
  async?: boolean;
}

export interface CompetencyData {
  name: string;
  priority: number;
  type?: string;
}

export interface SkillData {
  skill: string;
  competency: string;
  priority: number;
}

export interface AnalysisResults {
  core_competencies: string[];
  general_behavioral_competencies: string[];
  leadership_behavioral_competencies: string[];
  technical_competencies: string[];
  skills_data: {
    skills: SkillData[];
  };
  kpis_data?: {
    kpis: any[];
  };
  ranked_competencies?: {
    ranked_competencies: any[];
  };
  weighted_competencies?: Record<string, number>;
}

export interface AnalysisResponse {
  job_description_id: string;
  employee_id?: string;
  job_title: string;
  analysis_results: AnalysisResults;
  job_level: number;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  task_id?: string;
  error?: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: AnalysisResponse;
  error?: string;
}

export type UserRole = 'hr_manager' | 'employee' | 'manager';

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  organization_name?: string;
  national_id?: string;
  onboarding_step: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface EmployeeProfile {
  الاسم_الكامل: string;
  رقم_الهوية: string;
  المسمى_الوظيفي: string;
  القسم: string;
  الإدارة: string;
  البريد_الإلكتروني: string;
  تاريخ_الانضمام: string;
  المرتبة_الوظيفية: string;
  الموقع: string;
  المدير_المباشر: string;
  المسمى_الوظيفي_للمدير: string;
  رقم_هوية_المدير: string;
  organization_name: string;
  raw_data?: any;
}

export interface EmployeeProfileResponse {
  success: boolean;
  user: UserResponse;
  employee: EmployeeProfile | null;
  message?: string;
}

export interface AssessmentQuestion {
  question_id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'likert';
  options?: string[];
  competency?: string;
}

export interface Assessment {
  assessment_id: string;
  employee_national_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  assessment_type: 'technical' | 'manager';
  status: 'pending' | 'in_progress' | 'completed' | 'sent';
  questions: AssessmentQuestion[];
  answers?: Record<string, any>; // ✨ المضاف: الإجابات
  created_at: string;
  assigned_at?: string;
  sent_at?: string;
  completed_at?: string;
  organization_name?: string; // Add this
  is_reevaluation?: boolean;
  parent_report_id?: string;
}

export interface AssessmentListResponse {
  success: boolean;
  assessments: Assessment[];
}

export interface GroupedEmployee {
  employee_national_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  organization_name: string;
  employee_assessment: Assessment | null;
  manager_assessment: Assessment | null;
  combined_report_id: string | null;
  report?: Report | null; // Add this if we have the full report object
  sent_to_employee: boolean;
  all_reports?: Array<{ id: string; sent: boolean; is_latest: boolean; date: number }>;
}

export interface SingleAssessmentResponse {
  success: boolean;
  assessment: Assessment;
}

export interface Report {
  report_id: string;
  employee_national_id: string;
  employee_name: string;
  job_title: string;
  organization_name: string;
  content: string; // Markdown content
  type: 'individual' | 'combined';
  viewed_by_employee: boolean;
  generated_at: string;
  sent_at: string;
}

export interface ReportListResponse {
  success: boolean;
  reports: Report[];
}

export interface SingleReportResponse {
  success: boolean;
  report: Report;
}

export interface DetailedAnswer {
  question_id: string;
  question_text: string;
  options: string[];
  selected_option_index: number | null;
  selected_option_text: string | null;
  correct_answer_index: number | null;
  correct_answer_text: string | null;
  is_correct: boolean | null;
  competency?: string;
}

export interface DetailedAssessmentResult {
  assessment_id: string;
  assessment_type: 'technical' | 'manager';
  job_title: string;
  employee_name: string;
  employee_national_id: string;
  submitted_at: string;
  score: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  skipped_count: number | null;
  detailed_answers: DetailedAnswer[];
}

export interface DetailedAssessmentResultResponse {
  success: boolean;
  results: DetailedAssessmentResult;
}

export interface ReEvaluationRequest {
  employee_id: string;
  new_courses: string;
  employee_name?: string;
  employee_national_id?: string;
  job_title?: string;
  organization_name?: string;
  manager_name?: string;
  manager_national_id?: string;
  department?: string;
}

export interface ReEvaluationResponse {
  status: 'success' | 'error';
  message: string;
  technical_assessment_id?: string;
  manager_assessment_id?: string;
  merged_skills_count?: number;
  technical_questions_count?: number;
  manager_questions_count?: number;
}

export interface DevelopmentCourse {
  _id: string;
  employee_national_id: string;
  report_id: string;
  course_name: string;
  reason?: string;
  status: 'pending' | 'completed';
  assigned_by: string;
  assigned_at: string;
  completed_at?: string;
}

export interface DevelopmentCourseInput {
  employee_national_id: string;
  report_id: string;
  course_name: string;
  reason?: string;
}

export interface DevelopmentCoursesResponse {
  success: boolean;
  courses: DevelopmentCourse[];
}
