import type { ControlTarget } from '@/app/core/ao-api/types';
export type { ControlRestartAction, ControlRestartResult, ControlStatus, ControlTarget, ControlTargetKind, } from '@/app/core/ao-api/types';
export interface ControlConfirmSpec {
    title: string;
    body: string;
    phrase: string | null;
    confirmLabel: string;
    danger: boolean;
}
export declare function targetsInGroup(targets: ControlTarget[] | null | undefined, group: string): ControlTarget[];
export declare function canSubmitConfirm(phrase: string | null | undefined, typed: string): boolean;
export declare function controlConfirmSpec(target: ControlTarget, hostname?: string | null): ControlConfirmSpec;
