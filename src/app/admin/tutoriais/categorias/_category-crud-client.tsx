'use client'

import { useState, useTransition } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/features/help/actions'
import type { TutorialCategory } from '@/features/help/queries'
import type { CategoryFormValues } from '@/features/help/schemas'

interface CategoryCrudClientProps {
  categories: TutorialCategory[]
}

export function CategoryCrudClient({ categories: initial }: CategoryCrudClientProps) {
  const [categories, setCategories] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    setError(null)
    const data: CategoryFormValues = {
      slug:       formData.get('slug') as string,
      name:       formData.get('name') as string,
      icon:       formData.get('icon') as string || 'BookOpen',
      sort_order: Number(formData.get('sort_order') ?? 0),
    }
    startTransition(async () => {
      const result = await createCategory(data)
      if (!result.ok) { setError(result.error); return }
      setCreating(false)
      // Reload page state
      window.location.reload()
    })
  }

  function handleUpdate(id: string, formData: FormData) {
    setError(null)
    const data: CategoryFormValues = {
      slug:       formData.get('slug') as string,
      name:       formData.get('name') as string,
      icon:       formData.get('icon') as string || 'BookOpen',
      sort_order: Number(formData.get('sort_order') ?? 0),
    }
    startTransition(async () => {
      const result = await updateCategory(id, data)
      if (!result.ok) { setError(result.error); return }
      setEditing(null)
      window.location.reload()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (!result.ok) { setError(result.error); return }
      setCategories((prev) => prev.filter((c) => c.id !== id))
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
            <th className="pb-2 text-left font-semibold">Ícone</th>
            <th className="pb-2 text-left font-semibold">Ordem</th>
            <th className="pb-2 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {categories.map((cat) => (
            editing === cat.id ? (
              <tr key={cat.id}>
                <td colSpan={5} className="py-3">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleUpdate(cat.id, new FormData(e.currentTarget)) }}
                    className="flex flex-wrap gap-2"
                  >
                    <input name="name" defaultValue={cat.name} required placeholder="Nome"
                      className="rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                    <input name="slug" defaultValue={cat.slug} required placeholder="slug"
                      className="rounded-lg border border-border px-2 py-1 font-mono text-sm focus:border-brand focus:outline-none" />
                    <input name="icon" defaultValue={cat.icon} placeholder="Ícone"
                      className="rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                    <input name="sort_order" type="number" defaultValue={cat.sort_order}
                      className="w-16 rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                    <button type="submit" disabled={isPending}
                      className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-50">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setEditing(null)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted hover:text-text">
                      Cancelar
                    </button>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={cat.id} className="hover:bg-surface-muted/50">
                <td className="py-2">{cat.name}</td>
                <td className="py-2 font-mono text-xs text-text-muted">{cat.slug}</td>
                <td className="py-2 text-xs text-text-muted">{cat.icon}</td>
                <td className="py-2 text-xs">{cat.sort_order}</td>
                <td className="py-2 text-right flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(cat.id)}
                    className="text-xs font-medium text-brand hover:underline">Editar</button>
                  <button type="button" onClick={() => handleDelete(cat.id)}
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
          <input name="icon" placeholder="Ícone (ex: BookOpen)"
            className="rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
          <input name="sort_order" type="number" defaultValue={categories.length + 1} placeholder="Ordem"
            className="w-16 rounded-lg border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none" />
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-50">
            Criar
          </button>
          <button type="button" onClick={() => setCreating(false)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted hover:text-text">
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm font-medium text-brand hover:underline underline-offset-2"
        >
          + Nova categoria
        </button>
      )}
    </div>
  )
}
