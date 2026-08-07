import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '404',
    loadComponent: () => import('./features/error-404'),
  },
];

export default routes;
