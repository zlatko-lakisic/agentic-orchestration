export function BuildLogQuote() {
  return (
    <section id="build-log" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">06 · build log</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Block at the harness. Don&apos;t persuade the model.
        </h2>
        <blockquote className="mt-8 max-w-3xl border-l-2 border-steel pl-5">
          <p className="text-lg text-white sm:text-xl">
            A canary in a skill instruction proved the model had read the playbook — and it still
            confabulated a media capability that was not there. So capability gating moved to the
            harness and runner: deterministic evidence, reject contradictions, strip skill-echo
            artifacts before anything user-facing ships.
          </p>
          <footer className="mt-4 font-mono text-[11px] text-dim">
            Media grounding harness · rule drawn from a real defect, not a marketing parable
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
