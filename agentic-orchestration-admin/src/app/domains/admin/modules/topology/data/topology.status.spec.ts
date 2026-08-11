import { describe, expect, it } from 'vitest';
import {
  STATUS_MARK_LIST,
  statusGlyph,
  statusGlyphColor,
  statusIcon,
  statusMark,
  visibleNodeStatus,
} from './topology.status';

describe('topology.status', () => {
  it('keeps a red X for failed only', () => {
    expect(statusGlyph('failed')).toBe('✕');
    expect(statusIcon('failed')).toBe('x');
    expect(statusGlyphColor('failed')).toBe('#dc2626');
    expect(statusGlyph('degraded')).not.toBe('✕');
    expect(statusGlyph('offline')).not.toBe('✕');
    expect(statusGlyph('healthy')).not.toBe('✕');
  });

  it('uses a yellow caution triangle for degraded', () => {
    expect(statusIcon('degraded')).toBe('triangle-alert');
    expect(statusGlyph('degraded')).toBe('▲');
    expect(statusGlyphColor('degraded')).toBe('#eab308');
  });

  it('keeps a green check for healthy', () => {
    expect(statusGlyph('healthy')).toBe('✓');
    expect(statusIcon('healthy')).toBe('check');
    expect(statusGlyphColor('healthy')).toBe('#16a34a');
  });

  it('gives every other state its own icon and glyph', () => {
    const icons = STATUS_MARK_LIST.map((m) => m.icon);
    const glyphs = STATUS_MARK_LIST.map((m) => m.glyph);
    expect(new Set(icons).size).toBe(STATUS_MARK_LIST.length);
    expect(new Set(glyphs).size).toBe(STATUS_MARK_LIST.length);
    expect(statusIcon('starting')).toBe('loader-circle');
    expect(statusIcon('draining')).toBe('circle-arrow-down');
    expect(statusIcon('offline')).toBe('circle-off');
    expect(STATUS_MARK_LIST.some((m) => m.id === 'unknown')).toBe(false);
  });

  it('never surfaces unknown — idle/unprobed is healthy, not-deployed is offline', () => {
    expect(visibleNodeStatus('unknown', true)).toBe('healthy');
    expect(visibleNodeStatus('unknown', false)).toBe('offline');
    expect(visibleNodeStatus('', true)).toBe('healthy');
    expect(visibleNodeStatus('down', true)).toBe('healthy');
    expect(statusMark('unknown').id).toBe('healthy');
    expect(statusMark('').id).toBe('healthy');
    expect(statusMark(null).id).toBe('healthy');
  });
});
