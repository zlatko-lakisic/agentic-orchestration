import { IsActiveMatchOptions } from '@angular/router';

export type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  route?: string;
  icon?: string;
  badge?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  expanded?: boolean;
  activeOptions?: { exact: boolean } | IsActiveMatchOptions;
};

/** Routes are app-root relative (baseHref=/admin/). */
export const NAVIGATION: NavigationItem[] = [
  {
    id: 'main',
    label: 'Control plane',
    children: [
      {
        id: 'overview',
        label: 'Overview',
        icon: 'activity',
        route: '/overview',
      },
    ],
  },
  {
    id: 'operate',
    label: 'Operate',
    children: [
      {
        id: 'components',
        label: 'Components',
        icon: 'server',
        route: '/components',
        activeOptions: { exact: false },
      },
      {
        id: 'runs',
        label: 'Runs',
        icon: 'history',
        route: '/runs',
      },
      {
        id: 'activity',
        label: 'Activity',
        icon: 'git-compare',
        route: '/activity',
      },
    ],
  },
  {
    id: 'configure',
    label: 'Configure',
    children: [
      {
        id: 'capabilities',
        label: 'Capabilities',
        icon: 'layers',
        route: '/capabilities',
        activeOptions: { exact: false },
      },
      {
        id: 'behaviour',
        label: 'Behaviour',
        icon: 'cpu',
        route: '/behaviour',
      },
      {
        id: 'access',
        label: 'Access',
        icon: 'shield',
        route: '/access',
      },
      {
        id: 'data',
        label: 'Data',
        icon: 'hard-drive',
        route: '/data',
      },
      {
        id: 'deploy',
        label: 'Deploy',
        icon: 'rocket',
        route: '/deploy',
      },
    ],
  },
  {
    id: 'escape',
    label: 'Escape hatch',
    children: [
      {
        id: 'settings',
        label: 'All settings',
        icon: 'sliders-horizontal',
        route: '/settings',
      },
    ],
  },
];
