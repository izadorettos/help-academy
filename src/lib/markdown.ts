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
    // Callouts pós-processados (data-callout + class) precisam manter os atributos.
    div: ['class', 'data-callout'],
    span: ['class', 'data-callout-title'],
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

// ─── Callouts ────────────────────────────────────────────────────────────────
// Convert GFM-style callouts inside blockquotes:
//   > [!NOTE] Título opcional
//   > corpo do callout
// Into styled divs handled by CSS. Runs on the raw HTML produced by marked
// (before sanitization). The final tags remain within the sanitize allowlist.

type CalloutKind = 'note' | 'tip' | 'important' | 'warning'

const CALLOUT_LABELS: Record<CalloutKind, string> = {
  note: 'Nota',
  tip: 'Dica',
  important: 'Importante',
  warning: 'Atenção',
}

const CALLOUT_CLASSES: Record<CalloutKind, string> = {
  note: 'ha-callout ha-callout--note',
  tip: 'ha-callout ha-callout--tip',
  important: 'ha-callout ha-callout--important',
  warning: 'ha-callout ha-callout--warning',
}

/**
 * Substitui `<blockquote>` cujo primeiro parágrafo começa com `[!NOTE|TIP|IMPORTANT|WARNING]`
 * por uma `<div>` semanticamente marcada. O componente cliente/CSS aplica os estilos.
 */
function transformCallouts(html: string): string {
  const blockquoteRe = /<blockquote>([\s\S]*?)<\/blockquote>/g
  return html.replace(blockquoteRe, (full, inner: string) => {
    const marker = inner.match(
      /^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*([^<]*)<\/p>\s*/i,
    )
    if (!marker) return full

    const kind = marker[1]!.toLowerCase() as CalloutKind
    const inlineTitle = marker[2]?.trim() ?? ''
    const body = inner.slice(marker[0].length)
    const title = inlineTitle.length > 0 ? inlineTitle : CALLOUT_LABELS[kind]

    return (
      `<div class="${CALLOUT_CLASSES[kind]}" data-callout="${kind}">` +
      `<span class="ha-callout__title" data-callout-title="${kind}">${title}</span>` +
      body +
      `</div>`
    )
  })
}

/**
 * Converte uma string Markdown em HTML sanitizado, seguro para uso em
 * `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string
  const withCallouts = transformCallouts(rawHtml)
  return sanitizeHtml(withCallouts, SANITIZE_OPTIONS)
}
