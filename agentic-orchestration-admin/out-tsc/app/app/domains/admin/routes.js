import { AdminLayout } from './layout/layout';
const routes = [
    {
        path: '',
        component: AdminLayout,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'overview' },
            {
                path: 'overview',
                loadComponent: () => import('./modules/overview/features/overview').then((m) => m.OverviewPage),
            },
            {
                path: 'topology',
                loadComponent: () => import('./modules/topology/features/topology-page').then((m) => m.TopologyPage),
            },
            {
                path: 'control',
                loadComponent: () => import('./modules/control/features/control-page').then((m) => m.ControlPage),
            },
            {
                path: 'components',
                loadComponent: () => import('./modules/components/features/components').then((m) => m.ComponentsPage),
            },
            {
                path: 'components/:id',
                loadComponent: () => import('./modules/components/features/component-detail').then((m) => m.ComponentDetailPage),
            },
            {
                path: 'runs',
                loadComponent: () => import('./modules/runs/features/runs').then((m) => m.RunsPage),
            },
            {
                path: 'traces',
                loadComponent: () => import('./modules/traces/features/traces').then((m) => m.TracesPage),
            },
            {
                path: 'llm-usage',
                loadComponent: () => import('./modules/usage/features/llm-usage').then((m) => m.LlmUsagePage),
            },
            {
                path: 'activity',
                loadComponent: () => import('./modules/activity/features/activity').then((m) => m.ActivityPage),
            },
            {
                path: 'capabilities',
                pathMatch: 'full',
                redirectTo: 'capabilities/agents',
            },
            {
                path: 'capabilities/:kind',
                loadComponent: () => import('./modules/catalogs/features/catalogs').then((m) => m.CatalogsPage),
                children: [
                    {
                        path: ':id',
                        loadComponent: () => import('./modules/catalogs/features/catalog-detail').then((m) => m.CatalogDetailPage),
                    },
                ],
            },
            {
                path: 'behaviour',
                loadComponent: () => import('./modules/behaviour/features/behaviour').then((m) => m.BehaviourPage),
            },
            {
                path: 'access',
                loadComponent: () => import('./modules/access/features/access').then((m) => m.AccessPage),
            },
            {
                path: 'data',
                loadComponent: () => import('./modules/data-storage/features/data').then((m) => m.DataPage),
            },
            {
                path: 'deploy',
                loadComponent: () => import('./modules/deploy/features/deploy').then((m) => m.DeployPage),
            },
            {
                path: 'settings',
                loadComponent: () => import('./modules/settings/features/settings').then((m) => m.SettingsPage),
            },
            // Legacy redirects
            { path: 'runtime', pathMatch: 'full', redirectTo: 'behaviour' },
            { path: 'runtime/planner', redirectTo: 'behaviour' },
            { path: 'runtime/execution', redirectTo: 'components/execution' },
            { path: 'runtime/models', redirectTo: 'components/ollama' },
            { path: 'catalogs', redirectTo: 'capabilities/agents' },
            { path: 'catalogs/:kind', redirectTo: 'capabilities/:kind' },
            { path: 'memory', redirectTo: 'behaviour' },
            { path: 'security', redirectTo: 'access' },
            { path: 'integrations', redirectTo: 'components' },
            { path: 'deployments', redirectTo: 'deploy' },
            { path: 'audit', redirectTo: 'activity' },
            { path: 'changes', redirectTo: 'activity' },
            { path: 'advanced', redirectTo: 'settings' },
            {
                path: '404',
                loadComponent: () => import('./modules/extras/error/features/error-404'),
            },
            { path: '**', redirectTo: 'overview' },
        ],
    },
];
export default routes;
