export function LoopContrast() {
  return (
    <section id="the-loop" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">03 · the loop</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          With the loop vs without.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Four parts. Order matters: what just happened feeds the next decision.
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
      </div>
    </section>
  )
}
