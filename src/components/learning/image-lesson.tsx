'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface ImageItem {
  url: string
  alt: string
  caption?: string
}

interface ImageLessonProps {
  images: ImageItem[]
}

export function ImageLesson({ images }: ImageLessonProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length))
  }, [images.length])

  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, prev, next])

  // Focus trap: focus modal when opened
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.getElementById('lightbox-close')?.focus()
    }
  }, [lightboxIndex])

  if (images.length === 0) {
    return (
      <p className="text-sm text-text-muted">Nenhuma imagem disponível.</p>
    )
  }

  return (
    <>
      {/* Gallery grid */}
      <div
        className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
      >
        {images.map((img, idx) => (
          <figure key={idx} className="group relative overflow-hidden rounded-lg">
            <button
              type="button"
              onClick={() => openLightbox(idx)}
              className="block w-full focus:outline-none focus:ring-2 focus:ring-focus"
              aria-label={`Ver imagem em tela cheia: ${img.alt || `Imagem ${idx + 1}`}`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt}
                  className="size-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                  <ZoomIn className="size-8 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
              </div>
            </button>
            {img.caption && (
              <figcaption className="mt-2 px-1 text-center text-xs text-text-muted">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de imagem"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox()
          }}
        >
          {/* Close */}
          <button
            id="lightbox-close"
            type="button"
            onClick={closeLightbox}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="size-5" />
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={prev}
              aria-label="Imagem anterior"
              className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image */}
          <div className="max-h-[90vh] max-w-[90vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex]!.url}
              alt={images[lightboxIndex]!.alt}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            {images[lightboxIndex]!.caption && (
              <p className="mt-2 text-center text-sm text-white/70">
                {images[lightboxIndex]!.caption}
              </p>
            )}
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={next}
              aria-label="Próxima imagem"
              className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {lightboxIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </>
  )
}
