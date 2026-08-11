import { describe, expect, it } from 'vitest';
import { topologyShowsTable } from './topology-page';

describe('topologyShowsTable', () => {
  it('shows the table when table mode or a narrow screen forces it', () => {
    expect(topologyShowsTable(true, false, false)).toBe(true);
    expect(topologyShowsTable(false, true, false)).toBe(true);
    expect(topologyShowsTable(false, false, false)).toBe(false);
  });

  it('keeps the canvas in full-screen focus mode even on a narrow/table layout', () => {
    expect(topologyShowsTable(true, true, true)).toBe(false);
    expect(topologyShowsTable(false, true, true)).toBe(false);
  });
});
