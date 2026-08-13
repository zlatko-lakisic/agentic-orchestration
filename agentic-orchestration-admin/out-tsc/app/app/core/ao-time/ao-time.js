import { __decorate } from "tslib";
import { Injectable, signal } from '@angular/core';
/** App-wide 1 Hz clock for live “ago” labels. */
let AoClock = class AoClock {
    nowMs = signal(Date.now());
    timer = setInterval(() => this.nowMs.set(Date.now()), 1000);
    ngOnDestroy() {
        clearInterval(this.timer);
    }
};
AoClock = __decorate([
    Injectable({ providedIn: 'root' })
], AoClock);
export { AoClock };
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
export function toEpochMs(value) {
    if (value == null || value === '')
        return null;
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? t : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value < 1e12 ? value * 1000 : value;
    }
    const s = String(value).trim();
    if (!s)
        return null;
    const asNum = Number(s);
    if (Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(s)) {
        return asNum < 1e12 ? asNum * 1000 : asNum;
    }
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : null;
}
/**
 * Relative time up to 6 hours (ceil to second / minute / hour), then absolute local date.
 */
export function formatTimeAgo(value, nowMs = Date.now()) {
    const t = toEpochMs(value);
    if (t == null)
        return '—';
    const age = Math.max(0, nowMs - t);
    if (age >= SIX_HOURS_MS) {
        return new Date(t).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'medium',
        });
    }
    if (age < 60_000) {
        const s = Math.max(1, Math.ceil(age / 1000));
        return s === 1 ? '1 second ago' : `${s} seconds ago`;
    }
    if (age < 3_600_000) {
        const m = Math.max(1, Math.ceil(age / 60_000));
        return m === 1 ? '1 minute ago' : `${m} minutes ago`;
    }
    const h = Math.max(1, Math.ceil(age / 3_600_000));
    return h === 1 ? '1 hour ago' : `${h} hours ago`;
}
export function formatAbsoluteLocal(value) {
    const t = toEpochMs(value);
    if (t == null)
        return '—';
    return new Date(t).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
}
