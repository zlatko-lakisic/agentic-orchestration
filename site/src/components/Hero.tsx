import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { DOCS, GITHUB } from '../content/links'
import { HERO_TRACE } from '../content/runTrace'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { GitHubIcon } from './GitHubIcon'
import { TracePanel } from './TracePanel'

const HERO_IMG = `${import.meta.env.BASE_URL}hero-network`

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
    <header className="relative overflow-x-hidden border-b border-line">
      {/* Full-bleed network artwork — decorative only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <picture>
          <source srcSet={`${HERO_IMG}.webp`} type="image/webp" />
          <img
            src={`${HERO_IMG}.jpg`}
            alt=""
            width={1024}
            height={521}
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover object-[70%_center] opacity-[0.38]"
          />
        </picture>
        {/* Soften into Control Plane graphite; keep left readable for copy */}
        <div className="absolute inset-0 bg-graphite/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-graphite via-graphite/70 to-graphite/25" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-graphite to-transparent" />
        {/* Obscure any residual Gemini mark in the extreme bottom-right */}
        <div className="absolute right-0 bottom-0 h-14 w-36 bg-gradient-to-tl from-graphite via-graphite/95 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end lg:gap-12">
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
            When one answer isn&apos;t enough.
          </motion.h1>
          <motion.p className="mt-5 max-w-lg text-base text-mist sm:text-lg" {...fade(0.28)}>
            You ask AI a question and get an answer — great for quick things. But some jobs are
            too big for one answer. They take real steps, and the first draft can&apos;t just be
            trusted. This works like a small team instead of a single assistant: it plans the
            work, does it, catches its own mistakes and redoes them, and has a separate reviewer
            check the result before it reaches you — using whatever AI you already trust.
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
          subtitle="representative · not a live execution"
          events={HERO_TRACE}
          animate
          className="min-h-[280px] bg-panel/90 backdrop-blur-sm"
          footer={
            <p className="font-mono text-[11px] text-dim">
              Representative example — ambient proof beside the explanation, not a captured
              session.
            </p>
          }
        />
      </div>
    </header>
  )
}
