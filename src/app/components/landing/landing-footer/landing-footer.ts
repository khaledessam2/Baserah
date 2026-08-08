import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '@/shared/components/icon/icon';
import type { IconName } from '@/shared/icons/icons';
import { TranslatePipe } from '@/shared/pipes/translate.pipe';

/** Port of `landing/LandingFooter.tsx`. */
@Component({
  selector: 'app-landing-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslatePipe],
  templateUrl: './landing-footer.html',
})
export class LandingFooter {
  readonly socialIcons: IconName[] = ['Twitter', 'Linkedin', 'Facebook', 'Github'];
  readonly sections = ['Product', 'Company', 'Resources', 'Legal'];
  readonly linkItems = [1, 2, 3];
}
