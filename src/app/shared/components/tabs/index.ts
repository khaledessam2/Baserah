import { Tabs } from './tabs';
import { TabsTrigger } from './tabs-trigger';
import { TabsContent } from './tabs-content';
import { TabsListDirective } from './tabs.directive';

export { Tabs } from './tabs';
export { TabsTrigger } from './tabs-trigger';
export { TabsContent } from './tabs-content';
export { TabsListDirective } from './tabs.directive';

export const TABS_DIRECTIVES = [
  Tabs,
  TabsListDirective,
  TabsTrigger,
  TabsContent,
] as const;
