import { REPRESENTATIVE_RUN } from '../content/runTrace'
import { TracePanel } from './TracePanel'

export function OneRealRun() {
  return (
    <section id="one-real-run" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">02 · one run</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Goal in. Replan. Assertions. Score. Deliverable out.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Grounded in the shipped healthcare harness scenario{' '}
          <code className="font-mono text-sm text-steel">chf_evidence_outline</code> — a one-page
          evidence-vs-judgment outline for a hospital CHF remote-monitoring program. The power of
          the loop is that the output is checked and scored.
        </p>

        <div className="mt-10">
          <TracePanel
            title="representative run · chf_evidence_outline"
            subtitle="scenario + assertions + healthcare_claims rubric — not a captured session log"
            events={REPRESENTATIVE_RUN}
            animate
            footer={
              <p className="font-mono text-[11px] text-dim">
                Labeled representative: real scenario id, assertions, and rubric rules from the
                repo. Step timings and intermediate prose are illustrative of the loop, not a
                pasted production transcript.
              </p>
            }
          />
        </div>
      </div>
    </section>
  )
}
