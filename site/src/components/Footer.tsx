import { GITHUB } from '../content/links'
import { GitHubIcon } from './GitHubIcon'

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-mono text-[11px] text-dim">
          Agentic Orchestration · Apache-2.0 · control plane landing
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
