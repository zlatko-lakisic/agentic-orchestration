import { GITHUB } from '../content/links'
import { GitHubIcon } from './GitHubIcon'

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2 font-mono text-[11px] text-dim">
          <img
            src={`${import.meta.env.BASE_URL}ao-mark.svg`}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 opacity-90"
          />
          <span className="text-steel">Agentic Orchestration</span>
          <span>· Apache-2.0 · control plane landing</span>
        </p>
        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-steel"
        >
          <GitHubIcon className="h-4 w-4" />
          zlatko-lakisic/agentic-orchestration
        </a>
      </div>
    </footer>
  )
}
