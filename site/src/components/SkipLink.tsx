type SkipLinkProps = {
  href?: string
}

export function SkipLink({ href = '#main-content' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-steel focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-graphite"
    >
      Skip to content
    </a>
  )
}
