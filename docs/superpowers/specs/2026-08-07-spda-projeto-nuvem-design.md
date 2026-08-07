# Salvar projeto SPDA na nuvem

Data: 2026-08-07

## Contexto

A aba SPDA (`src/components/SpdaTab.jsx`) só guarda o estado atual em
`localStorage` — sem nada na nuvem, diferente de Infraestrutura, Capacitores
e Quadro de Cargas, que já salvam/carregam projetos nomeados via Supabase
(`ProjectsPanel.jsx` + um hook `use<Aba>Projects.js` por aba, tabela
`projetos_<aba>` com o estado inteiro num `jsonb`).

Esse padrão é **plano**: um nome = um estado salvo. Não serve para SPDA
porque, na prática, um cliente (site industrial) tem várias estruturas —
"Unidade Cvale Corbélia" pode ter "Administrativo", "Graneleiro",
"Classificação" — e cada uma precisa da própria análise de risco (R1, R3, F
não se somam entre estruturas diferentes; a norma trata cada uma como zona
de estudo própria).

**Decisão deste brainstorm**: a aba SPDA ganha um modelo de dois níveis —
**projeto** (o site/cliente) contendo várias **áreas** (cada uma uma análise
SPDA completa) — só para esta aba. As outras abas continuam com o padrão
plano de hoje; não há pedido nem necessidade de mudar o que já funciona
nelas.

## Modelo de dados

Duas tabelas novas em `supabase/schema.sql`, mesma convenção de nomes e a
mesma política de RLS (`allow all with anon key`, sem login — uso pessoal)
já usada em `projetos` e `projetos_capacitores`:

```sql
-- Projeto principal (o site/cliente).
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

-- Áreas dentro de um projeto SPDA. Cada uma guarda a `entrada` inteira
-- (estrutura, linhas, proteções) da aba, num jsonb — mesma razão de
-- projetos_capacitores: o formato de `entrada` muda com a aba evoluindo, e
-- jsonb evita migração de coluna a cada campo novo.
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
```

`on delete cascade` implementa a decisão já tomada: apagar um projeto apaga
as áreas dele junto. A UI confirma isso mostrando quantas áreas serão
perdidas antes de apagar.

## Camada de acesso — `src/hooks/useSpdaProjects.js`

Um hook cobrindo os dois níveis, no mesmo estilo de `useCapacitorProjects.js`
(funções `useCallback`, sem cache além do próprio estado do hook):

- `projetos` / `loading` / `error` / `refreshProjetos()` — lista de
  `{ id, nome, updated_at }` de `projetos_spda`, mais recente primeiro.
- `createProjeto(nome)` → cria e devolve o projeto (sem área nenhuma ainda).
- `deleteProjeto(id)` → apaga (cascade cuida das áreas).
- `areas` / `areasLoading` / `refreshAreas(projetoId)` — lista de
  `{ id, nome, updated_at }` de `areas_spda` filtrada por `projeto_id`, mais
  recente primeiro. `areas` fica vazio quando nenhum projeto está
  selecionado.
- `createArea(projetoId, nome, entrada)` → insere em `areas_spda` com
  `dados: entrada`, devolve a linha criada.
- `updateArea(id, entrada)` → atualiza `dados` e `updated_at`.
- `loadArea(id)` → `select("*").eq("id", id).single()`, devolve a linha
  inteira (incluindo `projeto_id`, que a UI usa para saber a que projeto a
  área pertence quando carregada direto, sem passar pela lista).
- `deleteArea(id)`.

## Interface — `src/components/spda/SpdaProjectsPanel.jsx`

Painel novo (não reaproveita `ProjectsPanel.jsx`, que é de um nível só),
renderizado no topo da aba SPDA, logo abaixo do cabeçalho:

1. **Seletor de projeto**: `<select>` com os projetos existentes por nome +
   opção "+ novo projeto", que troca o select por um campo de texto e um
   botão "Criar". Nada selecionado → painel mostra só o seletor, sem lista
   de áreas.
2. Com um projeto selecionado, mostra a **lista de áreas** desse projeto —
   mesmo visual de lista que `ProjectsPanel.jsx` já usa (nome + Carregar /
   Apagar) — e um campo "Nome da área" + botão "+ área", que salva a
   `entrada` atual da tela como área nova no projeto selecionado.
3. Com uma área carregada (`activeArea` no estado de `SpdaTab.jsx`), uma
   barra "Editando: **{projeto}** / **{área}**" com "Salvar alterações"
   (regrava `dados` da área) e "Desvincular" (limpa `activeArea` e zera a
   aba para `defaultEntrada()`, com confirmação — mesmo texto de aviso que
   `ProjectsPanel.jsx` usa hoje).
4. Botão "Apagar projeto" ao lado do seletor. Confirmação:
   `Apagar "{nome}" e as N área(s) dentro dele?` (N vem de `areas.length` já
   carregado).
5. Sem `supabaseConfigured`, mesmo aviso que `ProjectsPanel.jsx` já mostra
   ("Salvar projetos requer configurar o Supabase").

O rascunho local (`localStorage`, chave `spdaRisco.v1`) continua exatamente
como hoje — grava a cada mudança de `entrada`, independente de haver área
carregada. A nuvem é uma ação separada de salvar/carregar uma área nomeada.

## Integração em `SpdaTab.jsx`

- Novo estado: `activeArea` (`{ id, nome, projetoId, projetoNome } | null`),
  paralelo ao `entrada` que já existe.
- Handlers seguindo o padrão de `CapacitoresTab.jsx`
  (`handleCreateProject`/`handleSaveChanges`/`handleLoadProject`/
  `handleDeleteProject`/`handleUnlinkProject`), mas com um par a mais para
  projeto (criar/apagar projeto, selecionar projeto ativo na lista).
- **Normalização ao carregar**: a função `carregar()` já existente em
  `SpdaTab.jsx` faz a migração de estado salvo (spread sobre
  `defaultEntrada()`, conversão de `tz` antigo, default de `critico`/`zpr0a`
  nos sistemas). Ela está hoje amarrada à leitura do `localStorage`. Este
  trabalho extrai a parte de normalização para uma função pura
  `normalizarEntrada(salvo)`, reutilizada tanto pelo carregamento do
  localStorage quanto pelo carregamento de uma área da nuvem — sem isso, uma
  área salva antes de um campo novo existir carregaria com
  `undefined`/checkbox não controlado, do mesmo jeito que o
  `localStorage` já tratava antes desta mudança.

## Testes

`normalizarEntrada()` é pura e ganha testes diretos (estado antigo sem
`tz`/`critico`/`zpr0a`, estado já no formato atual, estado vazio). O resto —
hook Supabase e o painel — segue o padrão do projeto: sem teste de unidade
para chamadas de rede ou para o componente em si (nenhuma das abas
existentes testa `useCapacitorProjects`/`ProjectsPanel`); verificação por
navegador, criando projeto, criando duas áreas, alternando entre elas,
apagando área e depois projeto.

## Fora de escopo

- Mudar o padrão plano das outras abas (Infra, Capacitores, Quadro de
  Cargas) para o modelo de dois níveis — decisão já tomada no brainstorm.
- Mover/copiar uma área de um projeto para outro.
- Renomear projeto ou área depois de criado (só criar/apagar).
- Login ou controle de acesso — mesma política aberta ("allow all with anon
  key") das tabelas já existentes.
