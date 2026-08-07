import { Routes } from '@angular/router';
import { AdminLayout } from './layout/layout';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./modules/overview/features/overview').then((m) => m.OverviewPage),
      },
      {
        path: 'runtime/planner',
        loadComponent: () =>
          import('./modules/runtime/features/planner').then((m) => m.PlannerPage),
      },
      {
        path: 'runtime/execution',
        loadComponent: () =>
          import('./modules/runtime/features/execution').then((m) => m.ExecutionPage),
      },
      {
        path: 'runtime/models',
        loadComponent: () =>
          import('./modules/runtime/features/models').then((m) => m.ModelsPage),
      },
      { path: 'catalogs', pathMatch: 'full', redirectTo: 'catalogs/agents' },
      {
        path: 'catalogs/:kind',
        loadComponent: () =>
          import('./modules/catalogs/features/catalogs').then((m) => m.CatalogsPage),
      },
      {
        path: 'catalogs/:kind/:id',
        loadComponent: () =>
          import('./modules/catalogs/features/catalog-detail').then(
            (m) => m.CatalogDetailPage
          ),
      },
      {
        path: 'memory',
        loadComponent: () =>
          import('./modules/memory/features/memory').then((m) => m.MemoryPage),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./modules/security/features/security').then((m) => m.SecurityPage),
      },
      {
        path: 'integrations',
        loadComponent: () =>
          import('./modules/integrations/features/integrations').then(
            (m) => m.IntegrationsPage
          ),
      },
      {
        path: 'deployments',
        loadComponent: () =>
          import('./modules/deployments/features/deployments').then(
            (m) => m.DeploymentsPage
          ),
      },
      {
        path: 'data',
        loadComponent: () =>
          import('./modules/data-storage/features/data').then((m) => m.DataPage),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./modules/audit/features/audit').then((m) => m.AuditPage),
      },
      {
        path: 'advanced',
        loadComponent: () =>
          import('./modules/advanced/features/advanced').then((m) => m.AdvancedPage),
      },
      {
        path: 'changes',
        loadComponent: () =>
          import('./modules/changes/features/changes').then((m) => m.ChangesPage),
      },
      {
        path: '404',
        loadComponent: () =>
          import('./modules/extras/error/features/error-404'),
      },
      { path: '**', redirectTo: 'overview' },
    ],
  },
];

export default routes;
