/** competency models. */

export interface Competency {
  competency_name: string;
  competency_type: string;
  priority_score: number;
  weight: number;
  skills: string[];
  kpis: string[];
  confidence_score?: number;
  rank?: number;
}

export interface CompetencyData {
  competency_name: string;
  competency_type: string;
  priority_score: number;
  weight: number;
  skills: string[];
  kpis?: string[];
  rank?: number;
  confidence_score?: number;
}
