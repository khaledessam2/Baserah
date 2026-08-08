/** Models for skills-gap.service. */

export interface SkillsGapFilters {
  job_titles: string[];
  departments: string[];
  organizations: string[];
}

export interface CompetencyGap {
  competency: string;
  score: number;
  gap: number;
  severity: 'critical' | 'medium' | 'low' | 'strength';
  correct: number;
  total: number;
}

export interface EmployeeGap {
  employee_national_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  organization_name: string;
  overall_score: number;
  overall_gap: number;
  competency_gaps: CompetencyGap[];
  assessed_at: string;
  history?: { date: string; score: number }[];
}

/** Shapes and helpers shared by the employee tab and its round card. */

export interface CompGap {
  competency: string;
  score: number;
  gap: number;
  severity: string;
  correct: number;
  total: number;
}

export interface Round {
  round: number;
  label: string;
  date: string;
  overall_score: number;
  overall_gap: number;
  total_questions: number;
  correct_answers: number;
  competencies: CompGap[];
}

export interface CompChange {
  competency: string;
  initial_score: number | null;
  latest_score: number | null;
  change: number;
  initial_severity: string | null;
  latest_severity: string | null;
}

export interface ProfileData {
  employee_national_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  section: string;
  manager_name: string;
  organization_name: string;
  overall_score: number;
  overall_gap: number;
  competency_gaps: CompGap[];
  technical_rounds: Round[];
  manager_rounds: Round[];
  comparison: {
    initial_score: number;
    latest_score: number;
    score_change: number;
    direction: 'improved' | 'declined' | 'unchanged';
    initial_date: string;
    latest_date: string;
    competency_changes: CompChange[];
  } | null;
  history: { date: string; score: number; label: string }[];
  summary: {
    total_tech_assessments: number;
    total_mgr_assessments: number;
    latest_tech_score: number | null;
    latest_mgr_score: number | null;
    has_improvement: boolean | null;
  };
}
