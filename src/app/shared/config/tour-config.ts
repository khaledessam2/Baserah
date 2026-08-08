import type { TourStep } from '@/models/tour.model';
import type { I18nService } from '@/services/i18n.service';

/**
 * Port of `config/tourConfig.ts`.
 *
 * Takes the i18n service rather than an i18next `TFunction`; `t` is bound off
 * it so every call site below stays byte-identical to the React version.
 */
export const getTourSteps = (
  i18n: I18nService
): Record<string, TourStep[]> => {
  const t = (key: string, fallback: string) => i18n.t(key, fallback);

  return ({
  intro: [
    {
      target: '[data-tour="company-name"]',
      title: t('tour.intro.company_title', 'اسم المنظمة'),
      content: t(
        'tour.intro.company_content',
        'ابدأ بإدخال اسم منظمتك أو شركتك للبدء في عملية التحليل.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="input-methods"]',
      title: t('tour.intro.methods_title', 'طرق الإدخال'),
      content: t(
        'tour.intro.methods_content',
        'اختر الطريقة التي تفضلها لتزويدنا بمعلومات الشركة: رفع ملف، رابط موقع، أو كتابة نص يدوياً.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="start-analysis"]',
      title: t('tour.intro.start_title', 'بدء التحليل'),
      content: t(
        'tour.intro.start_content',
        'بمجرد تعبئة البيانات، انقر هنا للانتقال للخطوة التالية وتوليد المسميات الوظيفية.'
      ),
      placement: 'top',
    },
  ],
  'title-generation': [
    {
      target: '[data-tour="upload-area"]',
      title: t('tour.title_gen.upload_title', 'رفع الملفات'),
      content: t(
        'tour.title_gen.upload_content',
        'ارفع ملف Excel الذي يحتوي على بيانات الموظفين والوظائف للاستخراج التلقائي.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="manual-entry"]',
      title: t('tour.title_gen.manual_title', 'الإدخال اليدوي'),
      content: t(
        'tour.title_gen.manual_content',
        'أو يمكنك إدخال المسميات الوظيفية يدوياً في هذا القسم.'
      ),
      placement: 'bottom',
    },
  ],
  'job-setup': [
    {
      target: '[data-tour="job-title-select"]',
      title: t('tour.job_setup.select_title', 'اختيار المسمى'),
      content: t(
        'tour.job_setup.select_content',
        'اختر المسمى الوظيفي الذي تريد إعداد وصفه وجوداته.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="job-description"]',
      title: t('tour.job_setup.desc_title', 'الوصف الوظيفي'),
      content: t(
        'tour.job_setup.desc_content',
        'قم بمراجعة أو كتابة الوصف الوظيفي المفصل هنا لضمان دقة التحليل.'
      ),
      placement: 'top',
    },
  ],
  dashboard: [
    {
      target: '[data-tour="dashboard-header"]',
      title: t('tour.dashboard.header_title', 'لوحة التحكم'),
      content: t(
        'tour.dashboard.header_content',
        'مرحباً بك في لوحة التحكم. هنا يمكنك بدء تحليل جديد أو مراجعة سجل التحليلات.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="view-toggle"]',
      title: t('tour.dashboard.toggle_title', 'التبديل بين العرض'),
      content: t(
        'tour.dashboard.toggle_content',
        'يمكنك التبديل بين أداة التحليل الحالية وسجل التحليلات السابقة.'
      ),
      placement: 'bottom',
    },
  ],
  employees: [
    {
      target: '[data-tour="stats-total"]',
      title: t('tour.employees.stats_title', 'ملخص المنظمة'),
      content: t(
        'tour.employees.stats_content',
        'عرض سريع لإجمالي القوى العاملة، الموظفين النشطين، وعدد الأقسام بلمحة واحدة.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="add-employee"]',
      title: t('tour.employees.add_title', 'توسيع فريقك'),
      content: t(
        'tour.employees.add_content',
        'انقر هنا لإضافة موظف جديد يدوياً إلى منظمتك.'
      ),
      placement: 'left',
    },
    {
      target: '[data-tour="search-input"]',
      title: t('tour.employees.search_title', 'البحث عن الموظفين'),
      content: t(
        'tour.employees.search_content',
        'ابحث بالاسم، رقم الهوية الوطنية، أو المسمى الوظيفي للعثور بسرعة على أي شخص في قائمتك.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="employee-table"]',
      title: t('tour.employees.table_title', 'سجل الموظفين'),
      content: t(
        'tour.employees.table_content',
        'إدارة جميع موظفيك من هنا. يمكنك عرض التفاصيل، إعادة تعيين كلمات المرور، أو حذف السجلات.'
      ),
      placement: 'top',
    },
  ],
  'employee-dashboard': [
    {
      target: '[data-tour="profile-card"]',
      title: t('tour.employee_db.profile_title', 'ملفك الشخصي'),
      content: t(
        'tour.employee_db.profile_content',
        'اطلع على بياناتك الشخصية الموثقة في النظام.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="assessments-card"]',
      title: t('tour.employee_db.assess_title', 'التقييمات'),
      content: t(
        'tour.employee_db.assess_content',
        'هنا ستجد جميع التقييمات المطلوبة منك للإجابة عليها.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-card"]',
      title: t('tour.employee_db.reports_title', 'التقارير'),
      content: t(
        'tour.employee_db.reports_content',
        'راجع تقارير أدائك ونتائج التقييمات السابقة.'
      ),
      placement: 'bottom',
    },
  ],
  'employee-assessments': [
    {
      target: '[data-tour="stats-grid"]',
      title: t('tour.assessments.stats_title', 'نظرة عامة على التقييمات'),
      content: t(
        'tour.assessments.stats_content',
        'تابع تقدمك في التقييمات المطلوبة والمنجزة من هنا.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="filter-section"]',
      title: t('tour.assessments.filter_title', 'تصفية التقييمات'),
      content: t(
        'tour.assessments.filter_content',
        'يمكنك تصفية التقييمات حسب النوع (فني أو إداري) أو الحالة (مكتمل أو معلق).'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="assessments-list"]',
      title: t('tour.assessments.list_title', 'قائمة التقييمات'),
      content: t(
        'tour.assessments.list_content',
        'ابدأ التقييم الجديد من هنا، أو راجع نتائج تقييماتك السابقة.'
      ),
      placement: 'top',
    },
  ],
  'employee-reports': [
    {
      target: '[data-tour="reports-list"]',
      title: t('tour.reports.list_title', 'تقارير الأداء'),
      content: t(
        'tour.reports.list_content',
        'جميع تقارير أدائك ونتائج التقييمات مفصلة هنا للرجوع إليها في أي وقت.'
      ),
      placement: 'top',
    },
  ],
  reports: [
    {
      target: '[data-tour="reports-stats"]',
      title: t('tour.reports_mgmt.stats_title', 'إحصائيات التقارير'),
      content: t(
        'tour.reports_mgmt.stats_content',
        'نظرة سريعة على عدد التقارير المكتملة والمعلقة في المنظمة.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-filters"]',
      title: t('tour.reports_mgmt.filters_title', 'البحث والتصفية'),
      content: t(
        'tour.reports_mgmt.filters_content',
        'استخدم الفلاتر للوصول السريع لموظف معين أو قسم محدد.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-tabs"]',
      title: t('tour.reports_mgmt.tabs_title', 'أنواع التقارير'),
      content: t(
        'tour.reports_mgmt.tabs_content',
        'تنقل بين تقارير الموظفين الفردية وتقارير التقييم الإداري 360 درجة.'
      ),
      placement: 'bottom',
    },
  ],
  'job-titles': [
    {
      target: '[data-tour="stats-grid"]',
      title: t('tour.job_titles.stats_title', 'إحصائيات المسميات'),
      content: t(
        'tour.job_titles.stats_content',
        'نظرة عامة على حالة المسميات الوظيفية ومدى اكتمال أوصافها وجوداتها.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="filters-card"]',
      title: t('tour.job_titles.filters_title', 'البحث والتصفية'),
      content: t(
        'tour.job_titles.filters_content',
        'استخدم أدوات البحث والتصفية للوصول السريع للمسمى الوظيفي المطلوب.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="job-titles-table"]',
      title: t('tour.job_titles.table_title', 'سجل المسميات'),
      content: t(
        'tour.job_titles.table_content',
        'إدارة جميع المسميات الوظيفية والانتقال لتعديل الجدارات لكل مسمى.'
      ),
      placement: 'top',
    },
  ],
  'job-title-competencies': [
    {
      target: '[data-tour="competencies-tabs"]',
      title: t('tour.job_title_competencies.tabs_title', 'أقسام التحليل'),
      content: t(
        'tour.job_title_competencies.tabs_content',
        'تنقل بين الوصف الوظيفي، الجدارات، مؤشرات الأداء، والتقييمات.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="tab-jd"]',
      title: t('tour.job_title_competencies.jd_title', 'الوصف الوظيفي'),
      content: t(
        'tour.job_title_competencies.jd_content',
        'هنا يمكنك مراجعة وتعديل الوصف الوظيفي المعتمد لهذا المسمى.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="tab-competencies"]',
      title: t(
        'tour.job_title_competencies.competencies_title',
        'قائمة الجدارات'
      ),
      content: t(
        'tour.job_title_competencies.competencies_content',
        'راجع الجدارات المستخرجة، وأضف أو عدل أو حدد أوزان الجدارات.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="tab-kpis"]',
      title: t('tour.job_title_competencies.kpis_title', 'مؤشرات الأداء'),
      content: t(
        'tour.job_title_competencies.kpis_content',
        'قم بتوليد مؤشرات أداء دقيقة مرتبطة بكل جدارة وظيفية.'
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="tab-assessments"]',
      title: t(
        'tour.job_title_competencies.assessments_title',
        'نماذج التقييم'
      ),
      content: t(
        'tour.job_title_competencies.assessments_content',
        'قم بتوليد نماذج التقييم (فني وإداري) بناءً على الجدارات والوصف الوظيفي.'
      ),
      placement: 'bottom',
    },
  ],
  });
};
