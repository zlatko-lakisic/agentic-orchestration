import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { DOCS, GITHUB } from '../content/links'
import { HERO_TRACE } from '../content/runTrace'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { GitHubIcon } from './GitHubIcon'
import { TracePanel } from './TracePanel'

export function Hero() {
  const reduced = usePrefersReducedMotion()
  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
        }

  return (
    <header className="bg-grain relative overflow-x-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end lg:gap-12">
        <div>
          <motion.p
            className="font-display text-sm font-medium tracking-[0.2em] text-steel uppercase"
            {...fade(0.05)}
          >
            Agentic Orchestration
          </motion.p>
          <motion.h1
            className="font-display mt-4 max-w-xl text-4xl leading-[1.08] font-semibold text-balance text-white sm:text-5xl"
            {...fade(0.15)}
          >
            A loop that replans, remembers the work, and checks itself.
          </motion.h1>
          <motion.p className="mt-5 max-w-lg text-base text-mist sm:text-lg" {...fade(0.28)}>
            Not a smarter single model — a process for multi-step work: coordinator,
            working record, knowledge that should carry, and scored QA. Runs
            model-agnostically on CrewAI + LiteLLM.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" {...fade(0.4)}>
            <a
              href={`${DOCS}/quick-start/`}
              className="inline-flex items-center gap-2 rounded-sm bg-steel px-5 py-3 text-sm font-semibold text-graphite transition hover:bg-steel/90"
            >
              Quick Start
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm border border-line bg-panel/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-steel/40 hover:bg-panel-raised"
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub
            </a>
          </motion.div>
        </div>

        <TracePanel
          title="run · console"
          subtitle="task.in → replan → qa → task.out"
          events={HERO_TRACE}
          animate
          className="min-h-[280px]"
        />
      </div>
    </header>
  )
}
