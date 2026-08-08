export const routes = [
    {
        path: '',
        loadChildren: () => import('./domains/admin/routes'),
    },
    {
        path: '**',
        redirectTo: 'overview',
    },
];
