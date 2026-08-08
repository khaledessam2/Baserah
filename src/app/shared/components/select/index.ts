import { Select } from './select';
import { SelectTrigger } from './select-trigger';
import { SelectValue } from './select-value';
import { SelectContent } from './select-content';
import { SelectItem } from './select-item';
import {
  SelectLabelDirective,
  SelectSeparatorDirective,
} from './select.directive';

export { Select } from './select';
export { SelectTrigger } from './select-trigger';
export { SelectValue } from './select-value';
export { SelectContent } from './select-content';
export { SelectItem } from './select-item';
export {
  SelectLabelDirective,
  SelectSeparatorDirective,
} from './select.directive';

export const SELECT_DIRECTIVES = [
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabelDirective,
  SelectSeparatorDirective,
] as const;
