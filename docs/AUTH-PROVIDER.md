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
