import { Dialog } from './dialog';
import {
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
} from './dialog.directive';

export { Dialog } from './dialog';
export {
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
} from './dialog.directive';

export const DIALOG_DIRECTIVES = [
  Dialog,
  DialogHeaderDirective,
  DialogFooterDirective,
  DialogTitleDirective,
  DialogDescriptionDirective,
] as const;
