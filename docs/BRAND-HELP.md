# Marca HELP aplicada ao Help Academy

Fonte: **Branding Book v2.0 — Help Entregas (01/09/2026)**. Este documento traduz o manual para tokens e regras de interface.
Ele **substitui os valores provisórios** do `DESIGN-SYSTEM.md` §2 (cores, tipografia, raio, movimento). O resto do design system (componentes, estados, acessibilidade) continua valendo.

> **Escopo desta etapa:** aplicar a identidade via **tokens centralizados** (`src/app/globals.css`), fontes e ajustes pontuais em componentes-base (`components/ui`). **Não** é o rebranding completo: telas não são redesenhadas, arquitetura não muda. Quando o Design System oficial da HELP chegar, a troca acontece aqui e em `globals.css`.

---

## 1. Família de superfície

O manual define duas famílias e proíbe misturar:

| Família | Fundo | Uso |
|---|---|---|
| Papel | `#FAF7F2` | site, deck, impresso |
| **Tela** | **`#F4F8FD`** | **app, painel, e-mail** ← Help Academy |

O Help Academy é **família Tela**: fundo de página `#F4F8FD`, cards brancos `#FFFFFF` com borda fina. Não existe terceiro fundo claro.
Painéis escuros (destaques, número em evidência, cabeçalho de trilha) usam **azul escura `#0A1730`** ou **tinta `#121417`**.

---

## 2. Tokens de cor (valores finais para `globals.css`)

### Marca
| Token | Valor | Uso | Regra |
|---|---|---|---|
| `--color-brand` | `#2BBDEF` | Preenchimento de ação primária, barra de progresso, ícone, traço, identidade | **Nunca** cor de texto sobre fundo claro (2,04:1 — reprova) |
| `--color-brand-hover` | `#0E9BCB` | Hover/pressed, borda de foco em campo | |
| `--color-brand-soft` | `#E6F6FC` | Fundo de bloco, chip, item ativo da navegação | |
| `--color-brand-text` | `#1C7999` | **Único ciano permitido como texto sobre claro** (links, item ativo, palavra serifada em headline) | 4,95:1 no branco, 4,64:1 na Tela |
| `--color-on-brand` | `#121417` | Texto sobre botão ciano | 8,46:1. **Não** usar branco sobre ciano |

### Acento (coral) — no máximo 5% da tela
| Token | Valor | Uso |
|---|---|---|
| `--color-accent` | `#FF6B4A` | Gamificação: ícone de XP, destaque de conquista, chama de sequência |
| `--color-accent-strong` | `#E04A28` | Hover/traço do acento |
| `--color-accent-soft` | `#FFEAE3` | Fundo de chip de XP/conquista |

Coral **não** vira cor de texto sobre claro (mesma regra do ciano). XP é escrito em tinta; o coral fica no ícone e no fundo.

### Tinta e superfície
| Token | Valor | Uso |
|---|---|---|
| `--color-text` | `#121417` | Texto principal |
| `--color-text-strong-muted` | `#2A2D33` | Subtítulos, texto de apoio forte |
| `--color-text-muted` | `#55585F` | Texto secundário, rótulos mono (7,1:1) |
| `--color-text-subtle` | `#8C8F96` | **Somente** placeholder, desabilitado e decoração (3,2:1 — não serve para texto informativo) |
| `--color-bg` | `#F4F8FD` | Fundo da página (família Tela) |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-surface-muted` | `#F4F8FD` | Hover de linha dentro de card |
| `--color-border` | `#E6E3DC` | Linha/borda de card, divisória |
| `--color-ink` | `#121417` | Painel escuro neutro |
| `--color-navy` | `#0A1730` | Painel escuro de destaque (azul escura) |
| `--color-on-dark` | `#FAF7F2` | Texto sobre painel escuro (papel) |
| `--color-on-dark-muted` | `#A4A7AE` | Texto secundário sobre escuro (7,4:1) |

### Status — jornada (regra do manual: sobre escuro é cor de texto; sobre claro é **chip tonal com texto escuro**)
| Estado no Academy | Equivalente no manual | Texto sobre escuro | Chip claro (fundo / texto) |
|---|---|---|---|
| Em andamento, disponível | Coleta / em rota | `#29B6F6` | `#E6F6FC` / `#17698A`* |
| Pendente, em análise, bloqueada | Espera / parada | `#FFD54F` | `#FFF6DA` / `#7A5B00` |
| Concluído, aprovado, acerto | Destino / concluído | `#34D399` | `#E3F7EF` / `#0F6E4C` |
| Reprovado, erro | Recusado / perdido | `#F04030` | `#FFEAE3` / `#8A2B12` |

\* `#1C7999` sobre `#E6F6FC` dá 4,47:1 (abaixo de AA). Dentro do chip usamos `#17698A` (5,54:1). É o único ajuste feito em relação ao manual, e é por acessibilidade.

Tokens: `--color-status-{info|warning|success|danger}-{fg-dark|chip-bg|chip-fg}`.
Os tokens antigos `success/warning/danger/xp` passam a apontar para estes valores. **O ciano da marca marca ação e identidade, nunca um estado.**

### Foco
`--color-focus: #1C7999` — anel 2px com offset 2px (o ciano `#2BBDEF` não atinge 3:1 sobre a Tela).

---

## 3. Tipografia — “três vozes”

| Voz | Família | Pesos | Onde |
|---|---|---|---|
| Fato | **Inter Tight** | 400 · 500 · 600 · 700 · 900 | Todo o texto de interface. Headline 900, subtítulo 600–700, corpo 400 |
| Emoção | **Instrument Serif** (regular + itálico) | 400 | **Uma palavra por headline**, a emocional/benefício, em itálico e `--color-brand-text`. Nunca em texto corrido, botão, rótulo, dado ou abaixo de 24px |
| Dado | **JetBrains Mono** | 400 · 500 | Rótulo, eyebrow, métrica, timestamp. Caixa alta, `letter-spacing: 0.08em`, 11–13px |

Carregar com `next/font/google` (as três são OFL) e expor como `--font-sans`, `--font-serif`, `--font-mono`.

| Token | Tamanho | Peso | Uso no Academy |
|---|---|---|---|
| `text-display` | 40–56px (mobile 32–40) | 900, tracking −0,03em | Título do dashboard, título da trilha |
| `text-h1` | 28–36px | 900 | Título de página |
| `text-h2` | 22–28px | 700 | Seção, título de card grande |
| `text-h3` | 18–20px | 700 | Título de card |
| `text-body` | 16–18px, altura 1,6 | 400 | Corpo, conteúdo de aula (medida ≤ 68ch) |
| `text-label` | 11–13px mono, caixa alta, +0,08em | 500 | Eyebrow (“MÓDULO 2 · OPERAÇÃO”), rótulo de métrica, timestamp |

**Fórmula de headline** (usar com moderação — título de dashboard, conclusão de trilha, tela de login): frase declarativa em Inter Tight 900 com **uma** palavra trocada por Instrument Serif itálico em `#1C7999`. Ex.: “Seu onboarding, *passo* a passo.” / “Trilha concluída com *gosto*.”

**Número em destaque:** valor em Inter Tight 900, rótulo mono caixa alta abaixo, recorte temporal junto (“340 XP · NESTA TRILHA”). Nenhum número sem régua e janela.

**Formato brasileiro sempre:** `1.549,70`, `45,8 km`, `15:00`, datas `24/09/2026`.

---

## 4. Forma e movimento

- **Raio:** `--radius-sm 10px`, `--radius-md 16px`, `--radius-lg 24px`, `--radius-xl 32px`, `--radius-pill 999px`. Card grande 24–32; **botão e chip sempre pill**.
- **Sombra:** praticamente nenhuma. Card = fundo branco + borda `#E6E3DC`. Sombra suave só em elemento flutuante (dialog, toast, menu).
- **Grid:** container máx. 1240px, gutter 24px. Um bloco = uma ideia.
- **Ícones:** lineares, traço uniforme (lucide), mesmo peso do texto. Nunca misturar preenchido com linear na mesma tela. **Sem emoji na interface** (substituir ✓ 🔒 → por ícones).
- **Movimento:** hover de botão 160ms ease-out; entrada de card 240ms fade + 8px; mudança de status/chip 200ms. Sem parallax, sem partícula, **sem confete**. Tudo desligado em `prefers-reduced-motion`.

---

## 5. Componentes-base (ajustes mínimos)

| Componente | Ajuste |
|---|---|
| `Button` primary | Pill, fundo `brand`, texto `on-brand` (tinta), hover `brand-hover` |
| `Button` secondary | Pill, sem preenchimento, borda `border`, texto `text` |
| Pares de ação | Primária **à direita**, preenchida; secundária à esquerda, sem preenchimento. **Nunca dois botões preenchidos lado a lado** |
| `Badge`/status | Chip tonal pill (tabela §2). Nunca letra colorida sobre claro |
| `ProgressBar` | Trilho `#E6E3DC`, preenchimento `brand` |
| `Card` | Branco, borda `border`, raio `lg` |
| Link / item ativo | Texto `brand-text`; item ativo da sidebar com fundo `brand-soft` |
| Eyebrow | Componente `Eyebrow` (mono, caixa alta, `text-muted`) |
| Painel de destaque | `Card` variante `dark` (`navy`, texto `on-dark`) — usar para XP/nível e conclusão |

---

## 6. Logo

Arquivos em `public/brand/` (extraídos do manual, PNG com transparência):

| Arquivo | Versão | Quando |
|---|---|---|
| `logo-help-positivo.png` | Ciano | Sobre fundo claro (sidebar, login, header) |
| `logo-help-negativo.png` | Papel | Sobre `navy`/`ink` (painéis escuros) |
| `logo-help-tinta.png` | Tinta | Uma cor (impressão/relatório PDF) |

Regras: área de proteção = metade da altura do logo; **mínimo 32px de altura**; nunca distorcer, rotacionar, recolorir, sombrear ou usar o positivo sobre escuro. **Favicon:** o manual ainda não tem o símbolo isolado (pendência aberta); até lá, manter favicon neutro e não recortar o logo.

---

## 7. Voz e vocabulário na interface

Eixo: **direta · calorosa sem ser íntima · específica · adulta.** Frase curta, ponto final. Sem exclamação e sem emoji nos textos de interface.

**Vocabulário travado (nunca na interface, nem em alt text, nem em conteúdo seed):**
`colaborador`, `funcionário`, `entregador dedicado`, `exclusividade de entregador`, `frota própria`, `nossos motoboys`, `equipe fixa`, `escala`, `fidelidade`, `dedicação`.
Adjetivos proibidos sem prova ao lado: `líder`, `referência nacional`, `revolucionário`, `inovador`, `disruptivo`, `exclusivo`, `melhor do mercado`, `excelência`.

**Substitutos:** “pessoa”, “você”, “time”, “parceiro”, “entregador parceiro”, “rede de autônomos”, “entregadores cadastrados”, “suporte humano 24/7”, “QR de entrega com foto e geotag”, “prazo Help”.

> Isso afeta textos já existentes (ex.: PRD usa “colaboradores”). Revisar **strings de interface e conteúdo seed**; documentação interna pode manter o termo técnico até a revisão jurídica.

Teste automatizado: `tests/unit/vocabulary.test.ts` varre `src/**/*.tsx`, `supabase/seed.sql` e `supabase/demo/**/*.sql` e falha se encontrar palavra travada.

---

## 8. Pendências de marca (não bloqueiam a demonstração)

- Design System oficial da HELP (componentes) — substituirá §5.
- Logo vetorial (SVG) e símbolo isolado para favicon.
- Banco de fotos próprio (o Academy não usa foto de banco de imagem; capas usam cor sólida + ícone).
