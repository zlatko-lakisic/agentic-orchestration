export function WhoThisIsFor() {
  return (
    <section id="who" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">03 · who</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Who this is for.
        </h2>
        <div className="mt-8 max-w-2xl space-y-4 text-mist">
          <p>
            Teams that want a process-driven approach to multi-step work without lock-in to one
            AI vendor — bring fine-tuned, self-hosted, or proprietary models alongside commodity
            APIs; the same process stays in place either way.
          </p>
          <p>
            Especially regulated or audit-heavy environments — government, defense, financial
            services — where being free to choose your models, run on your own Kubernetes
            cluster, and keep an execution audit trail matter as much as raw capability.
          </p>
          <p className="text-sm text-dim">
            Not a claim of existing production case studies — an honest starting point for
            technical evaluation.
          </p>
        </div>
      </div>
    </section>
  )
}
