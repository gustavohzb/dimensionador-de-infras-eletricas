# Importar Lista de Cargas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botão "Importar lista" no Quadro de Cargas que transforma colunas coladas do Excel em N circuitos de uma vez, com detecção de colunas corrigível e padrões do lote.

**Architecture:** Parser e detecção puros em `src/lib/importCargas.js` (testados no Vitest); painel `src/components/cabos/ImportarCargas.jsx` orquestra colar → analisar → corrigir → confirmar; `QuadroCargasTab.jsx` ganha o botão e o callback de inserção (somar/substituir).

**Tech Stack:** React 19 + Vite, Tailwind v4 (classes `copper`/`slate` do tema), Vitest. Sem dependência nova.

**Spec:** `docs/superpowers/specs/2026-08-03-importar-lista-cargas-design.md`

## Global Constraints

- Precedência de valores: **coluna > padrão do lote > default do formulário** (`defaultCircuito()` / `defaultTrecho()`).
- **Só a potência é obrigatória** (ou corrente, se a coluna for mapeada à mão). Linha sem número aproveitável vira aviso e é pulada.
- A coluna Tensão ajusta **só o número** — o esquema vem sempre do padrão do lote.
- Corrente (A): **sem detecção automática**, só mapeável à mão.
- Vírgula decimal aceita ("3,7"); unidades CV/kW/W/kVA lidas da célula quando presentes.
- Todo texto de UI em PT-BR, no tom das outras abas.
- Fora de escopo: upload .xlsx/.csv, inferir esquema pela tensão.
- Trabalho na branch `importar-lista-cargas`; merge `--no-ff` só depois de testes + verificação no navegador.
- Comandos de teste rodam de `C:\Users\gusta\Desktop\CLAUDE\eletrocalha-app` (no Bash, prefixar `cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app &&` — o cwd não persiste entre chamadas).

---

### Task 1: Parsing de células e da grade (`parseLista`, `parseNumero`, `parsePotencia`, `parseTensao`)

**Files:**
- Create: `src/lib/importCargas.js`
- Test: `src/lib/importCargas.test.js`

**Interfaces:**
- Consumes: nada (funções puras).
- Produces:
  - `parseNumero(texto) → number | null` — vírgula decimal e milhar ("1.234,5").
  - `parsePotencia(texto) → { valor: number, unidade: "CV"|"kW"|"W"|"kVA"|null } | null`
  - `parseTensao(texto) → number | null` — aceita "380" e "380 V".
  - `parseLista(raw) → string[][]` — matriz de células aparadas, linhas vazias fora, linhas curtas completadas com `""`.

- [ ] **Step 1: Criar a branch**

```bash
git checkout -b importar-lista-cargas
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `src/lib/importCargas.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseLista, parseNumero, parsePotencia, parseTensao } from "./importCargas";

describe("parseNumero", () => {
  it("aceita vírgula decimal e ponto de milhar", () => {
    expect(parseNumero("3,7")).toBe(3.7);
    expect(parseNumero("7.5")).toBe(7.5);
    expect(parseNumero("1.234,5")).toBe(1234.5);
  });
  it("rejeita o que não é número", () => {
    expect(parseNumero("")).toBeNull();
    expect(parseNumero("abc")).toBeNull();
    expect(parseNumero(null)).toBeNull();
  });
});

describe("parsePotencia", () => {
  it("lê a unidade da própria célula quando presente", () => {
    expect(parsePotencia("15 CV")).toEqual({ valor: 15, unidade: "CV" });
    expect(parsePotencia("3,7kW")).toEqual({ valor: 3.7, unidade: "kW" });
    expect(parsePotencia("500 w")).toEqual({ valor: 500, unidade: "W" });
    expect(parsePotencia("10 kVA")).toEqual({ valor: 10, unidade: "kVA" });
  });
  it("número puro vem sem unidade", () => {
    expect(parsePotencia("15")).toEqual({ valor: 15, unidade: null });
  });
  it("texto não é potência", () => {
    expect(parsePotencia("Exaustor")).toBeNull();
    expect(parsePotencia("")).toBeNull();
  });
});

describe("parseTensao", () => {
  it("aceita o número com ou sem V", () => {
    expect(parseTensao("380")).toBe(380);
    expect(parseTensao("380 V")).toBe(380);
    expect(parseTensao("220v")).toBe(220);
  });
  it("rejeita texto e unidades de potência", () => {
    expect(parseTensao("15 CV")).toBeNull();
    expect(parseTensao("Exaustor")).toBeNull();
  });
});

describe("parseLista", () => {
  it("separa por TAB (colar do Excel)", () => {
    expect(parseLista("Exaustor\t15 CV\nBomba\t7,5 CV")).toEqual([
      ["Exaustor", "15 CV"],
      ["Bomba", "7,5 CV"],
    ]);
  });
  it("separa por ponto e vírgula quando não há TAB", () => {
    expect(parseLista("Exaustor;15\nBomba;7,5")).toEqual([
      ["Exaustor", "15"],
      ["Bomba", "7,5"],
    ]);
  });
  it("coluna única, ignorando linhas vazias", () => {
    expect(parseLista("15\n\n7,5\n")).toEqual([["15"], ["7,5"]]);
  });
  it("completa linhas curtas com células vazias", () => {
    expect(parseLista("A\t1\t380\nB\t2")).toEqual([
      ["A", "1", "380"],
      ["B", "2", ""],
    ]);
  });
  it("texto vazio vira lista vazia", () => {
    expect(parseLista("")).toEqual([]);
    expect(parseLista("   \n  ")).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: FAIL — "Failed to resolve import ./importCargas".

- [ ] **Step 4: Implementar**

Criar `src/lib/importCargas.js`:

```js
// Importador de lista de cargas da aba Cabos Elétricos: transforma colunas
// coladas do Excel (ou texto com ";") em circuitos do Quadro de Cargas.
//
// O formato das listas varia de projeto para projeto, então o fluxo é
// detectar o papel de cada coluna e deixar o usuário corrigir na prévia.
// Precedência de valores: coluna > padrão do lote > default do formulário.

const UNIDADE_CANONICA = { cv: "CV", kw: "kW", w: "W", kva: "kVA" };
const RE_POTENCIA = /^([\d.,]+)\s*(cv|kw|kva|w)?$/i;
const RE_TENSAO = /^([\d.,]+)\s*v?$/i;

// "3,7" → 3.7; "1.234,5" → 1234.5 (vírgula presente = decimal BR, pontos são
// milhar); "7.5" → 7.5. Fora disso, null.
export function parseNumero(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  const limpo = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

// "15 CV" → { valor: 15, unidade: "CV" }; "3,7" → { valor: 3.7, unidade: null };
// texto → null. A unidade escrita na célula vence a unidade padrão do lote.
export function parsePotencia(texto) {
  const m = RE_POTENCIA.exec(String(texto ?? "").trim());
  if (!m) return null;
  const valor = parseNumero(m[1]);
  if (valor == null) return null;
  return { valor, unidade: m[2] ? UNIDADE_CANONICA[m[2].toLowerCase()] : null };
}

// "380" e "380 V" → 380. Não aceita unidades de potência.
export function parseTensao(texto) {
  const m = RE_TENSAO.exec(String(texto ?? "").trim());
  return m ? parseNumero(m[1]) : null;
}

// Divide o texto colado em matriz de células: TAB (colar do Excel) tem
// prioridade, depois ";", senão coluna única. Linhas vazias caem fora e as
// curtas são completadas com "" para a grade ficar retangular.
export function parseLista(raw) {
  const linhas = String(raw ?? "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (!linhas.length) return [];
  const sep = linhas.some((l) => l.includes("\t"))
    ? "\t"
    : linhas.some((l) => l.includes(";"))
      ? ";"
      : null;
  const grade = linhas.map((l) => (sep ? l.split(sep) : [l]).map((c) => c.trim()));
  const nCols = Math.max(...grade.map((g) => g.length));
  return grade.map((g) => [...g, ...Array(nCols - g.length).fill("")]);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: PASS (12 testes).

- [ ] **Step 6: Commit**

```bash
git add src/lib/importCargas.js src/lib/importCargas.test.js
git commit -m "feat: parsing de células e grade do importador de cargas"
```

---

### Task 2: Detecção de colunas e cabeçalho (`detectarColunas`, `PAPEIS`)

**Files:**
- Modify: `src/lib/importCargas.js` (acrescentar no fim)
- Test: `src/lib/importCargas.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `parsePotencia`, `parseTensao` da Task 1.
- Produces:
  - `PAPEIS` — `[{ id, label }]` com ids `descricao | tag | potencia | tensao | distancia | corrente | ignorar` (ordem de exibição do seletor).
  - `detectarColunas(grade) → { papeis: string[], temCabecalho: boolean }` — um papel por coluna; papéis nunca se repetem (exceto `ignorar`).
  - `detectarCabecalho(grade) → boolean` (exportada para teste).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `src/lib/importCargas.test.js` (novo import: `detectarColunas`):

```js
import { detectarColunas } from "./importCargas"; // juntar ao import existente

describe("detectarColunas", () => {
  it("texto vira descrição e número vira potência", () => {
    const grade = parseLista("Exaustor\t15\nBomba\t7,5");
    expect(detectarColunas(grade)).toEqual({
      papeis: ["descricao", "potencia"],
      temCabecalho: false,
    });
  });
  it("coluna única numérica é potência", () => {
    expect(detectarColunas(parseLista("15\n7,5")).papeis).toEqual(["potencia"]);
  });
  it("unidades misturadas na mesma coluna ainda é potência", () => {
    expect(detectarColunas(parseLista("15 CV\n3,7 kW")).papeis).toEqual(["potencia"]);
  });
  it("coluna com só 127/220/380/440/660 é tensão", () => {
    const grade = parseLista("Exaustor\t15\t380\nBomba\t7,5\t220");
    expect(detectarColunas(grade).papeis).toEqual(["descricao", "potencia", "tensao"]);
  });
  it("segunda coluna numérica genérica vira distância", () => {
    const grade = parseLista("Exaustor\t15\t45\nBomba\t7,5\t80");
    expect(detectarColunas(grade).papeis).toEqual(["descricao", "potencia", "distancia"]);
  });
  it("TAG no padrão XX-99 é reconhecida", () => {
    const grade = parseLista("AL-01\tExaustor\t15\nAL-02\tBomba\t7,5");
    expect(detectarColunas(grade).papeis).toEqual(["tag", "descricao", "potencia"]);
  });
  it("cabeçalho é detectado e usado como dica de mapeamento", () => {
    const grade = parseLista("Descrição\tPotência (kW)\tDistância\nExaustor\t15\t45");
    const r = detectarColunas(grade);
    expect(r.temCabecalho).toBe(true);
    expect(r.papeis).toEqual(["descricao", "potencia", "distancia"]);
  });
  it("lista de uma linha só não tem cabeçalho", () => {
    expect(detectarColunas(parseLista("Exaustor\t15")).temCabecalho).toBe(false);
  });
  it("corrente nunca é detectada sozinha", () => {
    // Coluna de números genéricos vira potência/distância — corrente só à mão.
    const { papeis } = detectarColunas(parseLista("42\n18"));
    expect(papeis).not.toContain("corrente");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: FAIL — "detectarColunas is not a function" (ou import quebrado).

- [ ] **Step 3: Implementar**

Acrescentar em `src/lib/importCargas.js`:

```js
// Papéis que uma coluna colada pode assumir (ordem do seletor da prévia).
export const PAPEIS = [
  { id: "descricao", label: "Descrição" },
  { id: "tag", label: "TAG" },
  { id: "potencia", label: "Potência" },
  { id: "tensao", label: "Tensão (V)" },
  { id: "distancia", label: "Distância (m)" },
  { id: "corrente", label: "Corrente (A)" },
  { id: "ignorar", label: "Ignorar" },
];

const TENSOES_USUAIS = [127, 220, 380, 440, 660];
const RE_TAG = /^[a-z]{1,5}-?\d{1,4}$/i;

// A primeira linha é cabeçalho quando nenhuma célula dela é numérica e há
// pelo menos uma linha de dados abaixo.
export function detectarCabecalho(grade) {
  if (grade.length < 2) return false;
  return grade[0].every(
    (cel) => cel === "" || (parsePotencia(cel) == null && parseTensao(cel) == null)
  );
}

const DICAS_CABECALHO = [
  [/\btag\b/, "tag"],
  [/desc|nome/, "descricao"],
  [/pot|^cv$|^kw$|^kva$|^w$/, "potencia"],
  [/tens|^v$/, "tensao"],
  [/dist|compr|^m$/, "distancia"],
  [/corrente|^a$/, "corrente"],
];

const semAcento = (t) =>
  String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function papelPorDica(celula) {
  const t = semAcento(celula);
  if (!t) return null;
  for (const [re, papel] of DICAS_CABECALHO) if (re.test(t)) return papel;
  return null;
}

// Classifica uma coluna pelo conteúdo. `usados` impede papel repetido:
// a segunda coluna numérica genérica vira distância, a terceira, ignorar.
// Corrente nunca sai daqui — só mapeável à mão, para não confundir com
// potência.
function papelPorConteudo(celulas, usados, unicaColuna) {
  if (!celulas.length) return "ignorar";
  const livre = (p) => !usados.has(p);
  const numerica = celulas.every(
    (c) => parsePotencia(c) != null || parseTensao(c) != null
  );
  if (numerica) {
    if (unicaColuna && livre("potencia")) return "potencia";
    const soTensoesUsuais =
      celulas.every((c) => TENSOES_USUAIS.includes(parseTensao(c))) &&
      celulas.every((c) => parsePotencia(c)?.unidade == null);
    if (livre("tensao") && soTensoesUsuais) return "tensao";
    if (livre("potencia")) return "potencia";
    if (livre("distancia")) return "distancia";
    return "ignorar";
  }
  if (livre("tag") && celulas.every((c) => RE_TAG.test(c))) return "tag";
  if (livre("descricao")) return "descricao";
  return "ignorar";
}

// Um papel por coluna: dica do cabeçalho primeiro (quando há), conteúdo
// depois. A prévia mostra um seletor por coluna para corrigir o que errar.
export function detectarColunas(grade) {
  const temCabecalho = detectarCabecalho(grade);
  const dados = temCabecalho ? grade.slice(1) : grade;
  const nCols = grade[0]?.length ?? 0;
  const usados = new Set();
  const papeis = [];
  for (let c = 0; c < nCols; c++) {
    const celulas = dados.map((l) => l[c]).filter((x) => x !== "");
    let papel = temCabecalho ? papelPorDica(grade[0][c]) : null;
    if (papel && usados.has(papel)) papel = null;
    if (!papel) papel = papelPorConteudo(celulas, usados, nCols === 1);
    if (papel !== "ignorar") usados.add(papel);
    papeis.push(papel);
  }
  return { papeis, temCabecalho };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: PASS (21 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/importCargas.js src/lib/importCargas.test.js
git commit -m "feat: deteccao de colunas e cabecalho no importador de cargas"
```

---

### Task 3: Montagem dos circuitos (`montarCircuitos`)

**Files:**
- Modify: `src/lib/importCargas.js` (acrescentar no fim + 2 imports no topo)
- Test: `src/lib/importCargas.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `parsePotencia`, `parseNumero`, `parseTensao` (Task 1); `defaultCircuito`/`defaultTrecho` de `src/components/cabos/CircuitoForm.jsx`; `proximoNumero(rotulos, padrao)` de `src/lib/sequencialRotulos.js`.
- Produces:
  - `montarCircuitos({ grade, papeis, temCabecalho, padroes, tagsExistentes }) → { porLinha, circuitos, avisos }`
    - `padroes = { unidade, esquemaId, tensao, distancia, formaPartidaId }`
    - `porLinha[i]` (alinhado às linhas de dados, para a prévia): `{ circuito }` ou `{ aviso }`
    - `circuitos`: objetos completos no formato de `defaultCircuito()`, prontos para `setCircuitos`
    - `avisos`: strings "Linha N: …" (N = número da linha colada, contando o cabeçalho)

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `src/lib/importCargas.test.js` (novo import: `montarCircuitos`):

```js
import { montarCircuitos } from "./importCargas"; // juntar ao import existente

describe("montarCircuitos", () => {
  const PADROES = {
    unidade: "CV",
    esquemaId: "trifCnCt",
    tensao: 380,
    distancia: 30,
    formaPartidaId: "nenhuma",
  };
  const montar = (texto, extra = {}) => {
    const grade = parseLista(texto);
    return montarCircuitos({
      grade,
      ...detectarColunas(grade),
      padroes: PADROES,
      tagsExistentes: [],
      ...extra,
    });
  };

  it("caso mínimo: uma coluna de números + padrões do lote", () => {
    const { circuitos, avisos } = montar("15\n7,5");
    expect(avisos).toEqual([]);
    expect(circuitos).toHaveLength(2);
    expect(circuitos[0]).toMatchObject({
      modo: "potencia",
      potencia: 15,
      unidade: "CV",
      tensao: 380,
      esquemaId: "trifCnCt",
      formaPartidaId: "nenhuma",
      tag: "AL-01",
      descricao: "",
    });
    expect(circuitos[0].trechos[0].distancia).toBe(30);
    expect(circuitos[1].tag).toBe("AL-02");
  });

  it("coluna vence padrão do lote", () => {
    const { circuitos } = montar("Exaustor\t3,7 kW\t220\t55");
    expect(circuitos[0]).toMatchObject({
      descricao: "Exaustor",
      potencia: 3.7,
      unidade: "kW",
      tensao: 220,
    });
    expect(circuitos[0].trechos[0].distancia).toBe(55);
    // O esquema NÃO vem da tensão — sempre do padrão do lote.
    expect(circuitos[0].esquemaId).toBe("trifCnCt");
  });

  it("unidade da célula vence a padrão; número puro usa a padrão", () => {
    const { circuitos } = montar("15\n3,7 kW");
    expect(circuitos[0].unidade).toBe("CV");
    expect(circuitos[1].unidade).toBe("kW");
  });

  it("linha sem número aproveitável vira aviso e é pulada", () => {
    const { circuitos, avisos, porLinha } = montar("Exaustor\t15\nReserva");
    expect(circuitos).toHaveLength(1);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/Linha 2/);
    expect(porLinha[1].aviso).toBeDefined();
  });

  it("o número da linha no aviso conta o cabeçalho", () => {
    const { avisos } = montar("Descrição\tPotência\nExaustor\t15\nReserva");
    expect(avisos[0]).toMatch(/Linha 3/);
  });

  it("TAGs geradas não colidem com as existentes", () => {
    const { circuitos } = montar("15\n7,5", { tagsExistentes: ["AL-01", "AL-07"] });
    expect(circuitos.map((c) => c.tag)).toEqual(["AL-08", "AL-09"]);
  });

  it("coluna TAG mapeada é usada no lugar da sequência", () => {
    const { circuitos } = montar("QF-01\tExaustor\t15");
    expect(circuitos[0].tag).toBe("QF-01");
  });

  it("coluna mapeada à mão como corrente cria circuito em modo corrente", () => {
    const grade = parseLista("Exaustor\t42\nBomba\t18");
    const det = detectarColunas(grade); // detecta potência…
    det.papeis[1] = "corrente"; // …e o usuário corrige no seletor
    const { circuitos } = montarCircuitos({
      grade,
      ...det,
      padroes: PADROES,
      tagsExistentes: [],
    });
    expect(circuitos[0]).toMatchObject({ modo: "corrente", corrente: 42 });
  });

  it("cabeçalho não vira circuito", () => {
    const { circuitos } = montar("Descrição\tPotência\nExaustor\t15");
    expect(circuitos).toHaveLength(1);
    expect(circuitos[0].descricao).toBe("Exaustor");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: FAIL — "montarCircuitos is not a function".

- [ ] **Step 3: Implementar**

No topo de `src/lib/importCargas.js`, acrescentar os imports:

```js
import { defaultCircuito, defaultTrecho } from "../components/cabos/CircuitoForm";
import { proximoNumero } from "./sequencialRotulos";
```

E no fim do arquivo:

```js
// Constrói os circuitos: uma linha de dados → um circuito completo no
// formato de defaultCircuito(). `porLinha` fica alinhado às linhas de dados
// para a prévia pintar linha boa/linha pulada; `circuitos` e `avisos` são a
// versão achatada para importar e avisar.
export function montarCircuitos({ grade, papeis, temCabecalho, padroes, tagsExistentes = [] }) {
  const dados = temCabecalho ? grade.slice(1) : grade;
  const tags = [...tagsExistentes];
  const porLinha = dados.map((linha, i) => {
    const numLinha = i + (temCabecalho ? 2 : 1);
    const col = (papel) => {
      const idx = papeis.indexOf(papel);
      return idx === -1 ? "" : (linha[idx] ?? "");
    };
    // defaultCircuito() cria trechos novos a cada chamada — mexer em
    // c.trechos[0] não vaza para outros circuitos.
    const c = { ...defaultCircuito() };
    c.esquemaId = padroes.esquemaId;
    c.tensao = Number(padroes.tensao);
    c.unidade = padroes.unidade;
    c.formaPartidaId = padroes.formaPartidaId;
    c.trechos[0].distancia = Number(padroes.distancia);
    c.descricao = col("descricao");

    const corrente = papeis.includes("corrente") ? parseNumero(col("corrente")) : null;
    const pot = parsePotencia(col("potencia"));
    if (corrente != null) {
      c.modo = "corrente";
      c.corrente = corrente;
    } else if (pot) {
      c.modo = "potencia";
      c.potencia = pot.valor;
      if (pot.unidade) c.unidade = pot.unidade;
    } else {
      return { aviso: `Linha ${numLinha}: sem potência ou corrente aproveitável — pulada.` };
    }

    const v = parseTensao(col("tensao"));
    if (v != null) c.tensao = v;
    const d = parseNumero(col("distancia"));
    if (d != null) c.trechos[0].distancia = d;

    c.tag = col("tag") || `AL-${String(proximoNumero(tags, /^AL-(\d+)/)).padStart(2, "0")}`;
    tags.push(c.tag);
    return { circuito: c };
  });
  return {
    porLinha,
    circuitos: porLinha.filter((l) => l.circuito).map((l) => l.circuito),
    avisos: porLinha.filter((l) => l.aviso).map((l) => l.aviso),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/importCargas.test.js`
Expected: PASS (30 testes).

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: 187 + 30 = 217 testes passando, nenhum quebrado.

- [ ] **Step 6: Commit**

```bash
git add src/lib/importCargas.js src/lib/importCargas.test.js
git commit -m "feat: montagem de circuitos a partir da lista colada"
```

---

### Task 4: Painel `ImportarCargas.jsx`

**Files:**
- Create: `src/components/cabos/ImportarCargas.jsx`

**Interfaces:**
- Consumes: `PAPEIS`, `parseLista`, `detectarColunas`, `montarCircuitos` (Tasks 1–3); `UNIDADES_POTENCIA` de `src/lib/cableSizingPro.js`; `ESQUEMAS`, `FORMAS_PARTIDA` de `src/data/cabosNBR5410.js`.
- Produces: componente default `ImportarCargas({ tagsExistentes, existingCount, onImportar, onClose })`:
  - `tagsExistentes: string[]` — tags atuais do quadro (para a sequência AL-NN).
  - `existingCount: number` — circuitos já no quadro (dispara a pergunta somar/substituir).
  - `onImportar({ circuitos, substituir })` — chamado ao confirmar; `circuitos` já vêm completos.
  - `onClose()` — fecha o painel sem importar.

- [ ] **Step 1: Escrever o componente**

Criar `src/components/cabos/ImportarCargas.jsx` (sem teste unitário — a lógica está toda na lib; este arquivo é orquestração + markup, verificado no navegador na Task 5):

```jsx
import { useMemo, useState } from "react";
import { PAPEIS, parseLista, detectarColunas, montarCircuitos } from "../../lib/importCargas";
import { UNIDADES_POTENCIA } from "../../lib/cableSizingPro";
import { ESQUEMAS, FORMAS_PARTIDA } from "../../data/cabosNBR5410";

const selectCls =
  "rounded-xs border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const inputCls = `${selectCls} w-20`;

// Resumo do circuito que a linha vai virar — a coluna "vira" da prévia.
function resumo(c) {
  const carga =
    c.modo === "corrente"
      ? `${String(c.corrente).replace(".", ",")} A`
      : `${String(c.potencia).replace(".", ",")} ${c.unidade}`;
  return `${c.tag} · ${carga} · ${c.tensao} V · ${c.trechos[0].distancia} m`;
}

function CampoPadrao({ label, children }) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
      {children}
    </label>
  );
}

export default function ImportarCargas({ tagsExistentes, existingCount, onImportar, onClose }) {
  const [text, setText] = useState("");
  const [analise, setAnalise] = useState(null); // { grade, temCabecalho, papeis }
  const [askReplace, setAskReplace] = useState(false);
  // Padrões do lote: completam o que a lista não traz. Coluna vence padrão.
  const [padroes, setPadroes] = useState({
    unidade: "CV",
    esquemaId: "trifCnCt",
    tensao: 380,
    distancia: 30,
    formaPartidaId: "nenhuma",
  });

  const analisar = () => {
    const grade = parseLista(text);
    if (!grade.length) return;
    setAnalise({ grade, ...detectarColunas(grade) });
    setAskReplace(false);
  };

  // Prévia ao vivo: corrigir um papel ou um padrão refaz os circuitos na hora.
  const previa = useMemo(
    () => (analise ? montarCircuitos({ ...analise, padroes, tagsExistentes }) : null),
    [analise, padroes, tagsExistentes]
  );
  const dados = analise ? (analise.temCabecalho ? analise.grade.slice(1) : analise.grade) : [];

  const setPapel = (idx, papel) =>
    setAnalise((a) => ({ ...a, papeis: a.papeis.map((p, i) => (i === idx ? papel : p)) }));
  const setPadrao = (patch) => setPadroes((p) => ({ ...p, ...patch }));

  const confirmar = (substituir) => {
    // Substituir zera o quadro: a sequência AL-NN recomeça do zero.
    const { circuitos } = montarCircuitos({
      ...analise,
      padroes,
      tagsExistentes: substituir ? [] : tagsExistentes,
    });
    if (!circuitos.length) return;
    onImportar({ circuitos, substituir });
  };

  const handleConfirm = () => {
    if (existingCount > 0) setAskReplace(true);
    else confirmar(false);
  };

  return (
    <div className="space-y-2.5">
      {!analise && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cole a lista de cargas direto do Excel (uma linha por carga). Só a <b>potência</b> é
            obrigatória — descrição, TAG, tensão e distância são lidas quando existirem, e o resto
            sai dos padrões do lote. Unidade junto do número ("15 CV", "3,7 kW") também funciona.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"Exaustor\t15 CV\nBomba d'água\t7,5 CV"}
            className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={analisar}
              disabled={!text.trim()}
              className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              Analisar lista
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {analise && (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-xs border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="w-full text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Padrões do lote — usados onde a lista não informa
            </span>
            <CampoPadrao label="Unidade">
              <select
                value={padroes.unidade}
                onChange={(e) => setPadrao({ unidade: e.target.value })}
                className={selectCls}
              >
                {UNIDADES_POTENCIA.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </CampoPadrao>
            <CampoPadrao label="Esquema">
              <select
                value={padroes.esquemaId}
                onChange={(e) => setPadrao({ esquemaId: e.target.value })}
                className={selectCls}
              >
                {ESQUEMAS.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
            </CampoPadrao>
            <CampoPadrao label="Tensão (V)">
              <input
                type="number"
                value={padroes.tensao}
                onChange={(e) => setPadrao({ tensao: e.target.value })}
                className={inputCls}
              />
            </CampoPadrao>
            <CampoPadrao label="Distância (m)">
              <input
                type="number"
                value={padroes.distancia}
                onChange={(e) => setPadrao({ distancia: e.target.value })}
                className={inputCls}
              />
            </CampoPadrao>
            <CampoPadrao label="Partida">
              <select
                value={padroes.formaPartidaId}
                onChange={(e) => setPadrao({ formaPartidaId: e.target.value })}
                className={selectCls}
              >
                {FORMAS_PARTIDA.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </CampoPadrao>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {analise.papeis.map((papel, c) => (
                    <th key={c} className="px-1.5 py-1">
                      <select
                        value={papel}
                        onChange={(e) => setPapel(c, e.target.value)}
                        aria-label={`Papel da coluna ${c + 1}`}
                        className={`${selectCls} w-full font-semibold`}
                      >
                        {PAPEIS.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </th>
                  ))}
                  <th className="px-1.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Vira
                  </th>
                </tr>
                {analise.temCabecalho && (
                  <tr className="text-[11px] italic text-slate-400 dark:text-slate-500">
                    {analise.grade[0].map((cel, c) => (
                      <td key={c} className="px-1.5 py-0.5">{cel || "—"}</td>
                    ))}
                    <td className="px-1.5 py-0.5">cabeçalho (não importa)</td>
                  </tr>
                )}
              </thead>
              <tbody>
                {dados.map((linha, i) => {
                  const st = previa.porLinha[i];
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 dark:border-slate-800 ${
                        st.aviso ? "text-red-500 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {linha.map((cel, c) => (
                        <td key={c} className="max-w-[160px] truncate px-1.5 py-1">{cel || "—"}</td>
                      ))}
                      <td className="whitespace-nowrap px-1.5 py-1 font-mono text-[11px]">
                        {st.aviso ? "⚠ sem potência — pulada" : resumo(st.circuito)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {previa.avisos.length > 0 && (
            <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              {previa.avisos.map((a, i) => (
                <li key={i}>⚠ {a}</li>
              ))}
            </ul>
          )}

          {askReplace ? (
            <div className="rounded-xs border border-copper-300 bg-copper-50 px-3 py-2.5 dark:border-copper-800 dark:bg-copper-500/10">
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                O quadro já tem <b>{existingCount}</b> circuito{existingCount > 1 ? "s" : ""}. Somar
                os importados ou substituir tudo?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmar(false)}
                  className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700"
                >
                  Somar
                </button>
                <button
                  type="button"
                  onClick={() => confirmar(true)}
                  className="flex-1 rounded-xs border border-copper-600 px-3 py-1.5 text-sm font-semibold text-copper-700 transition hover:bg-copper-100 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
                >
                  Substituir
                </button>
                <button
                  type="button"
                  onClick={() => setAskReplace(false)}
                  className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={previa.circuitos.length === 0}
                className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
              >
                {previa.circuitos.length > 0
                  ? `Importar ${previa.circuitos.length} circuito${previa.circuitos.length > 1 ? "s" : ""}`
                  : "Nada para importar"}
              </button>
              <button
                type="button"
                onClick={() => setAnalise(null)}
                className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Conferir que nada quebrou**

Run: `npm test` — Expected: mesmos 217 testes passando.
Run: `npm run lint` — Expected: nenhum aviso novo (os pré-existentes de CircuitoForm.jsx e capacitorBank.test.js podem aparecer).

- [ ] **Step 3: Commit**

```bash
git add src/components/cabos/ImportarCargas.jsx
git commit -m "feat: painel de importacao de lista de cargas"
```

---

### Task 5: Botão e callback no `QuadroCargasTab` + verificação no navegador

**Files:**
- Modify: `src/components/QuadroCargasTab.jsx`

**Interfaces:**
- Consumes: `ImportarCargas` (Task 4).
- Produces: fluxo completo na aba Cabos Elétricos.

- [ ] **Step 1: Import e estado**

Em `QuadroCargasTab.jsx`, junto aos imports:

```js
import ImportarCargas from "./cabos/ImportarCargas";
```

Dentro do componente, junto aos outros `useState` (após `const formRef = useRef(null);`):

```js
const [importando, setImportando] = useState(false);
```

- [ ] **Step 2: Callback de importação**

Logo após a função `remover`:

```js
// Recebe os circuitos prontos do painel de importação. Somar: seleciona o
// primeiro importado (índice = tamanho atual). Substituir: zera tudo.
const importarCircuitos = ({ circuitos: novos, substituir }) => {
  const primeiro = substituir ? 0 : circuitos.length;
  setCircuitos((cs) => (substituir ? novos : [...cs, ...novos]));
  setSelecionado(primeiro);
  setSelecionadosEnvio(new Set()); // índices mudaram — zera a seleção de envio
  setImportando(false);
};
```

- [ ] **Step 3: Botão no cabeçalho do quadro**

No `div` de botões do cabeçalho (`<div className="flex gap-1.5">`), antes do botão "Memorial PDF":

```jsx
<button
  type="button"
  onClick={() => setImportando((v) => !v)}
  title="Cole uma lista de cargas do Excel e crie vários circuitos de uma vez."
  className="rounded-xs border border-copper-600 px-3 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
>
  Importar lista
</button>
```

- [ ] **Step 4: Painel de importação**

Logo após o fechamento do card do quadro de cargas (o `</div>` depois do `<p ...>{CRITERIO_LEGENDA}</p>`), inserir:

```jsx
{importando && (
  <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
      Importar lista de cargas
    </h2>
    <ImportarCargas
      tagsExistentes={circuitos.map((c) => c.tag)}
      existingCount={circuitos.length}
      onImportar={importarCircuitos}
      onClose={() => setImportando(false)}
    />
  </div>
)}
```

- [ ] **Step 5: Verificação no navegador**

Subir o dev server (preview_start com o launch.json do projeto) e, na aba Cabos Elétricos:

1. Clicar "Importar lista" — painel abre com textarea.
2. Colar `Exaustor\t15 CV\nBomba\t7,5\nReserva` (TABs reais) e Analisar: seletores devem mostrar Descrição | Potência; linha "Reserva" em vermelho "⚠ sem potência — pulada"; aviso "Linha 3" embaixo; botão "Importar 2 circuitos".
3. Mudar o padrão de unidade para kW: a linha "Bomba" muda para "7,5 kW" na prévia; "Exaustor" continua "15 CV" (unidade da célula vence).
4. Confirmar → pergunta somar/substituir (quadro já tem 1 circuito). Somar: 3 circuitos no quadro, TAGs sem colisão, primeiro importado selecionado, Ib e cabos calculados.
5. Testar coluna única (`15\n7,5\n3`) com Substituir: quadro fica só com os 3, TAGs AL-01..03.
6. Testar cabeçalho: `Descrição\tPotência (kW)\tDistância` + 2 linhas de dados — papéis certos, cabeçalho não vira circuito, distância da coluna aplicada (conferir no trecho do circuito importado).
7. Corrigir um papel à mão (Potência → Corrente (A)) e ver o resumo mudar para "… A".
8. Conferir console sem erros e o visual no tema escuro.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuadroCargasTab.jsx
git commit -m "feat: botao Importar lista no Quadro de Cargas"
```

---

### Task 6: Changelog 1.18.0, checagens finais e merge

**Files:**
- Modify: `src/data/changelog.js` (acrescentar entrada no FIM do array `CHANGELOG`)

**Interfaces:**
- Consumes: formato das entradas de `CHANGELOG` (`versao`, `data`, `titulo`, `tipo`, `itens`). `APP_VERSION` passa a ser "1.18.0" automaticamente (última entrada).
- Produces: release visível na aba Atualizações e versão nova na aba Sobre.

- [ ] **Step 1: Acrescentar a entrada**

No fim do array `CHANGELOG` em `src/data/changelog.js` (depois da entrada 1.17.0):

```js
{
  versao: "1.18.0",
  data: "2026-08-03",
  titulo: "Importar lista de cargas",
  tipo: "novo",
  itens: [
    "Botão \"Importar lista\" no Quadro de Cargas: cole colunas do Excel e cada linha vira um circuito.",
    "Detecção automática de colunas (descrição, TAG, potência, tensão, distância) com correção por seletor no topo de cada coluna.",
    "Unidade lida da própria célula (\"15 CV\", \"3,7 kW\") ou do padrão do lote; padrões do lote completam o que a lista não traz.",
    "Linhas sem potência aproveitável viram aviso e são puladas; ao confirmar dá para somar ao quadro ou substituir tudo.",
  ],
},
```

- [ ] **Step 2: Suíte completa, lint e build**

Run: `npm test` — Expected: 217 testes passando (os testes do changelog validam a 1.18.0 sozinhos).
Run: `npm run lint` — Expected: sem avisos novos.
Run: `npm run build` — Expected: build ✓.

- [ ] **Step 3: Conferir no navegador**

Aba Atualizações: 1.18.0 no topo com "Versão atual"; aba Sobre: "Versão 1.18.0".

- [ ] **Step 4: Commit**

```bash
git add src/data/changelog.js
git commit -m "docs: release 1.18.0 no changelog"
```

- [ ] **Step 5: Merge e push (fluxo de sempre)**

```bash
git checkout master
git merge --no-ff importar-lista-cargas -m "Merge branch 'importar-lista-cargas'"
git push
git branch -d importar-lista-cargas
```

Expected: push aceito (Vercel faz o deploy do master automaticamente).
