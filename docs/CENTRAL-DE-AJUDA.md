# Central de Ajuda — tutoriais da Help dentro do Academy

**Origem da demanda (grupo Help, 26/09/2026):**
- Douglas: atualizar o vídeo de **Visão Estabelecimento** no layout novo.
- Lucas: material para entregadores em **YouTube, PDF, blog/passo a passo visual**, com um **painel com todos os materiais e a data da última atualização**, direto no front ou no Academy.

Esta fase cria a **Central de Ajuda** no Academy com os 23 materiais recebidos, já analisados e catalogados. A análise foi feita a partir dos arquivos: quadros dos vídeos, texto dos PDFs, metadados e o manifesto do APK. **Nenhuma regra ou funcionalidade foi inventada.** Onde havia dúvida, o material ficou marcado para revisão da Help (§8).

Arquivos de apoio:
- `content/tutoriais/catalog.json`: fonte de verdade do conteúdo (públicos, categorias, séries e 23 tutoriais).
- `~/Documents/help-academy-midia/tutoriais/`: mídia pronta para web, **fora do git**. São 14 vídeos em MP4 720p com faststart, 2 PDFs, 6 imagens, 1 APK e 23 capas 16:9. Os vídeos originais somavam cerca de 1,5 GB; as versões web ficaram com cerca de 10% disso, sem perder a leitura do texto na tela.

---

## 1. Estrutura de conteúdo

### Públicos (`help_audiences`)
| slug | Nome | Materiais |
|---|---|---|
| `estabelecimentos` | Estabelecimentos | 4 |
| `entregadores` | Entregadores | 14 |
| `operacao` | Administradores / Operação | 4 |
| `geral` | Todos os públicos | 1 |

Relação N:N (`tutorial_audiences`): um material pode servir a mais de um público.

### Categorias (`help_categories`)
Primeiros passos · Painel do estabelecimento · Roteamento inteligente · Corridas e entregas · Prazos e prioridades · Pagamentos e taxas · Preços e tabelas · Suporte e problemas técnicos.
Cada uma tem slug, nome, ícone lucide e ordem. Todas são editáveis no admin.

### Séries (`help_series`)
- **Visão Estabelecimento**: Parte 1 · Visão geral (17:35) → Parte 2 · Fluxo de pedido (4:17) → Parte 3 · Roteamento inteligente (10:08).
  - As partes 1 e 2 são de janeiro/2026, no **layout anterior**. Ficam marcadas como **“Atualização solicitada”**, com a nota do pedido do grupo.
  - A parte 3 (setembro/2026) já está no layout atual.
  - Quando o vídeo novo chegar, basta trocar o arquivo no admin: a URL, a data e o status mudam sem mexer no front.
- **App do entregador**: os 10 materiais numerados da pasta do Drive, na ordem original (1–10).

---

## 2. Banco (nova migration, próximo número livre)

```sql
create type public.tutorial_content_type as enum ('video','pdf','image','app','link','article');
create type public.tutorial_freshness   as enum ('current','needs_update','needs_review');
create type public.tutorial_visibility  as enum ('authenticated','public');

create table public.help_audiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text,
  sort_order int not null default 0, created_at timestamptz not null default now()
);
create table public.help_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, icon text not null default 'BookOpen',
  sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.help_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tutorials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  description text not null,
  category_id uuid not null references public.help_categories(id) on delete restrict,
  series_id uuid references public.help_series(id) on delete set null,
  series_position int,
  content_type public.tutorial_content_type not null,
  -- mídia desacoplada: 'storage:<bucket>/<path>' OU URL https (YouTube, Vimeo, CDN)
  video_url text, file_url text, thumbnail_url text,
  duration_seconds int check (duration_seconds >= 0),
  pages int, file_size_bytes bigint, mime_type text, sha256 text, app_version text,
  freshness public.tutorial_freshness not null default 'current',
  freshness_note text,
  visibility public.tutorial_visibility not null default 'authenticated',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  source_file text,                    -- nome original (uso interno)
  date_source text,                    -- de onde veio a data de atualização
  last_content_update date not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, series_position),
  check ((content_type = 'video' and video_url is not null) or (content_type <> 'video' and file_url is not null) or content_type in ('link','article'))
);
create table public.tutorial_audiences (
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  audience_id uuid not null references public.help_audiences(id) on delete restrict,
  primary key (tutorial_id, audience_id)
);
create index tutorials_published_idx on public.tutorials (is_published, sort_order);
create index tutorials_category_idx on public.tutorials (category_id);
create index tutorials_updated_idx on public.tutorials (last_content_update desc);
create index tutorial_audiences_audience_idx on public.tutorial_audiences (audience_id);
-- busca: pt-BR sem acento
create extension if not exists unaccent;
create index tutorials_search_idx on public.tutorials
  using gin (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'')));
```
- Trigger `set_updated_at` em `tutorials`, `help_categories` e `help_series`. `updated_by` é preenchido na action.
- `last_content_update` é a data mostrada ao usuário (“Atualizado em DD/MM/AAAA”). É separada de `updated_at`, porque corrigir um erro de digitação não é atualizar o conteúdo. No formulário, trocar o arquivo sugere a data de hoje.

### RLS
| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `tutorials` | `is_published and is_active_user()`; `anon` só se `is_published and visibility = 'public'`; admin vê tudo | `is_admin()` |
| `tutorial_audiences`, `help_*` | autenticado ativo (e `anon` para o que alimenta tutoriais públicos) | `is_admin()` |

Todos os tutoriais entram como `visibility = 'authenticated'`. Tornar algum público é decisão da Help (§8).

### Storage
Bucket **`tutorials`**, privado, limite de 50 MB. MIME permitidos: `video/mp4`, `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/vnd.android.package-archive`.
- **Leitura:** URL assinada (1 h) gerada no servidor depois de conferir que o tutorial está publicado e visível para quem pede.
- **Escrita:** somente admin.
- **Resolução desacoplada:** `lib/media/resolve-media-url.ts`.
  - `storage:tutorials/x.mp4` → URL assinada.
  - `https://youtu.be/...` ou `https://www.youtube.com/...` → player do YouTube (allowlist já existente).
  - `https://vimeo.com/...` → player do Vimeo.
  - Qualquer outra `https://` → usada como está (CDN).
  - Trocar a hospedagem é só editar o campo no admin. O front não muda.

---

## 3. Importação (seed de conteúdo real)

`scripts/import-tutorials.mjs` → `npm run tutorials:import -- --media ~/Documents/help-academy-midia/tutoriais`
1. Lê `content/tutoriais/catalog.json`.
2. Faz upsert de públicos, categorias e séries **por slug**.
3. Sobe cada arquivo e capa para `tutorials/<slug>/...`, calcula `file_size_bytes`, `mime_type` e `sha256` (este último para o APK).
4. Faz upsert dos tutoriais por slug, com `is_published = true`, e das relações de público.
5. É **idempotente**: rodar duas vezes não duplica nada nem sobe arquivo repetido (compara o sha256).

Por padrão roda contra o Supabase local. Para produção, exige `--target production` e as variáveis do projeto. Não é demonstração: é conteúdo real, então não usa `is_demo`.

---

## 4. Página `/ajuda` (Central de Ajuda)

Item **“Central de Ajuda”** (ícone `LifeBuoy`) na sidebar e na bottom nav, que passa a ter 5 itens.

Layout, seguindo `BRAND-HELP.md` (família Tela, uma palavra em serifada no título):
- **Cabeçalho:**
  - eyebrow mono “CENTRAL DE AJUDA · 23 MATERIAIS”;
  - título “Tutoriais para resolver *rápido*.”;
  - linha de apoio;
  - campo de busca grande (ícone, placeholder “Buscar por pedido, parada, QR Code, adiantamento…”, atalho `/` para focar).
- **Filtros:**
  - **Público**: controle segmentado (Todos · Estabelecimentos · Entregadores · Operação).
  - **Categoria**: chips pill roláveis no celular, cada um com contador.
  - **Tipo**: chips Vídeo · PDF · Passo a passo · App.
  - Os filtros viram parâmetros da URL (`?q=&publico=&categoria=&tipo=`), para compartilhar o link e voltar do detalhe mantendo o estado.
  - Botão “Limpar filtros”.
- **Sem filtro ativo:**
  1. faixa **“Comece por aqui”**, com a série Visão Estabelecimento em cartão horizontal de 3 passos e o Guia rápido do entregador;
  2. **“Materiais atualizados recentemente”** (os 4 mais recentes por `last_content_update`);
  3. grade completa agrupada por categoria.
- **Com filtro ou busca:** grade única com o contador “8 materiais”.
  - A busca ignora acentos e diferença entre maiúsculas e minúsculas, e procura em título, descrição, categoria e público. Pode ser no cliente, porque a lista é pequena, mas precisa ficar pronta para trocar pela busca do Postgres.
  - Estado vazio: “Nenhum material encontrado para ‘x’.” + Limpar filtros.
- **Cartão:**
  - capa 16:9;
  - chip de tipo no canto superior esquerdo (Vídeo / PDF / Passo a passo / App);
  - duração em chip mono no canto inferior direito (`17:35`), ou páginas (`5 págs.`);
  - eyebrow mono com o público;
  - título com até 2 linhas e descrição com até 2 linhas;
  - rodapé com “Atualizado em 04/09/2026” em mono e o link **“Acessar conteúdo →”**;
  - chip de status quando houver: **“Atualização solicitada”** (chip âmbar) ou **“Atualizado recentemente”** (chip verde, até 60 dias);
  - o cartão inteiro é clicável, com hover de borda `brand` + elevação de 2px em 160ms e foco visível;
  - a capa usa `next/image` com `sizes` e carregamento lento.
- **Grade:** 1 coluna em 360px, 2 a partir de 640px, 3 a partir de 1024px e 4 a partir de 1280px. Skeleton no `loading.tsx`.

## 5. Página do material `/ajuda/[slug]`

- Botão **“Voltar para a Central de Ajuda”**, que preserva os filtros de origem, e breadcrumb.
- Eyebrow com público · categoria, título, e uma linha de meta: tipo, duração ou páginas, “Atualizado em DD/MM/AAAA”, chip de status.
  - Status `needs_update`: aviso tonal com a nota (“Gravado no layout anterior do painel. Um vídeo novo foi solicitado.”).
  - Status `needs_review`: o aviso aparece **só para admin**.
- **Mídia por tipo:**
  - **Vídeo:** `VideoPlayer` provedor `file` (ou YouTube/Vimeo, se a URL for externa), com velocidade 1× / 1,5× / 2× e poster = capa. No celular, o vídeo vertical dos entregadores fica em proporção 9:16 limitado a 80vh.
  - **PDF:** visualizador embutido + “Baixar PDF (1,3 MB)”.
  - **Imagem:** imagem inteira com zoom em tela cheia (Esc fecha) + “Baixar imagem”.
  - **App:** cartão de download com nome, versão, “Android 7.0 ou superior”, tamanho e SHA-256, e o aviso “Instale apenas se a Help orientar”. O download é por URL assinada.
- **Série:** navegador “Parte 2 de 3” com anterior/próxima e lista das partes.
- **Relacionados:** até 4 materiais da mesma categoria ou público (excluindo o atual), no mesmo cartão.
- Descrição completa abaixo da mídia. Página 404 se o material não estiver publicado ou visível.

## 6. Dashboards

- **Dashboard do membro:** seção **“Materiais atualizados recentemente”** com 3 cartões compactos + “Ver Central de Ajuda”.
- **Dashboard admin:** bloco **Central de Ajuda** com os KPIs:
  - total de tutoriais publicados;
  - quantidade por público (barras horizontais simples, com os números em texto);
  - atualizados nos últimos 60 dias;
  - marcados como “Atualização solicitada” ou “Revisar”;
  - lista dos últimos 5 adicionados ou atualizados, com data e link para editar.

## 7. Admin `/admin/tutoriais` (dentro do admin atual — nada de segunda administração)

- Item **“Tutoriais”** na `AdminSidebar`.
- **Lista:** tabela (cartões no celular) com capa, título, públicos, categoria, tipo, “Atualizado em”, status, publicado e destaque.
  - Busca e filtros.
  - Alternância rápida de publicado e destaque.
  - Botão primário **“Novo tutorial”**.
- **Formulário (criar/editar):**
  - título e slug (gerado, editável), descrição, categoria, públicos (múltipla escolha), tipo;
  - **mídia:** upload (URL assinada, igual à Fase 22) **ou** colar URL (YouTube, Vimeo, CDN);
  - capa (upload, recorte 16:9) e duração (lida do arquivo quando possível);
  - **data da última atualização** (date picker) e origem da data;
  - status (Atual / Atualização solicitada / Revisar) + nota;
  - série e posição, ordem, destaque, publicado e visibilidade.
  - Trocar o arquivo sugere a data de hoje.
- **Excluir:** `ConfirmDialog` que remove também os arquivos do Storage.
- **Abas “Categorias” e “Públicos”:** CRUD simples (nome, slug, ícone, ordem). Não deixa excluir categoria em uso.
- Toda action começa com `requireAdmin()` e valida com Zod.

## 8. O que depende da equipe da Help

1. **Vídeo novo da Visão Estabelecimento**, no layout atual, para substituir as partes 1 e 2. A troca é pelo admin.
2. **YouTube:** o Lucas citou YouTube para os entregadores. Se a Help subir os vídeos num canal (não listado), basta colar as URLs no admin, e o Storage deixa de ser usado para eles.
3. **Visibilidade pública:** entregadores e estabelecimentos ainda não têm login no Academy (depende da autenticação da HELP). Para eles usarem já, a Help precisa decidir quais materiais podem ficar **abertos sem login**.
   - Recomendação: os de entregadores, estabelecimentos e geral.
   - Os de Operação ficam internos, porque mostram nomes e telefones reais de clientes.
4. **Regra de adiantamento:** o Guia rápido (01/09/2026) e o Tutorial de adiantamento (10/07/2026) dizem coisas diferentes sobre fins de semana. Confirmar qual vale.
5. **App HelpEntregas Gestor (APK 1.0.0):** confirmar para quem é e se o download deve ficar disponível na Central. A instalação por APK exige liberar “fontes desconhecidas” no Android.
6. **“Aceitar pedido” (vídeo 1)** mostra uma versão anterior do app. Confirmar se ainda vale ou se o vídeo 5 o substitui.
7. **“Limpar cache do navegador”** não tinha data; entrou com a data de importação (26/09/2026).

## 9. Testes e critério de conclusão

- **pgTAP:**
  - RLS de `tutorials`: membro vê só os publicados; `anon` vê só os públicos publicados; membro não escreve; admin faz tudo.
  - Unicidade de slug e de posição na série.
  - Check de mídia por tipo.
- **Unitários:**
  - `resolve-media-url` (storage, YouTube, Vimeo, CDN);
  - busca sem acento;
  - formatação `DD/MM/AAAA` e `mm:ss`;
  - regra “Atualizado recentemente” (60 dias);
  - validação Zod do formulário.
- **E2E** (390×844 e 1440×900):
  - `/ajuda` abre com os 23 materiais;
  - a busca “adiantamento” encontra 2 materiais (o Guia rápido e o Tutorial de adiantamento);
  - o filtro Entregadores dá 14;
  - o filtro Categoria + Tipo combinados funciona;
  - o vídeo toca (`video.currentTime` avança);
  - PDF, imagem e APK abrem ou baixam;
  - a série navega entre as partes;
  - os relacionados aparecem;
  - “Voltar” preserva os filtros;
  - o dashboard mostra os KPIs e os recentes;
  - admin cria, edita, troca arquivo, despublica e exclui;
  - membro em `/admin/tutoriais` recebe 404;
  - **zero erros no console** (listener de `console.error` e `pageerror` falhando o teste);
  - axe sem violações sérias.
- **Conclusão:** lint, typecheck, test, `supabase test db`, build e test:e2e verdes; importação idempotente conferida; plano atualizado; commit.
