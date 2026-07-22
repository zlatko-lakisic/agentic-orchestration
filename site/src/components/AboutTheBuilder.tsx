import { GITHUB_USER, LINKEDIN } from '../content/links'

export function AboutTheBuilder() {
  return (
    <section id="about" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">07 · builder</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          About the builder.
        </h2>
        <p className="mt-5 max-w-2xl text-mist">
          Enterprise-architecture background applied to a real system: process first, catalogs as
          substrate, honesty about what is shipped versus partial. Same author as the sibling
          project My Futuristic Home — different identity on purpose.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-steel underline-offset-4 hover:underline"
          >
            LinkedIn
          </a>
          <a
            href={GITHUB_USER}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-steel underline-offset-4 hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
