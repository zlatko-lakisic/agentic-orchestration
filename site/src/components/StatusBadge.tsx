type StatusKind = 'shipped' | 'partial' | 'planned'

const STYLES: Record<StatusKind, string> = {
  shipped: 'border-pass/50 text-pass bg-pass/10',
  partial: 'border-steel/50 text-steel bg-steel/10',
  planned: 'border-dim/50 text-dim bg-panel',
}

export function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ${STYLES[kind]}`}
    >
      {kind}
    </span>
  )
}
