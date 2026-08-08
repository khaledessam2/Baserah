import { I18nService } from '@/services/i18n.service';
import type { KpiOption } from '@/models/kpi.model';

/** Port of the KPI dropdown option lists in `JobTitleCompetenciesPage.tsx`. */
export function performanceDimensions(i18n: I18nService): KpiOption[] {
  const t = (key: string) => i18n.t(key);
  return [
    {
      value: 'strategic_outcomes',
      label: t('job_title_competencies.dimensions.strategic_outcomes'),
    },
    {
      value: 'operational_excellence',
      label: t('job_title_competencies.dimensions.operational_excellence'),
    },
    {
      value: 'customer_satisfaction',
      label: t('job_title_competencies.dimensions.customer_satisfaction'),
    },
    {
      value: 'employee_engagement',
      label: t('job_title_competencies.dimensions.employee_engagement'),
    },
    {
      value: 'financial_performance',
      label: t('job_title_competencies.dimensions.financial_performance'),
    },
    {
      value: 'innovation',
      label: t('job_title_competencies.dimensions.innovation'),
    },
    { value: 'quality', label: t('job_title_competencies.dimensions.quality') },
    {
      value: 'efficiency',
      label: t('job_title_competencies.dimensions.efficiency'),
    },
  ];
}

export function measurementTypes(i18n: I18nService): KpiOption[] {
  const t = (key: string) => i18n.t(key);
  return [
    {
      value: 'percentage',
      label: t('job_title_competencies.measurements.percentage'),
    },
    { value: 'count', label: t('job_title_competencies.measurements.count') },
    { value: 'rating', label: t('job_title_competencies.measurements.rating') },
    {
      value: 'time-based',
      label: t('job_title_competencies.measurements.time_based'),
    },
    { value: 'binary', label: t('job_title_competencies.measurements.binary') },
  ];
}

export function targetPeriods(i18n: I18nService): KpiOption[] {
  const t = (key: string) => i18n.t(key);
  return [
    { value: 'annual', label: t('job_title_competencies.periods.annual') },
    { value: 'quarterly', label: t('job_title_competencies.periods.quarterly') },
    { value: 'monthly', label: t('job_title_competencies.periods.monthly') },
    { value: 'weekly', label: t('job_title_competencies.periods.weekly') },
    { value: 'daily', label: t('job_title_competencies.periods.daily') },
    { value: 'ongoing', label: t('job_title_competencies.periods.ongoing') },
  ];
}
