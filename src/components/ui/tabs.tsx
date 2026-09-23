'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

interface TabsContextValue {
  active: string
  setActive: (v: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  children,
  className = '',
}: {
  defaultValue: string
  children: ReactNode
  className?: string
}) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div role="tablist" className={`border-border flex border-b ${className}`}>
      {children}
    </div>
  )
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!
  const active = ctx.active === value
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setActive(value)}
      className={`min-h-10 border-b-2 px-4 text-sm font-medium transition-colors ${active ? 'border-brand text-brand -mb-px' : 'border-transparent text-text-muted hover:text-text'}`}
    >
      {children}
    </button>
  )
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!
  if (ctx.active !== value) return null
  return <div role="tabpanel">{children}</div>
}
