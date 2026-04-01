import type { JSX, SVGProps } from 'react'

type IconName =
  | 'search'
  | 'grid'
  | 'list'
  | 'sun'
  | 'moon'
  | 'edit'
  | 'sparkles'
  | 'refresh'
  | 'close'
  | 'check'
  | 'warning'
  | 'arrow-left'
  | 'arrow-right'
  | 'price'
  | 'chevron-down'
  | 'send'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

const iconMap: Record<IconName, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M6 7h14" />
      <path d="M6 12h14" />
      <path d="M6 17h14" />
      <circle cx="3.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5" />
      <path d="M12 19v2.5" />
      <path d="M4.9 4.9l1.8 1.8" />
      <path d="M17.3 17.3l1.8 1.8" />
      <path d="M2.5 12H5" />
      <path d="M19 12h2.5" />
      <path d="M4.9 19.1l1.8-1.8" />
      <path d="M17.3 6.7l1.8-1.8" />
    </>
  ),
  moon: <path d="M18 14.5A6.5 6.5 0 119.5 6 5 5 0 0018 14.5z" />,
  edit: (
    <>
      <path d="M4 20l4.5-1 9-9a2 2 0 10-2.8-2.8l-9 9L4 20z" />
      <path d="M13 6l5 5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3L12 3z" />
      <path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 00-14-4" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0014 4" />
      <path d="M20 20v-5h-5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  warning: (
    <>
      <path d="M12 4l9 16H3L12 4z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'arrow-left': <path d="M14.5 5L7.5 12l7 7" />,
  'arrow-right': <path d="M9.5 5l7 7-7 7" />,
  'chevron-down': <path d="M6.5 9.5L12 15l5.5-5.5" />,
  price: (
    <>
      <path d="M12 2l2.8 5.6L21 10l-4.5 4.3 1 6.2-5.5-2.8-5.5 2.8 1-6.2L3 10l6.2-2.4L12 2z" />
    </>
  ),
  send: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4 18-7z" />
    </>
  ),
}

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {iconMap[name]}
    </svg>
  )
}
