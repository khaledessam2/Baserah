import { Routes } from '@angular/router';
import { Layout } from './components/layout/layout/layout';
import { LandingPage } from './pages/landing-page/landing-page';
import { AuthPage } from './pages/auth-page/auth-page';
import { IntroPage } from './pages/intro-page/intro-page';
import { TitleGenerationPage } from './pages/title-generation-page/title-generation-page';
import { JobSetupPage } from './pages/job-setup-page/job-setup-page';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { EmployeesPage } from './pages/employees-page/employees-page';
import { JobTitlesPage } from './pages/job-titles-page/job-titles-page';
import { EmployeeDashboardPage } from './pages/employee-dashboard-page/employee-dashboard-page';
import { EmployeeAssessmentsPage } from './pages/employee-assessments-page/employee-assessments-page';
import { EmployeeReportsPage } from './pages/employee-reports-page/employee-reports-page';
import { TakeAssessmentPage } from './pages/take-assessment-page/take-assessment-page';
import { AssessmentResultsPage } from './pages/assessment-results-page/assessment-results-page';
import { ViewReportPage } from './pages/view-report-page/view-report-page';
import { SkillsGapPage } from './pages/skills-gap-page/skills-gap-page';
import { JobTitleCompetenciesPage } from './pages/job-title-competencies-page/job-title-competencies-page';
import { ReportsPage } from './pages/reports-page/reports-page';
import { authGuard } from '@/guards/auth.guard';

const hr = authGuard(['hr_manager', 'manager']);
const employee = authGuard(['employee']);
const anyRole = authGuard(['hr_manager', 'manager', 'employee']);

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'auth', component: AuthPage },
  {
    path: 'app',
    component: Layout,
    children: [
      { path: 'intro', component: IntroPage, canActivate: [hr] },
      { path: 'title-generation', component: TitleGenerationPage, canActivate: [hr] },
      { path: 'job-setup', component: JobSetupPage, canActivate: [hr] },
      { path: 'dashboard', component: DashboardPage, canActivate: [hr] },
      { path: 'employees', component: EmployeesPage, canActivate: [hr] },
      { path: 'job-titles', component: JobTitlesPage, canActivate: [hr] },
      { path: 'employee-dashboard', component: EmployeeDashboardPage, canActivate: [employee] },
      { path: 'employee-assessments', component: EmployeeAssessmentsPage, canActivate: [employee] },
      { path: 'employee-reports', component: EmployeeReportsPage, canActivate: [employee] },
      { path: 'take-assessment', component: TakeAssessmentPage, canActivate: [employee] },
      { path: 'assessment-results', component: AssessmentResultsPage, canActivate: [anyRole] },
      { path: 'view-report', component: ViewReportPage, canActivate: [anyRole] },
      { path: 'skills-gap', component: SkillsGapPage, canActivate: [hr] },
      { path: 'job-title-competencies', component: JobTitleCompetenciesPage, canActivate: [hr] },
      { path: 'reports', component: ReportsPage, canActivate: [hr] },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
