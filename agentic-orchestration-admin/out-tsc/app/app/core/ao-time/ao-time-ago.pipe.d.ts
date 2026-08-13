import { PipeTransform } from '@angular/core';
/** Live-friendly relative time; pass `clock.nowMs()` as the second arg so it ticks. */
export declare class AoTimeAgoPipe implements PipeTransform {
    transform(value: unknown, nowMs?: number): string;
}
export declare class AoAbsoluteTimePipe implements PipeTransform {
    transform(value: unknown): string;
}
