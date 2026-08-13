import { type ControlConfirmSpec } from '../data/control.model';
export declare class ControlConfirmDialog {
    readonly data: ControlConfirmSpec;
    private readonly ref;
    typed: string;
    canSubmit(): boolean;
    confirm(): void;
}
