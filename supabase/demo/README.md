# Demo — Conhecendo a HELP

Dados isolados de demonstração. Removíveis com um comando.

## Carregar
```bash
npm run demo:seed
```

## Resetar progresso (re-apresentar)
```bash
npm run demo:reset
```

## Remover completamente
```bash
npm run demo:remove
```

Credenciais do usuário demo: `demo@help.local` / ver `DEMO_USER_PASSWORD` em `.env.local`.

Todos os registros carregados aqui têm `is_demo = true` (ou usam o prefixo de UUID `de000000-`),
o que garante que relatórios e métricas do painel excluem esses dados por padrão. A remoção
apaga tudo em cascata: submissões, progresso, XP, conquistas e usuário demo.
