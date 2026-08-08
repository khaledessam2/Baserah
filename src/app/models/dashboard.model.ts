/** Models for dashboard.service. */

export interface JobTitleStatus {
  no_jd: number;
  jd_only: number;
  jd_and_competencies: number;
}

export interface JobTitleData {
  title: string;
  status: 'no_jd' | 'jd_only' | 'jd_and_competencies';
  has_jd: boolean;
  has_competencies: boolean;
  organization?: string;
}

export interface DashboardData {
  job_titles: JobTitleData[];
  status_breakdown: JobTitleStatus;
}

export interface JobTitlesDashboardResponse {
  success: boolean;
  data: DashboardData;
}
