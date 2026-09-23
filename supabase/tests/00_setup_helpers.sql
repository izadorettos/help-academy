-- Helpers para os testes pgTAP
-- Executado antes dos arquivos *.test.sql

begin;
select plan(count(*)::integer)
from (
  select * from generate_series(1,1)
) t;

-- Verificar que as extensões básicas estão disponíveis
select ok(
  (select count(*) from pg_extension where extname = 'citext') > 0,
  'extensão citext instalada'
);

select * from finish();
rollback;
