import { REPRESENTATIVE_RUN } from '../content/runTrace'
import { TracePanel } from './TracePanel'

const STEPS = [
  {
    title: 'Plans the work',
    body: "Figure out what's actually proven in trials, what regulators require, and what's just the hospital's own judgment call.",
  },
  {
    title: 'Does it',
    body: 'Pulls the evidence into a first draft.',
  },
  {
    title: 'Catches its own mistake',
    body: 'The draft leaned too clinical and skipped the cost and approval side. It notices.',
  },
  {
    title: 'Redoes it',
    body: 'Rebalances so evidence and judgment are both covered.',
  },
  {
    title: 'A separate reviewer checks it',
    body: 'Scores the result and flags anything that looks made up, like invented studies or fake approval numbers.',
  },
  {
    title: 'Done',
    body: 'A clean one-page brief that keeps "what\'s proven" and "what\'s our call" separate.',
  },
]

export function OneRealRun() {
  return (
    <section id="one-real-job" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">01 · one job</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          One big job, done step by step.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          A hospital asks: should we start an at-home heart-monitoring program for heart-failure
          patients? That&apos;s not one answer. Here&apos;s how it&apos;s handled:
        </p>

        <ol className="mt-10 max-w-2xl space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <span
                className="font-display text-2xl font-semibold text-steel tabular-nums"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-mist">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <details className="mt-12 max-w-3xl rounded-sm border border-line bg-panel open:pb-0">
          <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              See the detailed run
              <span className="font-mono text-[10px] font-normal tracking-wider text-dim uppercase">
                optional · technical
              </span>
            </span>
          </summary>
          <div className="border-t border-line p-3 sm:p-4">
            <TracePanel
              title="representative run · chf_evidence_outline"
              subtitle="scenario + checks + review rules — not a captured session log"
              events={REPRESENTATIVE_RUN}
              animate
              footer={
                <p className="font-mono text-[11px] text-dim">
                  Labeled representative: real scenario id and review rules from the repo. Step
                  timings, intermediate prose, and the pass result are illustrative of the loop —
                  not a pasted production transcript or a measured live metric.
                </p>
              }
            />
          </div>
        </details>
      </div>
    </section>
  )
}
