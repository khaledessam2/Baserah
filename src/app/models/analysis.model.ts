/** Models for analysis.service. */

export interface SelectedCompetencies {
  core: string[];
  general_behavioral: string[];
  leadership_behavioral: string[];
  technical: string[];
}

/**
 * A competency as the analysis endpoint returns it — distinct from the stored
 * shape in `competency.model.ts`, which uses the backend's snake_case fields.
 */
export interface AnalysisCompetency {
  name: string;
  category: 'Core' | 'Behavioral' | 'Leadership' | 'Technical';
  priority: number;
  description: string;
  skills: string[];
  kpis: string[];
}

export interface AnalysisResult {
  job_title: string;
  summary: string;
  competencies: {
    core: AnalysisCompetency[];
    behavioral: AnalysisCompetency[];
    leadership: AnalysisCompetency[];
    technical: AnalysisCompetency[];
  };
  stats: {
    words_analyzed: number;
    skills_identified: number;
    sections_analyzed: number;
    confidence_score: number;
  };
  raw_results?: any;
}
