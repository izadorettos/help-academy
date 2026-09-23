# PRD — Help Academy

**Produto:** Help Academy — plataforma de onboarding, treinamento e gamificação da Help Entregas
**Versão do documento:** 0.1 (pré-implementação)
**Status:** aguardando validação das decisões pendentes (`IMPLEMENTATION-PLAN.md` §2)

---

## 1. Contexto e problema

A Help Entregas precisa treinar públicos muito diferentes — colaboradores internos (Suporte, TI, Comercial, Operacional, Supervisão), entregadores e estabelecimentos parceiros. Hoje o material está disperso e não há como medir quem concluiu o quê.

## 2. Objetivos

| # | Objetivo | Como medir |
|---|---|---|
| O1 | Centralizar o onboarding em um só lugar | 100% das trilhas oficiais publicadas na plataforma |
| O2 | Entregar a cada pessoa só o que é do seu perfil | Trilhas visíveis = trilhas atribuídas (área + individuais) |
| O3 | Tornar o onboarding mensurável | Relatório por usuário/área/trilha com progresso, nota média e último acesso |
| O4 | Aumentar engajamento e conclusão | Taxa de conclusão das trilhas obrigatórias; tempo médio até concluir |

## 3. Públicos e personas

| Persona | Papel no sistema | Contexto de uso |
|---|---|---|
| Novo colaborador (Suporte/TI/Comercial/Operacional) | MEMBER | Desktop e celular, primeiras semanas |
| Supervisor | MEMBER (futuro: gestor de área) | Acompanha a própria trilha; no futuro, a equipe |
| Entregador | MEMBER | **Majoritariamente celular**, conexão instável, pouco tempo |
| Estabelecimento parceiro | MEMBER | Celular/desktop, treinamento pontual |
| Time de RH/Treinamento | ADMIN | Desktop, cria conteúdo e acompanha relatórios |

## 4. Escopo do MVP

### Dentro
Login (email/senha + recuperação), dashboard, trilhas, módulos, aulas (texto, vídeo, PDF, link, embed), conclusão idempotente, quizzes (múltipla escolha / V ou F) com nota mínima e tentativas, XP, níveis, conquistas, perfil, painel admin (usuários, áreas, trilhas, construtor, conteúdos, relatórios, configurações).

### Fora (não implementar agora)
Chat, feed social, comunidade, pagamentos, assinaturas, marketplace, IA, ranking competitivo, certificados avançados, notificações push, app nativo.

## 5. Papéis e permissões

| Capacidade | MEMBER | ADMIN |
|---|:-:|:-:|
| Dashboard, trilhas atribuídas, aulas, quizzes, perfil próprio | ✓ | ✓ |
| Ver progresso/XP/conquistas próprios | ✓ | ✓ |
| Ver dados de outros usuários | — | ✓ |
| Criar/convidar/editar/desativar usuários, alterar role | — | ✓ |
| CRUD de áreas, trilhas, módulos, conteúdos, quizzes | — | ✓ |
| Atribuir trilhas a áreas e a usuários | — | ✓ |
| Relatórios e configurações de gamificação | — | ✓ |

Toda regra acima é aplicada no servidor (RLS + guards). Ver `ARCHITECTURE.md` §5.

## 6. Requisitos funcionais

### 6.1 Autenticação
- **RF-01** Login por email e senha em `/login` (Supabase Auth).
- **RF-02** Recuperação de senha por email (`/recuperar-senha` → link → `/redefinir-senha`).
- **RF-03** Sem cadastro público. Usuários são **convidados** pelo admin; o convite leva à definição de senha.
- **RF-04** Após login, todos vão para `/dashboard`, que adapta o conteúdo ao papel.
- **RF-05** Usuário desativado não consegue logar nem usar sessão existente.

### 6.2 Dashboard (`/dashboard`)
- **RF-10** Cabeçalho: “Olá, [nome]”, avatar, área.
- **RF-11** Progresso geral do onboarding (regra RN-05).
- **RF-12** “Continue de onde parou”: aula com `last_accessed_at` mais recente, iniciada e sem `completed_at`, respeitando acesso. Mostra trilha, módulo, duração e botão Continuar. Oculto se não houver.
- **RF-13** “Minhas trilhas”: cards com nome, descrição curta, progresso, nº de módulos, status (Não iniciado / Em andamento / Concluído).
- **RF-14** XP total e nível atual, com quanto falta para o próximo nível.
- **RF-15** Conquistas recentes (até 4).
- **RF-16** Para ADMIN: atalho visível para `/admin`.

### 6.3 Trilhas
- **RF-20** `/trilhas`: todas as trilhas atribuídas e publicadas, ordenadas por `position`, com filtro por status.
- **RF-21** `/trilhas/[slug]`: título, descrição, capa, progresso, XP disponível, módulos e aulas com estado (concluída ✓, disponível →, bloqueada 🔒).
- **RF-22** Trilha `sequential = true`: aula só é liberada quando a aula **obrigatória** anterior (na ordem módulo → aula) estiver concluída. Aulas opcionais nunca bloqueiam.
- **RF-23** Acessar trilha não atribuída ou não publicada → 404 (não revela existência).

### 6.4 Aulas (`/aula/[id]`)
- **RF-30** Tipos: `text` (Markdown), `video` (URL de provedor permitido: YouTube, Vimeo, Google Drive — ver D-06), `pdf` (arquivo no Storage, URL assinada), `link` (abre em nova aba), `embed` (iframe de domínio permitido).
- **RF-31** Exibe título, descrição, duração estimada, XP, se é obrigatória, navegação anterior/próxima e breadcrumb Trilha › Módulo.
- **RF-32** Ao abrir a aula, registra `started_at` (uma vez) e atualiza `last_accessed_at`.
- **RF-33** Botão **Marcar como concluído** (aulas sem quiz). Aula com quiz: ver RN-03.
- **RF-34** Aula bloqueada por sequência → tela de bloqueio com link para a próxima pendente. Aula inacessível → 404.

### 6.5 Conclusão
- **RF-40** Concluir aula registra conclusão, recalcula progresso, concede XP uma única vez, libera a próxima aula, verifica conclusão de módulo/trilha e conquistas.
- **RF-41** Idempotente: recarregar, clicar duas vezes ou repetir a requisição não duplica nada.
- **RF-42** Feedback imediato: XP ganho, conquistas desbloqueadas, módulo/trilha concluídos.

### 6.6 Quizzes
- **RF-50** Um quiz por aula (opcional). Perguntas `multiple_choice` (uma correta) ou `true_false`.
- **RF-51** O membro recebe perguntas **sem** o gabarito.
- **RF-52** Correção no servidor; resultado: acertos/total, %, e “Você foi aprovado.” ou “Você precisa atingir X%. Tente novamente.”
- **RF-53** Após submeter, mostrar correção por pergunta e explicação (se houver).
- **RF-54** Toda tentativa é registrada (inclusive reprovadas), com respostas.
- **RF-55** Tentativas ilimitadas no MVP (D-08).

### 6.7 Gamificação
- **RF-60** XP concedido por eventos (tabela §7), valores configuráveis.
- **RF-61** Nível calculado pela faixa de XP em `levels`.
- **RF-62** Conquistas avaliadas no backend após cada evento.
- **RF-63** `/conquistas`: todas as conquistas ativas, desbloqueadas e bloqueadas, com data.

### 6.8 Perfil (`/perfil`)
- **RF-70** Nome, avatar, área, cargo, data de entrada, XP, nível, trilhas concluídas, conquistas, progresso atual.
- **RF-71** Membro pode editar apenas nome e avatar.

### 6.9 Administração
- **RF-80** `/admin`: total de usuários, usuários ativos (acesso nos últimos 30 dias), trilhas publicadas, média de conclusão, pessoas com onboarding pendente.
- **RF-81** `/admin/usuarios`: tabela (nome, email, área, cargo, nº trilhas, progresso, status) com busca e filtros; convidar, editar, desativar/reativar, atribuir área, atribuir/remover trilhas, alterar role, reenviar convite.
- **RF-82** `/admin/areas`: criar, editar, desativar. Área desativada não recebe novas atribuições.
- **RF-83** `/admin/trilhas`: criar, editar, duplicar, publicar/despublicar, arquivar; definir área responsável, áreas-alvo, ordem, obrigatória, sequencial.
- **RF-84** Construtor (`/admin/trilhas/[id]`): árvore Trilha › Módulos › Aulas › Quiz; criar/editar/remover e reordenar (botões ↑↓ no MVP; drag-and-drop opcional).
- **RF-85** `/admin/conteudos`: lista de todas as aulas com busca e filtro por trilha/tipo/status.
- **RF-86** Editor de quiz: perguntas, alternativas, correta, explicação, nota mínima.
- **RF-87** `/admin/relatorios`: usuário, área, trilha, progresso %, último acesso, nota média de quiz, status; filtros área/trilha/status; exportar CSV.
- **RF-88** `/admin/configuracoes`: valores de XP e faixas de nível.
- **RF-89** Ações destrutivas pedem confirmação.

## 7. Regras de negócio

- **RN-01 Acesso a trilha.** Usuário acessa trilha se ela está publicada, não arquivada e **atribuída** a ele — por área (a área do usuário está entre as áreas-alvo da trilha) ou individualmente.
- **RN-02 Aula conta para progresso** se é `published` e `required`. Aulas opcionais dão XP mas não entram no %.
- **RN-03 Aula com quiz** é concluída automaticamente quando o quiz é aprovado (sem botão manual). *Confirmar — D-05.*
- **RN-04 Progresso da trilha** = aulas obrigatórias publicadas concluídas ÷ aulas obrigatórias publicadas. Módulo concluído = todas as suas aulas obrigatórias concluídas (módulo sem aula obrigatória não conta como concluído nem dá XP).
- **RN-05 Progresso geral do onboarding** = soma das aulas obrigatórias concluídas ÷ soma das aulas obrigatórias das trilhas **obrigatórias** atribuídas. Se não houver trilha obrigatória, usa todas as atribuídas.
- **RN-06 Conclusão congelada.** Trilha concluída grava `completed_at`, que não é desfeito se o admin adicionar aulas depois; o % exibido considera as novas aulas, com selo “Nova aula disponível”. *Confirmar — D-11.*
- **RN-07 XP é concedido uma vez por (usuário, motivo, referência)** — garantido por constraint única.
- **RN-08 Quiz:** % = acertos ÷ total × 100, arredondado para baixo. Aprovado se % ≥ `passing_score`. Quiz sem nota mínima (`passing_score = 0`) aprova sempre.
- **RN-09 Usuário desativado** mantém histórico, perde acesso.
- **RN-10 XP não é removido** quando conteúdo é despublicado ou excluído (histórico é imutável).

### Tabela de XP (valores iniciais, configuráveis)

| Evento | XP | Uma vez por |
|---|---:|---|
| Aula concluída | `lessons.xp_reward` (padrão 10) | aula |
| Quiz aprovado | `quizzes.xp_reward` (padrão 20) | quiz |
| Quiz com 100% | +30 bônus | quiz |
| Módulo concluído | 50 | módulo |
| Trilha concluída | 100 | trilha |

### Níveis (iniciais, configuráveis)

| Nível | XP |
|---|---|
| 1 | 0–99 |
| 2 | 100–249 |
| 3 | 250–499 |
| 4 | 500–999 |
| 5 | 1000+ |

### Conquistas iniciais

| Código | Nome | Critério |
|---|---|---|
| `first_lesson` | Primeiro Passo | Concluiu a primeira aula |
| `first_module` | Começou com Tudo | Concluiu o primeiro módulo |
| `perfect_quiz` | Nota 10 | 100% em um quiz |
| `halfway` | Metade do Caminho | ≥ 50% em qualquer trilha |
| `path_completed` | Onboarding Concluído | Concluiu uma trilha |

## 8. Requisitos não funcionais

- **Segurança:** RLS em todas as tabelas; nenhuma chave administrativa no cliente; validação de entrada; proteção server-side de rotas admin.
- **Mobile first:** layout funcional a partir de 360 px; alvos de toque ≥ 44 px.
- **Desempenho:** LCP < 2,5 s em 4G no dashboard; vídeo carregado sob demanda.
- **Acessibilidade:** WCAG 2.1 AA.
- **Confiabilidade:** operações de progresso/XP transacionais e idempotentes.
- **Privacidade (LGPD):** coletar só o necessário; projeto Supabase em `sa-east-1` (São Paulo); admin vê apenas dados de treinamento.
- **Idioma e fuso:** interface em pt-BR; datas em `America/Sao_Paulo`.

## 9. Critérios de aceite do MVP

1. Usuário faz login.
2. Sistema identifica sua área.
3. Usuário vê suas trilhas (e só elas).
4. Abre módulos.
5. Consome conteúdos de todos os tipos.
6. Conclui conteúdos.
7. Progresso persiste entre sessões e dispositivos.
8. Responde quiz.
9. Resultado persiste (tentativas registradas).
10. Recebe XP.
11. XP não duplica (reload, duplo clique, requisição repetida).
12. Desbloqueia conquistas.
13. Admin cria/edita conteúdo.
14. Admin atribui trilha (por área e individual).
15. Admin visualiza progresso.
16. Autorização funciona (pgTAP + E2E cobrindo membro tentando acessar admin e dados alheios).
17. Funciona em mobile e desktop (E2E em 390×844 e 1440×900).

## 10. Métricas pós-lançamento

Taxa de conclusão de trilhas obrigatórias; tempo até concluir o onboarding; nota média por quiz; % de usuários ativos por semana; aulas com maior abandono.
