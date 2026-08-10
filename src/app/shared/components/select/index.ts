import { Select } from './select';
import { SelectTrigger } from './select-trigger/select-trigger';
import { SelectValue } from './select-value/select-value';
import { SelectContent } from './select-content/select-content';
import { SelectItem } from './select-item/select-item';
import {
  SelectLabelDirective,
  SelectSeparatorDirective,
} from '@/shared/directives/select.directive';

export { Select } from './select';
export { SelectTrigger } from './select-trigger/select-trigger';
export { SelectValue } from './select-value/select-value';
export { SelectContent } from './select-content/select-content';
export { SelectItem } from './select-item/select-item';
export {
  SelectLabelDirective,
  SelectSeparatorDirective,
} from '@/shared/directives/select.directive';

export const SELECT_DIRECTIVES = [
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabelDirective,
  SelectSeparatorDirective,
] as const;
