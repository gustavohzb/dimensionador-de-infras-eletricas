-- Execute este script no SQL Editor do Supabase (Project > SQL Editor > New query).

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  infra_type text not null,
  eletroduto_norma text,
  leito_flange text,
  tray_width numeric not null,
  tray_height numeric not null,
  cables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projetos enable row level security;

-- Sem sistema de login: qualquer pessoa com a chave "anon" (pública, do
-- front-end) pode ler/salvar/apagar projetos. Adequado para uso pessoal;
-- não use esta política se o app for multiusuário ou público.
create policy "allow all with anon key" on projetos
  for all
  using (true)
  with check (true);

-- Projetos da aba "Capacitores". O estado do banco tem muitos campos
-- (tensões, fatores, estágios, parâmetros da placa), então guardamos tudo
-- num único jsonb `dados` em vez de uma coluna por campo — assim adicionar
-- um parâmetro novo não exige migração.
create table if not exists projetos_capacitores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projetos_capacitores enable row level security;

create policy "allow all with anon key" on projetos_capacitores
  for all
  using (true)
  with check (true);
