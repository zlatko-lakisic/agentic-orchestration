import { StatusBadge } from './StatusBadge'

const PARTS = [
  {
    name: 'Coordinator',
    tagline: 'Replans from what was just tried — not plan-once.',
    under: 'CrewAI + LiteLLM · --dynamic-iterative · auto-controller',
    status: 'shipped' as const,
  },
  {
    name: 'Record',
    tagline: 'Phases and steps as a working record that feeds the next decision.',
    under: 'Sessions · step context injection · run store',
    status: 'shipped' as const,
  },
  {
    name: 'Memory',
    tagline: 'Knowledge that should carry from one task to the next.',
    under: 'SQLite-FTS KB · learning stats · weighted hints (not deep transfer yet)',
    status: 'partial' as const,
  },
  {
    name: 'Judge',
    tagline: 'Impartial QA that scores the outcome, separate from who did the work.',
    under: 'Learning-loop eval · harness L3 rubrics · user-harness scoring (fragmented)',
    status: 'partial' as const,
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">05 · how it works</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Process loop, not a smarter single model.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Narrow AI is good at one task. Moving toward general task-processing means modeling how
          a capable person works through a problem: continuously reevaluate, keep a working
          record, carry what should transfer, and score the outcome before calling it done.
          Catalogs, MCP, and pluggable backends are the substrate under the hood — they let the
          loop run on any LLM. They are not the headline.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-line bg-panel p-5">
            <p className="font-mono text-[11px] tracking-wider text-dim uppercase">Without</p>
            <p className="font-display mt-2 text-lg font-semibold text-white">
              Plan once. Execute. Hope.
            </p>
            <p className="mt-3 text-sm text-mist">
              A fixed plan runs to completion. Failures surface late. There is no working record
              feeding the next decision, and nobody scores the deliverable before it ships.
            </p>
          </div>
          <div className="rounded-sm border border-steel/35 bg-panel-raised p-5">
            <p className="font-mono text-[11px] tracking-wider text-steel uppercase">With</p>
            <p className="font-display mt-2 text-lg font-semibold text-white">
              Replan on what just failed. Carry the record. Score before done.
            </p>
            <ol className="mt-4 space-y-2 font-mono text-sm text-mist">
              <li>
                <span className="text-steel">01</span> Coordinator reevaluates
              </li>
              <li>
                <span className="text-steel">02</span> Record keeps phases and steps
              </li>
              <li>
                <span className="text-steel">03</span> Memory should carry across tasks
              </li>
              <li>
                <span className="text-steel">04</span> Judge scores the outcome
              </li>
            </ol>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          <li className="rounded-sm border border-line bg-panel p-4">
            <div className="flex items-center gap-2">
              <StatusBadge kind="shipped" />
              <span className="font-display text-sm font-semibold text-white">Solid today</span>
            </div>
            <p className="mt-3 text-sm text-mist">
              Iterative replanning (
              <code className="font-mono text-[12px] text-steel">--dynamic-iterative</code> +
              auto-controller), step/phase records with session context injection, and
              model-agnostic YAML catalogs across backends.
            </p>
          </li>
          <li className="rounded-sm border border-line bg-panel p-4">
            <div className="flex items-center gap-2">
              <StatusBadge kind="partial" />
              <span className="font-display text-sm font-semibold text-white">Still maturing</span>
            </div>
            <p className="mt-3 text-sm text-mist">
              Cross-task knowledge transfer is partial — sessions, KB retrieval, and learning
              stats are closer to caching and weighted hints than deep transfer. Outcome scoring
              exists but is fragmented across three mechanisms, not one unified QA gate.
            </p>
          </li>
        </ul>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PARTS.map((part) => (
            <li key={part.name} className="flex flex-col rounded-sm border border-line bg-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-semibold text-white">{part.name}</h3>
                <StatusBadge kind={part.status} />
              </div>
              <p className="mt-3 flex-1 text-sm text-mist">{part.tagline}</p>
              <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-dim">
                {part.under}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
