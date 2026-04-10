import { useState, type HTMLAttributes, type ReactNode } from 'react'

type PageScaffoldProps = {
  title: ReactNode
  left?: ReactNode
  right?: ReactNode
  top?: ReactNode
  headerBottom?: ReactNode | ((isScrolled: boolean) => ReactNode)
  controls?: ReactNode | ((isScrolled: boolean) => ReactNode)
  children: ReactNode
  scrollMode?: 'page' | 'body'
  className?: string
  headerClassName?: string
  contentClassName?: string
  persistentHeaderBorder?: boolean
  contentProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'onScroll'>
}

export default function PageScaffold({
  title,
  left,
  right,
  top,
  headerBottom,
  controls,
  children,
  scrollMode = 'page',
  className = '',
  headerClassName = '',
  contentClassName,
  persistentHeaderBorder = false,
  contentProps,
}: PageScaffoldProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const headerBottomNode = typeof headerBottom === 'function' ? headerBottom(isScrolled) : headerBottom
  const controlsNode = typeof controls === 'function' ? controls(isScrolled) : controls
  const headerClasses = [
    'page-header',
    persistentHeaderBorder ? 'page-header-persistent' : '',
    isScrolled ? 'page-header-scrolled' : '',
    headerClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const pageClasses = ['page', scrollMode === 'body' ? 'page-fixed-header-shell' : '', 'animate-in', className]
    .filter(Boolean)
    .join(' ')

  const content = contentClassName ? <div className={contentClassName}>{children}</div> : <>{children}</>
  const scrollContent =
    scrollMode === 'body' ? (
      <div
        className="page-scroll-body"
        onScroll={(event) => {
          setIsScrolled(event.currentTarget.scrollTop > 0)
        }}
        {...contentProps}
      >
        {content}
      </div>
    ) : (
      content
    )

  return (
    <div
      className={pageClasses}
      {...(scrollMode === 'page' ? contentProps : undefined)}
      onScroll={
        scrollMode === 'page'
          ? (event) => {
              setIsScrolled(event.currentTarget.scrollTop > 0)
            }
          : undefined
      }
    >
      {top}
      <header className={headerClasses}>
        <div className="page-header-main">
          {left ?? <div style={{ width: 24 }} />}
          {title}
          {right ?? <div style={{ width: 24 }} />}
        </div>
        {headerBottomNode && <div className="page-header-bottom">{headerBottomNode}</div>}
      </header>
      {controlsNode}
      {scrollContent}
    </div>
  )
}
