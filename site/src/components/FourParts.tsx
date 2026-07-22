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

export function FourParts() {
  return (
    <section id="four-parts" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">04 · cast</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Meet the four parts.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Catalogs, MCP, and pluggable backends are the substrate under the hood — they let the
          loop run on any LLM. They are not the headline.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
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
