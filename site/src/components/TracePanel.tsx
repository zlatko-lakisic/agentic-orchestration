import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { TraceEvent } from '../content/runTrace'

const KIND_COLOR: Record<string, string> = {
  goal: 'text-white',
  plan: 'text-mist',
  step: 'text-mist',
  replan: 'text-steel',
  assert: 'text-mist',
  score: 'text-pass',
  out: 'text-pass',
}

type TracePanelProps = {
  title: string
  subtitle?: string
  events: TraceEvent[]
  animate?: boolean
  className?: string
  footer?: ReactNode
}

export function TracePanel({
  title,
  subtitle,
  events,
  animate = false,
  className = '',
  footer,
}: TracePanelProps) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(reduced || !animate ? events.length : 0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced || !animate) {
      setVisible(events.length)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStarted(true)
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [animate, events.length, reduced])

  useEffect(() => {
    if (!started || reduced || !animate) return
    if (visible >= events.length) return
    const id = window.setTimeout(() => setVisible((v) => v + 1), 420)
    return () => window.clearTimeout(id)
  }, [started, visible, events.length, reduced, animate])

  const shown = events.slice(0, visible)

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-sm border border-line bg-panel shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-white)_4%,transparent)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-wider text-steel uppercase">{title}</p>
          {subtitle ? (
            <p className="truncate font-mono text-[10px] text-dim">{subtitle}</p>
          ) : null}
        </div>
        <span className="font-mono text-[10px] text-dim" aria-hidden="true">
          {shown.length}/{events.length}
        </span>
      </div>
      <ol className="divide-y divide-line/70 font-mono text-[12px] leading-relaxed sm:text-[13px]">
        {shown.map((ev, i) => (
          <li key={`${ev.t}-${i}`} className="grid grid-cols-[3.25rem_1fr] gap-3 px-3 py-2.5 sm:grid-cols-[3.75rem_1fr] sm:px-4">
            <span className="text-dim tabular-nums">{ev.t}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={`font-medium ${KIND_COLOR[ev.kind] ?? 'text-mist'}`}>{ev.label}</span>
                {ev.status === 'pass' ? (
                  <span className="rounded-sm border border-pass/40 bg-pass/10 px-1 py-px text-[10px] text-pass uppercase">
                    pass
                  </span>
                ) : null}
                {ev.status === 'warn' ? (
                  <span className="rounded-sm border border-steel/40 bg-steel/10 px-1 py-px text-[10px] text-steel uppercase">
                    gap
                  </span>
                ) : null}
              </div>
              {ev.detail ? <p className="mt-0.5 text-dim wrap-break-word">{ev.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      {footer ? <div className="border-t border-line px-3 py-2.5 sm:px-4">{footer}</div> : null}
    </div>
  )
}
