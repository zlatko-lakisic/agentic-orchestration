import { Router } from '@angular/router';
/** Fuse Settings layout pattern for Runtime tabs. */
export declare class RuntimeLayout {
    protected router: Router;
    protected links: {
        id: string;
        label: string;
        route: string;
    }[];
}
