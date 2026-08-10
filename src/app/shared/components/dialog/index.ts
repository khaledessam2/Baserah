import { Dialog } from './dialog';
import {
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
} from '@/shared/directives/dialog.directive';

export { Dialog } from './dialog';
export {
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
} from '@/shared/directives/dialog.directive';

export const DIALOG_DIRECTIVES = [
  Dialog,
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
] as const;
