# Simulação de infraestrutura na aba Cabos Elétricos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rodar a busca de infraestrutura dentro da própria aba Cabos Elétricos, com um desenho que identifica os circuitos do trecho por uma legenda em lista desenhada dentro do SVG.

**Architecture:** Três camadas novas. Um módulo puro (`simulacaoTrecho.js`) converte circuitos dimensionados em cabos físicos e produz a legenda. Um hook (`useBuscaInfra`) extrai a máquina de estados da busca que hoje está solta dentro do `InfraTab`, e passa a servir as duas abas. Um componente (`SimulacaoTrecho.jsx`) monta o painel na aba do quadro. O `TrayVisualization` ganha uma prop opcional `legenda`; ausente, renderiza exatamente o que renderiza hoje.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, vitest, oxlint. Sem dependência nova.

## Global Constraints

- Idioma da UI e dos comentários de código: **português do Brasil**.
- O linter do projeto é **oxlint**, não eslint. Rodar `npx oxlint <arquivo>`.
- Testes com **vitest**: `npx vitest run`. A suíte inteira precisa continuar passando (384 testes na base).
- Cor de acento da marca: `copper` (`copper-600` em claro, `copper-400/500` em escuro). Todo componente novo precisa funcionar em **tema claro e escuro** (classes `dark:`).
- Não alterar `src/lib/reverseSearch.js`, `src/lib/packing.js`, `src/lib/occupancy.js` nem `src/lib/cableSizingPro.js`.
- Não alterar a ponte existente `onEnviarParaInfra` → `App.pendingImport` → `InfraTab` → `ImportarPlanilha`.
- `src/lib/quadroToMemorial.js` continua existindo e em uso — é o que a ponte consome.
- Commits com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` na última linha.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/simulacaoTrecho.js` *(novo)* | Puro. Circuitos → cabos físicos + itens de legenda; conduto declarado; ocupação contra o resultado aplicado |
| `src/lib/simulacaoTrecho.test.js` *(novo)* | Testes do acima |
| `src/lib/exportarSvgPng.js` *(novo)* | O `exportPNG` do `InfraTab` extraído, agora com três consumidores |
| `src/hooks/useBuscaInfra.js` *(novo)* | Estado da busca reversa: resultados, filtro de tipo, camadas, opção aplicada |
| `src/components/TrayVisualization.jsx` *(modificar)* | Prop opcional `legenda`, nos dois ramos (retangular e circular) |
| `src/components/InfraTab.jsx` *(modificar)* | Passa a consumir o hook, o `ocupacaoAplicada` e o `exportarSvgPng` |
| `src/components/cabos/SimulacaoTrecho.jsx` *(novo)* | O painel |
| `src/components/QuadroCargasTab.jsx` *(modificar)* | Botão e slot do painel |
| `src/App.jsx` *(modificar)* | Passa `dark` para o `QuadroCargasTab` |
| `src/data/changelog.js` *(modificar)* | Release 1.26.0 |

---

### Task 1: `circuitosParaCabos`

**Files:**
- Create: `src/lib/simulacaoTrecho.js`
- Test: `src/lib/simulacaoTrecho.test.js`

**Interfaces:**
- Consumes: `designacaoCabos` de `./cableSizingPro`, `parseSecao` de `./importCables`, `getDiameter` de `../data/corfioHEPR`.
- Produces:
  ```js
  circuitosParaCabos({ circuitos, resultados, selecionados, material, semTrifolio })
    → { cabos, itens, avisos }
  ```
  `cabos`: array no formato que `layoutCables`/`computeOccupancy` consomem —
  `{ section, d, type, vias, trifolio?, material, groupId }`.
  `itens`: array `{ numero, tag, descricao, designacao, podeTrifolio, indice }`.
  `avisos`: array de strings.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/simulacaoTrecho.test.js`:

```js
// De circuitos já dimensionados para os cabos físicos que a simulação
// empacota. É o contrato entre o Quadro de Cargas e o motor de infraestrutura
// — se designacaoCabos ou parseSecao mudarem de formato, estes testes quebram.

import { describe, it, expect } from "vitest";
import { circuitosParaCabos } from "./simulacaoTrecho";
import { getDiameter } from "../data/corfioHEPR";

// Circuito mínimo + resultado que designacaoCabos consome. Valores à mão, não
// vindos do motor real — o que se testa aqui é a conversão, não a conta.
const circ = (over = {}) => ({ tag: "AL-01", descricao: "", esquemaId: "trifCnCt", trechos: [], ...over });
const res = (over = {}) => ({ secaoFinal: 25, neutro: 25, protecao: 16, porFase: 1, tipoCabo: "unipolar", ...over });

const chamar = (over = {}) =>
  circuitosParaCabos({
    circuitos: [circ()],
    resultados: [res()],
    selecionados: [0],
    material: "cobre",
    semTrifolio: new Set(),
    ...over,
  });

describe("circuitosParaCabos", () => {
  it("agrupa 3 fases unipolares iguais num feixe de trifólio", () => {
    const { cabos } = chamar();
    // 3#25 (trifólio, 1 entrada) + 1#25 (neutro) + 1#16 (terra)
    expect(cabos).toHaveLength(3);
    expect(cabos[0]).toMatchObject({ section: 25, type: "unipolar", vias: 1, trifolio: true });
    expect(cabos[1]).toMatchObject({ section: 25, trifolio: undefined });
    expect(cabos[2]).toMatchObject({ section: 16 });
  });

  it("com o trifólio desmarcado, as 3 fases viram condutores soltos", () => {
    const { cabos } = chamar({ semTrifolio: new Set([0]) });
    // 3 fases soltas + neutro + terra
    expect(cabos).toHaveLength(5);
    expect(cabos.every((c) => !c.trifolio)).toBe(true);
    expect(cabos.filter((c) => c.section === 25)).toHaveLength(4);
  });

  it("resolve o diâmetro pelo catálogo do material pedido", () => {
    const cobre = chamar({ material: "cobre" }).cabos[0].d;
    const aluminio = chamar({ material: "aluminio" }).cabos[0].d;
    expect(cobre).toBe(getDiameter(25, "unipolar", 1, "cobre"));
    expect(aluminio).toBe(getDiameter(25, "unipolar", 1, "aluminio"));
    expect(cobre).not.toBe(aluminio);
  });

  it("multipolar vira um cabo de N vias mais o terra unipolar", () => {
    const { cabos } = chamar({
      resultados: [res({ tipoCabo: "multipolar", secaoFinal: 16, neutro: 16, protecao: 16 })],
    });
    expect(cabos).toHaveLength(2);
    expect(cabos[0]).toMatchObject({ type: "multipolar", vias: 4, section: 16 });
    expect(cabos[1]).toMatchObject({ type: "unipolar", vias: 1, section: 16 });
  });

  it("numera a legenda pela posição no quadro, não pela posição na seleção", () => {
    const { itens } = chamar({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" }), circ({ tag: "AL-03" })],
      resultados: [res(), res(), res()],
      selecionados: [2], // só o terceiro
    });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ numero: "03", tag: "AL-03" });
  });

  it("marca podeTrifolio só quando há um grupo de 3 unipolares iguais", () => {
    expect(chamar().itens[0].podeTrifolio).toBe(true);
    // porFase 2 → 6 fases soltas, não é feixe de trifólio
    const seis = chamar({ resultados: [res({ porFase: 2 })] });
    expect(seis.itens[0].podeTrifolio).toBe(false);
    expect(seis.cabos.filter((c) => c.section === 25)).toHaveLength(7); // 6 fases + neutro
  });

  it("deixa fora da simulação o circuito com erro de cálculo, e avisa", () => {
    const { cabos, itens, avisos } = circuitosParaCabos({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" })],
      resultados: [{ error: "sem corrente" }, res()],
      selecionados: [0, 1],
      material: "cobre",
      semTrifolio: new Set(),
    });
    expect(itens).toHaveLength(1);
    expect(itens[0].tag).toBe("AL-02");
    expect(cabos.length).toBeGreaterThan(0);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("AL-01");
  });

  it("seleção vazia devolve tudo vazio, sem estourar", () => {
    const { cabos, itens, avisos } = chamar({ selecionados: [] });
    expect(cabos).toEqual([]);
    expect(itens).toEqual([]);
    expect(avisos).toEqual([]);
  });

  it("dá um groupId distinto por circuito, para a lista não fundir ramais", () => {
    const { cabos } = chamar({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" })],
      resultados: [res(), res()],
      selecionados: [0, 1],
    });
    const grupos = new Set(cabos.map((c) => c.groupId));
    expect(grupos.size).toBe(6); // 3 specs × 2 circuitos
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/lib/simulacaoTrecho.test.js`
Expected: FAIL — `Failed to resolve import "./simulacaoTrecho"`.

- [ ] **Step 3: Escrever a implementação**

Criar `src/lib/simulacaoTrecho.js`:

```js
// Ponte entre o Quadro de Cargas e o motor de infraestrutura: converte
// circuitos já dimensionados nos cabos físicos que o empacotamento acomoda, e
// monta a legenda que identifica os circuitos no desenho.
//
// O caminho antigo (aba Infraestrutura) passa por quadroToMemorial →
// parseMemorial, serializando os circuitos para texto tabulado só para
// reparsear em seguida. Aquele caminho continua, porque a importação da aba
// Infra é feita de texto colado. Aqui, com os circuitos em mãos, o desvio pelo
// texto não faz sentido: vai direto de designacaoCabos para parseSecao.
import { getDiameter } from "../data/corfioHEPR";
import { designacaoCabos } from "./cableSizingPro";
import { parseSecao } from "./importCables";

// `circuitos` e `resultados` são os arrays COMPLETOS do quadro; `selecionados`
// traz os índices marcados. Receber tudo e filtrar aqui dentro é o que permite
// numerar a legenda pela posição real na tabela. `semTrifolio` é um Set de
// índices no mesmo espaço.
//
// Um circuito que falhe em qualquer parte da sua designação sai inteiro da
// simulação (com aviso) em vez de entrar pela metade — meio circuito no
// desenho daria uma ocupação errada sem ninguém perceber.
export function circuitosParaCabos({ circuitos, resultados, selecionados, material = "cobre", semTrifolio }) {
  const cabos = [];
  const itens = [];
  const avisos = [];
  const sem = semTrifolio ?? new Set();

  for (const i of selecionados ?? []) {
    const c = circuitos[i];
    const r = resultados[i];
    const numero = String(i + 1).padStart(2, "0");

    if (!c || !r || r.error) {
      avisos.push(`${numero} ${c?.tag ?? "?"}: circuito com erro de cálculo — fora da simulação.`);
      continue;
    }

    const designacao = designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r });
    if (!designacao || designacao === "—") {
      avisos.push(`${numero} ${c.tag}: sem designação de cabos — fora da simulação.`);
      continue;
    }

    const doCircuito = [];
    let podeTrifolio = false;
    let falhou = false;

    parseSecao(designacao).forEach((spec, j) => {
      if (falhou) return;
      if (spec.error) {
        avisos.push(`${numero} ${c.tag}: ${spec.error}.`);
        falhou = true;
        return;
      }
      let d;
      try {
        d = getDiameter(spec.section, spec.cableType, spec.vias, material);
      } catch (e) {
        avisos.push(`${numero} ${c.tag}: ${e.message}`);
        falhou = true;
        return;
      }
      // Grupo de exatamente 3 unipolares iguais é o padrão de um trifólio real
      // (as três fases). É a mesma regra do canBeTrifolio do parseMemorial.
      const trifoliavel = spec.cableType === "unipolar" && spec.quantity === 3;
      if (trifoliavel) podeTrifolio = true;

      const groupId = `sim-${i}-${j}`;
      if (trifoliavel && !sem.has(i)) {
        // Uma entrada só: o feixe é manuseado e empacotado como uma peça.
        doCircuito.push({ section: spec.section, d, type: "unipolar", vias: 1, trifolio: true, material, groupId });
        return;
      }
      for (let k = 0; k < spec.quantity; k++) {
        doCircuito.push({
          section: spec.section,
          d,
          type: spec.cableType,
          vias: spec.cableType === "multipolar" ? spec.vias : 1,
          material,
          groupId,
        });
      }
    });

    if (falhou) continue;
    cabos.push(...doCircuito);
    itens.push({ numero, tag: c.tag, descricao: c.descricao || "", designacao, podeTrifolio, indice: i });
  }

  return { cabos, itens, avisos };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/lib/simulacaoTrecho.test.js`
Expected: PASS — 9 testes.

- [ ] **Step 5: Lint**

Run: `npx oxlint src/lib/simulacaoTrecho.js src/lib/simulacaoTrecho.test.js`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/simulacaoTrecho.js src/lib/simulacaoTrecho.test.js
git commit -m "$(cat <<'EOF'
Converter circuitos dimensionados em cabos para a simulação

circuitosParaCabos vai de designacaoCabos direto para parseSecao, sem o
desvio pelo texto tabulado que o caminho da aba Infraestrutura faz.
Recebe os arrays completos do quadro mais os índices selecionados, para
numerar a legenda pela posição real na tabela.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `condutoPredominante` e `ocupacaoAplicada`

**Files:**
- Modify: `src/lib/simulacaoTrecho.js` (acrescentar ao final)
- Modify: `src/lib/simulacaoTrecho.test.js` (acrescentar dois `describe`)

**Interfaces:**
- Consumes: `INFRA_TYPES` e `getDimensions` de `../data/corfioHEPR`, `computeOccupancy` de `./occupancy`.
- Produces:
  ```js
  condutoPredominante(circuitos) → string | null
  ocupacaoAplicada(cables, applied) → { trayArea, cableArea, ocupacao, limite, dentroLimite } | null
  ```

- [ ] **Step 1: Escrever os testes que falham**

Primeiro, ampliar os imports **no topo** de `src/lib/simulacaoTrecho.test.js`
(imports no fim do arquivo são válidos em ES modules, mas o linter reclama e a
leitura piora):

```js
import { circuitosParaCabos, condutoPredominante, ocupacaoAplicada } from "./simulacaoTrecho";
import { computeOccupancy } from "./occupancy";
```

Depois, acrescentar ao final do arquivo:

```js
const trecho = (condutoId) => ({ condutoId, distancia: 30, temperatura: 30, circuitos: 1, camadas: 1 });

describe("condutoPredominante", () => {
  it("devolve o conduto quando todos os trechos de todos os circuitos concordam", () => {
    const cs = [
      { trechos: [trecho("eletrocalha"), trecho("eletrocalha")] },
      { trechos: [trecho("eletrocalha")] },
    ];
    expect(condutoPredominante(cs)).toBe("eletrocalha");
  });

  it("devolve null quando trechos do mesmo circuito divergem", () => {
    const cs = [{ trechos: [trecho("eletrocalha"), trecho("leito")] }];
    expect(condutoPredominante(cs)).toBe(null);
  });

  it("devolve null quando circuitos diferentes divergem entre si", () => {
    const cs = [{ trechos: [trecho("perfilado")] }, { trechos: [trecho("eletroduto")] }];
    expect(condutoPredominante(cs)).toBe(null);
  });

  it("devolve null para conduto sem equivalente na simulação", () => {
    // dutoSubt existe em CONDUTOS mas não em INFRA_TYPES
    expect(condutoPredominante([{ trechos: [trecho("dutoSubt")] }])).toBe(null);
    expect(condutoPredominante([{ trechos: [trecho("canaletaEmb")] }])).toBe(null);
  });

  it("não estoura com lista vazia ou circuito sem trechos", () => {
    expect(condutoPredominante([])).toBe(null);
    expect(condutoPredominante([{}])).toBe(null);
    expect(condutoPredominante(undefined)).toBe(null);
  });
});

describe("ocupacaoAplicada", () => {
  const cabos = [
    { d: 10, type: "unipolar", vias: 1 },
    { d: 10, type: "unipolar", vias: 1 },
    { d: 10, type: "unipolar", vias: 1 },
  ];

  it("devolve null sem resultado aplicado", () => {
    expect(ocupacaoAplicada(cabos, null)).toBe(null);
  });

  it("calha retangular: usa a área do resultado e o limite de 40% (3 condutores)", () => {
    const applied = { infraType: "eletrocalha", eletrodutoNorma: null, trayWidth: 100, trayHeight: 50, trayArea: 5000 };
    const oc = ocupacaoAplicada(cabos, applied);
    expect(oc.trayArea).toBe(5000);
    expect(oc.limite).toBe(40);
    expect(oc.cableArea).toBeCloseTo(3 * Math.PI * 25, 6);
    expect(oc.dentroLimite).toBe(true);
  });

  it("eletroduto: cobra o limite da seção circular", () => {
    const R = 20;
    const applied = {
      infraType: "eletroduto", eletrodutoNorma: "nbr5624",
      trayWidth: 2 * R, trayHeight: 2 * R, trayArea: Math.PI * R * R,
    };
    const oc = ocupacaoAplicada(cabos, applied);
    // 3 condutores num duto → 40%, igual ao computeOccupancy com isDuct
    expect(oc.limite).toBe(computeOccupancy(cabos, Math.PI * R * R, true).limite);
    expect(oc.ocupacao).toBeCloseTo(computeOccupancy(cabos, Math.PI * R * R, true).ocupacao, 6);
  });

  it("com septo: soma as áreas, pega a pior ocupação e o menor limite", () => {
    const mistos = [
      { d: 10, type: "unipolar", vias: 1 },
      { d: 6, type: "comando", vias: 7 },
      { d: 6, type: "comando", vias: 7 },
    ];
    const applied = {
      infraType: "eletrocalha", eletrodutoNorma: null, hasSeptum: true,
      trayWidth: 100, trayHeight: 50, trayArea: 5000, septum: 2, splitX: 60,
    };
    const oc = ocupacaoAplicada(mistos, applied);
    const forca = computeOccupancy([mistos[0]], 60 * 50, false);
    const comando = computeOccupancy(mistos.slice(1), 38 * 50, false);
    expect(oc.cableArea).toBeCloseTo(forca.cableArea + comando.cableArea, 6);
    expect(oc.ocupacao).toBeCloseTo(Math.max(forca.ocupacao, comando.ocupacao), 6);
    expect(oc.limite).toBe(Math.min(forca.limite, comando.limite));
  });

  it("trifólio conta como 3 condutores na área", () => {
    const trif = [{ d: 10, type: "unipolar", vias: 1, trifolio: true }];
    const applied = { infraType: "eletrocalha", eletrodutoNorma: null, trayWidth: 100, trayHeight: 50, trayArea: 5000 };
    expect(ocupacaoAplicada(trif, applied).cableArea).toBeCloseTo(3 * Math.PI * 25, 6);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/lib/simulacaoTrecho.test.js`
Expected: FAIL — `condutoPredominante is not a function` (ou erro de importação).

- [ ] **Step 3: Escrever a implementação**

Acrescentar ao final de `src/lib/simulacaoTrecho.js` (e completar o import do topo):

```js
// no topo do arquivo, trocar o import de corfioHEPR por:
import { INFRA_TYPES, getDimensions, getDiameter } from "../data/corfioHEPR";
// e acrescentar:
import { computeOccupancy } from "./occupancy";
```

```js
// Ids que a simulação sabe desenhar. CONDUTOS (cabosNBR5410) e INFRA_TYPES
// (corfioHEPR) coincidem em eletrocalha, perfilado, leito e eletroduto; os
// demais condutos (canaleta embutida, duto e canaleta subterrâneos) não têm
// equivalente aqui, e o aramado existe só do lado da infraestrutura.
const IDS_INFRA = new Set(INFRA_TYPES.map((t) => t.id));

// O conduto que os circuitos declaram, quando declaram um só. É o que definiu
// o método de referência (B1/B2/E/F) e o fator de agrupamento que
// dimensionaram aqueles cabos — simular outro tipo contradiz a própria conta
// que gerou a bitola, então ele é o padrão do filtro do painel.
//
// Basta um trecho divergente, ou um conduto sem equivalente, para devolver
// null: aí o painel abre em "todos os tipos" e avisa.
export function condutoPredominante(circuitos) {
  let unico = null;
  for (const c of circuitos ?? []) {
    for (const t of c?.trechos ?? []) {
      if (!IDS_INFRA.has(t.condutoId)) return null;
      if (unico === null) unico = t.condutoId;
      else if (unico !== t.condutoId) return null;
    }
  }
  return unico;
}

// Ocupação recalculada a partir dos cabos ATUAIS contra a infraestrutura
// aplicada. O objeto `applied` congela os números do momento da busca, e os
// cabos podem ter mudado desde então — é essa diferença que faz aparecer o
// aviso de "já não cabem".
export function ocupacaoAplicada(cables, applied) {
  if (!applied) return null;

  if (applied.hasSeptum) {
    // Dois compartimentos independentes: o trecho só está dentro do limite se
    // os dois estiverem, então vale a pior ocupação contra o menor limite.
    const forca = cables.filter((c) => c.type !== "comando");
    const comando = cables.filter((c) => c.type === "comando");
    const w1 = applied.splitX;
    const w2 = applied.trayWidth - applied.septum - applied.splitX;
    const forcaOcc = computeOccupancy(forca, w1 * applied.trayHeight, false);
    const comandoOcc = computeOccupancy(comando, w2 * applied.trayHeight, false);
    return {
      trayArea: applied.trayArea,
      cableArea: forcaOcc.cableArea + comandoOcc.cableArea,
      ocupacao: Math.max(forcaOcc.ocupacao, comandoOcc.ocupacao),
      limite: Math.min(forcaOcc.limite, comandoOcc.limite),
      dentroLimite: forcaOcc.dentroLimite && comandoOcc.dentroLimite,
    };
  }

  const isDuct = getDimensions(applied.infraType, applied.eletrodutoNorma).kind === "duct";
  return { trayArea: applied.trayArea, ...computeOccupancy(cables, applied.trayArea, isDuct) };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/lib/simulacaoTrecho.test.js`
Expected: PASS — 20 testes (9 da Task 1 + 5 + 6).

- [ ] **Step 5: Suíte inteira e lint**

Run: `npx vitest run && npx oxlint src/lib/simulacaoTrecho.js src/lib/simulacaoTrecho.test.js`
Expected: toda a suíte passa; lint limpo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/simulacaoTrecho.js src/lib/simulacaoTrecho.test.js
git commit -m "$(cat <<'EOF'
Conduto declarado pelos circuitos e ocupação contra o aplicado

condutoPredominante lê o condutoId dos trechos para o filtro de tipo
nascer coerente com o método de referência e o FCA que dimensionaram o
cabo. ocupacaoAplicada é o liveOccupancy do InfraTab extraído como
função pura, com o ramo do septo divisor — agora testável.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `useBuscaInfra`, `exportarSvgPng` e refactor do `InfraTab`

Esta é a task de risco de regressão: a aba Infraestrutura funciona hoje e vai
passar a rodar por código compartilhado. O comportamento dela precisa ficar
**idêntico**.

**Files:**
- Create: `src/hooks/useBuscaInfra.js`
- Create: `src/lib/exportarSvgPng.js`
- Modify: `src/components/InfraTab.jsx`

**Interfaces:**
- Consumes: `findBestFits`, `selectDiverseResults` de `../lib/reverseSearch`; `ocupacaoAplicada` de `../lib/simulacaoTrecho` (Task 2).
- Produces:
  ```js
  useBuscaInfra({ infraTypeInicial = null, autoAplicar = false })
    → { results, displayResults, applied, searching, layerHint,
        maxLayers, setMaxLayers, infraType, setInfraType, buscar, aplicar, limpar }
  exportarSvgPng(svgEl, filename, dark)
  ```

- [ ] **Step 1: Criar `src/lib/exportarSvgPng.js`**

```js
// Serializa um <svg> da tela num PNG e dispara o download. Só o elemento SVG
// entra — o que estiver em HTML ao redor dele (a legenda de vias, por exemplo)
// não aparece na imagem. É por isso que a legenda de circuitos é desenhada
// dentro do SVG.
export function exportarSvgPng(svg, filename, dark = false) {
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(source)));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    // Fundo opaco: PNG transparente fica ilegível colado num documento claro.
    ctx.fillStyle = dark ? "#14181c" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
}
```

- [ ] **Step 2: Criar `src/hooks/useBuscaInfra.js`**

```js
import { useEffect, useMemo, useState } from "react";
import { findBestFits, selectDiverseResults } from "../lib/reverseSearch";

// O filtro entra ANTES do corte por diversidade: se cortasse primeiro, o
// selectDiverseResults gastaria as vagas com tipos que seriam descartados
// logo em seguida, e sobrariam menos opções do tipo pedido.
const filtrar = (results, infraType) =>
  infraType ? results.filter((r) => r.infraType === infraType) : results;

// Máquina de estados da busca reversa de infraestrutura, compartilhada pela
// aba Infraestrutura (modo Auto) e pelo painel de simulação do Quadro de
// Cargas. As duas rodam o mesmo findBestFits; o que muda é quem dispara e se
// a primeira opção é aplicada sozinha.
//
// `infraType` null significa todos os tipos. `maxLayers` "" significa sem
// limite (é o value de um <select>).
export function useBuscaInfra({ infraTypeInicial = null, autoAplicar = false } = {}) {
  const [results, setResults] = useState(null); // null = ainda não buscou
  const [layerHint, setLayerHint] = useState(null);
  const [searching, setSearching] = useState(false);
  const [maxLayers, setMaxLayers] = useState("");
  const [infraTypeRaw, setInfraTypeRaw] = useState(infraTypeInicial);
  const [applied, setApplied] = useState(null);

  const buscar = (cables) => {
    if (!cables || cables.length === 0) return;
    setSearching(true);
    setApplied(null);
    // Adia um tick pro botão re-renderizar em "Buscando…" antes do cálculo
    // síncrono, que segura a thread.
    setTimeout(() => {
      const numLayers = maxLayers ? Number(maxLayers) : undefined;
      const found = findBestFits(cables, { maxLayers: numLayers });
      let hint = null;
      if (found.length === 0 && numLayers) {
        const unrestricted = findBestFits(cables, {});
        if (unrestricted.length > 0) hint = Math.min(...unrestricted.map((r) => r.camadas));
      }
      setResults(found);
      setLayerHint(hint);
      setSearching(false);
    }, 10);
  };

  // Trocar o tipo invalida a opção aplicada: ela pode nem estar mais na lista.
  const setInfraType = (t) => {
    setInfraTypeRaw(t);
    setApplied(null);
  };

  const limpar = () => {
    setResults(null);
    setLayerHint(null);
    setApplied(null);
  };

  const displayResults = useMemo(
    () => (results ? selectDiverseResults(filtrar(results, infraTypeRaw), 2) : null),
    [results, infraTypeRaw]
  );

  // Com autoAplicar, a menor opção entra sozinha assim que a lista aparece —
  // o desenho fica pronto sem clique. A aba Infra não usa: lá o usuário
  // escolhe clicando em "Ver".
  useEffect(() => {
    if (!autoAplicar || applied) return;
    if (displayResults && displayResults.length > 0) setApplied(displayResults[0]);
  }, [autoAplicar, applied, displayResults]);

  return {
    results,
    displayResults,
    applied,
    searching,
    layerHint,
    maxLayers,
    setMaxLayers,
    infraType: infraTypeRaw,
    setInfraType,
    buscar,
    aplicar: setApplied,
    limpar,
  };
}
```

- [ ] **Step 3: Refatorar o `InfraTab` para consumir os dois**

Em `src/components/InfraTab.jsx`:

**3a.** Trocar os imports do topo. Remover `findBestFits, selectDiverseResults` e `computeOccupancy`; acrescentar o hook e o `ocupacaoAplicada`. As linhas 5 e 6 hoje são:

```js
import { findBestFits, selectDiverseResults } from "../lib/reverseSearch";
import { computeOccupancy } from "../lib/occupancy";
```

Passam a ser:

```js
import { useBuscaInfra } from "../hooks/useBuscaInfra";
import { ocupacaoAplicada } from "../lib/simulacaoTrecho";
import { exportarSvgPng } from "../lib/exportarSvgPng";
```

E o import do React na linha 1 perde o `useMemo` se ele não for mais usado — confira antes de tirar (`getDimensions` continua vindo de `../data/corfioHEPR`).

**3b.** Substituir o bloco de estado do modo Buscar (hoje linhas 77-91, de `// ---- Modo Buscar ----` até o fim de `applyResult`) por:

```js
  // ---- Modo Buscar ----
  const { results, displayResults, applied, searching, layerHint, maxLayers, setMaxLayers, buscar, aplicar } =
    useBuscaInfra();

  const arranjo =
    arranjoOverride ?? defaultArranjo(mode === "buscar" ? applied?.infraType : infraType);

  const applyResult = (r) => {
    aplicar(r);
    setArranjoOverride(null);
    setCircuitosOverride(null);
  };
```

**3c.** Substituir `handleSearch` inteiro (hoje linhas 93-110) por:

```js
  const handleSearch = () => buscar(cables);
```

**3d.** Remover a linha do `displayResults` (hoje linha 112) — agora vem do hook.

**3e.** Substituir o `liveOccupancy` inteiro (hoje linhas 114-135) por:

```js
  // Ocupação sempre recalculada a partir do trecho corrente (a opção "applied"
  // congela os números do momento da busca — cabos podem ter mudado depois).
  const liveOccupancy = useMemo(() => ocupacaoAplicada(cables, applied), [cables, applied]);
```

**3f.** Substituir o `exportPNG` local (hoje linhas 175-195) — apagar a função e trocar as duas chamadas:

```js
// antes: onClick={() => exportPNG(svgRefVerificar.current, "eletrocalha.png")}
onClick={() => exportarSvgPng(svgRefVerificar.current, "eletrocalha.png", dark)}

// antes: onClick={() => exportPNG(svgRefBuscar.current, "infraestrutura-recomendada.png")}
onClick={() => exportarSvgPng(svgRefBuscar.current, "infraestrutura-recomendada.png", dark)}
```

Nada mais muda: o JSX que lê `results`, `displayResults`, `applied`, `searching`, `layerHint`, `maxLayers` e `setMaxLayers` continua igual, porque os nomes foram preservados.

- [ ] **Step 4: Suíte e lint**

Run: `npx vitest run && npx oxlint src/hooks/useBuscaInfra.js src/lib/exportarSvgPng.js src/components/InfraTab.jsx`
Expected: 384 testes passando; lint limpo.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: sucesso (o aviso de chunk > 500kB é pré-existente e esperado).

- [ ] **Step 6: Verificar a aba Infraestrutura no navegador**

Subir o preview e conferir, sem pressa, que **nada** mudou:

1. Modo **Manual**: escolher eletrocalha, mudar dimensões, adicionar cabos, ver o desenho e a barra de ocupação.
2. `Exportar PNG` no modo Manual — o arquivo baixa e tem fundo opaco.
3. `Relatório PDF` no modo Manual — gera.
4. Modo **Auto**: adicionar cabos, `Buscar melhor infraestrutura`, conferir que o botão passa por "Buscando…", que a lista de opções aparece, que `Ver` aplica e marca `Visualizando ✓`.
5. Limite de camadas: pôr `1` com cabos que exijam mais e conferir a mensagem com a dica de camada mínima.
6. Trecho misto (um cabo de Força + um de Comando) no modo Auto: conferir que aparecem opções com septo divisor e que a ocupação bate.
7. A ponte: ir na aba Cabos Elétricos, marcar circuitos, `Enviar p/ Infra (Auto)` — ainda deve trocar de aba e cair na revisão de importação (esta task ainda não mexeu no botão).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useBuscaInfra.js src/lib/exportarSvgPng.js src/components/InfraTab.jsx
git commit -m "$(cat <<'EOF'
Extrair a busca de infraestrutura para um hook compartilhado

useBuscaInfra tira do InfraTab o estado da busca reversa (resultados,
opção aplicada, limite de camadas) e acrescenta um filtro por tipo, que
entra antes do corte por diversidade. exportarSvgPng tira a serialização
do SVG para PNG, que ganhará um terceiro consumidor.

O InfraTab passa a consumir os dois mais o ocupacaoAplicada. Nenhuma
mudança de comportamento — os nomes das variáveis foram preservados para
o JSX ficar intacto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: legenda de circuitos dentro do SVG

**Files:**
- Modify: `src/components/TrayVisualization.jsx`

**Interfaces:**
- Consumes: nada novo.
- Produces: prop opcional `legenda` em `TrayVisualization`, um array de
  `{ numero, tag, descricao, designacao }`. Ausente ou vazia, a renderização é
  idêntica à de hoje.

- [ ] **Step 1: Acrescentar as constantes e o helper de truncagem**

Logo abaixo das constantes do topo do arquivo (`PADDING`, `WALL`, `SEPTUM_HIGHLIGHT`):

```js
// ---- Legenda de circuitos (opcional) ---------------------------------------
// Desenhada DENTRO do SVG, não em HTML ao lado: o exportarSvgPng serializa só
// o elemento <svg>, então uma legenda em HTML não sairia na imagem (é o que
// acontece com a CableLegend de vias, logo abaixo).
const LEGENDA_W = 250;     // largura reservada à direita, em unidades do viewBox
const LEGENDA_LINHA = 26;  // altura de cada circuito (duas linhas de texto)
const LEGENDA_TOPO = 20;   // do título até o primeiro circuito
const LEGENDA_GAP = 50;    // do desenho até a legenda (passa a cota de altura)

// Larguras médias de caractere, medidas a olho nas fontes usadas abaixo. SVG
// não quebra texto sozinho e não dá para medir fonte sem DOM, então a
// truncagem é por contagem de caracteres. A fonte não é monoespaçada, então
// isto erra por sobra — que é o lado seguro: texto cortado cedo demais é
// melhor do que texto vazando por cima do vizinho.
const CHAR_W = 5.0;        // 9px, normal
const CHAR_W_BOLD = 5.6;   // 9px, bold
const CHAR_W_MONO = 5.1;   // 8.5px, monoespaçada

function truncar(texto, maxChars) {
  if (maxChars < 2) return "…";
  return texto.length <= maxChars ? texto : `${texto.slice(0, maxChars - 1)}…`;
}

const alturaLegenda = (itens) => LEGENDA_TOPO + itens.length * LEGENDA_LINHA;

// Uma linha por circuito: "NN TAG — descrição" em cima, a designação de cabos
// embaixo. Sem marcação sobre os cabos: o desenho responde "cabe?" e a lista
// responde "o que tem aqui?".
function LegendaCircuitos({ itens, dark }) {
  const corSuave = "#94a3b8";
  const corTag = dark ? "#e2e8f0" : "#334155";
  const corDesc = dark ? "#94a3b8" : "#64748b";
  const corDesig = dark ? "#34d399" : "#059669";
  const corLinha = dark ? "#334155" : "#e2e8f0";
  const util = LEGENDA_W - 12;

  return (
    <g fontFamily="system-ui, sans-serif">
      <text x={0} y={0} fontSize={8} fontWeight="700" letterSpacing="1" fill={corSuave}>
        CIRCUITOS NO TRECHO
      </text>
      <line x1={0} y1={6} x2={util} y2={6} stroke={corLinha} strokeWidth={1} />
      {itens.map((it, i) => {
        const y = LEGENDA_TOPO + i * LEGENDA_LINHA;
        const xDesc = 18 + it.tag.length * CHAR_W_BOLD + 8;
        return (
          <g key={`${it.numero}-${it.tag}`}>
            <text x={0} y={y} fontSize={9} fontFamily="ui-monospace, monospace" fill={corSuave}>
              {it.numero}
            </text>
            <text x={18} y={y} fontSize={9} fontWeight="700" fill={corTag}>
              {it.tag}
            </text>
            {it.descricao && (
              <text x={xDesc} y={y} fontSize={9} fill={corDesc}>
                {truncar(it.descricao, Math.floor((util - xDesc) / CHAR_W))}
              </text>
            )}
            <text x={18} y={y + 11} fontSize={8.5} fontFamily="ui-monospace, monospace" fill={corDesig}>
              {truncar(it.designacao, Math.floor((util - 18) / CHAR_W_MONO))}
            </text>
          </g>
        );
      })}
    </g>
  );
}
```

- [ ] **Step 2: Aceitar a prop na assinatura do componente**

A linha 348 hoje é:

```jsx
const TrayVisualization = forwardRef(function TrayVisualization({ cables, trayWidth, trayHeight, dark = false, infraType = "eletrocalha", leitoFlange = "interna", eletrodutoNorma = "nbr5624" }, svgRef) {
```

Passa a ser:

```jsx
const TrayVisualization = forwardRef(function TrayVisualization({ cables, trayWidth, trayHeight, dark = false, infraType = "eletrocalha", leitoFlange = "interna", eletrodutoNorma = "nbr5624", legenda = null }, svgRef) {
```

E logo depois do `const uid = ...`, acrescentar:

```jsx
  const temLegenda = Array.isArray(legenda) && legenda.length > 0;
```

- [ ] **Step 3: Ramo circular (eletroduto)**

Dentro do `if (ductDim.kind === "duct") { ... }`, trocar

```jsx
    const size = (outerR + PADDING) * 2;
    const c0 = size / 2;
```

por

```jsx
    const size = (outerR + PADDING) * 2;
    const c0 = size / 2;
    const legendaX = size + 6;
    const larguraSvg = temLegenda ? legendaX + LEGENDA_W : size;
    const alturaSvg = temLegenda ? Math.max(size, alturaLegenda(legenda) + PADDING) : size;
```

e trocar o `<svg>` de

```jsx
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="max-w-full"
          style={{ width: 420, height: "auto" }}
```

para

```jsx
          viewBox={`0 0 ${larguraSvg} ${alturaSvg}`}
          width={larguraSvg}
          height={alturaSvg}
          className="max-w-full"
          style={{ width: temLegenda ? 760 : 420, height: "auto" }}
```

e trocar o `<rect>` de fundo de

```jsx
          <rect x={0} y={0} width={size} height={size} fill={bgFill} />
```

para

```jsx
          <rect x={0} y={0} width={larguraSvg} height={alturaSvg} fill={bgFill} />
```

Por fim, logo antes do `</svg>` de fechamento desse ramo (depois do `</g>` do
`translate(${c0}, ${c0})`), acrescentar:

```jsx
          {temLegenda && (
            <g transform={`translate(${legendaX}, ${PADDING / 2})`}>
              <LegendaCircuitos itens={legenda} dark={dark} />
            </g>
          )}
```

- [ ] **Step 4: Ramo retangular (calha, perfilado, leito, aramado)**

Trocar

```jsx
  const width = trayWidth + PADDING * 2;
  const height = trayHeight + PADDING * 1.5;
```

por

```jsx
  const legendaX = PADDING / 2 + trayWidth + LEGENDA_GAP;
  const width = temLegenda ? legendaX + LEGENDA_W : trayWidth + PADDING * 2;
  const height = temLegenda
    ? Math.max(trayHeight + PADDING * 1.5, alturaLegenda(legenda) + PADDING)
    : trayHeight + PADDING * 1.5;
```

Trocar o `style` do `<svg>` de

```jsx
      style={{ width: 520, height: "auto" }}
```

para

```jsx
      style={{ width: temLegenda ? 780 : 520, height: "auto" }}
```

E, logo antes do `</svg>` de fechamento (depois do `</g>` que fecha o
`translate(${PADDING / 2}, ${PADDING / 2})`), acrescentar:

```jsx
      {temLegenda && (
        <g transform={`translate(${legendaX}, ${PADDING / 2})`}>
          <LegendaCircuitos itens={legenda} dark={dark} />
        </g>
      )}
```

- [ ] **Step 5: Suíte, lint e build**

Run: `npx vitest run && npx oxlint src/components/TrayVisualization.jsx && npm run build`
Expected: tudo passa.

- [ ] **Step 6: Verificar que a aba Infra não mudou**

No navegador, abrir a aba Infraestrutura nos dois modos e conferir que o
desenho está com o mesmo tamanho e o mesmo enquadramento de antes — nenhum dos
dois usos passa `legenda`, então o caminho novo não deve ser exercitado.

- [ ] **Step 7: Commit**

```bash
git add src/components/TrayVisualization.jsx
git commit -m "$(cat <<'EOF'
Legenda opcional de circuitos dentro do SVG do trecho

Prop `legenda` com { numero, tag, descricao, designacao } por circuito,
desenhada à direita, dentro do SVG, nos dois ramos (retangular e
circular). Ausente, a renderização é idêntica à de hoje.

Dentro do SVG e não em HTML porque o exportarSvgPng serializa só o
elemento <svg> — é por isso que a CableLegend de vias nunca saiu nas
imagens exportadas. Truncagem por contagem de caracteres: SVG não quebra
linha e não dá para medir fonte sem DOM.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: o painel `SimulacaoTrecho`

**Files:**
- Create: `src/components/cabos/SimulacaoTrecho.jsx`

**Interfaces:**
- Consumes: `circuitosParaCabos`, `condutoPredominante`, `ocupacaoAplicada` (Tasks 1-2); `useBuscaInfra` (Task 3); `exportarSvgPng` (Task 3); a prop `legenda` do `TrayVisualization` (Task 4); `INFRA_TYPES` de `../../data/corfioHEPR`; `OccupancyMeter` de `../OccupancyMeter`.
- Produces: componente default `SimulacaoTrecho` com as props
  `{ circuitos, resultados, selecionados, preset, dark, onAbrirNaInfra }`.
  `selecionados` é um array de índices; `onAbrirNaInfra` é chamado sem argumentos.

- [ ] **Step 1: Escrever o componente**

Criar `src/components/cabos/SimulacaoTrecho.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { INFRA_TYPES } from "../../data/corfioHEPR";
import { useBuscaInfra } from "../../hooks/useBuscaInfra";
import { exportarSvgPng } from "../../lib/exportarSvgPng";
import { circuitosParaCabos, condutoPredominante, ocupacaoAplicada } from "../../lib/simulacaoTrecho";
import OccupancyMeter from "../OccupancyMeter";
import TrayVisualization from "../TrayVisualization";

const cardCls =
  "rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const h2Cls =
  "font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";
const selectCls =
  "rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const botaoCls =
  "rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

// Assinatura do conjunto de cabos: muda exatamente quando o desenho precisa de
// uma busca nova. Mexer na descrição de um circuito não mexe nela; mudar a
// carga a ponto de trocar a bitola, sim.
const assinatura = (cabos) =>
  cabos.map((c) => `${c.type}:${c.vias}:${c.section}:${c.trifolio ? "t" : "s"}`).join("|");

export default function SimulacaoTrecho({ circuitos, resultados, selecionados, preset, dark = false, onAbrirNaInfra }) {
  const [semTrifolio, setSemTrifolio] = useState(() => new Set());
  const [assinBuscada, setAssinBuscada] = useState(null);
  const svgRef = useRef(null);

  // Array novo a cada render no pai — a chave estável é o que impede o efeito
  // de busca de disparar sem parar.
  const selKey = selecionados.join(",");

  const circuitosSel = useMemo(
    () => selecionados.map((i) => circuitos[i]).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selKey, circuitos]
  );
  const condutoInicial = useMemo(() => condutoPredominante(circuitosSel), [circuitosSel]);

  const {
    displayResults, applied, searching, layerHint, results,
    maxLayers, setMaxLayers, infraType, setInfraType, buscar, aplicar,
  } = useBuscaInfra({ infraTypeInicial: condutoInicial, autoAplicar: true });

  const { cabos, itens, avisos } = useMemo(
    () => circuitosParaCabos({ circuitos, resultados, selecionados, material: preset.material, semTrifolio }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circuitos, resultados, selKey, preset.material, semTrifolio]
  );

  // Lido dentro do efeito sem entrar nas dependências: a busca é disparada
  // pelos controles DO PAINEL, não por edições nos circuitos (ver o aviso de
  // desatualizado abaixo). findBestFits testa ~240 layouts, e o painel fica
  // logo acima do formulário de edição.
  const cabosRef = useRef(cabos);
  cabosRef.current = cabos;

  useEffect(() => {
    setAssinBuscada(assinatura(cabosRef.current));
    buscar(cabosRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraType, maxLayers, semTrifolio, selKey]);

  const desatualizado = !searching && assinBuscada !== null && assinBuscada !== assinatura(cabos);
  const oc = ocupacaoAplicada(cabos, applied);

  const reSimular = () => {
    setAssinBuscada(assinatura(cabos));
    buscar(cabos);
  };

  const alternarTrifolio = (indice) => {
    setSemTrifolio((prev) => {
      const next = new Set(prev);
      if (next.has(indice)) next.delete(indice);
      else next.add(indice);
      return next;
    });
  };

  const elegiveisTrifolio = itens.filter((it) => it.podeTrifolio);

  return (
    <div className={`${cardCls} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2Cls}>
          Simulação do trecho{" "}
          <span className="text-slate-400 dark:text-slate-500">
            ({itens.length} circuito{itens.length === 1 ? "" : "s"} · {cabos.length} cabo{cabos.length === 1 ? "" : "s"})
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Tipo
            <select
              value={infraType ?? ""}
              onChange={(e) => setInfraType(e.target.value || null)}
              className={selectCls}
            >
              <option value="">Todos</option>
              {INFRA_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Camadas
            <select value={maxLayers} onChange={(e) => setMaxLayers(e.target.value)} className={selectCls}>
              <option value="">Sem limite</option>
              <option value="1">1 (sem empilhar)</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => exportarSvgPng(svgRef.current, "simulacao-trecho.png", dark)}
            disabled={!applied}
            className={`${botaoCls} disabled:opacity-40`}
          >
            Exportar PNG
          </button>
        </div>
      </div>

      {condutoInicial === null && circuitosSel.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Os circuitos marcados declaram condutos diferentes (ou um conduto sem equivalente aqui),
          então a busca abriu em <b>Todos</b> os tipos. Escolher um tipo que não bate com o conduto
          usado no dimensionamento contradiz o método de referência e o fator de agrupamento que
          definiram a bitola.
        </p>
      )}

      {avisos.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
          {avisos.map((a, i) => (
            <li key={i}>⚠ {a}</li>
          ))}
        </ul>
      )}

      {desatualizado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-500/10">
          <span className="text-xs text-amber-800 dark:text-amber-300">
            Os cabos mudaram depois desta busca — a infraestrutura mostrada pode não ser mais a melhor.
          </span>
          <button
            type="button"
            onClick={reSimular}
            className="rounded-xs bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Re-simular
          </button>
        </div>
      )}

      {searching && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Buscando…</p>
      )}

      {!searching && cabos.length === 0 && (
        <p className="rounded-xs border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum cabo para simular. Marque circuitos calculados com sucesso na tabela acima.
        </p>
      )}

      {!searching && results && results.length > 0 && displayResults.length === 0 && (
        <p className="rounded-xs border border-amber-200 bg-amber-50 px-3 py-3 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          Nenhuma opção deste tipo comporta os cabos. Escolha <b>Todos</b> em Tipo para ver as demais.
        </p>
      )}

      {!searching && results && results.length === 0 && layerHint && (
        <p className="rounded-xs border border-amber-200 bg-amber-50 px-3 py-3 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          Nenhuma opção cabe com o limite de <b>{maxLayers} camada{Number(maxLayers) > 1 ? "s" : ""}</b>.
          Com esses cabos, a pilha mais baixa possível precisa de pelo menos{" "}
          <b>{layerHint} camada{layerHint > 1 ? "s" : ""}</b>.
        </p>
      )}

      {!searching && results && results.length === 0 && !layerHint && (
        <p className="rounded-xs border border-red-200 bg-red-50 px-3 py-3 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          Nenhuma infraestrutura cadastrada comporta esses cabos dentro do limite de ocupação da
          NBR 5410. Considere dividir em mais de um trecho.
        </p>
      )}

      {displayResults && displayResults.length > 0 && (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {displayResults.map((r, i) => {
            const ativo =
              applied && applied.label === r.label &&
              applied.trayWidth === r.trayWidth && applied.trayHeight === r.trayHeight;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => aplicar(r)}
                  className={`w-full rounded-xs border px-2.5 py-1.5 text-left text-xs transition ${
                    ativo
                      ? "border-copper-600 bg-copper-50 dark:border-copper-500 dark:bg-copper-500/10"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="block truncate font-medium text-slate-700 dark:text-slate-200">
                    {r.label} {ativo && <span className="text-copper-600 dark:text-copper-400">✓</span>}
                  </span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                    {r.ocupacao.toFixed(1)}% ocupado
                    {r.camadas != null && ` · ${r.camadas} camada${r.camadas > 1 ? "s" : ""}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {applied && oc && (
        <>
          <div className="flex justify-center overflow-x-auto rounded-sm bg-slate-50 p-3 dark:bg-slate-800/60">
            <TrayVisualization
              ref={svgRef}
              cables={cabos}
              trayWidth={applied.trayWidth}
              trayHeight={applied.trayHeight}
              dark={dark}
              infraType={applied.infraType}
              leitoFlange={applied.leitoFlange}
              eletrodutoNorma={applied.eletrodutoNorma}
              legenda={itens}
            />
          </div>

          <OccupancyMeter
            trayArea={oc.trayArea}
            cableArea={oc.cableArea}
            ocupacao={oc.ocupacao}
            limite={oc.limite}
            dentroLimite={oc.dentroLimite}
          />
          {!oc.dentroLimite && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Os cabos atuais já não cabem dentro do limite de ocupação da NBR 5410 para esta
              infraestrutura — re-simule ou reveja os circuitos marcados.
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        {elegiveisTrifolio.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
              Trifólio
            </span>
            {elegiveisTrifolio.map((it) => (
              <label
                key={it.indice}
                title="As 3 fases correm amarradas em feixe. Desmarque se correrem soltas na calha."
                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={!semTrifolio.has(it.indice)}
                  onChange={() => alternarTrifolio(it.indice)}
                  className="h-3.5 w-3.5 accent-copper-600"
                />
                <span className="font-mono">{it.tag}</span>
              </label>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onAbrirNaInfra}
          title="Leva os mesmos cabos para a aba Infraestrutura, onde dá para somar cabos à mão, salvar o trecho como projeto, ver o derating e gerar o Relatório PDF."
          className="text-xs font-medium text-copper-600 hover:text-copper-700 dark:text-copper-400 dark:hover:text-copper-300"
        >
          Abrir na aba Infraestrutura →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint e build**

Run: `npx oxlint src/components/cabos/SimulacaoTrecho.jsx && npm run build`
Expected: sem erros. O componente ainda não é montado por ninguém — o build só
confirma que compila.

- [ ] **Step 3: Commit**

```bash
git add src/components/cabos/SimulacaoTrecho.jsx
git commit -m "$(cat <<'EOF'
Painel de simulação de infraestrutura do quadro de cargas

Roda a busca ao montar e aplica a menor opção sozinha, com filtro de
tipo já no conduto que os circuitos declaram. A ocupação e o desenho são
sempre ao vivo; a busca só re-roda pelos controles do painel, e uma
edição de circuito que troque a bitola levanta o aviso de "re-simular"
em vez de disparar ~240 layouts a cada tecla.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: ligar o painel na aba

**Files:**
- Modify: `src/components/QuadroCargasTab.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: o componente `SimulacaoTrecho` (Task 5).
- Produces: nada para tasks seguintes.

- [ ] **Step 1: `App.jsx` passa `dark` para a aba**

Hoje (linha ~115):

```jsx
          <QuadroCargasTab onEnviarParaInfra={enviarParaInfra} />
```

Passa a ser:

```jsx
          <QuadroCargasTab dark={dark} onEnviarParaInfra={enviarParaInfra} />
```

- [ ] **Step 2: `QuadroCargasTab` — import e estado**

Acrescentar o import junto dos outros de `./cabos/`:

```jsx
import SimulacaoTrecho from "./cabos/SimulacaoTrecho";
```

Trocar a assinatura (linha ~68):

```jsx
export default function QuadroCargasTab({ dark = false, onEnviarParaInfra }) {
```

Acrescentar o estado junto do `importando` (linha ~77):

```jsx
  const [simulando, setSimulando] = useState(false);
```

- [ ] **Step 3: trocar o botão**

O bloco de hoje (linhas ~224-232):

```jsx
            <button
              type="button"
              onClick={enviarSelecionados}
              disabled={selEnvio.length === 0}
              title="Envia os circuitos marcados para a aba Infraestrutura (modo Auto) e busca a melhor infraestrutura para esses cabos."
              className="rounded-xs border border-copper-600 px-3 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              {selEnvio.length > 0 ? `Enviar ${selEnvio.length} p/ Infra (Auto)` : "Enviar p/ Infra (Auto)"}
            </button>
```

passa a ser:

```jsx
            <button
              type="button"
              onClick={() => setSimulando((v) => !v)}
              disabled={selEnvio.length === 0}
              title="Busca aqui mesmo a melhor infraestrutura para os cabos dos circuitos marcados, com o desenho do trecho e a lista dos circuitos."
              className="rounded-xs border border-copper-600 px-3 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              {simulando
                ? "Fechar simulação"
                : selEnvio.length > 0
                  ? `Simular ${selEnvio.length} circuito${selEnvio.length > 1 ? "s" : ""}`
                  : "Simular infraestrutura"}
            </button>
```

- [ ] **Step 4: montar o painel**

Logo depois do card do quadro (o `</div>` da linha ~392, imediatamente antes do
bloco `{importando && (`), acrescentar:

```jsx
      {simulando && selEnvio.length > 0 && (
        <SimulacaoTrecho
          circuitos={circuitos}
          resultados={resultados}
          selecionados={selEnvio}
          preset={preset}
          dark={dark}
          onAbrirNaInfra={enviarSelecionados}
        />
      )}
```

- [ ] **Step 5: fechar o painel quando a seleção esvazia**

`enviarSelecionados` já existe e não muda. Mas desmarcar todos os circuitos com
o painel aberto deixaria um painel vazio; a condição `selEnvio.length > 0` do
Step 4 já resolve a renderização. Para o rótulo do botão não ficar preso em
"Fechar simulação", acrescentar logo abaixo do `useEffect` de persistência
existente:

```jsx
  // Sem circuitos marcados não há trecho para simular — o painel se fecha
  // sozinho, senão o botão ficaria preso em "Fechar simulação".
  useEffect(() => {
    if (selEnvio.length === 0) setSimulando(false);
  }, [selEnvio.length]);
```

- [ ] **Step 6: Suíte, lint e build**

Run: `npx vitest run && npx oxlint src/components/QuadroCargasTab.jsx src/App.jsx && npm run build`
Expected: 384 testes passando, lint limpo, build ok.

- [ ] **Step 7: Commit**

```bash
git add src/components/QuadroCargasTab.jsx src/App.jsx
git commit -m "$(cat <<'EOF'
Simular infraestrutura sem sair da aba Cabos Elétricos

O botão "Enviar p/ Infra (Auto)" vira "Simular N circuitos" e abre o
painel logo abaixo da tabela, em vez de trocar de aba. A ponte antiga
continua inteira, agora atrás do link "Abrir na aba Infraestrutura" de
dentro do painel — é por lá que se chega a Projetos, derating, cabos à
mão e Relatório PDF.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: verificação no navegador e changelog

**Files:**
- Modify: `src/data/changelog.js`

- [ ] **Step 1: Verificar o fluxo novo**

Subir o preview. Na aba **Cabos Elétricos**:

1. Marcar 2 ou 3 circuitos e clicar em `Simular N circuitos`. O painel deve
   abrir **já com o desenho pronto** — sem clique em "buscar" e sem "Ver".
2. Conferir que a legenda dentro do desenho traz `Nº · TAG · descrição` e a
   designação de cabos, e que os números batem com a coluna Nº da tabela.
3. Conferir que o seletor **Tipo** abriu no conduto declarado nos trechos
   (o padrão dos circuitos é `eletrocalha`).
4. Trocar Tipo para `Eletroduto` e conferir que o desenho vira a seção circular
   **com a legenda ao lado** (é o ramo circular da Task 4).
5. Escolher um Tipo que não comporte os cabos e conferir a mensagem de
   "nenhuma opção deste tipo".
6. Desmarcar um `trifólio` no rodapé e conferir que a busca re-roda e o desenho
   muda (3 condutores soltos em vez do feixe).
7. Editar a potência de um circuito marcado, o suficiente para trocar a bitola.
   Conferir que **não** dispara busca e que aparece a faixa âmbar
   "Os cabos mudaram…" com o botão `Re-simular`; clicar e ver a busca rodar.
8. Marcar mais um circuito com o painel aberto e conferir que a busca re-roda
   sozinha e a legenda ganha a linha nova.
9. `Exportar PNG` e **abrir o arquivo**: a legenda com as TAGs precisa estar na
   imagem, e o fundo precisa ser opaco.
10. Clicar em `Abrir na aba Infraestrutura →` e conferir que troca de aba e cai
    na revisão de importação com os mesmos cabos.
11. Desmarcar todos os circuitos e conferir que o painel fecha e o botão volta
    para `Simular infraestrutura` desabilitado.
12. Repetir 1, 2 e 9 no **tema escuro**.

- [ ] **Step 2: Re-verificar a aba Infraestrutura**

Repetir a checagem do Step 6 da Task 3 (os dois modos, busca, `Ver`, camadas,
septo, PNG, Relatório PDF), agora com tudo integrado.

- [ ] **Step 3: Acrescentar o release no changelog**

Ao final do array `CHANGELOG` em `src/data/changelog.js`:

```js
  {
    versao: "1.26.0",
    data: "2026-08-10",
    titulo: "Simulação de infraestrutura sem sair do quadro de cargas",
    tipo: "novo",
    itens: [
      "Marque os circuitos no quadro de cargas e clique em Simular: a busca da melhor infraestrutura roda ali mesmo, com o desenho do trecho pronto de primeira — sem trocar de aba e sem clique extra.",
      "O desenho agora vem com a lista dos circuitos ao lado (número, TAG, descrição e designação de cabos), desenhada dentro da imagem, então ela sai também no PNG exportado.",
      "O filtro de tipo de infraestrutura já abre no conduto que os próprios circuitos declaram — simular um eletroduto para um circuito dimensionado como eletrocalha contradiz o método de referência e o fator de agrupamento que definiram a bitola.",
      "Caixinha de trifólio por circuito no painel: desmarque quando as três fases correrem soltas em vez de amarradas em feixe, e a simulação refaz o empacotamento.",
      "A ocupação é recalculada ao vivo conforme você mexe nos circuitos; se a bitola mudar, o painel avisa que os cabos mudaram e oferece re-simular.",
      "O caminho antigo continua: o link Abrir na aba Infraestrutura leva os mesmos cabos para lá, onde ficam Projetos, cabos avulsos, derating e o Relatório PDF.",
    ],
  },
```

- [ ] **Step 4: Checagens finais**

Run: `npx vitest run && npx oxlint src && npm run build`
Expected: toda a suíte passando (inclusive `changelog.test.js`, que trava a
ordem cronológica e o formato da versão), lint limpo, build ok.

- [ ] **Step 5: Confirmar que não sobrou lixo**

Run: `git status --short`
Expected: nada além do `changelog.js` modificado.

- [ ] **Step 6: Commit**

```bash
git add src/data/changelog.js
git commit -m "$(cat <<'EOF'
Changelog 1.26.0: simulação de infraestrutura no quadro de cargas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Notas de revisão do plano

Coisas conferidas ao reler o plano contra a spec:

- **Cobertura.** Todos os itens da tabela de decisões da spec têm task: escopo
  enxuto (5), legenda em lista dentro do SVG (4), ponte como saída secundária
  (5, rodapé; 6, `onAbrirNaInfra`), trifólio com toggle (1 e 5), filtro de tipo
  no conduto declarado (2 e 5), ocupação fora do desenho (4 — a `LegendaCircuitos`
  não tem rodapé de ocupação).
- **Tabela de erros da spec.** Nenhum circuito marcado → botão desabilitado
  (Task 6, Step 3). Circuito com erro → Task 1. `getDiameter` falha → Task 1.
  Nada comporta → Task 5. Filtro sem resultado → Task 5. Condutos divergentes →
  Task 2 + aviso na Task 5. Cabos mudaram → Task 5.
- **Consistência de tipos.** `itens` produzido na Task 1 tem exatamente os
  campos que a `LegendaCircuitos` da Task 4 lê (`numero`, `tag`, `descricao`,
  `designacao`) mais os dois que só o painel usa (`podeTrifolio`, `indice`).
  `cabos` tem os campos que `layoutCables` e `computeOccupancy` leem
  (`d`, `type`, `vias`, `trifolio`, `material`).
- **Risco concentrado na Task 3.** É a única que mexe em código que já funciona
  em produção. Por isso ela tem um passo de verificação no navegador só dela,
  antes de qualquer coisa nova ser ligada.
