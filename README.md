# Help Academy

Plataforma de onboarding, treinamento e gamificação da Help Entregas.
Leia o [`CLAUDE.md`](./CLAUDE.md) e a pasta [`docs/`](./docs) antes de contribuir.

## Requisitos

- Node.js 22 (`nvm use`)
- Docker (para o Supabase local, a partir da fase 2)

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium   # uma vez
npm run test:e2e                  # usa o build de produção
```

Status das fases: [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md).
