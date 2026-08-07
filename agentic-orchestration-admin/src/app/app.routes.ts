import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    loadChildren: () => import('./domains/admin/routes'),
  },
  {
    path: '**',
    redirectTo: 'overview',
  },
];
