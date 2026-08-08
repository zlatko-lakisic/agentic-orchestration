const routes = [
    {
        path: '404',
        loadComponent: () => import('./features/error-404'),
    },
];
export default routes;
