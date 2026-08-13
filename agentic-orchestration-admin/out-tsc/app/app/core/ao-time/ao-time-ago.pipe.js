import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { formatAbsoluteLocal, formatTimeAgo } from './ao-time';
/** Live-friendly relative time; pass `clock.nowMs()` as the second arg so it ticks. */
let AoTimeAgoPipe = class AoTimeAgoPipe {
    transform(value, nowMs = Date.now()) {
        return formatTimeAgo(value, nowMs);
    }
};
AoTimeAgoPipe = __decorate([
    Pipe({ name: 'aoTimeAgo', pure: true })
], AoTimeAgoPipe);
export { AoTimeAgoPipe };
let AoAbsoluteTimePipe = class AoAbsoluteTimePipe {
    transform(value) {
        return formatAbsoluteLocal(value);
    }
};
AoAbsoluteTimePipe = __decorate([
    Pipe({ name: 'aoAbsoluteTime', pure: true })
], AoAbsoluteTimePipe);
export { AoAbsoluteTimePipe };
