/** Routes are app-root relative (baseHref=/admin/). */
export const NAVIGATION = [
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
        id: 'runtime',
        label: 'Runtime',
        description: 'Planner, execution, models',
        children: [
            {
                id: 'runtime/planner',
                label: 'Planner & defaults',
                icon: 'cpu',
                route: '/runtime/planner',
            },
            {
                id: 'runtime/execution',
                label: 'Execution',
                icon: 'server',
                route: '/runtime/execution',
            },
            {
                id: 'runtime/models',
                label: 'Models & hardware',
                icon: 'microchip',
                route: '/runtime/models',
            },
        ],
    },
    {
        id: 'configuration',
        label: 'Configuration',
        children: [
            {
                id: 'catalogs',
                label: 'Catalogs',
                icon: 'layers',
                route: '/catalogs',
                activeOptions: { exact: false },
            },
            {
                id: 'memory',
                label: 'Memory & quality',
                icon: 'database',
                route: '/memory',
            },
            {
                id: 'security',
                label: 'Access & security',
                icon: 'shield',
                route: '/security',
            },
            {
                id: 'integrations',
                label: 'Integrations',
                icon: 'plug',
                route: '/integrations',
            },
        ],
    },
    {
        id: 'operations',
        label: 'Operations',
        children: [
            {
                id: 'deployments',
                label: 'Deployments',
                icon: 'rocket',
                route: '/deployments',
            },
            {
                id: 'data',
                label: 'Data & storage',
                icon: 'hard-drive',
                route: '/data',
            },
            {
                id: 'audit',
                label: 'Audit',
                icon: 'scroll-text',
                route: '/audit',
            },
            {
                id: 'advanced',
                label: 'Advanced',
                icon: 'sliders-horizontal',
                route: '/advanced',
            },
            {
                id: 'changes',
                label: 'Change set',
                icon: 'git-compare',
                route: '/changes',
            },
        ],
    },
];
