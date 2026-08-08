# Projeto SPDA na Nuvem (Projeto + Áreas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar salvamento em nuvem (Supabase) à aba SPDA, com um modelo de dois níveis — um projeto (site/cliente) contém várias áreas, cada uma com sua própria análise de risco SPDA completa.

**Architecture:** Duas tabelas novas no Supabase (`projetos_spda`, `areas_spda` com FK em cascade). Um hook `useSpdaProjects.js` cobrindo CRUD dos dois níveis, no mesmo estilo de `useCapacitorProjects.js` já existente no projeto. Um painel novo `SpdaProjectsPanel.jsx` (não reaproveita o `ProjectsPanel.jsx` genérico, que é de um nível só) renderizado no topo da aba. A lógica de migração de estado salvo (hoje só usada pelo localStorage) é extraída para uma função pura reutilizada tanto pelo carregamento local quanto pelo carregamento de uma área da nuvem.

**Tech Stack:** React 19, Vite, Vitest, `@supabase/supabase-js` (já uma dependência do projeto).

## Global Constraints

- O modelo de dois níveis (projeto → várias áreas) é exclusivo da aba SPDA — não mexe nas tabelas/hooks/painéis das outras abas (`projetos`, `projetos_capacitores`, `ProjectsPanel.jsx`).
- Apagar um projeto apaga as áreas dele junto (`on delete cascade` no banco).
- Mesma política de RLS das tabelas já existentes: `allow all with anon key`, sem login.
- O rascunho local (`localStorage`, chave `spdaRisco.v1`) continua funcionando exatamente como hoje, independente de haver área carregada.
- `supabase/schema.sql` não roda sozinho — é executado manualmente no SQL Editor do Supabase. As tasks que dependem do banco (Task 3 em diante) só funcionam de ponta a ponta depois que alguém rodar o SQL da Task 1 lá.

---

## File Structure

- **Modificar** `supabase/schema.sql` — acrescenta `projetos_spda` e `areas_spda`.
- **Criar** `src/lib/spdaEntrada.js` — `normalizarEntrada(salvo)`, extraída de `SpdaTab.jsx`.
- **Criar** `src/lib/spdaEntrada.test.js`.
- **Modificar** `src/components/SpdaTab.jsx` — usa `normalizarEntrada` no lugar da lógica que estava embutida em `carregar()`.
- **Criar** `src/hooks/useSpdaProjects.js` — CRUD de projeto e área.
- **Criar** `src/components/spda/SpdaProjectsPanel.jsx` — painel de dois níveis.
- **Modificar** `src/components/SpdaTab.jsx` (de novo, tarefa separada) — liga o hook e o painel.
- **Modificar** `src/data/changelog.js` — entrada da versão 1.24.0.

---

### Task 1: Tabelas no Supabase

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: tabelas `projetos_spda(id, nome, created_at, updated_at)` e `areas_spda(id, projeto_id, nome, dados jsonb, created_at, updated_at)`, consumidas pelo hook da Task 3.

- [ ] **Step 1: Acrescentar o SQL**

Ao final de `supabase/schema.sql`, depois do bloco de `projetos_capacitores`:

```sql

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
```

- [ ] **Step 2: Commit**

```bash
cd eletrocalha-app
git add supabase/schema.sql
git commit -m "Adiciona tabelas projetos_spda e areas_spda"
```

Este arquivo não é aplicado automaticamente — a Task 6 (verificação final) lembra de rodá-lo no SQL Editor do Supabase antes de testar a funcionalidade fim a fim no navegador.

---

### Task 2: Extrair `normalizarEntrada` para reuso entre localStorage e nuvem

**Files:**
- Create: `src/lib/spdaEntrada.js`
- Create: `src/lib/spdaEntrada.test.js`
- Modify: `src/components/SpdaTab.jsx:1-41` (a função `carregar()`)

**Interfaces:**
- Consumes: `defaultEntrada()` de `src/lib/spdaRisco.js`.
- Produces: `normalizarEntrada(salvo)` → `{ estrutura, linhas, protecoes }`, mesma forma de `defaultEntrada()`. Usada por `SpdaTab.jsx` (Task 2, no carregamento local) e pela Task 5 (no carregamento de área da nuvem).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/spdaEntrada.test.js`:

```js
import { describe, it, expect } from "vitest";
import { normalizarEntrada } from "./spdaEntrada";
import { defaultEntrada } from "./spdaRisco";

describe("normalizarEntrada", () => {
  it("sem nada salvo, devolve defaultEntrada()", () => {
    expect(normalizarEntrada(null)).toEqual(defaultEntrada());
    expect(normalizarEntrada(undefined)).toEqual(defaultEntrada());
  });

  it("migra o campo antigo tz (horas/ano) para horasDia/diasSemana", () => {
    const salvo = { estrutura: { tz: 3650 }, linhas: [], protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.estrutura.tz).toBeUndefined();
    expect(r.estrutura.horasDia).toBeCloseTo(10, 1); // 3650/365
    expect(r.estrutura.diasSemana).toBe(7);
  });

  it("não sobrescreve horasDia se já estiver presente, mesmo com tz salvo", () => {
    const salvo = { estrutura: { tz: 3650, horasDia: 8, diasSemana: 5 }, linhas: [], protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.estrutura.horasDia).toBe(8);
    expect(r.estrutura.diasSemana).toBe(5);
  });

  it("sistemas sem critico/zpr0a recebem os defaults", () => {
    const salvo = {
      estrutura: {},
      linhas: [{ id: "l1" }],
      protecoes: { sistemas: [{ id: "s1", uw: 2.5 }] },
    };
    const r = normalizarEntrada(salvo);
    expect(r.protecoes.sistemas[0]).toMatchObject({ id: "s1", uw: 2.5, critico: false, zpr0a: false });
  });

  it("sistema que já tem critico/zpr0a preserva os valores", () => {
    const salvo = {
      estrutura: {},
      linhas: [],
      protecoes: { sistemas: [{ id: "s1", critico: true, zpr0a: true }] },
    };
    const r = normalizarEntrada(salvo);
    expect(r.protecoes.sistemas[0]).toMatchObject({ critico: true, zpr0a: true });
  });

  it("sem linhas salvas, usa as linhas do default", () => {
    const salvo = { estrutura: {}, protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.linhas).toEqual(defaultEntrada().linhas);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaEntrada.test.js`
Expected: FAIL — `spdaEntrada.js` ainda não existe.

- [ ] **Step 3: Implementar**

Criar `src/lib/spdaEntrada.js`:

```js
// Migração de estado salvo (localStorage ou área da nuvem) para o formato
// atual de `entrada`. Extraída de SpdaTab.jsx para ser reutilizada tanto no
// carregamento local quanto no carregamento de uma área do Supabase — sem
// isso, uma área salva antes de um campo novo existir carregaria com
// undefined, e um checkbox sem valor definido nasce "não controlado".
import { defaultEntrada } from "./spdaRisco";

export function normalizarEntrada(salvo) {
  if (!salvo) return defaultEntrada();
  const base = defaultEntrada();
  const estrutura = { ...base.estrutura, ...salvo.estrutura };
  // A ocupação era guardada em horas por ano; virou horas por dia mais dias
  // por semana. Converte o que estiver salvo assumindo semana cheia, que é
  // como o valor antigo tinha sido informado.
  if (salvo.estrutura?.tz != null && salvo.estrutura.horasDia == null) {
    estrutura.horasDia = Math.min(24, +(salvo.estrutura.tz / 365).toFixed(2));
    estrutura.diasSemana = 7;
  }
  delete estrutura.tz;
  // Sistemas salvos antes da Seção 7 não têm as marcações novas.
  const protecoes = { ...base.protecoes, ...salvo.protecoes };
  protecoes.sistemas = (protecoes.sistemas ?? []).map((s) => ({
    critico: false, zpr0a: false, ...s,
  }));
  return { estrutura, linhas: salvo.linhas ?? base.linhas, protecoes };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaEntrada.test.js`
Expected: PASS em todos os 6 testes.

- [ ] **Step 5: Usar em `SpdaTab.jsx`**

Em `src/components/SpdaTab.jsx`, substituir o import e a função `carregar()` (linhas 1-41):

```js
import { useEffect, useMemo, useState } from "react";
import { defaultEntrada, avaliarRisco } from "../lib/spdaRisco";
import { normalizarEntrada } from "../lib/spdaEntrada";
import { exportSpdaPDF } from "../lib/spdaPdf";
import VereditoRisco from "./spda/VereditoRisco";
import ResultadoRisco from "./spda/ResultadoRisco";
import FrequenciaDanos from "./spda/FrequenciaDanos";
import SugestaoMedidas from "./spda/SugestaoMedidas";
import EstruturaForm from "./spda/EstruturaForm";
import LinhasForm from "./spda/LinhasForm";
import ProtecoesForm from "./spda/ProtecoesForm";

const STORAGE_KEY = "spdaRisco.v1";

// Lazy: sem a função, o parse do localStorage rodaria a cada render.
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizarEntrada(JSON.parse(raw));
  } catch { /* estado inicial */ }
  return defaultEntrada();
}
```

(O resto do arquivo, a partir de `export default function SpdaTab()`, não muda nesta task.)

- [ ] **Step 6: Rodar a suíte inteira**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos — nenhum teste existente depende da forma antiga de `carregar()`.

- [ ] **Step 7: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaEntrada.js src/lib/spdaEntrada.test.js src/components/SpdaTab.jsx
git commit -m "Extrai normalizarEntrada para reuso entre localStorage e áreas da nuvem"
```

---

### Task 3: Hook `useSpdaProjects`

**Files:**
- Create: `src/hooks/useSpdaProjects.js`

**Interfaces:**
- Consumes: `supabase`, `supabaseConfigured` de `src/lib/supabaseClient.js`; tabelas `projetos_spda`/`areas_spda` (Task 1).
- Produces (consumido pela Task 5):
  - `projetos: Array<{id, nome, updated_at}>`, `loading: boolean`, `error: string|null`, `refreshProjetos(): Promise<void>`
  - `createProjeto(nome: string): Promise<{id, nome, ...}>`
  - `deleteProjeto(id: string): Promise<void>`
  - `areas: Array<{id, nome, updated_at}>`, `areasLoading: boolean`, `areasError: string|null`, `refreshAreas(projetoId: string|null): Promise<void>`
  - `createArea(projetoId: string, nome: string, entrada: object): Promise<{id, nome, projeto_id, ...}>`
  - `updateArea(id: string, entrada: object, projetoId: string|null): Promise<void>`
  - `loadArea(id: string): Promise<{id, nome, projeto_id, dados, ...}>`
  - `deleteArea(id: string, projetoId: string|null): Promise<void>`

Sem teste de unidade — nenhum hook de projeto existente no repositório tem
teste (`useCapacitorProjects.js`, `useProjects.js`, `useCabosProjects.js`
não têm arquivo `.test.js`); chamadas de rede ao Supabase são verificadas
por navegador na Task 5.

- [ ] **Step 1: Implementar**

Criar `src/hooks/useSpdaProjects.js`:

```js
import { useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

// CRUD dos dois níveis da aba SPDA: projeto (site/cliente) e área (uma
// análise de risco completa dentro dele). `areas` fica vazio sem projeto
// selecionado — refreshAreas(null) limpa a lista em vez de consultar.
export function useSpdaProjects() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState(null);

  const refreshProjetos = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("projetos_spda")
      .select("id, nome, updated_at")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setProjetos(data);
    setLoading(false);
  }, []);

  const createProjeto = useCallback(async (nome) => {
    const { data, error: err } = await supabase
      .from("projetos_spda")
      .insert({ nome })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await refreshProjetos();
    return data;
  }, [refreshProjetos]);

  const deleteProjeto = useCallback(async (id) => {
    const { error: err } = await supabase.from("projetos_spda").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refreshProjetos();
  }, [refreshProjetos]);

  const refreshAreas = useCallback(async (projetoId) => {
    if (!supabaseConfigured || !projetoId) {
      setAreas([]);
      return;
    }
    setAreasLoading(true);
    setAreasError(null);
    const { data, error: err } = await supabase
      .from("areas_spda")
      .select("id, nome, updated_at")
      .eq("projeto_id", projetoId)
      .order("updated_at", { ascending: false });
    if (err) setAreasError(err.message);
    else setAreas(data);
    setAreasLoading(false);
  }, []);

  const createArea = useCallback(async (projetoId, nome, entrada) => {
    const { data, error: err } = await supabase
      .from("areas_spda")
      .insert({ projeto_id: projetoId, nome, dados: entrada })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await refreshAreas(projetoId);
    return data;
  }, [refreshAreas]);

  const updateArea = useCallback(async (id, entrada, projetoId) => {
    const { error: err } = await supabase
      .from("areas_spda")
      .update({ dados: entrada, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw new Error(err.message);
    if (projetoId) await refreshAreas(projetoId);
  }, [refreshAreas]);

  const loadArea = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from("areas_spda")
      .select("*")
      .eq("id", id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  const deleteArea = useCallback(async (id, projetoId) => {
    const { error: err } = await supabase.from("areas_spda").delete().eq("id", id);
    if (err) throw new Error(err.message);
    if (projetoId) await refreshAreas(projetoId);
  }, [refreshAreas]);

  return {
    projetos, loading, error, refreshProjetos, createProjeto, deleteProjeto,
    areas, areasLoading, areasError, refreshAreas, createArea, updateArea, loadArea, deleteArea,
  };
}
```

- [ ] **Step 2: Rodar a suíte inteira (garantir que nada quebrou)**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos.

- [ ] **Step 3: Commit**

```bash
cd eletrocalha-app
git add src/hooks/useSpdaProjects.js
git commit -m "Hook useSpdaProjects: CRUD de projeto e área"
```

---

### Task 4: Painel `SpdaProjectsPanel`

**Files:**
- Create: `src/components/spda/SpdaProjectsPanel.jsx`

**Interfaces:**
- Consumes: `supabaseConfigured` de `src/lib/supabaseClient.js`. Todos os dados e callbacks vêm de props (nenhuma chamada direta ao hook — quem liga isso é a Task 5).
- Produces: componente `SpdaProjectsPanel` com as props abaixo, consumido pela Task 5.

```
projetos: Array<{id, nome, updated_at}>
loadingProjetos: boolean
errorProjetos: string | null
projetoSelecionadoId: string | null
onSelecionarProjeto: (id: string | null) => void
onCriarProjeto: (nome: string) => Promise<void>
onApagarProjeto: (id: string) => Promise<void>
areas: Array<{id, nome, updated_at}>
loadingAreas: boolean
activeArea: {id, nome, projetoId, projetoNome} | null
onCriarArea: (nome: string) => Promise<void>
onSalvarArea: () => Promise<void>
onCarregarArea: (id: string) => Promise<void>
onApagarArea: (id: string) => Promise<void>
onDesvincular: () => void
```

Sem teste de unidade — mesmo padrão de `ProjectsPanel.jsx`, que também não
tem teste (verificação por navegador, feita na Task 5 depois de tudo
ligado).

- [ ] **Step 1: Implementar**

Criar `src/components/spda/SpdaProjectsPanel.jsx`:

```jsx
import { useState } from "react";
import { supabaseConfigured } from "../../lib/supabaseClient";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function SpdaProjectsPanel({
  projetos, loadingProjetos, errorProjetos,
  projetoSelecionadoId, onSelecionarProjeto,
  onCriarProjeto, onApagarProjeto,
  areas, loadingAreas,
  activeArea,
  onCriarArea, onSalvarArea, onCarregarArea, onApagarArea, onDesvincular,
}) {
  const [criandoProjeto, setCriandoProjeto] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [nomeArea, setNomeArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!supabaseConfigured) {
    return (
      <p className="rounded-xs border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        Salvar projetos requer configurar o Supabase (arquivo <code>.env.local</code>).
      </p>
    );
  }

  const projetoAtual = projetos.find((p) => p.id === projetoSelecionadoId) ?? null;

  const handleCriarProjeto = async () => {
    if (!nomeProjeto.trim()) return;
    setBusy(true);
    try {
      await onCriarProjeto(nomeProjeto.trim());
      setNomeProjeto("");
      setCriandoProjeto(false);
    } catch (e) {
      alert("Erro ao criar projeto: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleApagarProjeto = async () => {
    if (!projetoAtual) return;
    const aviso = areas.length
      ? `Apagar "${projetoAtual.nome}" e ${areas.length === 1 ? "a área" : `as ${areas.length} áreas`} dentro dele?`
      : `Apagar "${projetoAtual.nome}"?`;
    if (!window.confirm(aviso)) return;
    setBusy(true);
    try {
      await onApagarProjeto(projetoAtual.id);
    } catch (e) {
      alert("Erro ao apagar projeto: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCriarArea = async () => {
    if (!nomeArea.trim()) return;
    setBusy(true);
    try {
      await onCriarArea(nomeArea.trim());
      setNomeArea("");
    } catch (e) {
      alert("Erro ao criar área: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSalvarArea = async () => {
    setBusy(true);
    try {
      await onSalvarArea();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCarregarArea = async (id) => {
    setBusyId(id);
    try {
      await onCarregarArea(id);
    } catch (e) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleApagarArea = async (id, nome) => {
    if (!window.confirm(`Apagar a área "${nome}"?`)) return;
    setBusyId(id);
    try {
      await onApagarArea(id);
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Projeto
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        {!criandoProjeto ? (
          <>
            <select
              value={projetoSelecionadoId ?? ""}
              onChange={(e) => onSelecionarProjeto(e.target.value || null)}
              className={`max-w-xs ${inputCls}`}
            >
              <option value="">Escolha um projeto…</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCriandoProjeto(true)}
              className="rounded-xs border border-copper-600 px-2.5 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              + novo projeto
            </button>
            {projetoAtual && (
              <button
                type="button"
                onClick={handleApagarProjeto}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Apagar projeto
              </button>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarProjeto()}
              placeholder="Nome do projeto (ex.: Unidade Cvale Corbélia)"
              autoFocus
              className={`max-w-xs ${inputCls}`}
            />
            <button
              type="button"
              onClick={handleCriarProjeto}
              disabled={busy || !nomeProjeto.trim()}
              className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-copper-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => { setCriandoProjeto(false); setNomeProjeto(""); }}
              className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
            >
              cancelar
            </button>
          </>
        )}
      </div>

      {loadingProjetos && <p className="mt-2 text-xs text-slate-400">Carregando projetos…</p>}
      {errorProjetos && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorProjetos}</p>}

      {projetoAtual && (
        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {activeArea && activeArea.projetoId === projetoAtual.id && (
            <div className="flex items-center justify-between gap-2 rounded-xs border border-copper-200 bg-copper-50 px-3 py-2 dark:border-copper-800 dark:bg-copper-500/10">
              <span className="truncate text-sm text-copper-800 dark:text-copper-300">
                Editando: <b>{activeArea.projetoNome}</b> / <b>{activeArea.nome}</b>
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSalvarArea}
                  disabled={busy}
                  className="rounded-xs bg-copper-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
                >
                  Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={onDesvincular}
                  disabled={busy}
                  className="rounded-xs border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Desvincular
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={nomeArea}
              onChange={(e) => setNomeArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarArea()}
              placeholder="Nome da área (ex.: Administrativo)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleCriarArea}
              disabled={busy || !nomeArea.trim()}
              className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              + área
            </button>
          </div>

          {loadingAreas && <p className="text-xs text-slate-400">Carregando áreas…</p>}

          {!loadingAreas && areas.length === 0 && (
            <p className="rounded-xs border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
              Nenhuma área salva ainda neste projeto
            </p>
          )}

          {areas.length > 0 && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {areas.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-2 rounded-xs border px-3 py-1.5 text-sm ${
                    activeArea?.id === a.id
                      ? "border-copper-300 bg-copper-50 dark:border-copper-700 dark:bg-copper-500/10"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">{a.nome}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => handleCarregarArea(a.id)}
                      className="text-xs font-medium text-copper-600 hover:underline disabled:opacity-50 dark:text-copper-400"
                    >
                      Carregar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => handleApagarArea(a.id, a.nome)}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rodar a suíte inteira e o build**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos.

Run: `cd eletrocalha-app && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
cd eletrocalha-app
git add src/components/spda/SpdaProjectsPanel.jsx
git commit -m "Painel SpdaProjectsPanel (projeto + áreas)"
```

---

### Task 5: Ligar o hook e o painel em `SpdaTab.jsx`

**Files:**
- Modify: `src/components/SpdaTab.jsx`

**Interfaces:**
- Consumes: `useSpdaProjects()` (Task 3), `<SpdaProjectsPanel>` (Task 4), `normalizarEntrada()` (Task 2).
- Produces: nada consumido por outro task — ponta final da funcionalidade.

- [ ] **Step 1: Adicionar o estado, os handlers e o painel**

Em `src/components/SpdaTab.jsx`, acrescentar aos imports (depois de
`import { exportSpdaPDF } from "../lib/spdaPdf";`):

```js
import { useSpdaProjects } from "../hooks/useSpdaProjects";
import SpdaProjectsPanel from "./spda/SpdaProjectsPanel";
```

Dentro de `export default function SpdaTab()`, logo depois da linha
`const [entrada, setEntrada] = useState(carregar);`, acrescentar:

```js
  // Registro de projetos SPDA (Supabase): projeto = site/cliente, área =
  // uma análise de risco completa dentro dele. O rascunho local acima
  // continua funcionando independente de haver área carregada.
  const projectsApi = useSpdaProjects();
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState(null);
  const [activeArea, setActiveArea] = useState(null);

  useEffect(() => {
    projectsApi.refreshProjetos();
  }, [projectsApi.refreshProjetos]);

  useEffect(() => {
    projectsApi.refreshAreas(projetoSelecionadoId);
  }, [projetoSelecionadoId, projectsApi.refreshAreas]);

  const handleCriarProjeto = async (nome) => {
    const criado = await projectsApi.createProjeto(nome);
    setProjetoSelecionadoId(criado.id);
  };

  const handleApagarProjeto = async (id) => {
    await projectsApi.deleteProjeto(id);
    if (projetoSelecionadoId === id) setProjetoSelecionadoId(null);
    if (activeArea?.projetoId === id) setActiveArea(null);
  };

  const handleCriarArea = async (nome) => {
    const criado = await projectsApi.createArea(projetoSelecionadoId, nome, entrada);
    const projeto = projectsApi.projetos.find((p) => p.id === projetoSelecionadoId);
    setActiveArea({ id: criado.id, nome: criado.nome, projetoId: projetoSelecionadoId, projetoNome: projeto?.nome ?? "" });
  };

  const handleSalvarArea = async () => {
    await projectsApi.updateArea(activeArea.id, entrada, activeArea.projetoId);
  };

  const handleCarregarArea = async (id) => {
    const salvo = await projectsApi.loadArea(id);
    setEntrada(normalizarEntrada(salvo.dados));
    const projeto = projectsApi.projetos.find((p) => p.id === salvo.projeto_id);
    setActiveArea({ id: salvo.id, nome: salvo.nome, projetoId: salvo.projeto_id, projetoNome: projeto?.nome ?? "" });
    setProjetoSelecionadoId(salvo.projeto_id);
  };

  const handleApagarArea = async (id) => {
    await projectsApi.deleteArea(id, projetoSelecionadoId);
    if (activeArea?.id === id) setActiveArea(null);
  };

  const handleDesvincularArea = () => {
    if (!window.confirm("Desvincular e zerar a aba (estrutura, linhas e proteções)?")) return;
    setActiveArea(null);
    setEntrada(defaultEntrada());
  };
```

No JSX, logo depois do `</div>` que fecha o cartão de cabeçalho (antes do
comentário `{/* Sem município escolhido ... */}` e de `<VereditoRisco`),
acrescentar:

```jsx
      <SpdaProjectsPanel
        projetos={projectsApi.projetos}
        loadingProjetos={projectsApi.loading}
        errorProjetos={projectsApi.error}
        projetoSelecionadoId={projetoSelecionadoId}
        onSelecionarProjeto={setProjetoSelecionadoId}
        onCriarProjeto={handleCriarProjeto}
        onApagarProjeto={handleApagarProjeto}
        areas={projectsApi.areas}
        loadingAreas={projectsApi.areasLoading}
        activeArea={activeArea}
        onCriarArea={handleCriarArea}
        onSalvarArea={handleSalvarArea}
        onCarregarArea={handleCarregarArea}
        onApagarArea={handleApagarArea}
        onDesvincular={handleDesvincularArea}
      />
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos.

- [ ] **Step 3: Verificar no navegador**

**Pré-requisito**: o SQL da Task 1 precisa já ter sido executado no SQL
Editor do Supabase (projeto configurado em `.env.local`), senão o painel
mostra o aviso "Salvar projetos requer configurar o Supabase" ou os
`selects`/`inserts` falham com erro de tabela inexistente.

Usar o preview do Claude Code, navegar até a aba SPDA, e:

1. Sem projeto selecionado, o painel mostra só o seletor "Escolha um
   projeto…" — sem lista de áreas.
2. Clicar "+ novo projeto", digitar "Unidade Cvale Corbélia", Criar — o
   projeto aparece selecionado, com "Nenhuma área salva ainda neste
   projeto".
3. Preencher o galpão padrão com um município (para ter N_G) e clicar "+
   área" com o nome "Administrativo" — aparece na lista, e a barra
   "Editando: Unidade Cvale Corbélia / Administrativo" surge com "Salvar
   alterações" e "Desvincular".
4. Mudar algum campo da estrutura (ex. dimensões) e clicar "+ área" de novo
   com o nome "Graneleiro" — cria uma segunda área, distinta da primeira.
5. Clicar "Carregar" na área "Administrativo" — os campos da tela voltam ao
   que foi salvo nela (não ao estado atual da tela, que era o de
   "Graneleiro"), e a barra muda para "Administrativo".
6. Mudar um campo, clicar "Salvar alterações" — sem erro; carregar de novo a
   mesma área confirma que persistiu.
7. Clicar "Apagar" na área "Graneleiro" — some da lista.
8. Clicar "Desvincular" — a barra some, a aba zera para o galpão padrão sem
   N_G.
9. Clicar "Apagar projeto" — confirmação mostra corretamente quantas áreas
   restam (1, "Administrativo"); confirmar apaga o projeto e ele some do
   seletor.
10. Console sem erros em nenhum passo.

- [ ] **Step 4: Commit**

```bash
cd eletrocalha-app
git add src/components/SpdaTab.jsx
git commit -m "Liga o painel de projeto/área SPDA à aba"
```

---

### Task 6: Changelog e verificação final

**Files:**
- Modify: `src/data/changelog.js`

- [ ] **Step 1: Acrescentar a entrada do changelog**

Em `src/data/changelog.js`, depois da entrada `versao: "1.23.0"`:

```js
  {
    versao: "1.24.0",
    data: "2026-08-07",
    titulo: "Projeto SPDA na nuvem, com áreas por estrutura",
    tipo: "novo",
    itens: [
      "A aba SPDA passa a salvar projetos na nuvem: um projeto (o site ou cliente) agrupa várias áreas, cada uma com sua própria análise de risco completa — diferente do salvamento único das outras abas, porque a norma trata cada estrutura como zona de estudo própria.",
      "Painel \"Projeto\" no topo da aba: criar/apagar projeto, criar/carregar/apagar área, e uma barra de edição mostrando projeto e área atuais.",
    ],
  },
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos — inclui `changelog.test.js`.

- [ ] **Step 3: Build de produção**

Run: `cd eletrocalha-app && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
cd eletrocalha-app
git add src/data/changelog.js
git commit -m "Changelog 1.24.0 — projeto SPDA na nuvem"
```

- [ ] **Step 5: Revisão final e integração**

Com todos os tasks commitados na branch `spda-nuvem`, seguir o fluxo já
usado nas features anteriores deste projeto: revisão de código de ponta a
ponta (superpowers:requesting-code-review) e, aprovado, merge para `master`
com `superpowers:finishing-a-development-branch`. Lembrar de avisar o
usuário que o SQL da Task 1 precisa ser executado manualmente no Supabase
em produção antes da funcionalidade aparecer para valer (o app já publicado
no Vercel vai mostrar o painel, mas criar/carregar vai falhar até o SQL
rodar lá).

---

## Self-Review

**Cobertura da spec:** modelo de dados com cascade delete (Task 1) ·
extração de `normalizarEntrada` para reuso local/nuvem (Task 2) · CRUD de
projeto e área (Task 3) · painel de dois níveis com os 5 comportamentos
descritos na spec — seletor+criar projeto, lista+criar área, barra de
edição, apagar projeto com aviso de N áreas, aviso sem Supabase configurado
(Task 4) · integração na aba, com o rascunho local intacto (Task 5) ·
changelog (Task 6). Itens explicitamente fora de escopo (mover área entre
projetos, renomear, login) não têm task — de acordo com a spec.

**Consistência de tipos:** `activeArea` é sempre
`{id, nome, projetoId, projetoNome} | null` em todo lugar que aparece
(Task 5's handlers, Task 4's props). `normalizarEntrada` devolve sempre a
mesma forma de `defaultEntrada()` (`{estrutura, linhas, protecoes}`),
consumida igual pelo `carregar()` local (Task 2) e por `handleCarregarArea`
(Task 5).
