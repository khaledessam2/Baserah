import { Tabs } from './tabs';
import { TabsTrigger } from './tabs-trigger/tabs-trigger';
import { TabsContent } from './tabs-content/tabs-content';
import { TabsListDirective } from '@/shared/directives/tabs.directive';

export { Tabs } from './tabs';
export { TabsTrigger } from './tabs-trigger/tabs-trigger';
export { TabsContent } from './tabs-content/tabs-content';
export { TabsListDirective } from '@/shared/directives/tabs.directive';

export const TABS_DIRECTIVES = [
  Tabs,
  TabsListDirective,
  TabsTrigger,
  TabsContent,
] as const;
