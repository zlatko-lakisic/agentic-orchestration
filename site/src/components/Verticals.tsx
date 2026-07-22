import { useId, useState } from 'react'

type DomainTab = {
  id: string
  label: string
  question: string
  does: string
  gets: string
  command: string
}

const TABS: DomainTab[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    question:
      'Should we launch an at-home monitoring program for heart-failure patients — and can we stand behind the decision?',
    does:
      "Pulls together what's proven in trials, what regulators require, and what's the hospital's own judgment — grounded in public evidence (FDA, trials, PubMed), and able to work against your own EMR through standard healthcare interfaces (FHIR) so it reasons over your records, not generic web data. On reimbursement and regulatory questions it's told to lean on official sources like FDA and CMS and to flag anything that needs legal review.",
    gets:
      'A decision-ready one-page brief that keeps "what\'s proven" separate from "our call," with invented studies or fake approval numbers flagged out.',
    command:
      'python main.py --example healthcare --dynamic "Draft a commercial brief for a novel oncology biomarker"',
  },
  {
    id: 'logistics',
    label: 'Logistics',
    question: 'Where is our warehouse actually losing time, and what do we do about it?',
    does:
      'Reviews how the operation runs, finds the bottlenecks, and weighs the labor and workflow trade-offs — grounded in your own WMS and ERP (SAP, Dynamics, NetSuite) connected as tools, with a simulated sandbox so you can see it work before wiring anything up.',
    gets:
      'A plain read on where the delays are and what to change, drawn from your systems of record rather than generic advice.',
    command:
      'python main.py --example logistics --dynamic "Analyze current warehouse utilization and flag bottlenecks"',
  },
]

export function Verticals() {
  const [active, setActive] = useState(TABS[0]!.id)
  const baseId = useId()
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]!

  return (
    <section id="verticals" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">04 · domains</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Two domains that ship today.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Real business questions. The deliverable is the proof — not a percentage promise.
        </p>

        <div
          role="tablist"
          aria-label="Domain use cases"
          className="mt-10 flex flex-wrap gap-2 border-b border-line pb-px"
        >
          {TABS.map((t) => {
            const selected = t.id === active
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={(e) => {
                  const i = TABS.findIndex((x) => x.id === active)
                  if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    setActive(TABS[(i + 1) % TABS.length]!.id)
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setActive(TABS[(i - 1 + TABS.length) % TABS.length]!.id)
                  }
                }}
                className={`rounded-sm px-4 py-2 font-display text-sm font-semibold transition ${
                  selected
                    ? 'bg-steel text-graphite'
                    : 'border border-line bg-panel text-mist hover:border-steel/40 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          className="mt-8 rounded-sm border border-line bg-panel p-5 sm:p-6"
        >
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] tracking-wider text-steel uppercase">
                The question
              </p>
              <p className="font-display mt-2 text-lg font-semibold text-balance text-white sm:text-xl">
                {tab.question}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-wider text-steel uppercase">
                What it does
              </p>
              <p className="mt-2 text-mist">{tab.does}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-wider text-steel uppercase">
                What you get
              </p>
              <p className="mt-2 text-mist">{tab.gets}</p>
            </div>
          </div>

          <details className="mt-8 border-t border-line pt-4">
            <summary className="cursor-pointer font-mono text-[11px] tracking-wider text-dim uppercase marker:content-none [&::-webkit-details-marker]:hidden">
              For developers
            </summary>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-line bg-graphite p-3 font-mono text-[11px] leading-relaxed text-steel wrap-break-word whitespace-pre-wrap">
              {tab.command}
            </pre>
          </details>
        </div>
      </div>
    </section>
  )
}
