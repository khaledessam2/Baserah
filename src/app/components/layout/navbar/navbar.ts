import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '@/services/auth.service';
import { I18nService } from '@/services/i18n.service';
import { TourService } from '@/services/tour.service';
import { getTourSteps } from '@/shared/config/tour-config';
import { cn } from '@/shared/utils/utils';
import { ButtonDirective } from '@/shared/directives/button.directive';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { ChangePasswordModal } from '@/components/dashboard/change-password-modal/change-password-modal';
import { LanguageSelector } from '../language-selector/language-selector';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

interface NavItem {
  name: string;
  path: string;
  icon: IconName;
}

/** Port of `layout/Navbar.tsx`. */
@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonDirective,
    Icon,
    ThemeToggle,
    LanguageSelector,
    ChangePasswordModal,
    TranslatePipe,
  ],
  templateUrl: './navbar.html',
})
export class Navbar implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly tour = inject(TourService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly isOpen = signal(false);
  readonly scrolled = signal(false);
  readonly showUserMenu = signal(false);
  readonly isChangePasswordOpen = signal(false);

  private readonly pathname = signal(this.router.url.split('?')[0]);
  private readonly routerSub: Subscription;

  readonly isRtl = computed(() => this.i18n.language() === 'ar');

  // Map routes to tour IDs
  private getRouteTourId(pathname: string): string | null {
    if (pathname === '/app/dashboard') return 'dashboard';
    if (pathname === '/app/employees') return 'employees';
    if (pathname === '/app/employee-dashboard') return 'employee-dashboard';
    if (pathname === '/app/employee-assessments') return 'employee-assessments';
    if (pathname === '/app/employee-reports') return 'employee-reports';
    if (pathname === '/app/reports') return 'reports';
    if (pathname === '/app/job-setup') return 'job-setup';
    if (pathname === '/app/title-generation') return 'title-generation';
    if (pathname === '/app/intro') return 'intro';
    if (pathname === '/app/job-titles') return 'job-titles';
    if (pathname === '/app/job-title-competencies')
      return 'job-title-competencies';
    return null;
  }

  readonly currentTourId = computed(() => this.getRouteTourId(this.pathname()));

  readonly tourSteps = computed(() => {
    const id = this.currentTourId();
    return id ? getTourSteps(this.i18n)[id] : null;
  });

  readonly navItems = computed<NavItem[]>(() => {
    const t = (key: string, fallback?: string) => this.i18n.t(key, fallback);
    return this.auth.user()?.role === 'employee'
      ? [
          {
            name: t('nav.dashboard'),
            path: '/app/employee-dashboard',
            icon: 'LayoutDashboard',
          },
        ]
      : [
          { name: t('nav.dashboard'), path: '/app/dashboard', icon: 'LayoutDashboard' },
          { name: t('nav.employees'), path: '/app/employees', icon: 'Users' },
          { name: t('nav.hr_reports'), path: '/app/reports', icon: 'FileText' },
          {
            name: t('nav.skills_gap', 'فجوات الجدارات'),
            path: '/app/skills-gap',
            icon: 'BarChart3',
          },
          { name: t('nav.job_titles'), path: '/app/job-titles', icon: 'Briefcase' },
        ];
  });

  private readonly handleScroll = () => this.scrolled.set(window.scrollY > 20);

  private readonly handleClickOutside = (event: MouseEvent) => {
    const menu = this.host.nativeElement.querySelector('[data-user-menu]');
    if (menu && !menu.contains(event.target as Node)) {
      this.showUserMenu.set(false);
    }
  };

  constructor() {
    window.addEventListener('scroll', this.handleScroll);
    document.addEventListener('mousedown', this.handleClickOutside);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.pathname.set(e.urlAfterRedirects.split('?')[0]));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('mousedown', this.handleClickOutside);
    this.routerSub.unsubscribe();
  }

  isActive(path: string): boolean {
    return this.pathname() === path;
  }

  handleLogout(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
    this.isOpen.set(false);
    this.showUserMenu.set(false);
  }

  openChangePassword(): void {
    this.isChangePasswordOpen.set(true);
    this.showUserMenu.set(false);
  }

  readonly wrapperClass = computed(() =>
    cn(
      'fixed top-0 left-0 right-0 z-50 flex justify-center py-4 transition-all duration-300',
      // Once stuck, the strip around the pill needs its own backdrop — without
      // it the page scrolls visibly through the gap above the rounded bar.
      this.scrolled()
        ? 'pt-2 pb-2 bg-background/80 backdrop-blur-xl'
        : 'pt-6 pb-4'
    )
  );

  readonly navClass = computed(() =>
    cn(
      'w-full max-w-[1400px] mx-4 sm:mx-6 rounded-2xl transition-all duration-500 ease-out',
      this.scrolled()
        ? 'bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl py-2 px-6 border border-white/30 dark:border-white/10'
        : 'bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl py-3 px-6 border border-white/40 dark:border-white/10 shadow-lg'
    )
  );

  navItemClass(path: string): string {
    return cn(
      'gap-2 px-5 h-10 rounded-full transition-all duration-300 font-semibold',
      this.isActive(path)
        ? 'bg-white dark:bg-indigo-600 text-primary dark:text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/30'
        : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/70'
    );
  }

  readonly userButtonClass = computed(() =>
    cn(
      'flex items-center gap-3 pl-1 pr-3 py-1 rounded-full transition-all duration-300 border border-transparent',
      this.showUserMenu()
        ? 'bg-white dark:bg-slate-800 shadow-xl ring-2 ring-primary/20 dark:ring-primary/40'
        : 'hover:bg-white/80 dark:hover:bg-white/10 hover:border-white/80 dark:hover:border-white/10'
    )
  );

  readonly chevronClass = computed(() =>
    cn(
      'w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 ml-1',
      this.showUserMenu() && 'rotate-180 text-primary dark:text-indigo-400'
    )
  );

  readonly dropdownClass = computed(() =>
    cn(
      'absolute mt-4 w-72 glass-card p-2 animate-fade-in-up origin-top-right',
      this.isRtl() ? 'left-0' : 'right-0'
    )
  );

  readonly menuItemClass = computed(() =>
    cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white hover:shadow-sm transition-all group',
      this.isRtl() && 'flex-row-reverse text-right'
    )
  );

  readonly logoutItemClass = computed(() =>
    cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 hover:shadow-sm transition-all group',
      this.isRtl() && 'flex-row-reverse text-right'
    )
  );

  mobileItemClass(path: string): string {
    return cn(
      'flex items-center gap-4 p-3 rounded-xl mb-1 transition-all',
      this.isActive(path)
        ? 'bg-indigo-50/80 dark:bg-indigo-900/30 text-primary dark:text-indigo-300 font-bold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
    );
  }

  mobileIconClass(path: string): string {
    return cn(
      'p-2 rounded-lg',
      this.isActive(path)
        ? 'bg-white dark:bg-slate-800 shadow-sm'
        : 'bg-slate-100 dark:bg-slate-800/50'
    );
  }
}
