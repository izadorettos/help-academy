'use client'

import { useRef } from 'react'
import { Avatar } from '@/components/ui/avatar'

interface AvatarUploadProps {
  src: string | null
  name: string
  action: (formData: FormData) => void | Promise<void>
}

export function AvatarUpload({ src, name, action }: AvatarUploadProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action} className="shrink-0">
      <label
        htmlFor="avatar-upload"
        className="relative cursor-pointer group focus-within:outline-none"
        title="Alterar foto"
      >
        <Avatar src={src} name={name} size={64} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
          Alterar
        </span>
        <input
          id="avatar-upload"
          type="file"
          name="avatar"
          accept="image/*"
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
          aria-label="Alterar foto de perfil"
        />
      </label>
    </form>
  )
}
