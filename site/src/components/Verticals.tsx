const VERTICALS = [
  {
    name: 'Healthcare',
    outcome: 'Medtech evidence research and commercial brief generation.',
    command:
      'python main.py --example healthcare --dynamic "Draft a commercial brief for a novel oncology biomarker"',
  },
  {
    name: 'Logistics',
    outcome: 'Warehouse utilization, bottleneck flagging, and labor planning.',
    command:
      'python main.py --example logistics --dynamic "Analyze current warehouse utilization and flag bottlenecks"',
  },
]

export function Verticals() {
  return (
    <section id="verticals" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">04 · domains</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Two domains that ship today.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Real overlays with a one-command entry point. Outcome first; the command is the proof.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {VERTICALS.map((v) => (
            <li key={v.name} className="rounded-sm border border-line bg-panel p-5">
              <h3 className="font-display text-xl font-semibold text-white">{v.name}</h3>
              <p className="mt-2 text-sm text-mist">{v.outcome}</p>
              <pre className="mt-4 overflow-x-auto rounded-sm border border-line bg-graphite p-3 font-mono text-[11px] leading-relaxed text-steel wrap-break-word whitespace-pre-wrap">
                {v.command}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
