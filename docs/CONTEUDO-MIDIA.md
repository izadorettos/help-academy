# Conteúdo e mídia no admin — pedidos do Lucas (24/09/2026)

Pedidos, em ordem: **(1)** subir vídeo, imagem, PDF e PowerPoint; **(2)** botão de **“Novo conteúdo”**; **(3)** **capa do módulo**. Referência de conteúdo real: *Onboarding Grupo CO* (Canva, Thais Cavalcanti/RH, 24 páginas). A Thais (RH) vai tocar o conteúdo junto — **o admin precisa permitir que ela monte a trilha sozinha**, sem seed e sem desenvolvedor.

Preservar tudo que funciona. Nada de refazer a arquitetura: são tipos novos, um bucket novo, uma coluna nova e telas de admin.

---

## 1. Botão “Novo conteúdo”

- Botão primário **“Novo conteúdo”** (ícone `Plus`) em três lugares: topo de `/admin/conteudos`, topo do construtor `/admin/trilhas/[id]` e no rodapé de cada módulo do construtor (“Adicionar conteúdo neste módulo”).
- Abre `/admin/conteudos/novo` (com `?trilha=` e `?modulo=` quando vier de um módulo) em **3 passos** com indicador “Passo 1 de 3”:
  1. **Tipo** — grade de cartões com ícone, nome e uma linha de descrição: Vídeo · Texto · PDF · Imagem · Apresentação · Link · Conteúdo incorporado · Quiz · Tarefa · Desafio · Questionário · Game.
  2. **Onde** — trilha e módulo (pré-selecionados quando vier do construtor); opção “Criar novo módulo” inline.
  3. **Conteúdo** — formulário do tipo, com upload quando couber; título, descrição, duração, XP (padrão vindo de `gamification_settings`), obrigatória, publicada.
- Ao salvar: volta ao construtor com o item destacado e toast “Conteúdo criado”. Rascunho (não publicado) é o padrão.

## 2. Upload de mídia

**Regra técnica:** Server Actions têm limite de corpo de 1 MB — **arquivo nunca passa pela action**. Fluxo:
1. Action `requestUpload({ lessonId, kind, fileName, size, mime })` → `requireAdmin()` → valida tipo/tamanho → `storage.createSignedUploadUrl(path)`.
2. O navegador envia direto ao Storage (`uploadToSignedUrl`), com **barra de progresso** e cancelamento. Acima de 6 MB usar upload resumível (TUS) para não perder o arquivo se a conexão cair.
3. Action `confirmUpload` grava o caminho na aula.
- Caminho: `lessons/{lesson_id}/{uuid}.{ext}`; nome original guardado só para exibição. Validação de extensão **e** MIME no cliente, na action e no `allowed_mime_types` do bucket.
- Ao excluir aula ou trocar arquivo, apagar o objeto antigo (sem órfãos).
- Leitura sempre por **URL assinada de curta duração** gerada após `can_access_lesson`.

Bucket novo `lesson-media` (privado) — migration `0020_lesson_media.sql`:

| Tipo | Formatos | Limite sugerido | Observação |
|---|---|---|---|
| Vídeo | mp4, webm, mov | 50 MB no plano atual (configurável por env) | Acima disso: link do YouTube (não listado) ou Vimeo — já suportado. Aviso claro no formulário |
| Imagem | jpg, png, webp | 10 MB | Texto alternativo **obrigatório** |
| PDF | pdf | 50 MB | Mostrar tamanho e nº de páginas; aviso se > 20 MB (“pode demorar no celular”) |
| Apresentação | pdf, pptx | 50 MB | Ver §2.3 |

> O limite global do Supabase no plano gratuito é 50 MB por arquivo. O PDF do Grupo CO original tem 60 MB — a versão comprimida (11 MB, mesma qualidade na tela) está em `~/Documents/Onboarding_Grupo_CO_comprimido.pdf`.

### 2.1 Vídeo por arquivo
`VideoPlayer` ganha o provedor `file` (`<video>` nativo com URL assinada). O progresso usa os eventos reais `timeupdate` → `save_lesson_progress` (mesma regra de 80% já existente). Legenda opcional (`.vtt`).

### 2.2 Imagem
Novo `lesson_type` **`image`** (migration própria, como em 0016): uma ou mais imagens com legenda, em galeria; toque abre em tela cheia (Esc fecha, setas navegam, foco preso). Na aula de **texto**, botão “Inserir imagem” no editor que sobe o arquivo e insere `![alt](media:<path>)`; o renderizador troca `media:` por URL assinada.

### 2.3 PowerPoint
O navegador não exibe `.pptx`. Sem conversão no servidor nesta etapa:
- **Recomendado:** exportar como PDF (Canva/PowerPoint/Google: *Arquivo → Baixar → PDF*) e subir como **Apresentação** → visualização página a página, igual ao PDF.
- `.pptx` também é aceito: vira cartão de download com nome, tamanho e aviso “Para ver aqui, envie a versão em PDF”.
- Link do Google Slides ou do Canva (“Compartilhar → link público/incorporar”) entra como **Conteúdo incorporado** — adicionar `docs.google.com/presentation` e `www.canva.com/design` à allowlist de embed.
Novo `lesson_type` **`presentation`**.

## 3. Capa do módulo

- Migration: `modules.cover_path text null`.
- No formulário do módulo: upload de imagem (jpg/png/webp, até 5 MB, recomendado 1600×900, 16:9), pré-visualização recortada em 16:9, remover/trocar. Bucket `covers` (já existe, público).
- Também garantir o mesmo upload para a **capa da trilha** (a coluna `cover_url` existe; conferir se há UI).
- Exibição: na página da trilha, cada módulo abre com a capa em 16:9 (raio `lg`), título e progresso do módulo por cima de um degradê `navy` para contraste; sem capa → bloco `navy` com número do módulo e ícone. Capa é decorativa (`alt=""`); o título continua como texto real.
- No card da trilha (dashboard e `/trilhas`), usar a capa da trilha; sem capa → fallback atual.

## 4. Testes desta fase

- Unitários: validação de tipo/tamanho, montagem de caminho, troca `media:` → URL.
- pgTAP: RLS do bucket `lesson-media` (membro sem acesso à trilha não gera URL; membro não faz upload), `cover_path`.
- E2E (admin): “Novo conteúdo” → cada tipo novo (vídeo por arquivo, imagem, PDF, apresentação em PDF, pptx) com arquivos pequenos de fixture → publicar → membro abre e conclui. Capa de módulo aparece para o membro. Mobile e desktop. axe.
- Upload de arquivo acima do limite mostra erro claro e não quebra a página.

---

## 5. Primeira trilha real: “Integração Grupo CO” (montada pela Thais pelo admin)

Estrutura sugerida a partir do PDF, **para validar com a Thais** — não entra como seed:

| Módulo | Conteúdos (tipo) |
|---|---|
| 1 · Bem-vindo ao Grupo CO | Boas-vindas (texto) · Nossa história e as quatro empresas: Help Entregas, Vivo Empresas, Fisco Certo, Estação Pôr do Sol (texto + imagens) · Visão e missão (texto) |
| 2 · Quem é quem | Estrutura organizacional de cada empresa (imagem, galeria) · Nossas lideranças (imagem) |
| 3 · Informações práticas | Dúvidas frequentes: jornada, ponto no QuarkRH, pagamento até o 5º dia útil, adiantamento até dia 15, benefícios, viagens, faltas e atestados em 48 h, férias, equipamentos, uniformes (texto) · Tarefa: instalar e acessar QuarkRH e Caju (tarefa com checklist) · Canais de comunicação e e-mails oficiais (texto) · Quiz rápido de informações práticas (quiz) |
| 4 · Seus primeiros dias | Nossos espaços (imagem, galeria) · Etapas da integração (texto) · Desenvolvimento e treinamento (texto) · Código de Conduta (PDF + tarefa “Li e estou de acordo”) · Como foi sua chegada (questionário) |
| Material de apoio | Apresentação completa “Integração de novos funcionários” (apresentação em PDF, versão comprimida) |

### Decisões pendentes antes de publicar
1. **Escopo da plataforma:** o material é do **Grupo CO** (quatro empresas). O Help Academy atende só a Help ou todo o Grupo? Isso muda marca (Help vs. Grupo CO) e pode exigir a dimensão “empresa” além de “área”.
2. **Vocabulário:** o manual da Help trava “funcionário/colaborador” (por causa da rede de entregadores parceiros). O material de RH do Grupo usa esses termos para o time contratado. Confirmar com Marketing/Jurídico se vale para conteúdo interno de RH.
3. **Dados pessoais:** organograma e fotos de lideranças — confirmar autorização de uso de imagem (exigência do próprio manual da Help).
