import { Download, AlertTriangle } from 'lucide-react'

interface AppDownloadCardProps {
  title: string
  version: string | null
  fileSizeBytes: number | null
  sha256: string | null
  downloadUrl: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AppDownloadCard({ title, version, fileSizeBytes, sha256, downloadUrl }: AppDownloadCardProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="space-y-1">
        <h2 className="text-h3 font-semibold">{title}</h2>
        {version && (
          <p className="font-mono text-sm text-text-muted">Versão {version}</p>
        )}
        <p className="text-sm text-text-muted">Requer Android 7.0 ou superior</p>
        {fileSizeBytes && (
          <p className="font-mono text-xs text-text-subtle">{formatBytes(fileSizeBytes)}</p>
        )}
      </div>

      {sha256 && (
        <div className="rounded-lg bg-surface-muted p-3 space-y-1">
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wide text-text-subtle">SHA-256</p>
          <p className="font-mono text-[0.6875rem] break-all text-text-muted">{sha256}</p>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning-text">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Instale apenas se a Help orientar. A instalação por APK requer habilitar &ldquo;Fontes desconhecidas&rdquo; no Android.</p>
      </div>

      <a
        href={downloadUrl}
        download
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Download className="size-4" aria-hidden />
        Baixar APK
      </a>
    </div>
  )
}
