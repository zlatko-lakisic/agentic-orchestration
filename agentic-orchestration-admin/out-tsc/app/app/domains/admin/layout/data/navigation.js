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
            {
                id: 'topology',
                label: 'Topology',
                icon: 'share-2',
                route: '/topology',
            },
        ],
    },
    {
        id: 'operate',
        label: 'Operate',
        children: [
            {
                id: 'control',
                label: 'Control',
                icon: 'power',
                route: '/control',
            },
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
                id: 'traces',
                label: 'Traces',
                icon: 'git-branch',
                route: '/traces',
            },
            {
                id: 'llm-usage',
                label: 'Token usage',
                icon: 'coins',
                route: '/llm-usage',
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
