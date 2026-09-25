import { FileText, Download, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface PresentationLessonProps {
  signedUrl: string | null
  filePath: string | null
  title: string
}

function isPdf(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.pdf')
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

export function PresentationLesson({ signedUrl, filePath, title }: PresentationLessonProps) {
  if (!signedUrl || !filePath) {
    return (
      <Card className="p-4 text-sm text-text-muted">
        Apresentação não disponível. Tente novamente mais tarde.
      </Card>
    )
  }

  const fileName = getFileName(filePath)
  const isPdfFile = isPdf(filePath)

  if (isPdfFile) {
    // Render PDF inline
    return (
      <div className="space-y-3">
        <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ height: '70vh', minHeight: 400 }}>
          <object
            data={signedUrl}
            type="application/pdf"
            className="size-full"
            aria-label={`Apresentação: ${title}`}
          >
            {/* Fallback for browsers that can't embed PDF */}
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <FileText className="size-12 text-text-muted" aria-hidden />
              <p className="text-sm text-text-muted">
                Seu navegador não suporta visualização de PDF inline.
              </p>
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand text-on-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <Download className="size-4" aria-hidden />
                Abrir PDF
              </a>
            </div>
          </object>
        </div>
        <p className="text-xs text-text-muted text-right">
          {fileName} · link válido por 1 hora
        </p>
      </div>
    )
  }

  // PPTX: show download card
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="bg-orange-50 flex size-12 shrink-0 items-center justify-center rounded-lg">
          <FileText className="size-6 text-orange-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <div className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
            <p className="text-xs text-text-muted">
              Para visualizar esta apresentação aqui, peça ao administrador que envie a versão em PDF.
              Arquivos .pptx não podem ser exibidos diretamente no navegador.
            </p>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <Download className="size-4" aria-hidden />
            Baixar apresentação
          </a>
        </div>
      </div>
    </Card>
  )
}
