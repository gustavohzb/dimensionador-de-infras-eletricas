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

-- Projeto SPDA (o site/cliente) — várias áreas dentro dele, cada uma com
-- sua própria análise de risco (a norma trata cada estrutura como zona de
-- estudo própria, então não faz sentido um estado salvo só por cliente).
create table if not exists projetos_spda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projetos_spda enable row level security;

create policy "allow all with anon key" on projetos_spda
  for all
  using (true)
  with check (true);

-- Áreas dentro de um projeto SPDA. `dados` guarda a `entrada` inteira
-- (estrutura, linhas, proteções) num jsonb, mesma razão de
-- projetos_capacitores: evita migração de coluna a cada campo novo do motor.
create table if not exists areas_spda (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos_spda(id) on delete cascade,
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table areas_spda enable row level security;

create policy "allow all with anon key" on areas_spda
  for all
  using (true)
  with check (true);
