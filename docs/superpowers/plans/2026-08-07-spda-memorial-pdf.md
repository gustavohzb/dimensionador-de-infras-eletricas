# Memorial de Cálculo em PDF — Aba SPDA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão "Relatório PDF" na aba SPDA que exporta um memorial de cálculo completo — dados de entrada, áreas de exposição, número de eventos, probabilidades, perdas, componentes de risco, veredito R1/R3 e frequência de danos F — com as fórmulas e números de equação da ABNT NBR 5419-2:2026.

**Architecture:** Novo módulo `src/lib/spdaPdf.js` segue o padrão de `src/lib/capacitorPdf.js`: import dinâmico de `jsPDF`, uma função exportada `exportSpdaPDF({ entrada, resultado })` que monta o PDF em orientação paisagem, e funções puras de preparação de linha de tabela (`rows*`, `linhas*`) separadas da renderização — só essas são testadas por unidade, seguindo o padrão de `resumoCircuito` em `iluminacaoPdf.test.js`. Uma pequena extensão em `spdaRisco.js` expõe a área da estrutura adjacente (`adj`), hoje calculada e descartada.

**Tech Stack:** React 19, Vite, Vitest, jsPDF (já uma dependência do projeto).

## Global Constraints

- Motor de cálculo (`spdaRisco.js`, `spdaFrequencia.js`) não muda nenhum resultado numérico — só passa a expor um valor intermediário já calculado.
- Números de equação e símbolos usados no PDF são os da ABNT NBR 5419-2:2026 conferidos nesta sessão (ver `docs/superpowers/specs/2026-08-07-spda-memorial-pdf-design.md` e `docs/superpowers/specs/nbr5419-2-2026-parametros.md`), não os da edição 2015.
- Sem seção de sugestão de medidas no PDF (decisão do brainstorm).
- Nome do arquivo: `memorial-spda-<município>.pdf` (slug igual ao de `capacitorPdf.js`), ou `memorial-spda.pdf` sem município.
- Rodar `npm test -- --run` e `npm run build` antes de cada commit que toque `spdaRisco.js` ou `spdaPdf.js`.

---

## File Structure

- **Modificar** `src/lib/spdaRisco.js` — `numeroEventos()` passa a incluir `adj` (área da estrutura adjacente) em cada item de `porLinha`.
- **Modificar** `src/lib/spdaRisco.test.js` — teste novo para `adj`.
- **Criar** `src/lib/spdaPdf.js` — funções puras de preparação de tabela (`rowsAreasExposicao`, `rowsNumeroEventos`, `rowsProbabilidades`, `rowsPerdas`, `rowsComponentes`, `linhasEstrutura`, `linhasLinhaEletrica`, `linhasProtecoes`, `linhasSistemaInterno`) e a função de exportação `exportSpdaPDF`.
- **Criar** `src/lib/spdaPdf.test.js` — testes das funções puras acima.
- **Modificar** `src/components/SpdaTab.jsx` — botão "Relatório PDF" no cabeçalho.
- **Modificar** `src/data/changelog.js` — entrada da versão 1.23.0.

---

### Task 1: Expor a área da estrutura adjacente em `numeroEventos`

**Files:**
- Modify: `src/lib/spdaRisco.js:42-69`
- Test: `src/lib/spdaRisco.test.js`

**Interfaces:**
- Consumes: `areaExposicaoEstrutura({L,W,H,Hp})` (já existe em `spdaRisco.js`).
- Produces: `numeroEventos(entrada).porLinha[i].adj` — `number | null`, a área calculada pela mesma fórmula de A_D (equação A.1) aplicada à estrutura adjacente da linha, ou `null` quando a linha não tem `adjacente`. Usado pelo Task 2.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do `describe("número de eventos perigosos (Anexo A)", ...)` em `src/lib/spdaRisco.test.js`, depois do teste "estrutura adjacente dá N_DJ pela equação A.4" (linha ~88):

```js
  it("expõe a área da estrutura adjacente (adj) para a tabela E.5 do memorial", () => {
    const comAdjacente = {
      ...base,
      linhas: [{
        id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
        adjacente: { L: 20, W: 20, H: 5, cd: "isolada" },
      }],
    };
    const [linha] = numeroEventos(comAdjacente).porLinha;
    const esperado = 20 * 20 + 2 * 15 * 40 + Math.PI * 225; // A.1 com L=W=20, H=5
    expect(linha.adj).toBeCloseTo(esperado, 8);
  });

  it("sem estrutura adjacente, adj é null", () => {
    const semAdjacente = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal", adjacente: null }],
    };
    const [linha] = numeroEventos(semAdjacente).porLinha;
    expect(linha.adj).toBeNull();
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaRisco.test.js`
Expected: FAIL nos dois testes novos — `linha.adj` é `undefined`, não o número esperado nem `null`.

- [ ] **Step 3: Implementar**

Em `src/lib/spdaRisco.js`, dentro de `numeroEventos`, o bloco `porLinha = linhas.map(...)` (linha ~49-66):

```js
  const porLinha = linhas.map((linha) => {
    const { al, ai } = areasLinha(Number(linha.ll) || 0);
    const ci = fator(INSTALACAO_CI, linha.ci);
    const ce = fator(AMBIENTE_CE, linha.ce);
    const ct = fator(TIPO_LINHA_CT, linha.ct);
    // (A.1) — mesma fórmula de A_D, aplicada à estrutura adjacente. Exposta
    // à parte (não só embutida em N_DJ) porque o memorial em PDF mostra a
    // área junto com o número de eventos, como a norma faz no Anexo A.
    const adj = linha.adjacente ? areaExposicaoEstrutura(linha.adjacente) : null;
    // (A.4) — só quando há estrutura adjacente na outra ponta da linha.
    const ndj = linha.adjacente
      ? ng * adj * fator(LOCALIZACAO_CD, linha.adjacente.cd) * ct * 1e-6
      : 0;
    return {
      id: linha.id,
      al,
      ai,
      adj,
      nl: ng * al * ci * ce * ct * 1e-6, // (A.7)
      ni: ng * ai * ci * ce * ct * 1e-6, // (A.9)
      ndj,
    };
  });
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaRisco.test.js`
Expected: PASS em todos os testes do arquivo (inclusive os dois novos).

- [ ] **Step 5: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaRisco.js src/lib/spdaRisco.test.js
git commit -m "Expõe a área da estrutura adjacente (adj) em numeroEventos"
```

---

### Task 2: Linhas de tabela do Anexo A — áreas de exposição e número de eventos

**Files:**
- Create: `src/lib/spdaPdf.js`
- Create: `src/lib/spdaPdf.test.js`

**Interfaces:**
- Consumes: `resultado.eventos` — `{ ad, am, porLinha: [{id, al, ai, adj, nl, ni, ndj}] }` (de `avaliarRisco`/`numeroEventos`, incluindo `adj` do Task 1).
- Produces:
  - `rowsAreasExposicao(resultado)` → `Array<{parametro, equacao, simbolo, resultado, ref}>`
  - `rowsNumeroEventos(resultado)` → mesma forma de linha, usada pelo Task 6.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/spdaPdf.test.js`:

```js
import { describe, it, expect } from "vitest";
import { rowsAreasExposicao, rowsNumeroEventos } from "./spdaPdf";

const resultadoBase = {
  eventos: {
    ad: 9127.43,
    am: 865398.16,
    porLinha: [
      { id: "l1", al: 40000, ai: 4000000, adj: null, nl: 0.32, ni: 32, ndj: 0 },
    ],
  },
};

describe("rowsAreasExposicao", () => {
  it("inclui A_D, A_M e A_L/A_I por linha, com as refs de equação corretas", () => {
    const linhas = rowsAreasExposicao(resultadoBase);
    expect(linhas.find((l) => l.simbolo === "A_D")).toMatchObject({ resultado: 9127.43, ref: "A.1" });
    expect(linhas.find((l) => l.simbolo === "A_M")).toMatchObject({ resultado: 865398.16, ref: "A.6" });
    expect(linhas.find((l) => l.simbolo === "A_L")).toMatchObject({ resultado: 40000, ref: "A.8" });
    expect(linhas.find((l) => l.simbolo === "A_I")).toMatchObject({ resultado: 4000000, ref: "A.10" });
    expect(linhas.find((l) => l.simbolo === "A_DJ")).toBeUndefined();
  });

  it("com estrutura adjacente, inclui A_DJ", () => {
    const comAdj = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], adj: 1225 }] },
    };
    const linha = rowsAreasExposicao(comAdj).find((l) => l.simbolo === "A_DJ");
    expect(linha).toMatchObject({ resultado: 1225, ref: "A.1" });
  });
});

describe("rowsNumeroEventos", () => {
  it("inclui N_D, N_M e N_L/N_I por linha, com as refs de equação corretas", () => {
    const linhas = rowsNumeroEventos(resultadoBase);
    expect(linhas.find((l) => l.simbolo === "N_D" && l.parametro === "Estrutura")).toMatchObject({ ref: "A.3" });
    expect(linhas.find((l) => l.simbolo === "N_M")).toMatchObject({ ref: "A.5" });
    expect(linhas.find((l) => l.simbolo === "N_L")).toMatchObject({ resultado: 0.32, ref: "A.7" });
    expect(linhas.find((l) => l.simbolo === "N_I")).toMatchObject({ resultado: 32, ref: "A.9" });
    expect(linhas.find((l) => l.simbolo === "N_DJ")).toBeUndefined();
  });

  it("com N_DJ diferente de zero, inclui a linha N_DJ", () => {
    const comNdj = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], ndj: 0.05 }] },
    };
    const linha = rowsNumeroEventos(comNdj).find((l) => l.simbolo === "N_DJ");
    expect(linha).toMatchObject({ resultado: 0.05, ref: "A.4" });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: FAIL — `spdaPdf.js` ainda não existe ("Failed to resolve import").

- [ ] **Step 3: Implementar**

Criar `src/lib/spdaPdf.js`:

```js
// Memorial de cálculo em PDF da aba SPDA. As funções `rows*`/`linhas*` só
// preparam dados — puras e testadas à parte da renderização (que usa jsPDF
// e é verificada visualmente, como os outros memoriais do app).
//
// Referências de equação são as da ABNT NBR 5419-2:2026 (2ª edição), não da
// edição 2015 — o Anexo E dessa edição, que trazia tabelas de exemplo
// numérico como E.5/E.6, está "Vago" (reservado, sem conteúdo).

export function rowsAreasExposicao(resultado) {
  const { eventos } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "L×W+2×(3H)×(L+W)+π×(3H)²", simbolo: "A_D", resultado: eventos.ad, ref: "A.1" },
    { parametro: "Descargas próximas", equacao: "2×500×(L+W)+π×500²", simbolo: "A_M", resultado: eventos.am, ref: "A.6" },
  ];
  eventos.porLinha.forEach((ev) => {
    const id = ev.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "40×L_L", simbolo: "A_L", resultado: ev.al, ref: "A.8" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "4 000×L_L", simbolo: "A_I", resultado: ev.ai, ref: "A.10" });
    if (ev.adj != null) {
      linhas.push({
        parametro: `Estrutura adjacente à linha ${id}`,
        equacao: "L_J×W_J+2×(3H_J)×(L_J+W_J)+π×(3H_J)²",
        simbolo: "A_DJ",
        resultado: ev.adj,
        ref: "A.1",
      });
    }
  });
  return linhas;
}

export function rowsNumeroEventos(resultado) {
  const { eventos } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "N_G×A_D×C_D×10⁻⁶", simbolo: "N_D", resultado: eventos.nd, ref: "A.3" },
    { parametro: "Descargas próximas", equacao: "N_G×A_M×10⁻⁶", simbolo: "N_M", resultado: eventos.nm, ref: "A.5" },
  ];
  eventos.porLinha.forEach((ev) => {
    const id = ev.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "N_G×A_L×C_I×C_E×C_T×10⁻⁶", simbolo: "N_L", resultado: ev.nl, ref: "A.7" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "N_G×A_I×C_I×C_E×C_T×10⁻⁶", simbolo: "N_I", resultado: ev.ni, ref: "A.9" });
    if (ev.ndj) {
      linhas.push({
        parametro: `Estrutura adjacente à linha ${id}`,
        equacao: "N_G×A_DJ×C_DJ×C_T×10⁻⁶",
        simbolo: "N_DJ",
        resultado: ev.ndj,
        ref: "A.4",
      });
    }
  });
  return linhas;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: PASS em todos os testes.

- [ ] **Step 5: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaPdf.js src/lib/spdaPdf.test.js
git commit -m "Linhas de tabela do Anexo A para o memorial SPDA (áreas e eventos)"
```

---

### Task 3: Linhas de tabela do Anexo B — probabilidades

**Files:**
- Modify: `src/lib/spdaPdf.js`
- Modify: `src/lib/spdaPdf.test.js`

**Interfaces:**
- Consumes: `resultado.probs` — `{ pa, pb, peb, pc, pm, porSistema: [{id,pc,pm}], porLinha: [{id,pu,pv,pw,pz}] }` (de `probabilidades()` em `spdaRisco.js`).
- Produces: `rowsProbabilidades(resultado)` → `Array<{parametro, equacao, simbolo, resultado, ref}>`, usada pelo Task 6.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/lib/spdaPdf.test.js`:

```js
import { rowsProbabilidades } from "./spdaPdf";

describe("rowsProbabilidades", () => {
  const resultado = {
    probs: {
      pa: 0.02, pb: 0.05, peb: 0.05,
      pc: 0.031, pm: 0.0004,
      porSistema: [{ id: "s1", pc: 0.02, pm: 0.0004 }],
      porLinha: [{ id: "l1", pu: 0.0025, pv: 0.05, pw: 0.02, pz: 0.02 }],
    },
  };

  it("inclui P_A, P_B e P_EB da estrutura com as refs corretas", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.find((l) => l.simbolo === "P_A")).toMatchObject({ resultado: 0.02, ref: "B.1" });
    expect(linhas.find((l) => l.simbolo === "P_B")).toMatchObject({ resultado: 0.05, ref: "B.2" });
    expect(linhas.find((l) => l.simbolo === "P_EB")).toMatchObject({ resultado: 0.05, ref: "B.7" });
  });

  it("inclui P_C e P_M por sistema interno", () => {
    const linhas = rowsProbabilidades(resultado);
    const pc = linhas.find((l) => l.simbolo === "P_C" && l.parametro.includes("S1"));
    const pm = linhas.find((l) => l.simbolo === "P_M" && l.parametro.includes("S1"));
    expect(pc).toMatchObject({ resultado: 0.02, ref: "B.2" });
    expect(pm).toMatchObject({ resultado: 0.0004, ref: "B.4" });
  });

  it("com um só sistema, não duplica com a linha composta", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.filter((l) => l.parametro === "Composto (todos os sistemas)")).toHaveLength(0);
  });

  it("com mais de um sistema, inclui a linha composta (equações 12 e 13)", () => {
    const doisSistemas = {
      probs: {
        ...resultado.probs,
        porSistema: [{ id: "s1", pc: 0.02, pm: 0.0004 }, { id: "s2", pc: 0.01, pm: 0.0002 }],
      },
    };
    const linhas = rowsProbabilidades(doisSistemas);
    const compostoPc = linhas.find((l) => l.parametro === "Composto (todos os sistemas)" && l.simbolo === "P_C");
    expect(compostoPc).toMatchObject({ resultado: 0.031, ref: "eq. 12" });
  });

  it("inclui P_U, P_V, P_W e P_Z por linha", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.find((l) => l.simbolo === "P_U")).toMatchObject({ resultado: 0.0025, ref: "B.8" });
    expect(linhas.find((l) => l.simbolo === "P_V")).toMatchObject({ resultado: 0.05, ref: "B.9" });
    expect(linhas.find((l) => l.simbolo === "P_W")).toMatchObject({ resultado: 0.02, ref: "B.10" });
    expect(linhas.find((l) => l.simbolo === "P_Z")).toMatchObject({ resultado: 0.02, ref: "B.11" });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: FAIL — `rowsProbabilidades` não existe.

- [ ] **Step 3: Implementar**

Acrescentar ao final de `src/lib/spdaPdf.js`:

```js
export function rowsProbabilidades(resultado) {
  const { probs } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "P_TA×P_B", simbolo: "P_A", resultado: probs.pa, ref: "B.1" },
    { parametro: "Estrutura (Tabela B.2)", equacao: "—", simbolo: "P_B", resultado: probs.pb, ref: "B.2" },
    { parametro: "Estrutura (Tabela B.7)", equacao: "—", simbolo: "P_EB", resultado: probs.peb, ref: "B.7" },
  ];
  probs.porSistema.forEach((s) => {
    const id = s.id.toUpperCase();
    linhas.push({ parametro: `Sistema ${id}`, equacao: "P_SPD×C_LD", simbolo: "P_C", resultado: s.pc, ref: "B.2" });
    linhas.push({ parametro: `Sistema ${id}`, equacao: "(K_S1×K_S2×K_S3×K_S4)²", simbolo: "P_M", resultado: s.pm, ref: "B.4" });
  });
  if (probs.porSistema.length > 1) {
    linhas.push({ parametro: "Composto (todos os sistemas)", equacao: "1−∏(1−P_Ci)", simbolo: "P_C", resultado: probs.pc, ref: "eq. 12" });
    linhas.push({ parametro: "Composto (todos os sistemas)", equacao: "1−∏(1−P_Mi)", simbolo: "P_M", resultado: probs.pm, ref: "eq. 13" });
  }
  probs.porLinha.forEach((p) => {
    const id = p.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_TU×P_EB×P_LD×C_LD", simbolo: "P_U", resultado: p.pu, ref: "B.8" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_EB×P_LD×C_LD", simbolo: "P_V", resultado: p.pv, ref: "B.9" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_SPD×P_LD×C_LD", simbolo: "P_W", resultado: p.pw, ref: "B.10" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_SPD×P_LI×C_LI", simbolo: "P_Z", resultado: p.pz, ref: "B.11" });
  });
  return linhas;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: PASS em todos os testes.

- [ ] **Step 5: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaPdf.js src/lib/spdaPdf.test.js
git commit -m "Linhas de tabela do Anexo B para o memorial SPDA (probabilidades)"
```

---

### Task 4: Linhas de tabela do Anexo C — perdas

**Files:**
- Modify: `src/lib/spdaPdf.js`
- Modify: `src/lib/spdaPdf.test.js`

**Interfaces:**
- Consumes: `resultado.perdas` — `{ la, lb, lc }` (de `perdasL1()`); `perdaL3(estrutura)` de `src/lib/spdaRisco.js`; `entrada.estrutura.patrimonioCultural`.
- Produces: `rowsPerdas(entrada, resultado)` → `Array<{parametro, equacao, simbolo, resultado, ref}>`, usada pelo Task 6.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/lib/spdaPdf.test.js`:

```js
import { rowsPerdas } from "./spdaPdf";
import { defaultEntrada } from "./spdaRisco";

describe("rowsPerdas", () => {
  const resultado = { perdas: { la: 0.0001, lb: 0.0002, lc: 0.00003 } };

  it("inclui L_A, L_B e L_C do L1, sem L3 quando não há patrimônio cultural", () => {
    const entrada = defaultEntrada();
    const linhas = rowsPerdas(entrada, resultado);
    expect(linhas.find((l) => l.simbolo === "L_A")).toMatchObject({ resultado: 0.0001, ref: "C.1/C.2" });
    expect(linhas.find((l) => l.simbolo === "L_B" && l.parametro.includes("L1"))).toMatchObject({ resultado: 0.0002, ref: "C.3" });
    expect(linhas.find((l) => l.simbolo === "L_C")).toMatchObject({ resultado: 0.00003, ref: "C.4" });
    expect(linhas.filter((l) => l.parametro.includes("L3"))).toHaveLength(0);
  });

  it("com patrimônio cultural, inclui L_B do L3 pela equação C.7", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.patrimonioCultural = true;
    entrada.estrutura.providencias = "nenhuma";
    entrada.estrutura.riscoIncendio = "incendioNormal";
    entrada.estrutura.cz = 500000;
    entrada.estrutura.ct = 2000000;
    const linhas = rowsPerdas(entrada, resultado);
    const l3 = linhas.find((l) => l.parametro.includes("L3"));
    expect(l3).toMatchObject({ simbolo: "L_B", ref: "C.7" });
    // r_p=1 (nenhuma providência) × r_f=0,01 (incêndio normal) × L_F=0,1 × (500000/2000000)
    expect(l3.resultado).toBeCloseTo(1 * 0.01 * 0.1 * (500000 / 2000000), 8);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: FAIL — `rowsPerdas` não existe.

- [ ] **Step 3: Implementar**

Acrescentar a importação de `perdaL3` no topo de `src/lib/spdaPdf.js` e a função ao final:

```js
import { perdaL3 } from "./spdaRisco";

export function rowsPerdas(entrada, resultado) {
  const { perdas } = resultado;
  const linhas = [
    { parametro: "Choque elétrico (L1)", equacao: "r_t×L_T×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_A", resultado: perdas.la, ref: "C.1/C.2" },
    { parametro: "Danos físicos (L1)", equacao: "r_p×r_f×h_z×L_F×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_B", resultado: perdas.lb, ref: "C.3" },
    { parametro: "Falha de sistemas internos (L1)", equacao: "L_O×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_C", resultado: perdas.lc, ref: "C.4" },
  ];
  if (entrada.estrutura.patrimonioCultural) {
    linhas.push({
      parametro: "Danos físicos (L3 — patrimônio cultural)",
      equacao: "r_p×r_f×L_F×(c_z/c_t)",
      simbolo: "L_B",
      resultado: perdaL3(entrada.estrutura),
      ref: "C.7",
    });
  }
  return linhas;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: PASS em todos os testes.

- [ ] **Step 5: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaPdf.js src/lib/spdaPdf.test.js
git commit -m "Linhas de tabela do Anexo C para o memorial SPDA (perdas)"
```

---

### Task 5: Dados de entrada — estrutura, linhas e proteções

**Files:**
- Modify: `src/lib/spdaPdf.js`
- Modify: `src/lib/spdaPdf.test.js`

**Interfaces:**
- Consumes: `entrada.estrutura`, `entrada.linhas[i]`, `entrada.protecoes`, `entrada.protecoes.sistemas[i]` (mesma forma de `defaultEntrada()` em `spdaRisco.js`); tabelas de rótulo de `src/data/spdaNBR5419.js`.
- Produces:
  - `linhasEstrutura(estrutura)` → `Array<[label, value]>`
  - `linhasLinhaEletrica(linha)` → `Array<[label, value]>`
  - `linhasProtecoes(protecoes)` → `Array<[label, value]>`
  - `linhasSistemaInterno(sistema)` → `Array<[label, value]>`
  Todas usadas pelo Task 6.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/lib/spdaPdf.test.js`:

```js
import { linhasEstrutura, linhasLinhaEletrica, linhasProtecoes, linhasSistemaInterno } from "./spdaPdf";

describe("linhasEstrutura", () => {
  it("traduz os ids da estrutura padrão em rótulos legíveis", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.ng = 8;
    entrada.estrutura.municipio = "Curitiba";
    entrada.estrutura.uf = "PR";
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.find(([label]) => label === "Município")).toEqual(["Município", "Curitiba/PR"]);
    expect(pares.find(([label]) => label.includes("C_D"))?.[1]).toBe("Isolada: sem objetos nas vizinhanças");
    expect(pares.find(([label]) => label.includes("r_S"))?.[1]).toBe("Robusta: estrutura metálica ou concreto armado");
  });

  it("omite os campos de patrimônio cultural quando a marcação está desligada", () => {
    const entrada = defaultEntrada();
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.some(([label]) => label.includes("acervo"))).toBe(false);
  });

  it("inclui c_z/c_t quando há patrimônio cultural", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.patrimonioCultural = true;
    entrada.estrutura.cz = 1;
    entrada.estrutura.ct = 2;
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.find(([label]) => label.includes("acervo"))).toEqual(["Valor do acervo / total (c_z / c_t)", "1 / 2"]);
  });
});

describe("linhasLinhaEletrica", () => {
  it("traduz os ids da linha em rótulos legíveis", () => {
    const entrada = defaultEntrada();
    const [linha] = entrada.linhas;
    const pares = linhasLinhaEletrica(linha);
    expect(pares.find(([label]) => label === "Tipo")).toEqual(["Tipo", "Energia"]);
    expect(pares.find(([label]) => label.includes("Instalação"))?.[1]).toBe("Aéreo");
  });

  it("inclui a estrutura adjacente quando declarada", () => {
    const linha = { ...defaultEntrada().linhas[0], adjacente: { L: 20, W: 20, H: 5, cd: "isolada" } };
    const pares = linhasLinhaEletrica(linha);
    expect(pares.find(([label]) => label === "Estrutura adjacente")?.[1]).toContain("20 × 20 × 5 m");
  });
});

describe("linhasProtecoes", () => {
  it("traduz as medidas marcáveis em lista de rótulos", () => {
    const protecoes = { ...defaultEntrada().protecoes, medidasPta: ["avisos", "descidaNatural"] };
    const pares = linhasProtecoes(protecoes);
    expect(pares.find(([label]) => label.includes("P_TA"))?.[1]).toBe(
      "Avisos de alerta; Estrutura metálica ou concreto armado como descida natural"
    );
  });

  it("sem nenhuma medida marcada, mostra 'Nenhuma'", () => {
    const pares = linhasProtecoes(defaultEntrada().protecoes);
    expect(pares.find(([label]) => label.includes("P_TA"))?.[1]).toBe("Nenhuma");
  });
});

describe("linhasSistemaInterno", () => {
  it("traduz as marcações do sistema interno", () => {
    const [sistema] = defaultEntrada().protecoes.sistemas;
    const pares = linhasSistemaInterno(sistema);
    expect(pares.find(([label]) => label === "U_W")).toEqual(["U_W", "2,5 kV"]);
    expect(pares.find(([label]) => label === "Blindado")).toEqual(["Blindado", "Não"]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: FAIL — nenhuma das quatro funções existe.

- [ ] **Step 3: Implementar**

Acrescentar imports e funções ao final de `src/lib/spdaPdf.js`:

```js
import {
  LOCALIZACAO_CD, CONSTRUCAO_RS, TIPO_ESTRUTURA_LF, PISO_RT, RISCO_RF,
  PROVIDENCIAS_RP, PERIGO_HZ, LO_POR_ESTRUTURA, INSTALACAO_CI, AMBIENTE_CE,
  TIPO_LINHA_CT, LINHA_CLD_CLI, BLINDAGEM_RS, SPDA_PB, DPS_PSPD, DPS_PEB,
  MEDIDAS_PTA, MEDIDAS_PTU, FIACAO_KS3,
} from "../data/spdaNBR5419";

function rotulo(tabela, id) {
  return tabela.find((t) => t.id === id)?.label ?? "—";
}

export function linhasEstrutura(e) {
  const pares = [
    ["Dimensões (L × W × H)", `${e.L} × ${e.W} × ${e.H} m`],
  ];
  if (e.Hp) pares.push(["Saliência H_P", `${e.Hp} m`]);
  pares.push(["Município", e.municipio && e.uf ? `${e.municipio}/${e.uf}` : "—"]);
  pares.push(["N_G", e.ng != null ? `${e.ng} raios/km²/ano` : "—"]);
  pares.push(["Localização relativa (C_D)", rotulo(LOCALIZACAO_CD, e.cd)]);
  pares.push(["Tipo de construção (r_S)", rotulo(CONSTRUCAO_RS, e.construcao)]);
  pares.push(["Uso da edificação (L_F)", rotulo(TIPO_ESTRUTURA_LF, e.tipoEstrutura)]);
  pares.push(["Piso da área ocupada (r_t)", rotulo(PISO_RT, e.piso)]);
  pares.push(["Risco de incêndio/explosão (r_f)", rotulo(RISCO_RF, e.riscoIncendio)]);
  pares.push(["Combate a incêndio (r_p)", rotulo(PROVIDENCIAS_RP, e.providencias)]);
  pares.push(["Perigo especial (h_z)", rotulo(PERIGO_HZ, e.perigoEspecial)]);
  pares.push(["Pessoas na zona / na estrutura (n_z / n_t)", `${e.nz} / ${e.nt}`]);
  pares.push(["Ocupação", `${e.horasDia} h/dia, ${e.diasSemana} dias/semana`]);
  pares.push(["Explosão ou risco imediato à vida", e.explosaoOuRiscoVida ? "Sim" : "Não"]);
  if (e.explosaoOuRiscoVida) {
    pares.push(["Consequência da falha dos sistemas internos (L_O)", rotulo(LO_POR_ESTRUTURA, e.loEstrutura)]);
  }
  pares.push(["Patrimônio cultural", e.patrimonioCultural ? "Sim" : "Não"]);
  if (e.patrimonioCultural) {
    pares.push(["Valor do acervo / total (c_z / c_t)", `${e.cz} / ${e.ct}`]);
  }
  return pares;
}

export function linhasLinhaEletrica(l) {
  const pares = [
    ["Tipo", l.tipo === "energia" ? "Energia" : "Sinal"],
    ["Comprimento L_L", `${l.ll} m`],
    ["Instalação (C_I)", rotulo(INSTALACAO_CI, l.ci)],
    ["Ambiente (C_E)", rotulo(AMBIENTE_CE, l.ce)],
    ["Tipo de linha (C_T)", rotulo(TIPO_LINHA_CT, l.ct)],
    ["Blindagem (C_LD/C_LI)", rotulo(LINHA_CLD_CLI, l.blindagem)],
    ["Resistência da blindagem (P_LD)", rotulo(BLINDAGEM_RS, l.rs)],
  ];
  if (l.adjacente) {
    pares.push([
      "Estrutura adjacente",
      `${l.adjacente.L} × ${l.adjacente.W} × ${l.adjacente.H} m, ${rotulo(LOCALIZACAO_CD, l.adjacente.cd)}`,
    ]);
  }
  return pares;
}

export function linhasProtecoes(p) {
  const listaOuNenhuma = (tabela, ids) =>
    ids.length ? ids.map((id) => rotulo(tabela, id)).join("; ") : "Nenhuma";
  return [
    ["SPDA (P_B)", rotulo(SPDA_PB, p.spdaNp)],
    ["Sistema coordenado de DPS (P_SPD)", rotulo(DPS_PSPD, p.dpsNp)],
    ["DPS classe I na entrada (P_EB)", rotulo(DPS_PEB, p.dpsClasseI)],
    ["Medidas contra toque/passo na estrutura (P_TA)", listaOuNenhuma(MEDIDAS_PTA, p.medidasPta)],
    ["Medidas contra toque vindo da linha (P_TU)", listaOuNenhuma(MEDIDAS_PTU, p.medidasPtu)],
    ["Fiação interna (K_S3)", rotulo(FIACAO_KS3, p.fiacao)],
    [
      "Blindagem espacial",
      p.blindagemContinua
        ? "Contínua ≥ 0,1 mm (K_S1 = K_S2 = 10⁻⁴)"
        : p.larguraMalha
          ? `Malha, largura ${p.larguraMalha} m`
          : "Nenhuma",
    ],
  ];
}

export function linhasSistemaInterno(s) {
  return [
    ["U_W", `${String(s.uw).replace(".", ",")} kV`],
    ["Blindado", s.blindado ? "Sim" : "Não"],
    ["Interface isolante", s.interfaceIsolante ? "Sim" : "Não"],
    ["Linha associada", s.linhaId ? s.linhaId.toUpperCase() : "Nenhuma"],
    ["Crítico (Seção 7)", s.critico ? "Sim" : "Não"],
    ["Em ZPR₀ᴬ (Seção 7)", s.zpr0a ? "Sim" : "Não"],
  ];
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd eletrocalha-app && npx vitest run src/lib/spdaPdf.test.js`
Expected: PASS em todos os testes.

- [ ] **Step 5: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaPdf.js src/lib/spdaPdf.test.js
git commit -m "Linhas de dados de entrada para o memorial SPDA (estrutura, linhas, proteções)"
```

---

### Task 6: Renderização do PDF (`exportSpdaPDF`)

**Files:**
- Modify: `src/lib/spdaPdf.js`

**Interfaces:**
- Consumes: todas as funções `rows*`/`linhas*` dos Tasks 2-5; `resultado.componentes`, `resultado.chavesR1`, `resultado.r1`, `resultado.r3`, `resultado.rt`, `resultado.dominante`, `resultado.frequencias` (de `avaliarRisco`); `RISCO_TOLERAVEL` de `spdaNBR5419.js`; `cientifica` de `src/components/spda/formato.js`.
- Produces: `exportSpdaPDF({ entrada, resultado })` — `Promise<void>`, assíncrona (import dinâmico de `jsPDF`), salva o arquivo no navegador via `doc.save()`. Consumida pelo Task 7.

Este task não tem teste de unidade — jsPDF renderiza em canvas/base64, sem
saída inspecionável por `expect()`. A verificação é visual, no navegador
(Step 3).

- [ ] **Step 1: Implementar a função de renderização**

Acrescentar ao final de `src/lib/spdaPdf.js`:

```js
import { RISCO_TOLERAVEL } from "../data/spdaNBR5419";
import { cientifica } from "../components/spda/formato";

const DESCRICAO_COMPONENTE = {
  RA: "Ferimentos por choque — descarga na estrutura",
  RB: "Danos físicos — descarga na estrutura",
  RC: "Falha de sistemas internos — descarga na estrutura",
  RM: "Falha de sistemas internos — descarga perto da estrutura",
  RU: "Ferimentos por choque — descarga na linha",
  RV: "Danos físicos — descarga na linha",
  RW: "Falha de sistemas internos — descarga na linha",
  RZ: "Falha de sistemas internos — descarga perto da linha",
};

const COLS_EQUACAO = [
  { t: "Parâmetro", w: 68 },
  { t: "Equação", w: 92 },
  { t: "Símbolo", w: 20 },
  { t: "Resultado", w: 40 },
  { t: "Ref.", w: 18 },
];

function novoDoc(jsPDF) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const state = { doc, pageW, pageH, margin, contentW: pageW - margin * 2, y: margin };

  state.ensureSpace = (needed) => {
    if (state.y + needed > pageH - margin) {
      doc.addPage();
      state.y = margin;
    }
  };

  state.sectionTitle = (text) => {
    state.ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(text, margin, state.y);
    state.y += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, state.y, pageW - margin, state.y);
    state.y += 5;
  };

  state.keyValue = (label, value) => {
    state.ensureSpace(5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, state.y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(String(value), margin + 90, state.y);
    state.y += 4.8;
  };

  return state;
}

function tabelaEquacoes(state, titulo, linhas) {
  const { doc, margin, pageW } = state;
  state.sectionTitle(`${titulo} (${linhas.length})`);
  let x = margin;
  const xs = COLS_EQUACAO.map((c) => { const atual = x; x += c.w; return atual; });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  COLS_EQUACAO.forEach((c, i) => doc.text(c.t, xs[i], state.y));
  state.y += 1.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, state.y, pageW - margin, state.y);
  state.y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  linhas.forEach((l) => {
    state.ensureSpace(4.8);
    doc.setTextColor(30, 41, 59);
    doc.text(l.parametro, xs[0], state.y);
    doc.setTextColor(100, 116, 139);
    doc.text(l.equacao, xs[1], state.y);
    doc.setTextColor(30, 41, 59);
    doc.text(l.simbolo, xs[2], state.y);
    doc.text(cientifica(l.resultado), xs[3], state.y);
    doc.setTextColor(148, 163, 184);
    doc.text(l.ref, xs[4], state.y);
    state.y += 4.8;
  });
  state.y += 2;
}

export async function exportSpdaPDF({ entrada, resultado }) {
  // Import dinâmico: jspdf é pesado (~400 kB) e só é necessário na hora de
  // gerar o relatório — não entra no bundle inicial do app.
  const { jsPDF } = await import("jspdf");
  const state = novoDoc(jsPDF);
  const { doc, margin, pageW } = state;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("Memorial de Cálculo — SPDA (ABNT NBR 5419-2:2026)", margin, state.y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const agora = new Date();
  doc.text(
    `Dimensionador do Gustavo — ${agora.toLocaleDateString("pt-BR")} ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - margin,
    state.y + 2,
    { align: "right" }
  );
  state.y += 9;

  // Dados de entrada — Estrutura
  state.sectionTitle("Dados de entrada — Estrutura");
  linhasEstrutura(entrada.estrutura).forEach(([label, value]) => state.keyValue(label, value));
  state.y += 2;

  // Dados de entrada — Linhas elétricas
  entrada.linhas.forEach((l) => {
    state.sectionTitle(`Linha elétrica ${l.id.toUpperCase()}`);
    linhasLinhaEletrica(l).forEach(([label, value]) => state.keyValue(label, value));
    state.y += 2;
  });

  // Dados de entrada — Proteções
  state.sectionTitle("Dados de entrada — Proteções");
  linhasProtecoes(entrada.protecoes).forEach(([label, value]) => state.keyValue(label, value));
  state.y += 2;
  (entrada.protecoes.sistemas ?? []).forEach((s) => {
    state.sectionTitle(`Sistema interno ${s.id.toUpperCase()}`);
    linhasSistemaInterno(s).forEach(([label, value]) => state.keyValue(label, value));
    state.y += 2;
  });

  // Anexo A
  tabelaEquacoes(state, "Áreas de exposição equivalente (Anexo A)", rowsAreasExposicao(resultado));
  tabelaEquacoes(state, "Número esperado de eventos perigosos (Anexo A)", rowsNumeroEventos(resultado));

  // Anexo B
  tabelaEquacoes(state, "Probabilidades (Anexo B)", rowsProbabilidades(resultado));

  // Anexo C
  tabelaEquacoes(state, "Perdas (Anexo C)", rowsPerdas(entrada, resultado));

  // Componentes de risco
  state.sectionTitle("Componentes de risco");
  Object.keys(resultado.componentes).forEach((k) => {
    const emR1 = resultado.chavesR1.includes(k);
    const valor = resultado.componentes[k];
    const pct = emR1 && resultado.r1 > 0 ? `${((valor / resultado.r1) * 100).toFixed(1).replace(".", ",")}%` : "—";
    const marca = k === resultado.dominante ? " (dominante)" : "";
    state.keyValue(`${k.replace("R", "R_")} — ${DESCRICAO_COMPONENTE[k]}${marca}`, `${cientifica(valor)} · ${pct} de R1`);
  });
  state.y += 2;

  // Veredito R1 / R3
  state.sectionTitle("Veredito");
  state.keyValue("R1 — vida humana", `${cientifica(resultado.r1)}/ano (tolerável ${cientifica(resultado.rt.R1)}) — ${resultado.precisa.r1 ? "acima do tolerável" : "dentro do tolerável"}`);
  if (resultado.r3 !== null) {
    state.keyValue("R3 — patrimônio cultural", `${cientifica(resultado.r3)}/ano (tolerável ${cientifica(resultado.rt.R3)}) — ${resultado.precisa.r3 ? "acima do tolerável" : "dentro do tolerável"}`);
  }
  state.y += 2;

  // Frequência de danos F
  if (resultado.frequencias.length) {
    state.sectionTitle(`Frequência de danos F — ${resultado.frequencias.length} sistema(s)`);
    resultado.frequencias.forEach((f) => {
      state.keyValue(
        `Sistema ${f.id.toUpperCase()}`,
        `maior fonte ${cientifica(f.maior)}/ano (tolerável ${cientifica(f.ft)}) — ${f.atende ? "atende" : "não atende"}`
      );
    });
  }

  const nomeMunicipio = (entrada.estrutura.municipio || "").replace(/[^\w\dÀ-ÿ -]+/g, "").trim();
  const nome = nomeMunicipio ? `memorial-spda-${nomeMunicipio}` : "memorial-spda";
  doc.save(`${nome}.pdf`);
}
```

- [ ] **Step 2: Rodar a suíte inteira para garantir que nada quebrou**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos, incluindo `spdaPdf.test.js`.

- [ ] **Step 3: Verificar no navegador**

Este step só pode ser feito com o app rodando (`npm run dev` e o preview do
Claude Code, ou manualmente). Como `exportSpdaPDF` ainda não está ligada a
nenhum botão, a verificação visual completa (abrir o PDF gerado e comparar
com a tela) acontece no Task 7, depois do botão existir. Por ora, confirmar
que o build não quebra:

Run: `cd eletrocalha-app && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
cd eletrocalha-app
git add src/lib/spdaPdf.js
git commit -m "Renderização do memorial SPDA em PDF (exportSpdaPDF)"
```

---

### Task 7: Botão "Relatório PDF" na aba SPDA

**Files:**
- Modify: `src/components/SpdaTab.jsx`

**Interfaces:**
- Consumes: `exportSpdaPDF({ entrada, resultado })` do Task 6.
- Produces: nada consumido por outro task — ponta final da funcionalidade.

- [ ] **Step 1: Adicionar o botão e a chamada**

Em `src/components/SpdaTab.jsx`, acrescentar o import (linha 2, junto aos
outros imports de `../lib/spdaRisco`):

```js
import { defaultEntrada, avaliarRisco } from "../lib/spdaRisco";
import { exportSpdaPDF } from "../lib/spdaPdf";
```

No corpo do componente, definir o handler antes do `return` (depois da
linha `const resultado = useMemo(...)`, por volta da linha 51):

```js
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const exportarPdf = () => {
    setGerandoPdf(true);
    exportSpdaPDF({ entrada, resultado }).finally(() => setGerandoPdf(false));
  };
```

`useState` já está importado no topo do arquivo (`import { useEffect, useMemo, useState } from "react";`).

No cabeçalho da aba (dentro do primeiro `<div className="rounded-sm border ...">`,
por volta da linha 58-67), acrescentar o botão ao lado do título:

```jsx
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-base font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
              Gerenciamento de risco — SPDA
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Análise de risco conforme a <b>ABNT NBR 5419-2:2026</b>, com a estrutura tratada como
              zona de estudo única. Calcula as oito componentes de risco, soma R1 e R3 e compara com os
              riscos toleráveis da Tabela 4.
            </p>
          </div>
          {entrada.estrutura.ng != null && (
            <button
              type="button"
              onClick={exportarPdf}
              disabled={gerandoPdf}
              className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700 disabled:opacity-50"
            >
              {gerandoPdf ? "Gerando…" : "Relatório PDF"}
            </button>
          )}
        </div>
      </div>
```

Isso substitui o `<div className="rounded-sm border ...">...</div>` original
do cabeçalho (linhas 58-67 do arquivo atual).

- [ ] **Step 2: Rodar a suíte de testes**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS — nenhum teste existente cobre `SpdaTab.jsx` diretamente (é
verificado por browser), então isso só confirma que nada mais quebrou.

- [ ] **Step 3: Verificar no navegador**

Usar o preview do Claude Code (`preview_start` com o dev server do projeto,
depois `navigate` até a aba SPDA):

1. Abrir a aba SPDA — sem município escolhido, o botão não deve aparecer.
2. Escolher um município no painel Estrutura (o galpão padrão já vem
   preenchido) — o botão "Relatório PDF" deve aparecer no cabeçalho.
3. Clicar no botão — deve baixar um arquivo `memorial-spda-<município>.pdf`.
4. Abrir o PDF baixado e conferir visualmente:
   - R1 e R3 (se marcado patrimônio cultural) batem com os valores mostrados
     na tela (cartões do `VereditoRisco`).
   - A tabela de componentes de risco bate com `ResultadoRisco.jsx`.
   - Se houver sistema interno, a tabela de F bate com `FrequenciaDanos.jsx`.
   - As tabelas de áreas/eventos/probabilidades/perdas aparecem, com números
     de equação visíveis (A.1, A.3, B.2, C.1/C.2 etc.).
5. Marcar "Abriga patrimônio cultural" no painel Estrutura, gerar de novo, e
   confirmar que a linha L_B (L3, equação C.7) aparece na tabela de perdas.
6. Adicionar uma segunda linha elétrica e um segundo sistema interno,
   marcar "Há estrutura na outra extremidade da linha" numa delas, gerar de
   novo, e confirmar que aparecem as linhas A_DJ/N_DJ e a linha "Composto
   (todos os sistemas)" nas tabelas de probabilidade.

- [ ] **Step 4: Commit**

```bash
cd eletrocalha-app
git add src/components/SpdaTab.jsx
git commit -m "Adiciona botão Relatório PDF na aba SPDA"
```

---

### Task 8: Changelog e verificação final

**Files:**
- Modify: `src/data/changelog.js`

**Interfaces:**
- Consumes: nada de tasks anteriores além do que já está pronto.
- Produces: nada — último task do plano.

- [ ] **Step 1: Acrescentar a entrada do changelog**

Em `src/data/changelog.js`, depois da entrada `versao: "1.22.0"` (a última
do array `CHANGELOG`), acrescentar:

```js
  {
    versao: "1.23.0",
    data: "2026-08-07",
    titulo: "Memorial de cálculo em PDF na aba SPDA",
    tipo: "novo",
    itens: [
      "Botão \"Relatório PDF\" na aba SPDA: exporta o memorial completo — dados de entrada, áreas de exposição, número de eventos, probabilidades e perdas dos Anexos A, B e C, componentes de risco, veredito R1/R3 e frequência de danos F.",
      "Fórmulas e números de equação conferidos diretamente contra o texto oficial da ABNT NBR 5419-2:2026 (2ª edição).",
    ],
  },
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `cd eletrocalha-app && npx vitest run`
Expected: PASS em todos os arquivos — inclui `changelog.test.js`, que trava
o formato de versão e a ordem cronológica.

- [ ] **Step 3: Build de produção**

Run: `cd eletrocalha-app && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
cd eletrocalha-app
git add src/data/changelog.js
git commit -m "Changelog 1.23.0 — memorial de cálculo em PDF na aba SPDA"
```

- [ ] **Step 5: Revisão final e integração**

Com todos os tasks commitados na branch `spda-memorial-pdf`, seguir o
fluxo já usado nas features anteriores deste projeto: revisão de código de
ponta a ponta (superpowers:requesting-code-review) e, aprovado, merge para
`master` com `superpowers:finishing-a-development-branch`.

---

## Self-Review

**Cobertura da spec:** cabeçalho (Task 6) · dados de entrada — estrutura,
linhas, proteções, sistemas internos (Task 5 + 6) · Anexo A — áreas e
eventos (Task 2) · Anexo B — probabilidades (Task 3) · Anexo C — perdas
(Task 4) · componentes de risco (Task 6) · veredito R1/R3 (Task 6) ·
frequência F (Task 6) · botão na aba (Task 7) · sem seção de sugestão de
medidas (respeitado — não implementada) · nome do arquivo com slug do
município (Task 6) · changelog (Task 8). A extensão do motor (`adj` em
`numeroEventos`) está no Task 1, antes de qualquer task que dependa dela.

**Consistência de tipos:** `rows*` sempre devolve
`{parametro, equacao, simbolo, resultado, ref}`; `linhas*` sempre devolve
`Array<[label, value]>`. `exportSpdaPDF` é a única função assíncrona (por
causa do import dinâmico do jsPDF) — o Task 7 já trata isso com
`.finally()` em vez de `await` direto num handler síncrono de clique.
