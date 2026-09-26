'use client'

import { useState, useTransition } from 'react'
import { createAudience, updateAudience, deleteAudience } from '@/features/help/actions'
import type { TutorialAudience } from '@/features/help/queries'
import type { AudienceFormValues } from '@/features/help/schemas'

interface AudienceCrudClientProps {
  audiences: TutorialAudience[]
}

export function AudienceCrudClient({ audiences: initial }: AudienceCrudClientProps) {
  const [audiences, setAudiences] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    setError(null)
    const data: AudienceFormValues = {
      slug:        formData.get('slug') as string,
      name:        formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      sort_order:  Number(formData.get('sort_order') ?? 0),
    }
    startTransition(async () => {
      const result = await createAudience(data)
      if (!result.ok) { setError(result.error); return }
      setCreating(false)
      window.location.reload()
    })
  }

  function handleUpdate(id: string, formData: FormData) {
    setError(null)
    const data: AudienceFormValues = {
      slug:        formData.get('slug') as string,
      name:        formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      sort_order:  Number(formData.get('sort_order') ?? 0),
    }
    startTransition(async () => {
      const result = await updateAudience(id, data)
      if (!result.ok) { setError(result.error); return }
      setEditing(null)
      window.location.reload()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este público?')) return
    startTransition(async () => {
      const result = await deleteAudience(id)
      if (!result.ok) { setError(result.error); return }
      setAudiences((prev) => prev.filter((a) => a.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-semibold">Nome</th>
            <th className="pb-2 text-left font-semibold">Slug</th>
            <th className="pb-2 text-left font-semibold">Ordem</th>
            <th className="pb-2 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {audiences.map((aud) => (
            editing === aud.id ? (
              <tr key={aud.id}>
                <td colSpan={4} className="py-3">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleUpdate(aud.id, new FormData(e.currentTarget)) }}
                    className="flex flex-wrap gap-2"
                  >
                    <input name="name" defaultValue={aud.name} required placeholder="Nome"
                      className="rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                    <input name="slug" defaultValue={aud.slug} required placeholder="slug"
                      className="rounded-lg border border-border px-2 py-1 font-mono text-sm focus:border-brand focus:outline-none" />
                    <input name="sort_order" type="number" defaultValue={aud.sort_order}
                      className="w-16 rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                    <button type="submit" disabled={isPending}
                      className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-on-brand disabled:opacity-50">Salvar</button>
                    <button type="button" onClick={() => setEditing(null)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted">Cancelar</button>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={aud.id} className="hover:bg-surface-muted/50">
                <td className="py-2">{aud.name}</td>
                <td className="py-2 font-mono text-xs text-text-muted">{aud.slug}</td>
                <td className="py-2 text-xs">{aud.sort_order}</td>
                <td className="py-2 text-right flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(aud.id)}
                    className="text-xs font-medium text-brand hover:underline">Editar</button>
                  <button type="button" onClick={() => handleDelete(aud.id)}
                    className="text-xs font-medium text-danger hover:underline">Excluir</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {creating ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(new FormData(e.currentTarget)) }}
          className="flex flex-wrap gap-2 border-t border-border pt-4"
        >
          <input name="name" required placeholder="Nome"
            className="rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
          <input name="slug" required placeholder="slug"
            className="rounded-lg border border-border px-2 py-1 font-mono text-sm focus:border-brand focus:outline-none" />
          <input name="sort_order" type="number" defaultValue={audiences.length + 1}
            className="w-16 rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-on-brand disabled:opacity-50">Criar</button>
          <button type="button" onClick={() => setCreating(false)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted">Cancelar</button>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)}
          className="text-sm font-medium text-brand hover:underline underline-offset-2">
          + Novo público
        </button>
      )}
    </div>
  )
}
