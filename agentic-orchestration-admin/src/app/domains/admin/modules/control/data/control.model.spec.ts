import { describe, expect, it } from 'vitest';
import {
  canSubmitConfirm,
  controlConfirmSpec,
  targetsInGroup,
  type ControlTarget,
} from './control.model';

const engine: ControlTarget = {
  id: 'engine',
  label: 'Engine',
  kind: 'k8s-deployment',
  group: 'apps',
  available: true,
  description: 'Restarts the Reach engine.',
};

const stack: ControlTarget = {
  id: 'stack',
  label: 'AO Kubernetes stack',
  kind: 'k8s-stack',
  group: 'stack',
  available: true,
  disconnectLikely: true,
};

const host: ControlTarget = {
  id: 'host',
  label: 'Reboot this server',
  kind: 'host-reboot',
  group: 'host',
  available: true,
  confirmPhrase: 'REBOOT',
  disconnectLikely: true,
};

describe('targetsInGroup', () => {
  it('filters by group', () => {
    expect(targetsInGroup([engine, stack, host], 'apps')).toEqual([engine]);
    expect(targetsInGroup([engine, stack, host], 'host')).toEqual([host]);
  });
});

describe('canSubmitConfirm', () => {
  it('allows dialogs without a phrase', () => {
    expect(canSubmitConfirm(null, '')).toBe(true);
  });

  it('requires an exact phrase', () => {
    expect(canSubmitConfirm('REBOOT', 'reboot')).toBe(false);
    expect(canSubmitConfirm('REBOOT', 'REBOOT')).toBe(true);
  });
});

describe('controlConfirmSpec', () => {
  it('requires REBOOT for the host', () => {
    const spec = controlConfirmSpec(host, 'omega-jetson-orin');
    expect(spec.phrase).toBe('REBOOT');
    expect(spec.danger).toBe(true);
    expect(spec.body).toContain('omega-jetson-orin');
  });

  it('warns that stack restart disconnects Admin', () => {
    const spec = controlConfirmSpec(stack);
    expect(spec.phrase).toBeNull();
    expect(spec.body.toLowerCase()).toContain('coordinator');
  });
});
