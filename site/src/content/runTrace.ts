export type TraceKind = 'goal' | 'plan' | 'step' | 'replan' | 'assert' | 'score' | 'out'

export type TraceEvent = {
  t: string
  kind: TraceKind
  label: string
  detail?: string
  status?: 'ok' | 'warn' | 'pass'
}

/**
 * Representative run grounded in the shipped healthcare harness scenario
 * `chf_evidence_outline` (assertions + healthcare_claims rubric). Not a
 * captured session transcript — labeled as such in the UI.
 */
export const REPRESENTATIVE_RUN: TraceEvent[] = [
  {
    t: '00:00',
    kind: 'goal',
    label: 'Goal received',
    detail:
      'One-page outline: evidence needs for a hospital CHF remote-monitoring program — evidence vs organizational judgment. No bedside recommendations.',
  },
  {
    t: '00:02',
    kind: 'plan',
    label: 'Plan v1',
    detail: '1) Scope RPM evidence categories  2) Separate trial/FDA/payer literature from ops judgment  3) Draft outline',
  },
  {
    t: '00:18',
    kind: 'step',
    label: 'Step 1 complete',
    detail: 'Draft leaned clinical; missing explicit FDA / payer literature buckets.',
    status: 'warn',
  },
  {
    t: '00:19',
    kind: 'replan',
    label: 'Coordinator replan',
    detail:
      'Reevaluate from step return → bias outline toward trial, FDA, and payer evidence categories; keep judgment section explicit.',
  },
  {
    t: '00:41',
    kind: 'step',
    label: 'Step 2 complete',
    detail: 'Revised outline with evidence vs judgment sections; planning tone.',
    status: 'ok',
  },
  {
    t: '00:42',
    kind: 'assert',
    label: 'Assertions',
    detail: 'bullet_count ≥ 4  ·  contains evidence|judgment|trial|FDA  ·  min_chars ≥ 300',
  },
  {
    t: '00:43',
    kind: 'score',
    label: 'QA score',
    detail:
      'Rubric: reward qualified claims; penalize invented trial IDs / approval numbers. Score 0.86 — pass.',
    status: 'pass',
  },
  {
    t: '00:44',
    kind: 'out',
    label: 'Deliverable',
    detail: 'Tight one-page evidence-vs-judgment outline for CHF RPM program planning.',
    status: 'pass',
  },
]

export const HERO_TRACE: TraceEvent[] = [
  {
    t: 'T+0',
    kind: 'goal',
    label: 'task.in',
    detail: 'Draft commercial brief — novel oncology biomarker',
  },
  {
    t: 'T+1',
    kind: 'plan',
    label: 'plan.v1',
    detail: 'research → outline → draft',
  },
  {
    t: 'T+2',
    kind: 'replan',
    label: 'replan',
    detail: 'step returned gap → add competitive landscape',
  },
  {
    t: 'T+3',
    kind: 'score',
    label: 'qa.score',
    detail: 'assertions checked',
    status: 'pass',
  },
  {
    t: 'T+4',
    kind: 'out',
    label: 'task.out',
    detail: 'deliverable ready',
    status: 'pass',
  },
]
