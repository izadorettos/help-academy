# Trilha demonstrativa — “Conhecendo a HELP”

Objetivo: o Lucas entra com um usuário de demonstração e percorre, do começo ao fim, **sete formatos de atividade funcionando de verdade**. Nada de tela estática: cada formato grava no banco, é validado no servidor, concede XP e conta para o progresso.

Duas partes, tratadas de forma diferente:

| Parte | O que é | Fica no produto? |
|---|---|---|
| **Formatos de atividade** (vídeo com progresso, tarefa, desafio, questionário, game) | Arquitetura: migrations, RPCs, componentes | **Sim.** São capacidades reais do Academy |
| **Conteúdo e usuário de demonstração** | Dados seed isolados em `supabase/demo/` | **Não.** Removível com um comando |

---

## 1. Estrutura da trilha

- **Título:** Conhecendo a HELP · **slug:** `conhecendo-a-help`
- **Descrição:** “Sete atividades para entender como a Help funciona, como a gente fala e como a operação acontece na rua. Leva cerca de 45 minutos.”
- `required = true`, `sequential = true`, `status = published`, `is_demo = true`
- Área-alvo: **Demonstração** (slug `demonstracao`, `is_demo = true`) — não toca as áreas reais.

| # | Módulo | Atividade | Tipo | Duração | XP |
|---|---|---|---|---|---|
| 1 | A Help por dentro | Se é para ajudar, ajudamos com gosto | `video` | 6 min | 10 |
| 2 | A Help por dentro | Como a gente fala: voz, tom e vocabulário | `text` | 8 min | 10 |
| 3 | Operação na prática | Quiz: a jornada do pedido | `text` + quiz | 5 min | 10 + 20 (+30 com 100%) |
| 4 | Operação na prática | Rota certa | `game` | 5 min | 20 (+30 com 100%) |
| 5 | Mão na massa | Tarefa: prepare seu primeiro dia | `task` | 10 min | 20 |
| 6 | Mão na massa | Desafio: responda um lojista | `challenge` | 10 min | 60 |
| 7 | Mão na massa | Questionário: como foi sua chegada | `survey` | 4 min | 15 |

Ao concluir: +50 XP por módulo, +100 XP pela trilha, conquistas (§2.4). Um percurso perfeito soma 475 XP (225 das atividades + 150 dos três módulos + 100 da trilha) → **nível 3**, o que deixa visível subir de nível durante a demonstração.

---

## 2. Mudanças de arquitetura (novas migrations — nunca editar as antigas)

### 2.1 `0015_activity_types.sql`
```sql
alter type public.lesson_type add value if not exists 'task';
alter type public.lesson_type add value if not exists 'challenge';
alter type public.lesson_type add value if not exists 'survey';
alter type public.lesson_type add value if not exists 'game';
alter type public.xp_reason   add value if not exists 'game_perfect';
```
(Migration isolada: valor novo de enum não pode ser usado na mesma transação.)

### 2.2 `0016_activities.sql`
- `lessons.config jsonb not null default '{}'` — configuração **pública** da atividade (instruções, campos, itens do game sem gabarito). Ajustar o check `lessons_payload_by_type`: `task/challenge/survey/game` exigem `config <> '{}'`; `video` aceita `external_url` **ou** `config->>'provider' = 'placeholder'`.
- `lesson_answer_keys (lesson_id uuid pk references lessons on delete cascade, key jsonb not null)` — gabarito do game. **RLS: somente admin.** Mesmo princípio de `quiz_options.is_correct`.
- `activity_submissions`:
  ```
  id uuid pk, user_id → profiles, lesson_id → lessons (cascade),
  kind lesson_type not null, payload jsonb not null,
  score int null check (0..100), status submission_status not null,
  feedback jsonb null, created_at timestamptz default now()
  ```
  `submission_status` enum: `submitted`, `completed`, `needs_review`, `changes_requested`. Índice `(user_id, lesson_id, created_at desc)`. RLS: select P ou A; insert/update **somente via RPC**.
- `lesson_progress.progress_percent smallint not null default 0 check (0..100)` e `lesson_progress.position_seconds int` (retomar vídeo).
- `learning_paths.is_demo boolean not null default false`, `departments.is_demo boolean not null default false`, `profiles.is_demo boolean not null default false`. Relatórios e métricas do admin **excluem `is_demo = true` por padrão** (filtro “Incluir dados de demonstração”).
- `gamification_settings`: `xp_game_perfect_bonus = 30`.

### 2.3 `0017_activity_functions.sql`
| RPC | Regra |
|---|---|
| `save_lesson_progress(p_lesson_id, p_percent, p_position)` | Acesso + desbloqueio. Só aumenta `progress_percent` (nunca diminui). Idempotente |
| `submit_activity(p_lesson_id, p_payload jsonb) returns jsonb` | Despacha por `content_type`, valida **no servidor**, grava `activity_submissions`, e quando o critério é atingido chama `_complete_lesson_internal` (XP, módulo, trilha, conquistas). Retorna `{ status, score, feedback, rewards, next_lesson_id }` |
| `complete_lesson` (alterar) | Rejeita `task/challenge/survey/game` (`USE_SUBMIT_ACTIVITY`). Para `video`, exige `progress_percent >= 80` (`VIDEO_NOT_WATCHED`) |
| `get_lesson_for_member` (alterar) | Devolve `config` (sem gabarito), `progress_percent`, `position_seconds` e a última submissão |

Critérios por tipo em `submit_activity`:
- **task:** todos os itens `required` do checklist marcados; nota opcional ≤ 1.000 caracteres. `config.requires_review = false` → `completed` na hora; `true` → `needs_review` (revisão pelo admin fica para fase futura; o esquema já comporta).
- **challenge:** resposta com 200–2.000 caracteres, **nenhuma palavra travada** (lista em `config.blocked_terms`, conferida no servidor, sem diferenciar maiúsculas e acentos), todos os critérios da autoavaliação marcados. Reprovação devolve `feedback.blocked_terms_found`.
- **survey:** uma resposta por pessoa (segunda chamada devolve a existente, sem erro e sem XP); campos `required` preenchidos e dentro do tipo (escala 1–5, NPS 0–10, opção existente).
- **game:** payload `{ rounds: [...] }`, corrigido contra `lesson_answer_keys`; `score` = % de acertos; conclui com **score ≥ 70**; 100% → `award_xp('game_perfect')`. Tentativas ilimitadas; todas registradas.

Testes pgTAP para cada critério, idempotência (dupla submissão não duplica XP) e RLS (membro não lê `lesson_answer_keys`, não insere em `activity_submissions` diretamente).

### 2.4 Conquistas novas (reais, não demo) — migration `0018_achievements_activities.sql`
| code | Nome | Critério |
|---|---|---|
| `first_task` | Mão na massa | Primeira tarefa concluída |
| `first_challenge` | Desafio aceito | Primeiro desafio concluído |
| `game_perfect` | Rota certa | 100% em um game |
| `first_survey` | Voz ativa | Primeiro questionário enviado |

---

## 3. Experiência do aluno (vale para todos os formatos)

- **Cabeçalho da atividade:** eyebrow mono (“MÓDULO 2 · ATIVIDADE 4 DE 7 · GAME”), título, descrição, duração, XP, chip de status (Não iniciada / Em andamento / Concluída).
- **Barra de progresso da trilha** fixa no topo da atividade (“3 de 7 concluídas · 43%”) e **stepper** com os sete tipos (ícone por tipo; concluída, atual e bloqueada distinguíveis sem depender de cor).
- **Ao concluir:** painel de recompensa (não modal bloqueante): “+20 XP”, barra de nível animando até o novo valor, conquista desbloqueada com nome e critério, módulo concluído, e botão primário **“Próxima atividade”** à direita. Subida de nível tem destaque próprio. Sem confete; transições de 200–240ms; nada anima com `prefers-reduced-motion`.
- **Conclusão da trilha:** tela de fechamento no painel `navy` (“Trilha concluída com *gosto*.”), total de XP ganho na trilha, tempo, conquistas da trilha, nível atual e atalho para o dashboard.
- Página da trilha com a lista dos sete itens, ícone do tipo, duração, XP e estado.

---

## 4. Conteúdo de cada atividade (seed)

Voz: direta, calorosa, sem exclamação, sem palavras travadas. Números sempre com régua e janela.

### 4.1 Vídeoaula — “Se é para ajudar, ajudamos com gosto”
- **Descrição:** “Seis minutos com a história da Help, o que ela promete e como a operação funciona no dia a dia.”
- **Player:** componente `VideoPlayer` com dois provedores: `youtube/vimeo` (iframe da allowlist) e **`placeholder`** (usado na demo, porque ainda não existe vídeo oficial). O placeholder é um player **funcional**: play/pause, barra de tempo clicável, ±10s, velocidade 1×/1,5×/2×, capítulos clicáveis, transcrição sincronizada que destaca o trecho atual, teclado (espaço, ←/→) e rótulos acessíveis. O “vídeo” é um quadro `navy` com o logo negativo e o título do capítulo atual; a faixa **“Vídeo de demonstração”** fica visível.
- O progresso é salvo a cada 10s e ao pausar (`save_lesson_progress`); ao voltar, retoma da posição. **“Marcar como concluído”** habilita com 80% assistidos (a regra é verificada no servidor); antes disso o botão mostra “Assista até 80% para concluir · faltam 1:12”.
- Duração simulada: 6:00. Capítulos e transcrição:
  - **00:00 · Quem somos** — “A Help nasceu em 2017, em Campo Grande, Mato Grosso do Sul. Nasceu da operação: primeiro a gente entregou, depois organizou o que funcionava. Hoje são 58 cidades em 15 estados.”
  - **01:20 · Propósito, visão e promessa** — “Nosso propósito é tirar a entrega do caminho de quem vende. A visão é ser a operação de last mile mais auditável do Brasil — não a maior de discurso, a que consegue provar cada entrega. E a promessa cabe numa frase: você pilota, a gente cuida do resto.”
  - **02:50 · Quatro valores** — “Prova antes de adjetivo. De igual para igual, com a rede e com o lojista. O ativo é gente: parceiro com rosto, nome e cidade. E suporte humano 24/7, com nome de gente do outro lado.”
  - **04:10 · Como a operação funciona** — “Uma rede de mais de 80 mil entregadores cadastrados, SLA por modalidade e QR de entrega com foto e geotag em cada pedido. O prazo Help medido porta a porta nos últimos 15 dias foi de 45 minutos.”
  - **05:20 · Seu papel aqui** — “Tudo o que você aprender nesta trilha serve para uma coisa: ajudar com gosto, mostrando o número.”

### 4.2 Aula de texto — “Como a gente fala: voz, tom e vocabulário”
Markdown renderizado com componentes próprios: `h2/h3`, parágrafos com medida curta, listas, citação, tabela responsiva e **destaques** via sintaxe de alerta do GitHub (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`) → componente `Callout` (ícone + chip tonal, sem cor de texto colorida). Índice lateral no desktop (âncoras dos `h2`), barra de leitura no topo; conclusão ao final da página (botão habilita após rolar até o fim **ou** 60s — a regra de texto não é bloqueada no servidor).

```markdown
## O eixo não muda

A Help fala do mesmo jeito em qualquer canal: **direta, calorosa sem ser íntima, específica e adulta.** Frase curta, ponto final. O que muda de um público para outro é o volume de prova — nunca a personalidade.

> [!NOTE]
> Arquétipo da marca: **prestativo + realista**. A gente ajuda com gosto, mas mostra o número. O calor nunca substitui a prova; a prova nunca esfria a frase.

## Um tom para cada público

| Público | Como soa | Exemplo |
|---|---|---|
| Rede | Mais prova, menos calor | “Contrato único, 58 cidades, SLA por modalidade e QR auditável em cada entrega.” |
| Lojista | Mais calor, segunda pessoa | “Você pilota, a gente cuida do resto.” |
| Entregador | Autonomia sempre | “Rode na sua região, no seu tempo.” |
| Institucional | Primeira pessoa do plural, sem superlativo | “Feita por gente, pra gente. Desde 2017.” |

## Prova antes de adjetivo

Nenhum número aparece sozinho. Todo número tem **régua** (o que foi medido) e **janela** (quando).

- Certo: “45 minutos de prazo Help, medido porta a porta nos últimos 15 dias.”
- Errado: “Entregas super-rápidas.”

> [!TIP]
> Antes de enviar uma mensagem com número, pergunte: medido como? em qual período?

## Palavras que a gente não usa

Algumas palavras sugerem uma relação de subordinação com a rede de parceiros. Elas não entram em nenhum material, para nenhum público.

> [!WARNING]
> Nunca use: colaborador, funcionário, entregador dedicado, frota própria, nossos motoboys, equipe fixa, escala.
> No lugar: entregador parceiro, rede de autônomos, entregadores cadastrados, capacidade elástica com SLA.

Adjetivos como “líder”, “inovador” ou “melhor do mercado” só aparecem com a prova ao lado. Na dúvida, troque o adjetivo pelo número.

## Formato brasileiro, sempre

- Moeda: R$ 1.549,70
- Distância: 45,8 km
- Hora: 15:00 (sem misturar com 13h20 na mesma peça)

> [!IMPORTANT]
> Resumo para levar: fale de igual para igual, mostre o número com régua e janela, e deixe de fora as palavras da lista.
```
> Obs.: as palavras travadas aparecem **aqui** porque o texto ensina a evitá-las. O teste de vocabulário deve ignorar blocos marcados com `<!-- vocab-allow -->` … `<!-- /vocab-allow -->` (envolver o callout WARNING).

### 4.3 Quiz — “Quiz: a jornada do pedido”
Aula curta de texto como introdução (“Cinco perguntas sobre o que você viu até aqui. Nota mínima: 70%. Pode tentar de novo quantas vezes precisar.”) + quiz existente, `passing_score = 70`.
**Melhoria de experiência (real, não só demo):** feedback **por pergunta** — ao escolher e tocar em “Confirmar resposta”, o servidor devolve se acertou e a explicação (RPC `check_quiz_answer`, que **não** grava nada e só responde para a pergunta enviada); ao final, `submit_quiz` continua sendo a correção oficial. Tela de resultado: “4/5 · 80%”, aprovado/reprovado com as frases do PRD, revisão por pergunta, “Tentar novamente” e “Próxima atividade”.

1. **O que a promessa “Você pilota, a gente cuida do resto” diz ao lojista?** (múltipla escolha)
   - a) Que a Help assume a gestão da loja
   - **b) Que o lojista cuida do negócio e a Help cuida do último quilômetro** ✓
   - c) Que o lojista precisa acompanhar cada rota
   - d) Que a entrega é gratuita
   Explicação: “O lojista pilota o negócio. A Help cuida do último quilômetro — com rede, método e auditoria.”
2. **Um pedido aguardando liberação na loja fica em qual status?**
   - a) Coleta / em rota · **b) Espera / parada** ✓ · c) Destino / concluído · d) Recusado / perdido
   Explicação: “Enquanto o pedido não sai, ele está em espera. Em rota é quando o parceiro já está com ele.”
3. **Como a entrega é comprovada?**
   - a) Assinatura em papel · b) Ligação para o cliente · **c) QR de entrega com foto e geotag** ✓ · d) Print da conversa
   Explicação: “O QR registra foto e localização no ato — e funciona mesmo quando a rede do celular cai.”
4. **O suporte humano da Help funciona apenas em horário comercial.** (verdadeiro/falso) — **Falso** ✓
   Explicação: “Suporte humano 24/7, com nome de gente do outro lado. Não é diferencial, é o padrão.”
5. **Qual frase segue a regra “prova antes de adjetivo”?**
   - a) “Somos a entrega mais rápida do Brasil.”
   - **b) “45 minutos de prazo Help, medido porta a porta nos últimos 15 dias.”** ✓
   - c) “Entregas super-rápidas e confiáveis.”
   - d) “Tecnologia de ponta em cada pedido.”
   Explicação: “Número com régua (porta a porta) e janela (últimos 15 dias). Os outros são adjetivo sem prova.”

### 4.4 Game — “Rota certa”
Game curto, jogável no celular com o polegar e totalmente por teclado. Duas rodadas, feedback imediato por item, pontuação e resultado final. Corrigido no servidor (`submit_activity` + `lesson_answer_keys`); o cliente só conhece os itens embaralhados.

**Rodada 1 — Monte a rota do pedido.** Seis cartões embaralhados; o aluno ordena arrastando (pointer events) **ou** com os botões ↑/↓ em cada cartão (acessível). “Conferir rota” → cada cartão mostra ✓/✕ com ícone + texto e a posição certa.
Ordem correta: 1 Pedido criado no painel do lojista · 2 Entregador parceiro aceita a corrida · 3 Coleta confirmada na loja · 4 Saiu para entrega · 5 QR de entrega lido com foto e geotag · 6 Entrega concluída no painel.

**Rodada 2 — Diga ou não diga.** Oito cartões aparecem um por vez; o aluno escolhe “Diga” ou “Não diga” (botões grandes; atalhos ← e →). Feedback imediato no cartão com a explicação curta; contador “5 de 8”.
| Cartão | Resposta | Explicação |
|---|---|---|
| “entregador parceiro” | Diga | Autonomia é o eixo da relação com a rede |
| “nossos motoboys” | Não diga | Sugere subordinação; use “rede de parceiros” |
| “QR de entrega com foto e geotag” | Diga | É a prova concreta da entrega |
| “tecnologia de ponta” | Não diga | Adjetivo sem prova; diga o que a tecnologia faz |
| “suporte humano 24/7” | Diga | Específico e verdadeiro |
| “frota própria” | Não diga | Palavra da lista travada |
| “prazo Help de 45 min, porta a porta, últimos 15 dias” | Diga | Número com régua e janela |
| “melhor do mercado” | Não diga | Superlativo sem prova |

**Pontuação:** 6 + 8 = 14 itens → `score` = acertos/14. Tela final: estrelas (1–3 por faixa: <70, 70–99, 100), acertos por rodada, tempo total, XP ganho, “Jogar de novo” (secundário) e “Próxima atividade” (primário). Conclui a atividade com ≥ 70%; 100% dá o bônus e a conquista **Rota certa**. (Os cartões da rodada 2 ficam dentro de `<!-- vocab-allow -->` no seed.)

### 4.5 Tarefa — “Tarefa: prepare seu primeiro dia”
- **Instruções:** “Três coisas que deixam seu primeiro dia mais leve. Faça cada uma, marque aqui e envie.”
- Checklist (`required`):
  1. “Coloquei minha foto e confirmei meu nome no perfil do Help Academy.” — com atalho “Abrir perfil” (nova aba não; volta para a tarefa preservando o estado)
  2. “Salvei o contato do suporte interno e sei em que canal pedir ajuda.”
  3. “Li o resumo da aula de voz e tom e anotei uma frase que vou usar.”
- Campo opcional: “Quer deixar um recado para quem vai te acompanhar na primeira semana?” (até 1.000 caracteres, com contador).
- `requires_review = false` na demo.
- **Status visível:** chip Pendente → **Enviada** (timestamp “Enviada em 24/09/2026 · 10:42”) → **Concluída**; linha do tempo com os eventos; resumo do que foi enviado (somente leitura). A tarefa enviada não pode ser editada (mostrar “Enviada” com o conteúdo).
- Se a pessoa sair no meio, o estado dos checkboxes é mantido localmente (rascunho) até enviar.

### 4.6 Desafio — “Desafio: responda um lojista”
- **Objetivo:** “Escrever uma resposta real para um lojista preocupado, na voz da Help.”
- **Recompensa:** 60 XP + conquista **Desafio aceito**. Chip “Desafio · 10 min”.
- **Cenário** (card `navy`, como a tela do app do manual): “EM ROTA · #4821 — Farmácia Central → Rua Bahia, 1120 · Centro · 6,4 km · SLA 45 min”. Mensagem do lojista: “Boa tarde. O pedido #4821 saiu às 14:31 e o cliente já ligou duas vezes. Vai chegar hoje?”
  Linha do tempo: Coleta confirmada · 14:22 → Saiu para entrega · 14:31 → (pendente) QR de entrega.
- **Instruções:** 1) Diga o status atual com o horário. 2) Dê a previsão com número e janela (“até 15:18”). 3) Diga como ele vai saber que chegou (QR com foto e geotag). 4) Tom direto e caloroso, sem exclamação e sem palavras da lista.
- **Editor de resposta** com **verificador ao vivo**: contador (mín. 200), marca no texto as palavras travadas e os adjetivos sem prova com sugestão de troca, e checa se há um horário no formato 00:00. Tudo isso é ajuda — a validação que vale é a do servidor.
- **Autoavaliação** (todos obrigatórios): “Informei o status com horário.” · “Dei uma previsão com número.” · “Expliquei como a entrega será comprovada.” · “Não usei palavras da lista nem exclamação.”
- **Resposta de referência** (mostrada **depois** de concluir, para comparar): “Boa tarde. O #4821 está em rota desde 14:31, com o parceiro a 2 km da Rua Bahia. A previsão é até 15:18, dentro do SLA de 45 minutos. Quando ele entregar, o QR registra foto e geotag e o comprovante aparece no seu painel. Se o cliente ligar de novo, pode passar esse horário — e sigo acompanhando por aqui.”
- Reprovação mostra o motivo (ex.: “Encontramos ‘nossos motoboys’ — troque por ‘entregador parceiro’.”) e mantém o texto.

### 4.7 Questionário — “Questionário: como foi sua chegada”
Formulário com um tipo diferente por pergunta, validação acessível e confirmação de envio. Sem certo/errado.
1. **Escala 1–5:** “Quão preparado(a) você se sente para o seu primeiro dia?” (rótulos: 1 Nada · 5 Totalmente)
2. **Escolha única:** “Qual atividade desta trilha foi mais útil?” (as seis anteriores)
3. **Múltipla seleção (até 3):** “Sobre quais temas você quer aprender mais?” — Voz e tom · Jornada do pedido · Status e prazos · Atendimento ao lojista · Rede de parceiros · Ferramentas internas
4. **Sim/Não:** “Você já sabe a quem pedir ajuda na primeira semana?”
5. **NPS 0–10:** “De 0 a 10, quanto você recomendaria esta trilha para quem está chegando?”
6. **Texto curto (obrigatório, ≤ 120):** “Em uma frase: o que a Help promete para o lojista?”
7. **Texto longo (opcional, ≤ 1.000):** “O que poderia melhorar nesta trilha?”
- Envio único. **Confirmação:** tela “Respostas enviadas” com data/hora, resumo das respostas (somente leitura) e XP. Voltar à atividade mostra a confirmação, não o formulário vazio.

---

## 5. Usuário e dados de demonstração

- **Usuário:** `demo@help.local` · nome “Ana Demonstração” · área Demonstração · `is_demo = true` · role `member`.
- **Senha:** não fica no repositório. O script lê `DEMO_USER_PASSWORD` do `.env.local`; se não existir, gera uma senha aleatória, grava no `.env.local` e imprime no terminal.
- Para o Lucas avaliar o painel: o admin local (`admin@help.local`) enxerga a demonstração em Relatórios marcando “Incluir dados de demonstração”.

### Arquivos
```
supabase/demo/
  README.md                    como carregar, resetar e remover
  conhecendo-a-help.sql        área, trilha, módulos, aulas, configs, quiz, gabarito do game (UUIDs com prefixo de000000-)
  demo-user.sql                usuário demo (senha via variável psql :'demo_password')
  remove.sql                   apaga tudo marcado is_demo (usuário → cascata de progresso, XP, conquistas; trilha → cascata do conteúdo; área)
scripts/demo.mjs               npm run demo:seed | demo:reset | demo:remove
```
- `demo:seed` e `demo:reset` **recusam rodar** se a conexão não for local (`127.0.0.1`/`localhost`), a menos que `DEMO_ALLOW_REMOTE=true` seja passado explicitamente (para staging).
- `demo:reset` = remove + seed: zera o progresso para apresentar de novo.
- O `seed.sql` principal **não** inclui a demonstração.
- **Teste de remoção:** carregar demo → percorrer → `demo:remove` → contagem de linhas das tabelas reais igual à de antes; `supabase test db`, `npm test` e E2E principais verdes.

---

## 6. Testes obrigatórios desta etapa

- **pgTAP:** cada critério de `submit_activity` por tipo; `save_lesson_progress` só aumenta; vídeo < 80% não conclui; survey envio único; game com gabarito; idempotência de XP; RLS de `activity_submissions` e `lesson_answer_keys`; remoção da demo sem resíduos.
- **Unitários:** normalização de texto do verificador de vocabulário (acentos/maiúsculas); regras de pontuação do game; formatação pt-BR; teste de vocabulário travado.
- **E2E (Playwright), em 390×844 e 1440×900:**
  - um spec **por formato** (7), cobrindo caminho feliz e um caminho de erro (ex.: desafio com palavra travada, quiz reprovado, vídeo antes de 80%, questionário sem campo obrigatório);
  - `demo-journey.spec.ts`: login como demo → trilha inteira do começo ao fim → confere XP final, nível, conquistas e tela de conclusão;
  - axe sem violações sérias em todas as telas de atividade.
