const PARTS = [
  {
    name: 'It plans',
    tagline:
      'Breaks a big job into real steps and revises the plan when a step falls short — not plan-once, hope-it-works.',
  },
  {
    name: 'It does and redoes',
    tagline:
      'Carries out the steps and keeps a working record of what just happened so the next decision is grounded in it.',
  },
  {
    name: 'It checks',
    tagline:
      'A separate check scores the result before it is handed back — not the same voice that wrote the draft.',
  },
  {
    name: 'It remembers',
    tagline:
      'Carries lessons between jobs so later runs can lean on what was useful before — modest transfer, not deep learning across every task.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">05 · how it works</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Under the hood it works like a small team.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Tools like ChatGPT are great at answering a question or writing a draft — one task, one
          response. Bigger jobs take more than one response: real steps, a first draft that
          can&apos;t be trusted, and a check before you rely on it.
        </p>
        <p className="mt-4 max-w-2xl text-mist">
          Under the hood it works like a small team with a coordinator: it plans the steps, does
          the work and redoes it when a step falls short, and a separate check scores the result
          before it&apos;s handed back — running on whatever AI you connect. Catalogs and
          connectors sit underneath so that process can use the AI you already trust; they are
          not the headline.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-line bg-panel p-5">
            <p className="font-mono text-[11px] tracking-wider text-dim uppercase">Without</p>
            <p className="font-display mt-2 text-lg font-semibold text-white">
              Plan once. Execute. Hope.
            </p>
            <p className="mt-3 text-sm text-mist">
              A fixed plan runs to completion. Mistakes surface late. Nobody checks the deliverable
              before it reaches you.
            </p>
          </div>
          <div className="rounded-sm border border-steel/35 bg-panel-raised p-5">
            <p className="font-mono text-[11px] tracking-wider text-steel uppercase">With</p>
            <p className="font-display mt-2 text-lg font-semibold text-white">
              Replan when a step falls short. Carry the record. Check before done.
            </p>
            <ol className="mt-4 space-y-2 text-sm text-mist">
              <li>
                <span className="font-mono text-steel">01</span> Plans the work
              </li>
              <li>
                <span className="font-mono text-steel">02</span> Does it — and redoes it when needed
              </li>
              <li>
                <span className="font-mono text-steel">03</span> A separate check scores the result
              </li>
              <li>
                <span className="font-mono text-steel">04</span> Carries lessons between jobs
              </li>
            </ol>
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PARTS.map((part) => (
            <li key={part.name} className="flex flex-col rounded-sm border border-line bg-panel p-5">
              <h3 className="font-display text-xl font-semibold text-white">{part.name}</h3>
              <p className="mt-3 flex-1 text-sm text-mist">{part.tagline}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
