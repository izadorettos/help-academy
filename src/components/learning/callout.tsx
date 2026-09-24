import { Info, Lightbulb, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

type CalloutKind = 'note' | 'tip' | 'important' | 'warning'

const LABELS: Record<CalloutKind, string> = {
  note: 'Nota',
  tip: 'Dica',
  important: 'Importante',
  warning: 'Atenção',
}

const KIND_CLASSES: Record<CalloutKind, string> = {
  note: 'ha-callout ha-callout--note',
  tip: 'ha-callout ha-callout--tip',
  important: 'ha-callout ha-callout--important',
  warning: 'ha-callout ha-callout--warning',
}

interface CalloutProps {
  kind?: CalloutKind
  title?: string
  children: ReactNode
}

/**
 * Componente Callout reutilizável usado por atividades quando precisamos
 * exibir um bloco destacado no cliente (ex.: instruções de challenge).
 * O visual segue o mesmo tratamento aplicado pelo `renderMarkdown`.
 */
export function Callout({ kind = 'note', title, children }: CalloutProps) {
  const label = title ?? LABELS[kind]

  const Icon =
    kind === 'note'
      ? Info
      : kind === 'tip'
        ? Lightbulb
        : kind === 'important'
          ? AlertOctagon
          : AlertTriangle

  return (
    <div className={KIND_CLASSES[kind]} data-callout={kind}>
      <span
        className="ha-callout__title inline-flex items-center gap-1.5"
        data-callout-title={kind}
      >
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  )
}
