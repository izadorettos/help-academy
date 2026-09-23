/**
 * Renderiza Markdown para HTML seguro.
 *
 * Pipeline:
 *   1. marked  — converte Markdown → HTML
 *   2. sanitize-html — remove tags e atributos não permitidos (XSS)
 *
 * Usado exclusivamente no servidor (Server Components).
 * Não importar em código cliente.
 */

import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// Configuração da allowlist para o HTML gerado pelo Markdown
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'em', 'del', 's', 'code', 'pre', 'blockquote',
    'a',
    'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
    th: ['align'],
    td: ['align'],
  },
  // Links devem ser https ou mailto — sem javascript:
  allowedSchemes: ['https', 'mailto'],
  // Força links externos a abrir em nova aba com rel seguro
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
}

/**
 * Converte uma string Markdown em HTML sanitizado, seguro para uso em
 * `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS)
}
