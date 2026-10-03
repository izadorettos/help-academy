# Autenticação — provedor desacoplado

**Decisão (Lucas, 24/09/2026):** a versão final usa **o mesmo login e senha do ambiente atual da HELP**. A tecnologia desse ambiente ainda não é conhecida e será definida com o time de TI. Portanto:

1. **Não** construir agora uma autenticação própria definitiva.
2. Deixar o login atrás de uma **interface de provedor**, com o Supabase Auth como implementação **de desenvolvimento**.
3. Não presumir SAML, OIDC, LDAP ou API própria — a arquitetura precisa aceitar qualquer um.

---

## 1. Separação de responsabilidades

| Camada | Responsável hoje | Responsável na versão final |
|---|---|---|
| **Identidade** (quem é a pessoa, confere a senha) | Supabase Auth (local) | **Ambiente HELP** |
| **Sessão no Academy** (cookie, expiração, RLS via `auth.uid()`) | Supabase Auth | Supabase Auth (recomendado manter) |
| **Perfil e autorização** (`profiles`: área, cargo, role, ativo) | Academy | Academy, alimentado pelos dados da HELP |

Manter o Supabase como camada de **sessão** preserva todo o RLS, as RPCs e os testes. O que muda é **como a pessoa prova quem é**. Conforme a resposta do TI, a identidade da HELP entra por um destes caminhos (a escolha fica para depois):
- **SSO por protocolo padrão** (SAML 2.0 ou OpenID Connect): o Supabase recebe a asserção do provedor da HELP e cria a sessão.
- **Login próprio da HELP exposto por API**: uma rota do servidor do Academy confere as credenciais na API da HELP e, se válidas, cria ou atualiza o usuário e abre a sessão Supabase do lado do servidor. A senha nunca é armazenada no Academy.
- **Diretório corporativo** (LDAP/Active Directory, Google Workspace, Microsoft Entra): via SSO do próprio diretório.

## 2. O que implementar agora (sem integrar a HELP)

```
src/lib/auth/
  provider.ts            interface AuthProvider + tipos Identity, AuthCapabilities
  providers/
    supabase.ts          implementação atual (dev/staging)
    help.ts              stub que lança NotConfigured — sem lógica inventada
  index.ts               escolhe o provedor por AUTH_PROVIDER (padrão: supabase)
  guards.ts              requireUser/requireAdmin passam a usar getAuthProvider()
```

```ts
export type Identity = { subject: string; email: string | null; name: string | null }
export type AuthCapabilities = {
  passwordLogin: boolean      // formulário usuário+senha nesta tela
  passwordReset: boolean      // "Esqueci minha senha" no Academy
  invites: boolean            // admin convida pelo Academy
  externalRedirect: boolean   // login acontece em outra página (SSO)
}
export interface AuthProvider {
  readonly id: 'supabase' | 'help'
  readonly capabilities: AuthCapabilities
  getIdentity(): Promise<Identity | null>
  signInWithPassword(input: { login: string; password: string }): Promise<AuthResult>
  startExternalSignIn?(returnTo: string): Promise<{ redirectUrl: string }>
  signOut(): Promise<void>
  requestPasswordReset?(login: string): Promise<AuthResult>
}
```

- Nenhum arquivo fora de `src/lib/auth/providers/` chama `supabase.auth.*` diretamente (hoje chamam: `features/auth/actions.ts`, `app/auth/confirm`, `app/(auth)/redefinir-senha`, `app/page.tsx`, `lib/supabase/proxy.ts`, `api/admin/relatorios/csv`). Teste unitário garante isso por varredura.
- O campo do formulário vira **“Login”** (não “Email”) e o schema aceita um identificador genérico; a validação específica fica no provedor.
- Telas de convite, “Esqueci minha senha” e “Definir senha” aparecem **somente** se o provedor declara a capacidade.
- `profiles` ganha `auth_provider text not null default 'supabase'` e `external_subject text null`, com `unique (auth_provider, external_subject)` — para mapear a pessoa da HELP sem depender do ID interno.
- **Usuário de teste local:** continua pelo Supabase local, com senha em `.env.local` (nunca no repositório) e bloqueio para não rodar o seed de teste fora de `localhost`. Em produção, `AUTH_PROVIDER=supabase` com usuários de teste é proibido (checagem no boot: se `NODE_ENV=production` e existir usuário `@help.local`, o app loga erro e não sobe).

## 3. O que ainda depende da autenticação da HELP

- Login de produção com usuário e senha da HELP (e o identificador usado: email, CPF, matrícula ou outro).
- Primeiro acesso e recuperação de senha (provavelmente ficam no ambiente HELP, e o Academy só redireciona).
- **Provisionamento:** quem cria as pessoas no Academy e como área, cargo e data de entrada chegam (hoje o admin convida manualmente).
- **Desligamento:** desativar no Academy quem sai da HELP.
- Quem é administrador do Academy (grupo/perfil vindo da HELP ou definido no Academy).
- Política de sessão: expiração, logout único, MFA.
- Deploy de produção (Fase 17) — sem isso o Academy só roda com usuários de teste.

## 4. Perguntas para o time de TI

1. **Tecnologia do login atual:** é SSO por SAML 2.0, OpenID Connect/OAuth 2.0, diretório (Active Directory/LDAP, Google Workspace, Microsoft Entra) ou um sistema próprio da HELP? Existe API documentada de autenticação?
2. **Identificador:** as pessoas entram com email, CPF, matrícula ou usuário? É o mesmo para time interno, entregadores parceiros e estabelecimentos — ou cada público tem um login diferente?
3. **Público:** entregadores e estabelecimentos também estão nesse ambiente? Se não, onde se autenticam hoje?
4. **Dados de integração** (conforme o protocolo): URL de metadata/issuer, client ID/secret ou certificado, URLs de retorno permitidas, escopos. Existe **ambiente de homologação** e usuários de teste que podemos usar?
5. **Atributos disponíveis** após o login e o nome de cada campo: nome, email, área/departamento, cargo, data de entrada, status ativo, foto, gestor.
6. **Provisionamento e desligamento:** como saber quem entrou e quem saiu (SCIM, webhook, API de consulta, exportação periódica)? Com que frequência?
7. **Administração:** existe grupo/perfil no ambiente HELP que deva virar “admin do Academy”?
8. **Política de sessão e segurança:** tempo de expiração, MFA obrigatório, logout único, restrição por IP/rede, requisitos de LGPD e de armazenamento de dados.
9. **Senha:** primeiro acesso, troca e recuperação acontecem sempre no ambiente HELP? Qual URL devemos indicar?
10. **Operação:** limites de uso da API, disponibilidade esperada, janela de manutenção e contato técnico responsável pela integração.

---

## 5. Implementação: login pela API do Core da HELP (03/10/2026)

O ambiente HELP é o **Core** (NestJS, `repo/Core`), que expõe login por API. Foi adotado o caminho **"Login próprio da HELP exposto por API"** da seção 1. Ativação: `AUTH_PROVIDER=help`.

**Fluxo** (`src/lib/auth/providers/help.ts`, `help-core.ts`, `core-jwt.ts`):
1. A página `/login` exibe o **Cloudflare Turnstile** (obrigatório). O botão "Entrar" só habilita com o token; após cada tentativa o widget é renovado (o token é de uso único).
2. O Server Action envia `{ email, senha, captchaToken }` à **rota pública** `POST /usuario/login` do Core. Sem token, o Core nem é chamado. O Core valida o captcha (com `TURNSTILE_SECRET_KEY`) antes da senha.
   - O Core recusa entregadores nessa rota (403, já depois do captcha); nesse caso o Academy tenta `POST /entregador/login`.
3. O **accessToken (JWT) devolvido é validado no servidor do Academy**: algoritmo HS256 (rejeita `none` e outros), assinatura com `HELP_CORE_JWT_SECRET` (= `JWT_SECRET` do Core), expiração (tolerância de 60 s) e email igual ao do login. **Email e perfil vêm das claims assinadas** (`email`, `tipo`), não do corpo da resposta. O token do Core não é armazenado.
4. O Academy localiza o perfil por `(auth_provider='help', external_subject=<id do usuário no Core>)`; se não houver, por email (vincula contas criadas antes da integração e preserva o progresso); se não houver, cria o usuário no Supabase Auth (`email_confirm: true`, sem senha).
5. A cada login são sincronizados email, nome e **role**: `tipo = Administrador` → `admin`; demais perfis (`Analista`, `Gestor`, `Estabelecimento`, `Afiliado`, `PessoaFisica`, `Entregador`) → `member`.
6. A sessão Supabase é aberta no servidor (`auth.admin.generateLink('magiclink')` + `verifyOtp`), gravando os cookies normais. RLS, RPCs e o `proxy.ts` continuam iguais.

**Regras**
- A senha não é armazenada no Academy. Perfis com `active = false` não entram, mesmo com login válido no Core.
- Erros para a pessoa são genéricos ("Login ou senha inválidos.", "Confirme que você não é um robô…" ou "tente novamente"); o motivo do Core vai para o log do servidor.
- Capacidades: `passwordReset` e `invites` desligados — senha e cadastro são geridos no Core.
- CSP (`next.config.ts`): `https://challenges.cloudflare.com` liberado em `script-src` e `frame-src`.
- `/login` é renderizada por requisição (`connection()`), então a site key é lida em runtime.

**Variáveis** (`.env.example`, todas obrigatórias com `AUTH_PROVIDER=help`): `HELP_CORE_API_URL`, `HELP_CORE_JWT_SECRET` (somente servidor), `HELP_TURNSTILE_SITE_KEY` (pública, a mesma do Front).

**Atenção**
- O Turnstile só é de fato validado se o Core tiver `TURNSTILE_SECRET_KEY` (sem ela o `TurnstileService` do Core aprova qualquer token). O Academy não pode validá-lo por conta própria: o token é de uso único e é consumido pelo Core.
- `HELP_CORE_JWT_SECRET` é o segredo que assina **todos** os tokens do Core: quem o tiver consegue emitir tokens válidos para o Core. Guardar só no servidor/gerenciador de segredos.

**Pendências**
- O painel admin ainda oferece "Convidar usuário" (Supabase) mesmo com `AUTH_PROVIDER=help`; não usa `capabilities.invites`.
- Área (`department_id`) não vem do Core; continua definida pelo admin no Academy.
- Desligamento: quem for desativado/deletado no Core deixa de conseguir entrar, mas a sessão já aberta vale até expirar (`jwt_expiry`).
