import { Pipe, PipeTransform } from '@angular/core';
import { formatAbsoluteLocal, formatTimeAgo } from './ao-time';

/** Live-friendly relative time; pass `clock.nowMs()` as the second arg so it ticks. */
@Pipe({ name: 'aoTimeAgo', pure: true })
export class AoTimeAgoPipe implements PipeTransform {
  transform(value: unknown, nowMs: number = Date.now()): string {
    return formatTimeAgo(value, nowMs);
  }
}

@Pipe({ name: 'aoAbsoluteTime', pure: true })
export class AoAbsoluteTimePipe implements PipeTransform {
  transform(value: unknown): string {
    return formatAbsoluteLocal(value);
  }
}
