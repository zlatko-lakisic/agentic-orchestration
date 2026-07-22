import { StatusBadge } from './StatusBadge'

export function TheIdea() {
  return (
    <section id="idea" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">01 · thesis</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Process loop, not a smarter single model.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Narrow AI is good at one task. Moving toward general task-processing means modeling
          how a capable person works through a problem: continuously reevaluate, keep a working
          record, carry what should transfer, and score the outcome before calling it done.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          <li className="rounded-sm border border-line bg-panel p-4">
            <div className="flex items-center gap-2">
              <StatusBadge kind="shipped" />
              <span className="font-display text-sm font-semibold text-white">Solid today</span>
            </div>
            <p className="mt-3 text-sm text-mist">
              Iterative replanning (`--dynamic-iterative` + auto-controller), step/phase records
              with session context injection, and model-agnostic YAML catalogs across backends.
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
      </div>
    </section>
  )
}
