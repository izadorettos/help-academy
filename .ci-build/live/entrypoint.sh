#!/bin/sh
set -e

# As migrations do banco (supabase/migrations) NÃO rodam aqui: são aplicadas no projeto
# Supabase com `npx supabase db push` antes do deploy (ver git-ops/academy/README.md).

echo "Iniciando o Help Academy na porta ${PORT:-3000}..."
exec node server.js
