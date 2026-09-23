# Design System — Help Academy

Visual profissional, moderno, limpo e amigável, com cara de produto SaaS — não de template de curso.
**Mobile first.** Tokens definidos em `src/app/globals.css` (`@theme` do Tailwind v4).

> ⚠️ **Cores e fonte da marca são provisórias.** Precisamos dos arquivos oficiais da Help Entregas (logo em SVG, cores em HEX, fonte) — decisão **D-01**. A estrutura de tokens abaixo não muda; só os valores.

---

## 1. Princípios

1. **Clareza antes de decoração.** Cada tela tem uma ação principal óbvia.
2. **Progresso sempre visível.** O usuário sabe onde está, quanto falta e o que ganha.
3. **Recompensa discreta, mas presente.** XP e conquistas celebram sem atrapalhar (sem confete em tela cheia a cada aula).
4. **Polegar primeiro.** Ações principais ao alcance no celular; alvos ≥ 44 × 44 px.
5. **Nunca tela vazia ou quebrada.** Todo dado tem estado de loading, vazio e erro.

---

## 2. Tokens

### 2.1 Cores

Semânticas (use estas nos componentes; nunca a paleta crua):

| Token | Uso | Claro (provisório) |
|---|---|---|
| `--color-brand` | Ação primária, links, progresso | `#E4002B` (vermelho Help — **confirmar**) |
| `--color-brand-hover` | Hover/pressed primário | `#B80023` |
| `--color-brand-soft` | Fundo de destaque, chip ativo | `#FDECEF` |
| `--color-on-brand` | Texto sobre brand | `#FFFFFF` |
| `--color-bg` | Fundo da página | `#F7F7F8` |
| `--color-surface` | Cards, sidebar | `#FFFFFF` |
| `--color-surface-muted` | Linhas alternadas, áreas secundárias | `#F1F1F3` |
| `--color-border` | Bordas de card/input | `#E4E4E7` |
| `--color-text` | Texto principal | `#18181B` |
| `--color-text-muted` | Texto secundário | `#52525B` |
| `--color-text-subtle` | Placeholder, metadados | `#71717A` |
| `--color-success` / `-soft` | Concluído, aprovado | `#15803D` / `#DCFCE7` |
| `--color-warning` / `-soft` | Pendente, atenção | `#B45309` / `#FEF3C7` |
| `--color-danger` / `-soft` | Erro, reprovado, ação destrutiva | `#B91C1C` / `#FEE2E2` |
| `--color-xp` / `-soft` | XP, nível, conquistas | `#7C3AED` / `#EDE9FE` |
| `--color-focus` | Anel de foco | `#2563EB` |

Regras:
- Contraste mínimo 4.5:1 para texto normal e 3:1 para texto grande/ícones. Validar os valores finais da marca antes de aplicar.
- Vermelho da marca ≠ vermelho de erro: erro sempre acompanha ícone + texto, nunca só cor.
- Estado nunca comunicado só por cor (✓, 🔒 e rótulos textuais acompanham).
- Modo escuro: **fora do MVP**; os tokens semânticos já permitem adicioná-lo.

### 2.2 Tipografia

- Fonte: **pilha do sistema** (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`) até a decisão D-01; a fonte da marca entrará via `next/font/local` (arquivos no repositório, sem depender do Google Fonts no build).
- Base 16 px (nunca menor que 14 px para texto corrido; inputs ≥ 16 px para evitar zoom no iOS).

| Token | Tamanho / altura | Peso | Uso |
|---|---|---|---|
| `text-display` | 30/36 (mobile 26/32) | 700 | Título de dashboard, nome da trilha |
| `text-h1` | 24/32 | 700 | Título de página |
| `text-h2` | 20/28 | 600 | Seção |
| `text-h3` | 17/24 | 600 | Título de card |
| `text-body` | 16/24 | 400 | Texto |
| `text-sm` | 14/20 | 400/500 | Metadados, labels |
| `text-xs` | 12/16 | 500 | Badges, legendas |

Conteúdo de aula (Markdown): largura máxima 68ch, `text-body` com `leading-7`.

### 2.3 Espaçamento, raio, sombra

- Escala de 4 px (Tailwind padrão). Padding de card: 16 px mobile / 24 px desktop. Gap entre seções: 24/32 px.
- Raio: `--radius-sm 8px` (input, badge), `--radius-md 12px` (botão), `--radius-lg 16px` (card), `--radius-full` (avatar, pill).
- Sombra: `--shadow-card: 0 1px 2px rgb(0 0 0 / .04), 0 1px 3px rgb(0 0 0 / .06)`; `--shadow-pop` para dialog/menu. Preferir borda + sombra leve a sombras fortes.

### 2.4 Breakpoints

| Nome | Min | Layout |
|---|---|---|
| base | 0 | 1 coluna, bottom nav, header compacto |
| `sm` | 640 | 2 colunas em grids de cards |
| `md` | 768 | tablet: bottom nav mantida, grids 2 col |
| `lg` | 1024 | sidebar fixa (240 px), grids 3 col |
| `xl` | 1280 | conteúdo máx. 1200 px centralizado |

### 2.5 Movimento

- Transições 150–200 ms `ease-out`. Barra de progresso anima largura ao atualizar.
- Respeitar `prefers-reduced-motion` (sem animação de XP/conquista).

---

## 3. Layout

### 3.1 Membro

```
Desktop (≥ lg)                          Mobile (< lg)
┌────────┬──────────────────────┐       ┌──────────────────────┐
│ Logo   │ Header (busca? não)  │       │ Logo        Avatar   │
│        │ Olá, Ana  · 340 XP   │       ├──────────────────────┤
│ ▣ Dash │──────────────────────│       │                      │
│ ▣ Tril │  conteúdo            │       │  conteúdo            │
│ ▣ Conq │                      │       │                      │
│ ▣ Perf │                      │       ├──────────────────────┤
│ ─────  │                      │       │ ⌂   ▤   ★   ●        │  bottom nav
│ Admin* │                      │       └──────────────────────┘
└────────┴──────────────────────┘       * “Admin” só para ADMIN (no perfil, no mobile)
```

- Sidebar: Dashboard, Minhas trilhas, Conquistas, Perfil (+ “Painel admin” para ADMIN, separado por divisória).
- Bottom nav: 4 itens com ícone + rótulo, item ativo com `aria-current="page"`, altura 64 px + safe-area.
- Página de aula no mobile: barra inferior fixa com “Anterior / Marcar como concluído / Próxima”, substituindo a bottom nav.

### 3.2 Admin

Sidebar própria: Dashboard, Usuários, Áreas, Trilhas, Conteúdos, Relatórios, Configurações + “Voltar à área do membro”. No mobile vira menu em gaveta (admin é desktop-first, mas precisa funcionar).

---

## 4. Componentes

### Primitivos (`components/ui`)

| Componente | Variantes / notas |
|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `danger`; tamanhos `md` (44 px) e `sm` (36 px, só desktop/admin); estado `loading` (spinner + `aria-busy`, desabilitado) |
| `Card` | padrão; `interactive` (hover, foco, área clicável inteira via link) |
| `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup` | Sempre com `<label>`; erro com ícone + texto + `aria-invalid` + `aria-describedby` |
| `ProgressBar` | `value` 0–100, `label` acessível (`role="progressbar"`, `aria-valuenow`), variantes `brand`/`success` |
| `ProgressRing` | Para card de progresso geral |
| `Badge` | `neutral`, `success` (Concluído), `warning` (Em andamento), `muted` (Não iniciado), `xp`, `required` |
| `Avatar` | Imagem ou iniciais; tamanhos 32/40/64 |
| `Skeleton` | Blocos com `animate-pulse` (desligado em reduced-motion) |
| `Dialog` / `ConfirmDialog` | `<dialog>` nativo; foco preso; Esc fecha; confirmação destrutiva exige botão `danger` com verbo explícito (“Desativar usuário”) |
| `Toast` | `role="status"` (sucesso) / `role="alert"` (erro); some em 5 s, pausável |
| `EmptyState` | Ícone + título + texto + ação opcional |
| `ErrorState` | Mensagem + “Tentar novamente” |
| `Table` | Admin; no mobile vira lista de cards |
| `Tabs` | Filtros de status em `/trilhas` |

### Domínio

| Componente | Conteúdo |
|---|---|
| `PathCard` | Capa (ou cor sólida + ícone), área, título, descrição (2 linhas), `n módulos · x min`, ProgressBar, Badge de status, badge “Obrigatória” |
| `ContinueCard` | “Continue de onde parou”, trilha, módulo, título da aula, duração, botão Continuar |
| `ModuleList` / `LessonRow` | Número do módulo, título, progresso do módulo; linhas com ícone de estado (✓ concluída, → disponível, 🔒 bloqueada), tipo (ícone), duração, XP; linha bloqueada com `aria-disabled` e texto “Conclua a aula anterior” |
| `LessonViewer` | Uma implementação por tipo: `TextLesson`, `VideoLesson` (iframe lazy, 16:9), `PdfLesson` (visualizador embutido + botão baixar), `LinkLesson` (card com botão “Abrir em nova aba”), `EmbedLesson` |
| `CompleteButton` | Estados: disponível → carregando → “Concluído ✓” (desabilitado) |
| `QuizForm` | Uma pergunta por bloco (`fieldset` + `legend`), opções como radio grandes; botão “Enviar respostas” só habilitado com todas respondidas; indicador “3 de 5 respondidas” |
| `QuizResult` | Grande: “8/10 · 80%”; aprovado (success) “Você foi aprovado.” / reprovado (danger-soft) “Você precisa atingir 70%. Tente novamente.”; revisão por pergunta com explicação; ações “Tentar novamente” / “Próxima aula” |
| `XpCard` | XP total, nível, barra até o próximo nível, “faltam N XP para o nível X” |
| `LevelBadge` | “Nível 3” em pill `xp` |
| `AchievementCard` | Ícone, nome, descrição, data; bloqueada em cinza com cadeado e critério visível |
| `RewardToast` | “+10 XP”, “Módulo concluído! +50 XP”, “Conquista desbloqueada: Primeiro Passo”; subida de nível com destaque |

---

## 5. Estados de interface (obrigatórios)

| Estado | Padrão |
|---|---|
| Loading de página | `loading.tsx` com skeleton na forma do conteúdo final (sem spinner de tela cheia) |
| Loading de ação | Botão `loading` + desabilitado; demais controles do formulário desabilitados |
| Vazio | `EmptyState` com texto específico |
| Erro de página | `error.tsx` → `ErrorState` |
| Erro de ação | Toast `alert` + mensagem inline quando for de campo |
| Sucesso | Toast `status`; recompensas com `RewardToast` |
| Desabilitado | Opacidade 50%, `cursor-not-allowed`, motivo em texto quando não óbvio |
| Destrutivo | `ConfirmDialog` sempre |

### Textos de estados vazios

| Onde | Texto |
|---|---|
| Dashboard / Minhas trilhas | “Nenhuma trilha foi atribuída a você ainda.” + “Assim que o time de treinamento liberar seu onboarding, ele aparece aqui.” |
| Continue de onde parou | (card oculto) |
| Conquistas recentes | “Conclua sua primeira aula para ganhar a conquista *Primeiro Passo*.” |
| Filtro sem resultado | “Nenhuma trilha com esse status.” |
| Módulo sem aulas | “Este módulo ainda não tem conteúdos.” |
| Admin — usuários | “Nenhum usuário encontrado.” + Convidar usuário |
| Admin — trilhas | “Nenhuma trilha criada.” + Criar trilha |
| Admin — relatórios | “Sem dados para os filtros selecionados.” |

---

## 6. Linguagem (UX writing)

- Português do Brasil, tratamento “você”, frases curtas, verbo no botão (“Continuar”, “Marcar como concluído”, “Enviar respostas”).
- Status de trilha: **Não iniciado**, **Em andamento**, **Concluído**.
- Números: “340 XP”, “45% concluído”, “8 min”. Datas: “12 de março de 2026” (fuso São Paulo).
- Erros sem culpar o usuário e sem jargão técnico: “Não foi possível salvar. Tente novamente.”

---

## 7. Acessibilidade (checklist por tela)

- [ ] HTML semântico: `header`, `nav` (com `aria-label`), `main`, `h1` único por página, hierarquia de headings.
- [ ] Link “Pular para o conteúdo”.
- [ ] Tudo operável por teclado; ordem de foco lógica; foco visível (`outline` 2 px `--color-focus`, offset 2 px).
- [ ] Labels em todos os campos; erros com `aria-invalid` + `aria-describedby`; resumo de erros em `role="alert"`.
- [ ] Barras de progresso com `role="progressbar"` e valor textual.
- [ ] Iframes com `title`; vídeos com legendas quando o provedor oferecer.
- [ ] Imagens com `alt` (capa decorativa: `alt=""`).
- [ ] Contraste AA verificado; zoom 200% sem perda de conteúdo; nada quebra em 320 px.
- [ ] Toasts anunciados (`role="status"`/`alert`) sem roubar foco.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Teste automatizado com `@axe-core/playwright` nas páginas principais.

---

## 8. Ícones

`lucide-react`, 20 px (24 px na bottom nav), `stroke-width 2`, sempre com texto ou `aria-label`.
Mapeamento de tipos de aula: texto `FileText`, vídeo `PlayCircle`, PDF `FileDown`, link `ExternalLink`, embed `LayoutTemplate`, quiz `ListChecks`. Estados: concluída `CheckCircle2`, disponível `ArrowRightCircle`, bloqueada `Lock`.
