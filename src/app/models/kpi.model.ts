/** kpi models. */

export interface KpiOption {
  value: string;
  label: string;
}

export interface AddKpiPayload {
  kpi_text: string;
  performance_dimension: string;
  measurement_type: string;
  target_period: string;
  competency: string;
  competency_type: string;
}

export interface EditKpiPayload {
  performance_dimension: string;
  measurement_type: string;
  target_period: string;
}
