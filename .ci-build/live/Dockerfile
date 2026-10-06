# Help Academy — ambiente live.
# Build a partir da raiz do repositório (o workflow gera o .env antes):
#     docker build -f .ci-build/live/Dockerfile .
#
# O .env precisa existir já no build: as variáveis NEXT_PUBLIC_* são embutidas no bundle
# do navegador pelo `next build`. As demais são lidas pelo server.js em runtime (.env).
FROM node:22 AS builder
LABEL stage=builder

ENV TZ=America/Campo_Grande
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /temp
COPY package*.json ./
RUN npm ci
COPY . .

RUN test -s .env || (echo "❌ .env ausente ou vazio — gere-o antes do docker build" && exit 1)

# `output: 'standalone'` no next.config: gera .next/standalone com server.js e só as
# dependências usadas.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Campo_Grande \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache tzdata \
 && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /var/www/app

COPY --from=builder --chown=node:node /temp/.next/standalone ./
COPY --from=builder --chown=node:node /temp/.next/static ./.next/static
COPY --from=builder --chown=node:node /temp/public ./public
COPY --from=builder --chown=node:node /temp/.env ./.env

COPY .ci-build/live/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
