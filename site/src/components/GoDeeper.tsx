import { ArrowUpRight } from 'lucide-react'
import { DOCS, GITHUB, SIBLING } from '../content/links'

const LINKS = [
  { label: 'Quick Start', href: `${DOCS}/quick-start/`, note: 'Install and first run' },
  { label: 'Architecture', href: `${DOCS}/architecture/`, note: 'How components fit' },
  { label: 'Agent Catalog', href: `${DOCS}/agent-catalog/`, note: 'YAML provider templates' },
  { label: 'Agent Harness', href: `${DOCS}/Agent-harness-roadmap/`, note: 'Verification tiers' },
  { label: 'Docs home', href: `${DOCS}/`, note: 'Full documentation index' },
  { label: 'GitHub repository', href: GITHUB, note: 'Source and issues', external: true },
  {
    label: 'My Futuristic Home',
    href: SIBLING,
    note: 'Sibling project by the same author',
    external: true,
  },
]

export function GoDeeper() {
  return (
    <section id="go-deeper" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="font-mono text-[11px] tracking-wider text-steel uppercase">09 · go deeper</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Documentation and related work.
        </h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="group flex h-full flex-col rounded-sm border border-line bg-panel p-4 transition hover:border-steel/40 hover:bg-panel-raised"
              >
                <span className="flex items-center justify-between gap-2 font-display text-base font-semibold text-white">
                  {link.label}
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-dim transition group-hover:text-steel"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 text-sm text-dim">{link.note}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-[11px] text-dim">
          TODO: public GitLab mirror URL — self-hosted mirror exists on private LAN only.
        </p>
      </div>
    </section>
  )
}
