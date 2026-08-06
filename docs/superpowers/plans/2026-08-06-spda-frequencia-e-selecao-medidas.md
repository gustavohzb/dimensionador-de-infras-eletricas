# Frequência de danos F e seleção de medidas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acrescentar à aba SPDA o critério de frequência de danos F da Seção 7 da NBR 5419-2:2026 e uma busca que recomenda as combinações de medidas de proteção mais baratas que atendem R1, R3 e F ao mesmo tempo.

**Architecture:** O motor puro em `src/lib/` ganha dois módulos novos — `spdaFrequencia.js` (Tabela 7) e `spdaBusca.js` (busca melhor-primeiro sobre um catálogo de medidas) — e `spdaRisco.js` passa a expor as probabilidades por sistema que F precisa. A camada de tela ganha um cartão no veredito, uma tabela de F por sistema e um painel de sugestões que escreve de volta no estado da aba.

**Tech Stack:** React 19, Vite 8, Tailwind v4, Vitest, oxlint. Sem dependência nova.

**Spec:** [2026-08-06-spda-frequencia-e-selecao-medidas-design.md](../specs/2026-08-06-spda-frequencia-e-selecao-medidas-design.md)
**Parâmetros da norma:** [nbr5419-2-2026-parametros.md](../specs/nbr5419-2-2026-parametros.md)

## Global Constraints

- Branch de trabalho: `spda-frequencia-medidas`. Não fazer merge sem pedir.
- Todo comentário, rótulo e texto de tela em português do Brasil.
- Nenhuma conta em `src/data/`; nenhum dado normativo em `src/lib/`.
- Números em notação científica na tela usam `cientifica()` de `src/components/spda/formato.js`.
- Rodar `npm test -- --run` na raiz `C:\Users\gusta\Desktop\CLAUDE\eletrocalha-app`. No Bash, prefixar `cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app &&` — o diretório não persiste entre chamadas.
- Lint é `npm run lint` (oxlint, não eslint). Avisos preexistentes em `CircuitoForm.jsx` e `capacitorBank.test.js` são aceitáveis; qualquer aviso novo não é.
- Callbacks que alteram listas no estado recebem um *updater*, nunca a lista pronta — dois cliques no mesmo lote de render leem a mesma lista e o segundo desfaz o primeiro.
- Frequência tolerável F_T: `0,1/ano` para sistema crítico, `1/ano` para não crítico.
- Riscos toleráveis: R1 = 10⁻⁵, R3 = 10⁻⁴ (`RISCO_TOLERAVEL`).

---

### Task 1: Probabilidades por sistema e P_EB expostas

`frequenciaDanos` precisa de P_C e P_M **por sistema**, não do composto das equações 12 e 13, e precisa de P_EB, que hoje é calculado e descartado.

**Files:**
- Modify: `src/data/spdaNBR5419.js` (fim do arquivo)
- Modify: `src/lib/spdaRisco.js:114-167` (`probabilidades`)
- Test: `src/lib/spdaRisco.test.js`

**Interfaces:**
- Produces: `FREQUENCIA_TOLERAVEL = { critico: 0.1, naoCritico: 1 }` em `src/data/spdaNBR5419.js`.
- Produces: `probabilidades()` passa a devolver, além de `{ pa, pb, pc, pm, porLinha }`, também `peb` (número) e `porSistema` (array de `{ id, pc, pm }` na mesma ordem de `protecoes.sistemas`).

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `src/lib/spdaRisco.test.js`, dentro do bloco `describe` que já cobre `probabilidades`:

```js
it("expõe P_C e P_M de cada sistema, além do composto", () => {
  const e = defaultEntrada();
  e.protecoes.dpsNp = "npI"; // P_SPD = 0,01
  e.protecoes.sistemas = [
    { id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" },
    { id: "s2", uw: 2.5, blindado: false, interfaceIsolante: true, linhaId: "l1" },
  ];
  const p = probabilidades(e);

  expect(p.porSistema.map((s) => s.id)).toEqual(["s1", "s2"]);
  // s1 não é blindado e tem linha: C_LD = 1 por B.4.4, então P_C = P_SPD.
  expect(p.porSistema[0].pc).toBeCloseTo(0.01, 12);
  // s2 tem interface isolante: P_M = 0 por B.4.11.
  expect(p.porSistema[1].pm).toBe(0);
  // O composto continua sendo o de antes e não é a soma dos individuais.
  expect(p.pc).toBeCloseTo(1 - (1 - 0.01) * (1 - 0.01), 12);
});

it("expõe P_EB, que R_V e F_V usam direto", () => {
  const e = defaultEntrada();
  e.protecoes.dpsClasseI = "npII"; // Tabela B.7 = 0,02
  expect(probabilidades(e).peb).toBe(0.02);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaRisco.test.js
```

Esperado: FAIL — `Cannot read properties of undefined (reading 'map')` no primeiro teste e `expected undefined to be 0.02` no segundo.

- [ ] **Step 3: Acrescentar a tabela de F_T**

No fim de `src/data/spdaNBR5419.js`, depois de `RISCO_TOLERAVEL`:

```js
// Seção 7 — frequência de danos tolerável F_T (1/ano). O valor de sistema
// crítico é máximo: só autoridade com jurisdição pode alterá-lo. O de não
// crítico a norma dá como meramente representativo.
export const FREQUENCIA_TOLERAVEL = { critico: 0.1, naoCritico: 1 };
```

- [ ] **Step 4: Expor os valores por sistema**

Em `src/lib/spdaRisco.js`, trocar o `return` de `probabilidades` (linha 166) por:

```js
  return {
    pa,
    pb,
    peb,
    pc: composta(pcPorSistema),
    pm: composta(pmPorSistema),
    // A Seção 7 compara equipamento a equipamento, então precisa do valor de
    // cada sistema — o composto das equações 12 e 13 não serve para F.
    porSistema: sistemas.map((s, i) => ({ id: s.id, pc: pcPorSistema[i], pm: pmPorSistema[i] })),
    porLinha,
  };
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npm test -- --run
```

Esperado: PASS, com 2 testes a mais que os 278 atuais (280).

- [ ] **Step 6: Commit**

```bash
git add src/data/spdaNBR5419.js src/lib/spdaRisco.js src/lib/spdaRisco.test.js
git commit -m "feat: expoe P_C e P_M por sistema e P_EB para a frequencia de danos"
```

---

### Task 2: Módulo da frequência de danos

**Files:**
- Create: `src/lib/spdaFrequencia.js`
- Test: `src/lib/spdaFrequencia.test.js`

**Interfaces:**
- Consumes: `probabilidades()` com `peb` e `porSistema` (Task 1); `numeroEventos()` de `src/lib/spdaRisco.js`, que devolve `{ nd, nm, ad, am, porLinha: [{ id, al, ai, nl, ni, ndj }] }`; `FREQUENCIA_TOLERAVEL` (Task 1).
- Produces: `frequenciaDanos({ eventos, probs, sistemas })` → array de
  `{ id, fc, fm, fw, fv, fz, fb, maior, ft, atende }`, um item por sistema, na
  ordem de `sistemas`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/spdaFrequencia.test.js`. Os eventos e probabilidades entram sintéticos e redondos: assim cada expectativa é aritmética conferível à mão, sem depender de nenhum valor normativo.

```js
import { describe, it, expect } from "vitest";
import { frequenciaDanos } from "./spdaFrequencia";

// N e P redondos: cada F esperado sai de uma multiplicação de cabeça.
const EVENTOS = {
  nd: 0.1,
  nm: 0.02,
  porLinha: [{ id: "l1", nl: 0.004, ni: 0.05, ndj: 0.001 }],
};

const PROBS = {
  pb: 0.2,
  peb: 0.05,
  porSistema: [{ id: "s1", pc: 0.5, pm: 0.25 }],
  porLinha: [{ id: "l1", pw: 0.1, pz: 0.4 }],
};

const SISTEMA = { id: "s1", linhaId: "l1", critico: false, zpr0a: false };

describe("frequência de danos (Seção 7, Tabela 7)", () => {
  it("calcula as seis frequências da Tabela 7", () => {
    const [f] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(f.fc).toBeCloseTo(0.05, 12); // N_D × P_C = 0,1 × 0,5
    expect(f.fm).toBeCloseTo(0.005, 12); // N_M × P_M = 0,02 × 0,25
    expect(f.fw).toBeCloseTo(0.0005, 12); // (N_L + N_DJ) × P_W = 0,005 × 0,1
    expect(f.fv).toBeCloseTo(0.00025, 12); // (N_L + N_DJ) × P_EB = 0,005 × 0,05
    expect(f.fz).toBeCloseTo(0.02, 12); // N_I × P_Z = 0,05 × 0,4
  });

  it("zera F_B fora de ZPR₀ᴬ e o calcula dentro", () => {
    const [fora] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(fora.fb).toBe(0);

    const [dentro] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, zpr0a: true }],
    });
    expect(dentro.fb).toBeCloseTo(0.02, 12); // N_D × P_B = 0,1 × 0,2
  });

  it("toma o maior F e compara com o F_T do sistema", () => {
    const [naoCritico] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(naoCritico.maior).toBeCloseTo(0.05, 12); // F_C é o maior
    expect(naoCritico.ft).toBe(1);
    expect(naoCritico.atende).toBe(true);

    const [critico] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, critico: true }],
    });
    expect(critico.ft).toBe(0.1);
    expect(critico.atende).toBe(true); // 0,05 ≤ 0,1
  });

  it("reprova o sistema crítico cujo maior F passa de 0,1/ano", () => {
    const [f] = frequenciaDanos({
      eventos: { ...EVENTOS, nd: 1 }, // F_C = 0,5
      probs: PROBS,
      sistemas: [{ ...SISTEMA, critico: true }],
    });
    expect(f.maior).toBeCloseTo(0.5, 12);
    expect(f.atende).toBe(false);
  });

  it("zera as frequências de linha quando o sistema não tem linha", () => {
    const [f] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, linhaId: null }],
    });
    expect(f.fw).toBe(0);
    expect(f.fv).toBe(0);
    expect(f.fz).toBe(0);
    expect(f.fc).toBeCloseTo(0.05, 12); // as de estrutura continuam valendo
  });

  it("devolve uma linha por sistema, na ordem recebida", () => {
    const r = frequenciaDanos({
      eventos: EVENTOS,
      probs: {
        ...PROBS,
        porSistema: [
          { id: "s1", pc: 0.5, pm: 0.25 },
          { id: "s2", pc: 0.1, pm: 0.1 },
        ],
      },
      sistemas: [SISTEMA, { id: "s2", linhaId: "l1", critico: true, zpr0a: false }],
    });
    expect(r.map((f) => f.id)).toEqual(["s1", "s2"]);
    expect(r[1].ft).toBe(0.1);
  });

  it("devolve lista vazia sem sistemas internos", () => {
    expect(frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaFrequencia.test.js
```

Esperado: FAIL — `Failed to resolve import "./spdaFrequencia"`.

- [ ] **Step 3: Escrever o módulo**

Criar `src/lib/spdaFrequencia.js`:

```js
import { FREQUENCIA_TOLERAVEL } from "../data/spdaNBR5419";

// Seção 7 da NBR 5419-2:2026 — frequência de danos F_X = N_X × P_X (equação
// 15), avaliada por sistema interno e comparada com a frequência tolerável
// F_T da Tabela 7.
//
// É critério independente do risco: uma estrutura pode ficar abaixo do R1
// tolerável e mesmo assim reprovar aqui, porque F não é ponderado por perda
// nem por presença de pessoas — conta só quantas vezes o dano acontece.
//
// A criticidade é do SISTEMA, não da estrutura: a norma define sistema
// crítico como aquele cuja falha pode afetar uma comunidade, com perdas
// irreversíveis ou de longa duração. O mesmo prédio pode ter um CFTV comum e
// um sistema de combate a incêndio crítico.
export function frequenciaDanos({ eventos, probs, sistemas = [] }) {
  return sistemas.map((s) => {
    const ps = probs.porSistema.find((x) => x.id === s.id);
    const evLinha = eventos.porLinha.find((x) => x.id === s.linhaId);
    const pLinha = probs.porLinha.find((x) => x.id === s.linhaId);

    // Descargas na linha: N_L + N_DJ, como em R_U, R_V e R_W (6.5.4).
    const naLinha = evLinha ? evLinha.nl + evLinha.ndj : 0;

    const fc = eventos.nd * (ps?.pc ?? 0);
    const fm = eventos.nm * (ps?.pm ?? 0);
    const fw = pLinha ? naLinha * pLinha.pw : 0;
    const fv = pLinha ? naLinha * probs.peb : 0;
    const fz = evLinha && pLinha ? evLinha.ni * pLinha.pz : 0;
    // Nota "a" da Tabela 7: F_B só conta para equipamento em ZPR₀ᴬ, isolado
    // ou no topo da estrutura. Nas demais situações é zero.
    const fb = s.zpr0a ? eventos.nd * probs.pb : 0;

    const maior = Math.max(fc, fm, fw, fv, fz, fb);
    const ft = s.critico ? FREQUENCIA_TOLERAVEL.critico : FREQUENCIA_TOLERAVEL.naoCritico;

    return { id: s.id, fc, fm, fw, fv, fz, fb, maior, ft, atende: maior <= ft };
  });
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaFrequencia.test.js
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spdaFrequencia.js src/lib/spdaFrequencia.test.js
git commit -m "feat: frequencia de danos F da Secao 7"
```

---

### Task 3: F ligada ao veredito

**Files:**
- Modify: `src/lib/spdaRisco.js:214-240` (`defaultEntrada`) e `:247-308` (`avaliarRisco`)
- Test: `src/lib/spdaRisco.test.js`

**Interfaces:**
- Consumes: `frequenciaDanos()` (Task 2).
- Produces: `avaliarRisco()` devolve, além do que já devolve, `frequencias` (array da Task 2) e `precisa.f` (booleano — verdadeiro quando algum sistema não atende; `false` quando não há sistema).
- Produces: cada sistema em `defaultEntrada().protecoes.sistemas` passa a ter `critico: false` e `zpr0a: false`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `src/lib/spdaRisco.test.js`:

```js
it("traz as frequências de dano e o veredito de F", () => {
  const e = defaultEntrada();
  e.estrutura.ng = 14;
  const r = avaliarRisco(e);

  expect(r.frequencias).toHaveLength(1);
  expect(r.frequencias[0].id).toBe("s1");
  // O galpão padrão não tem proteção nenhuma: P_C = 1 e F_C = N_D, que passa
  // de 1/ano nessa geometria. Reprova mesmo como não crítico.
  expect(r.frequencias[0].maior).toBeCloseTo(r.eventos.nd, 12);
  expect(r.precisa.f).toBe(true);
});

it("não exige F quando não há sistema interno", () => {
  const e = defaultEntrada();
  e.estrutura.ng = 14;
  e.protecoes.sistemas = [];
  const r = avaliarRisco(e);
  expect(r.frequencias).toEqual([]);
  expect(r.precisa.f).toBe(false);
});

it("dá aos sistemas do estado inicial as marcações da Seção 7", () => {
  const [s] = defaultEntrada().protecoes.sistemas;
  expect(s.critico).toBe(false);
  expect(s.zpr0a).toBe(false);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaRisco.test.js
```

Esperado: FAIL — `expected undefined to have length 1`.

- [ ] **Step 3: Ligar no motor**

Em `src/lib/spdaRisco.js`, acrescentar o import no topo do arquivo, junto dos outros:

```js
import { frequenciaDanos } from "./spdaFrequencia";
```

Em `defaultEntrada`, trocar a linha do `sistemas` (linha 237) por:

```js
      sistemas: [{
        id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1",
        // Seção 7: criticidade e posição do equipamento são declaração de quem
        // projeta, e o caso comum é equipamento não crítico dentro da estrutura.
        critico: false, zpr0a: false,
      }],
```

Em `avaliarRisco`, depois da linha que calcula `dominante`, acrescentar:

```js
  const frequencias = frequenciaDanos({ eventos, probs, sistemas: entrada.protecoes.sistemas ?? [] });
```

E no objeto devolvido, acrescentar `frequencias` e o campo `f` dentro de `precisa`:

```js
    frequencias,
    precisa: {
      r1: r1 > RISCO_TOLERAVEL.R1,
      r3: r3 === null ? null : r3 > RISCO_TOLERAVEL.R3,
      // Basta um sistema reprovar: F é avaliado equipamento a equipamento.
      f: frequencias.some((x) => !x.atende),
    },
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npm test -- --run
```

Esperado: PASS, 290 testes (280 da Task 1 + 7 da Task 2 + 3 desta).

- [ ] **Step 5: Commit**

```bash
git add src/lib/spdaRisco.js src/lib/spdaRisco.test.js
git commit -m "feat: veredito de frequencia de danos no avaliarRisco"
```

---

### Task 4: Marcações de criticidade e ZPR₀ᴬ na tela

**Files:**
- Modify: `src/components/spda/ProtecoesForm.jsx:56-63` (`adicionarSistema`) e `:163-212` (cartão do sistema)
- Modify: `src/components/SpdaTab.jsx:12-36` (`carregar`)

**Interfaces:**
- Consumes: os campos `critico` e `zpr0a` do estado (Task 3).

- [ ] **Step 1: Migrar o estado salvo**

Um projeto salvo antes desta versão tem sistemas sem os dois campos, e `undefined` em `s.critico` faria o `checked` do input oscilar entre não controlado e controlado. Em `src/components/SpdaTab.jsx`, dentro de `carregar()`, logo depois da linha `delete estrutura.tz;`:

```js
      // Sistemas salvos antes da Seção 7 não têm as marcações novas. Sem o
      // padrão explícito o checkbox nasce não controlado e o React reclama.
      const protecoes = { ...base.protecoes, ...salvo.protecoes };
      protecoes.sistemas = (protecoes.sistemas ?? []).map((s) => ({
        critico: false, zpr0a: false, ...s,
      }));
```

E trocar o `return` logo abaixo para usar essa variável:

```js
      return { estrutura, linhas: salvo.linhas ?? base.linhas, protecoes };
```

- [ ] **Step 2: Dar os campos ao sistema novo**

Em `src/components/spda/ProtecoesForm.jsx`, dentro de `adicionarSistema`, trocar o objeto do sistema novo por:

```js
        uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: linhas[0]?.id ?? null,
        critico: false, zpr0a: false,
```

- [ ] **Step 3: Acrescentar as duas marcações ao cartão**

No mesmo arquivo, o cartão de cada sistema é hoje `sm:grid-cols-5`. Passa a `sm:grid-cols-7`, e entre a marcação "Interface isolante" e o botão "excluir" entram:

```jsx
            <label className="flex items-center gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.critico}
                onChange={(e) => alterarSistema(s.id, { critico: e.target.checked })}
                className="h-3.5 w-3.5 accent-copper-600"
              />
              Crítico
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.zpr0a}
                onChange={(e) => alterarSistema(s.id, { zpr0a: e.target.checked })}
                className="h-3.5 w-3.5 accent-copper-600"
              />
              Em ZPR₀ᴬ
            </label>
```

E, logo abaixo do parágrafo que já explica R_C e R_M (linha 156), entra a explicação das duas marcações:

```jsx
      <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
        <b>Crítico</b> (Seção 7): sistema cuja falha pode afetar uma comunidade, com perdas
        irreversíveis ou de longa duração, ou que possa levar a danos físicos ou ameaça à vida.
        A frequência de danos tolerável cai de 1/ano para 0,1/ano. <b>Em ZPR₀ᴬ</b>: equipamento
        exposto à descarga direta — isolado, no topo ou fora do volume protegido; só nesse caso
        F_B é contabilizado.
      </p>
```

- [ ] **Step 4: Verificar no navegador**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npm run build
```

Esperado: `✓ built`. Depois, no painel do navegador, abrir a aba SPDA, escolher um município, e confirmar com `read_page` que o cartão do sistema `s1` tem as marcações "Crítico" e "Em ZPR₀ᴬ", que marcar "Crítico" não gera erro no console e que o estado persiste em `localStorage` sob `spdaRisco.v1`.

- [ ] **Step 5: Commit**

```bash
git add src/components/spda/ProtecoesForm.jsx src/components/SpdaTab.jsx
git commit -m "feat: marcacoes de sistema critico e ZPR0A"
```

---

### Task 5: Cartão de F no veredito fixo

**Files:**
- Modify: `src/components/spda/VereditoRisco.jsx`
- Modify: `src/components/SpdaTab.jsx` (nada além de conferir que `resultado` já chega inteiro)

**Interfaces:**
- Consumes: `resultado.frequencias` e `resultado.precisa.f` (Task 3).

- [ ] **Step 1: Generalizar o cartão**

O componente `Veredito` hoje escreve "/ano" e a palavra "tolerável" fixos, o que serve para F também. Só o texto do rótulo e a unidade mudam. Em `src/components/spda/VereditoRisco.jsx`, dentro de `VereditoRisco`, antes do `return`:

```js
  // Pior sistema pela Seção 7. Sem sistema interno não há o que avaliar, e o
  // cartão não aparece — melhor do que exibir "0" e sugerir aprovação.
  const { frequencias = [] } = resultado;
  const piorF = frequencias.length
    ? frequencias.reduce((a, b) => (a.maior / a.ft >= b.maior / b.ft ? a : b))
    : null;
```

O pior é o de maior razão F/F_T, não o de maior F: um sistema crítico com F = 0,2 está reprovado, e um não crítico com F = 0,9 está aprovado.

- [ ] **Step 2: Acrescentar o cartão ao grid**

Trocar o grid de vereditos por:

```jsx
      <div className={`grid gap-2 ${r3 !== null || piorF ? "sm:grid-cols-2" : ""}`}>
        <Veredito
          titulo="R1 — vida humana"
          valor={r1}
          tolerado={RISCO_TOLERAVEL.R1}
          precisa={precisa.r1}
        />
        {r3 !== null && (
          <Veredito
            titulo="R3 — patrimônio cultural"
            valor={r3}
            tolerado={RISCO_TOLERAVEL.R3}
            precisa={precisa.r3}
          />
        )}
        {piorF && (
          <Veredito
            titulo="F — frequência de danos"
            valor={piorF.maior}
            tolerado={piorF.ft}
            precisa={precisa.f}
          />
        )}
      </div>
```

- [ ] **Step 3: Verificar no navegador**

Reconstruir e conferir com `read_page` que a barra fixa mostra os três cartões, que F aparece em vermelho no galpão padrão sem proteção, e que marcar "Crítico" no sistema muda o tolerável exibido de `1,00 × 10⁰` para `1,00 × 10⁻¹`.

- [ ] **Step 4: Commit**

```bash
git add src/components/spda/VereditoRisco.jsx
git commit -m "feat: cartao de frequencia de danos na barra de veredito"
```

---

### Task 6: Tabela de F por sistema

**Files:**
- Create: `src/components/spda/FrequenciaDanos.jsx`
- Modify: `src/components/SpdaTab.jsx`

**Interfaces:**
- Consumes: `resultado.frequencias` (Task 3), `cientifica` de `./formato`.
- Produces: componente padrão `FrequenciaDanos({ frequencias })`, que devolve `null` quando a lista está vazia.

- [ ] **Step 1: Escrever o componente**

Criar `src/components/spda/FrequenciaDanos.jsx`:

```jsx
import { cientifica } from "./formato";

const FONTES = [
  { chave: "fc", rotulo: "F_C", origem: "Falha de sistema — descarga na estrutura" },
  { chave: "fm", rotulo: "F_M", origem: "Falha de sistema — descarga perto da estrutura" },
  { chave: "fw", rotulo: "F_W", origem: "Falha de sistema — descarga na linha" },
  { chave: "fz", rotulo: "F_Z", origem: "Falha de sistema — descarga perto da linha" },
  { chave: "fv", rotulo: "F_V", origem: "Danos físicos vindos da linha" },
  { chave: "fb", rotulo: "F_B", origem: "Danos físicos — descarga na estrutura (só em ZPR₀ᴬ)" },
];

export default function FrequenciaDanos({ frequencias }) {
  if (!frequencias.length) return null;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Frequência de danos por sistema interno
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 font-display text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
              <th className="px-2 py-1.5">Sistema</th>
              {FONTES.map((f) => (
                <th key={f.chave} className="px-2 py-1.5 text-right" title={f.origem}>
                  {f.rotulo}
                </th>
              ))}
              <th className="px-2 py-1.5 text-right">Maior</th>
              <th className="px-2 py-1.5 text-right">F_T</th>
              <th className="px-2 py-1.5">Veredito</th>
            </tr>
          </thead>
          <tbody>
            {frequencias.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-2 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {f.id.toUpperCase()}
                </td>
                {FONTES.map((fonte) => (
                  <td
                    key={fonte.chave}
                    className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400"
                  >
                    {cientifica(f[fonte.chave])}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {cientifica(f.maior)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {cientifica(f.ft)}
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`rounded-xs px-2 py-0.5 text-[11px] font-semibold ${
                      f.atende
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                    }`}
                  >
                    {f.atende ? "atende" : "reprova"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Seção 7 da NBR 5419-2:2026: F_X = N_X × P_X. É critério separado do risco — não pondera
        perda nem presença de pessoas, só conta quantas vezes o dano acontece por ano.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Montar na aba**

Em `src/components/SpdaTab.jsx`, importar o componente e renderizar logo depois de `ResultadoRisco`, sob a mesma condição de município escolhido:

```jsx
      {entrada.estrutura.ng != null && <ResultadoRisco resultado={resultado} />}
      {entrada.estrutura.ng != null && <FrequenciaDanos frequencias={resultado.frequencias} />}
```

- [ ] **Step 3: Verificar no navegador**

Confirmar com `read_page` que a tabela aparece com uma linha por sistema, que os seis F estão preenchidos, que F_B mostra `0` sem a marcação de ZPR₀ᴬ e um valor com ela, e que a tabela some ao excluir todos os sistemas internos.

- [ ] **Step 4: Commit**

```bash
git add src/components/spda/FrequenciaDanos.jsx src/components/SpdaTab.jsx
git commit -m "feat: tabela de frequencia de danos por sistema"
```

---

### Task 7: Catálogo de medidas e pesos de esforço

**Files:**
- Create: `src/data/spdaEsforco.js`
- Test: `src/data/spdaEsforco.test.js`

**Interfaces:**
- Produces: `EIXOS_FIXOS` — array de `{ id, label, alvo, opcoes: [{ id, label, esforco, patch }] }`, onde `alvo` é `"protecoes"` ou `"estrutura"` e `patch` é o objeto mesclado nessa parte do estado. Opções em ordem crescente de esforço, a primeira sempre com `esforco: 0` e o patch que representa "não fazer nada".
- Produces: `ESFORCO_MAXIMO` — soma do maior esforço de cada eixo, usada em teste e no painel.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/data/spdaEsforco.test.js`:

```js
import { describe, it, expect } from "vitest";
import { EIXOS_FIXOS, ESFORCO_MAXIMO } from "./spdaEsforco";
import { SPDA_PB, DPS_PSPD, DPS_PEB, FIACAO_KS3 } from "./spdaNBR5419";

describe("catálogo de medidas de proteção", () => {
  it("começa cada eixo no esforço zero", () => {
    for (const eixo of EIXOS_FIXOS) {
      expect(eixo.opcoes[0].esforco, eixo.id).toBe(0);
    }
  });

  it("ordena as opções por esforço crescente", () => {
    for (const eixo of EIXOS_FIXOS) {
      const esforcos = eixo.opcoes.map((o) => o.esforco);
      expect(esforcos, eixo.id).toEqual([...esforcos].sort((a, b) => a - b));
    }
  });

  it("só usa ids que existem nas tabelas normativas", () => {
    const idsDe = (eixo) => eixo.opcoes.map((o) => Object.values(o.patch)[0]);
    const acha = (eixo) => EIXOS_FIXOS.find((x) => x.id === eixo);
    expect(idsDe(acha("spdaNp")).every((id) => SPDA_PB.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("dpsNp")).every((id) => DPS_PSPD.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("dpsClasseI")).every((id) => DPS_PEB.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("fiacao")).every((id) => FIACAO_KS3.some((t) => t.id === id))).toBe(true);
  });

  it("mira todo eixo numa parte conhecida do estado", () => {
    for (const eixo of EIXOS_FIXOS) {
      expect(["protecoes", "estrutura"], eixo.id).toContain(eixo.alvo);
    }
  });

  it("soma o esforço máximo de todos os eixos", () => {
    const esperado = EIXOS_FIXOS.reduce(
      (acc, e) => acc + Math.max(...e.opcoes.map((o) => o.esforco)),
      0
    );
    expect(ESFORCO_MAXIMO).toBe(esperado);
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/data/spdaEsforco.test.js
```

Esperado: FAIL — `Failed to resolve import "./spdaEsforco"`.

- [ ] **Step 3: Escrever o catálogo**

Criar `src/data/spdaEsforco.js`:

```js
// Catálogo das medidas de proteção que a busca pode recomendar, com o esforço
// de obra de cada degrau.
//
// ATENÇÃO: os pesos NÃO são valor normativo. São julgamento de engenharia
// sobre ordem de grandeza de intervenção — o quanto cada medida mexe na obra,
// não quanto custa em reais. Mudá-los muda apenas a ORDEM em que as
// recomendações aparecem; nunca muda se uma combinação atende ou não à norma,
// que é decidido por R1, R3 e F. Discorde à vontade e ajuste os números.
//
// A escala:
//     0  nada a fazer
//   1–2  ajuste de projeto, sem material novo (roteamento, avisos)
//   3–6  material e mão de obra pontuais (DPS, piso, alarme)
//  7–12  intervenção estrutural (SPDA, malha de blindagem)
//    20  reforma pesada (blindagem metálica contínua)
//
// `alvo` diz em que parte do estado o `patch` é mesclado. Piso e providências
// contra incêndio ficam na estrutura, não nas proteções, e por isso a tela
// avisa que aplicar uma sugestão mexe nos dois painéis.

export const EIXOS_FIXOS = [
  {
    id: "spdaNp",
    label: "SPDA",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem SPDA", esforco: 0, patch: { spdaNp: "nenhum" } },
      { id: "npIV", label: "SPDA NP IV", esforco: 7, patch: { spdaNp: "npIV" } },
      { id: "npIII", label: "SPDA NP III", esforco: 8, patch: { spdaNp: "npIII" } },
      { id: "npII", label: "SPDA NP II", esforco: 10, patch: { spdaNp: "npII" } },
      { id: "npI", label: "SPDA NP I", esforco: 12, patch: { spdaNp: "npI" } },
    ],
  },
  {
    id: "dpsNp",
    label: "Sistema coordenado de DPS",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem DPS coordenado", esforco: 0, patch: { dpsNp: "nenhum" } },
      { id: "npIIIIV", label: "DPS para NP III-IV", esforco: 3, patch: { dpsNp: "npIIIIV" } },
      { id: "npII", label: "DPS para NP II", esforco: 4, patch: { dpsNp: "npII" } },
      { id: "npI", label: "DPS para NP I", esforco: 5, patch: { dpsNp: "npI" } },
      { id: "melhorQueNpI", label: "DPS melhores que NP I", esforco: 6, patch: { dpsNp: "melhorQueNpI" } },
    ],
  },
  {
    id: "dpsClasseI",
    label: "DPS classe I na entrada",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem DPS classe I", esforco: 0, patch: { dpsClasseI: "nenhum" } },
      { id: "npIIIIV", label: "DPS classe I para NP III-IV", esforco: 3, patch: { dpsClasseI: "npIIIIV" } },
      { id: "npII", label: "DPS classe I para NP II", esforco: 4, patch: { dpsClasseI: "npII" } },
      { id: "npI", label: "DPS classe I para NP I", esforco: 5, patch: { dpsClasseI: "npI" } },
      { id: "melhorQueNpI", label: "DPS classe I melhores que NP I", esforco: 6, patch: { dpsClasseI: "melhorQueNpI" } },
    ],
  },
  {
    id: "fiacao",
    label: "Roteamento da fiação interna",
    alvo: "protecoes",
    opcoes: [
      { id: "semCuidado", label: "Sem cuidado de roteamento", esforco: 0, patch: { fiacao: "semCuidado" } },
      { id: "grandesLacos", label: "Evitando grandes laços", esforco: 1, patch: { fiacao: "grandesLacos" } },
      { id: "lacosMedios", label: "Evitando laços médios", esforco: 2, patch: { fiacao: "lacosMedios" } },
      { id: "pequenosLacos", label: "Evitando pequenos laços", esforco: 4, patch: { fiacao: "pequenosLacos" } },
      { id: "blindado", label: "Cabos blindados ou em condutos metálicos", esforco: 8, patch: { fiacao: "blindado" } },
    ],
  },
  {
    // Conjuntos cumulativos em vez das 32 combinações da Tabela B.1: fora
    // desta ordem as combinações ou não fazem sentido em obra ou repetem o
    // efeito de uma mais barata.
    id: "medidasPta",
    label: "Contra tensões de toque e passo na estrutura",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Nenhuma", esforco: 0, patch: { medidasPta: [] } },
      { id: "avisos", label: "Avisos de alerta", esforco: 1, patch: { medidasPta: ["avisos"] } },
      {
        id: "avisosIsolacao",
        label: "Avisos + isolação das descidas",
        esforco: 5,
        patch: { medidasPta: ["avisos", "isolacaoDescidas"] },
      },
      {
        id: "restricoes",
        label: "Restrições físicas fixas",
        esforco: 9,
        patch: { medidasPta: ["restricoesFisicas"] },
      },
    ],
  },
  {
    id: "medidasPtu",
    label: "Contra tensões de toque vindas da linha",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Nenhuma", esforco: 0, patch: { medidasPtu: [] } },
      { id: "avisos", label: "Avisos visíveis", esforco: 1, patch: { medidasPtu: ["avisos"] } },
      { id: "isolacao", label: "Avisos + isolação elétrica", esforco: 5, patch: { medidasPtu: ["avisos", "isolacao"] } },
      { id: "restricoes", label: "Restrições físicas", esforco: 9, patch: { medidasPtu: ["restricoesFisicas"] } },
    ],
  },
  {
    // Cinco degraus em vez de um número contínuo: são as larguras que
    // aparecem em projeto, e uma malha intermediária não mudaria a ordem.
    id: "blindagem",
    label: "Blindagem espacial",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Sem blindagem espacial", esforco: 0, patch: { larguraMalha: null, blindagemContinua: false } },
      { id: "malha5", label: "Malha de 5 m", esforco: 10, patch: { larguraMalha: 5, blindagemContinua: false } },
      { id: "malha2", label: "Malha de 2 m", esforco: 12, patch: { larguraMalha: 2, blindagemContinua: false } },
      { id: "malha05", label: "Malha de 0,5 m", esforco: 15, patch: { larguraMalha: 0.5, blindagemContinua: false } },
      { id: "continua", label: "Blindagem metálica contínua", esforco: 20, patch: { larguraMalha: null, blindagemContinua: true } },
    ],
  },
];

// Teto do esforço somado, usado para dimensionar barras na tela e como
// referência nos testes da busca.
export const ESFORCO_MAXIMO = EIXOS_FIXOS.reduce(
  (acc, e) => acc + Math.max(...e.opcoes.map((o) => o.esforco)),
  0
);
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/data/spdaEsforco.test.js
```

Esperado: PASS, 5 testes.

Nota: o teste "só usa ids que existem nas tabelas normativas" pega `Object.values(o.patch)[0]`, que nos eixos citados é sempre a string do id. Os eixos `medidasPta`, `medidasPtu` e `blindagem` não entram nesse teste porque seus patches não são ids simples.

- [ ] **Step 5: Commit**

```bash
git add src/data/spdaEsforco.js src/data/spdaEsforco.test.js
git commit -m "feat: catalogo de medidas com pesos de esforco"
```

---

### Task 8: Busca melhor-primeiro das combinações

O ponto delicado: o produto cartesiano dos eixos passa de um milhão de arranjos. A busca escapa disso por duas propriedades. Primeira, **monotonicidade** — toda medida multiplica o risco por um fator ≤ 1, então subir um degrau nunca piora. Segunda, **não expandir solução** — os filhos de uma combinação que já atende custam mais e também atendem, logo não acrescentam nada; podar ali garante que as três recomendações sejam realmente distintas.

**Files:**
- Create: `src/lib/spdaBusca.js`
- Test: `src/lib/spdaBusca.test.js`

**Interfaces:**
- Consumes: `EIXOS_FIXOS` (Task 7); `avaliarRisco` e `RISCO_TOLERAVEL` de `src/lib/spdaRisco.js` / `src/data/spdaNBR5419.js`; `PISO_RT` e `PROVIDENCIAS_RP`.
- Produces: `montarEixos(entrada)` → array de eixos, os fixos mais os dois que dependem do estado atual.
- Produces: `aplicarEscolhas(entrada, eixos, indices)` → nova entrada.
- Produces: `atendeNorma(resultado)` → booleano.
- Produces: `buscarMedidas(entrada, { maximo = 3, teto = 20000 } = {})` →
  `{ combinacoes, avaliadas, esgotou, melhorParcial }`, onde cada combinação é
  `{ indices, esforco, escolhas, r1, r3, piorF, entrada }` e `escolhas` é um
  array de `{ eixo, label, esforco }` só com os eixos que saíram do degrau zero.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/spdaBusca.test.js`:

```js
import { describe, it, expect } from "vitest";
import { montarEixos, aplicarEscolhas, atendeNorma, buscarMedidas } from "./spdaBusca";
import { defaultEntrada, avaliarRisco } from "./spdaRisco";

// Galpão padrão com N_G real: reprova em R1 e em F sem proteção nenhuma.
function galpao() {
  const e = defaultEntrada();
  e.estrutura.ng = 14;
  return e;
}

describe("busca de medidas de proteção", () => {
  it("monta os eixos fixos mais piso e providências", () => {
    const ids = montarEixos(galpao()).map((x) => x.id);
    expect(ids).toContain("spdaNp");
    expect(ids).toContain("piso");
    expect(ids).toContain("providencias");
  });

  it("não oferece piso pior do que o já informado", () => {
    const e = galpao();
    e.estrutura.piso = "asfaltoMadeira"; // o melhor da Tabela C.3
    const piso = montarEixos(e).find((x) => x.id === "piso");
    expect(piso.opcoes).toHaveLength(1); // só "manter como está"
    expect(piso.opcoes[0].esforco).toBe(0);
  });

  it("aplica as escolhas nas duas partes do estado", () => {
    const e = galpao();
    const eixos = montarEixos(e);
    const indices = eixos.map((x) => (x.id === "spdaNp" ? 3 : 0));
    const nova = aplicarEscolhas(e, eixos, indices);
    expect(nova.protecoes.spdaNp).toBe("npII");
    expect(e.protecoes.spdaNp).toBe("nenhum"); // não muta a entrada original
  });

  it("subir um degrau nunca aumenta R1 (monotonicidade)", () => {
    const e = galpao();
    const eixos = montarEixos(e);
    const base = eixos.map(() => 0);
    const r1Base = avaliarRisco(aplicarEscolhas(e, eixos, base)).r1;

    for (let i = 0; i < eixos.length; i++) {
      for (let j = 1; j < eixos[i].opcoes.length; j++) {
        const indices = [...base];
        indices[i] = j;
        const r1 = avaliarRisco(aplicarEscolhas(e, eixos, indices)).r1;
        expect(r1, `${eixos[i].id} degrau ${j}`).toBeLessThanOrEqual(r1Base * (1 + 1e-12));
      }
    }
  });

  it("devolve combinações que realmente atendem, em ordem de esforço", () => {
    const r = buscarMedidas(galpao());
    expect(r.combinacoes.length).toBeGreaterThan(0);

    for (const c of r.combinacoes) {
      expect(atendeNorma(avaliarRisco(c.entrada))).toBe(true);
    }
    const esforcos = r.combinacoes.map((c) => c.esforco);
    expect(esforcos).toEqual([...esforcos].sort((a, b) => a - b));
  });

  it("promete o R1 que a combinação de fato produz", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(avaliarRisco(c.entrada).r1).toBeCloseTo(c.r1, 15);
  });

  it("lista só os eixos que saíram do degrau zero", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(c.escolhas.length).toBeGreaterThan(0);
    expect(c.escolhas.every((x) => x.esforco > 0)).toBe(true);
  });

  it("não recomenda nada quando a estrutura já atende", () => {
    const e = galpao();
    e.estrutura.nz = 0; // ninguém na zona: R1 = 0
    e.protecoes.sistemas = [];
    const r = buscarMedidas(e);
    expect(r.combinacoes).toHaveLength(1);
    expect(r.combinacoes[0].esforco).toBe(0);
    expect(r.combinacoes[0].escolhas).toEqual([]);
  });

  it("avisa quando para sem achar solução, com o melhor parcial", () => {
    // Teto de 1 avaliação: só o degrau zero é testado, e o galpão sem
    // proteção reprova. Força o caminho "não achei" de forma determinística,
    // sem depender de uma estrutura extrema que o catálogo talvez resolvesse.
    const r = buscarMedidas(galpao(), { teto: 1 });
    expect(r.combinacoes).toHaveLength(0);
    expect(r.esgotou).toBe(true);
    expect(r.melhorParcial).not.toBeNull();
    expect(r.melhorParcial.r1).toBeGreaterThan(0);
    expect(r.melhorParcial.escolhas).toEqual([]);
  });

  it("respeita o teto de avaliações", () => {
    const r = buscarMedidas(galpao(), { teto: 50 });
    expect(r.avaliadas).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaBusca.test.js
```

Esperado: FAIL — `Failed to resolve import "./spdaBusca"`.

- [ ] **Step 3: Escrever a busca**

Criar `src/lib/spdaBusca.js`:

```js
import { EIXOS_FIXOS } from "../data/spdaEsforco";
import { PISO_RT, PROVIDENCIAS_RP, RISCO_TOLERAVEL } from "../data/spdaNBR5419";
import { avaliarRisco } from "./spdaRisco";

// Piso e providências contra incêndio já têm um valor informado no painel
// Estrutura, e trocar por um pior seria absurdo. O eixo é montado na hora, a
// partir do estado: degrau zero é "manter como está" e os degraus seguintes
// são só as opções da tabela com fator menor que o atual.
function eixoQueMelhora({ id, label, campo, tabela, esforcos }, entrada) {
  const atualId = entrada.estrutura[campo];
  const atual = tabela.find((t) => t.id === atualId)?.valor ?? Infinity;
  const melhores = tabela
    .filter((t) => t.valor < atual)
    .sort((a, b) => b.valor - a.valor);

  return {
    id,
    label,
    alvo: "estrutura",
    opcoes: [
      { id: "manter", label: "Manter como está", esforco: 0, patch: {} },
      ...melhores.map((t, i) => ({
        id: t.id,
        label: t.label,
        esforco: esforcos[Math.min(i, esforcos.length - 1)],
        patch: { [campo]: t.id },
      })),
    ],
  };
}

export function montarEixos(entrada) {
  return [
    ...EIXOS_FIXOS,
    eixoQueMelhora(
      { id: "piso", label: "Piso da zona", campo: "piso", tabela: PISO_RT, esforcos: [3, 4, 5] },
      entrada
    ),
    eixoQueMelhora(
      {
        id: "providencias",
        label: "Providências contra incêndio",
        campo: "providencias",
        tabela: PROVIDENCIAS_RP,
        esforcos: [3, 6],
      },
      entrada
    ),
  ];
}

// Monta a entrada que uma combinação representa. Nunca muta a original: a
// busca avalia milhares de candidatas em cima do mesmo estado de partida.
export function aplicarEscolhas(entrada, eixos, indices) {
  const nova = {
    estrutura: { ...entrada.estrutura },
    linhas: entrada.linhas,
    protecoes: { ...entrada.protecoes },
  };
  eixos.forEach((eixo, i) => {
    Object.assign(nova[eixo.alvo], eixo.opcoes[indices[i]].patch);
  });
  return nova;
}

// Atender é passar nos três critérios ao mesmo tempo. Ficar abaixo do risco
// tolerável e reprovar na frequência de danos não serve — são requisitos
// independentes da norma.
export function atendeNorma(resultado) {
  return (
    resultado.r1 <= RISCO_TOLERAVEL.R1 &&
    (resultado.r3 === null || resultado.r3 <= RISCO_TOLERAVEL.R3) &&
    !resultado.precisa.f
  );
}

function piorFrequencia(resultado) {
  if (!resultado.frequencias.length) return null;
  return resultado.frequencias.reduce((a, b) => (a.maior / a.ft >= b.maior / b.ft ? a : b));
}

function descreverEscolhas(eixos, indices) {
  return eixos
    .map((eixo, i) => ({ eixo: eixo.label, ...eixo.opcoes[indices[i]] }))
    .filter((o) => o.esforco > 0)
    .map((o) => ({ eixo: o.eixo, label: o.label, esforco: o.esforco }));
}

// Busca melhor-primeiro sobre a grade de degraus dos eixos.
//
// Por que não força bruta: o produto cartesiano dos eixos passa de um milhão
// de arranjos, e avaliar todos travaria a tela.
//
// Por que a primeira encontrada é a mais barata: a fila devolve sempre o nó de
// menor esforço acumulado, e subir um degrau só soma esforço (nunca subtrai),
// então nenhum arranjo mais barato pode aparecer depois.
//
// Por que não expandir quem já atende: pela monotonicidade, todo filho de uma
// combinação aprovada também é aprovado e custa mais. Expandir só produziria
// variações redundantes da mesma resposta, e as três recomendações sairiam
// praticamente iguais.
export function buscarMedidas(entrada, { maximo = 3, teto = 20000 } = {}) {
  const eixos = montarEixos(entrada);
  const zero = eixos.map(() => 0);

  // Fila de prioridade simples: a grade é pequena o bastante para a inserção
  // ordenada custar menos que manter um heap.
  const fila = [{ indices: zero, esforco: 0 }];
  const vistos = new Set([zero.join(",")]);

  const combinacoes = [];
  let avaliadas = 0;
  let melhorParcial = null;

  while (fila.length && combinacoes.length < maximo && avaliadas < teto) {
    const no = fila.shift();
    const candidata = aplicarEscolhas(entrada, eixos, no.indices);
    const resultado = avaliarRisco(candidata);
    avaliadas++;

    if (atendeNorma(resultado)) {
      combinacoes.push({
        indices: no.indices,
        esforco: no.esforco,
        escolhas: descreverEscolhas(eixos, no.indices),
        r1: resultado.r1,
        r3: resultado.r3,
        piorF: piorFrequencia(resultado),
        entrada: candidata,
      });
      continue; // não expande: os filhos seriam a mesma resposta, mais cara
    }

    if (!melhorParcial || resultado.r1 < melhorParcial.r1) {
      melhorParcial = {
        esforco: no.esforco,
        escolhas: descreverEscolhas(eixos, no.indices),
        r1: resultado.r1,
        r3: resultado.r3,
        piorF: piorFrequencia(resultado),
        entrada: candidata,
      };
    }

    for (let i = 0; i < eixos.length; i++) {
      const proximo = no.indices[i] + 1;
      if (proximo >= eixos[i].opcoes.length) continue;
      const indices = [...no.indices];
      indices[i] = proximo;
      const chave = indices.join(",");
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      const esforco = indices.reduce((acc, idx, j) => acc + eixos[j].opcoes[idx].esforco, 0);
      const filho = { indices, esforco };
      const pos = fila.findIndex((x) => x.esforco > esforco);
      if (pos === -1) fila.push(filho);
      else fila.splice(pos, 0, filho);
    }
  }

  return {
    combinacoes,
    avaliadas,
    // Verdadeiro quando a busca parou sem completar o pedido — ou porque a
    // grade acabou, ou porque bateu o teto de avaliações.
    esgotou: combinacoes.length < maximo,
    melhorParcial,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npx vitest run src/lib/spdaBusca.test.js
```

Esperado: PASS, 10 testes.

- [ ] **Step 5: Medir o custo da busca**

Acrescentar ao fim de `src/lib/spdaBusca.test.js`:

```js
it("termina dentro do orçamento de um render", () => {
  const e = galpao();
  const inicio = performance.now();
  const r = buscarMedidas(e);
  const ms = performance.now() - inicio;
  // O painel roda a busca dentro de um useMemo, no mesmo quadro em que o
  // usuário digita. Acima de ~100 ms a digitação começa a engasgar.
  expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(1)} ms`).toBeLessThan(100);
});
```

Rodar. Se falhar, **não** aumentar o limite: baixar o `teto` padrão ou reduzir degraus dos eixos menos úteis, e registrar a decisão no comentário do arquivo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/spdaBusca.js src/lib/spdaBusca.test.js
git commit -m "feat: busca melhor-primeiro das combinacoes de medidas"
```

---

### Task 9: Painel de sugestões

**Files:**
- Create: `src/components/spda/SugestaoMedidas.jsx`
- Modify: `src/components/SpdaTab.jsx`

**Interfaces:**
- Consumes: `buscarMedidas` (Task 8), `cientifica` de `./formato`.
- Produces: `SugestaoMedidas({ entrada, resultado, onAplicar })`, onde `onAplicar` recebe a entrada completa da combinação escolhida.

- [ ] **Step 1: Escrever o painel**

Criar `src/components/spda/SugestaoMedidas.jsx`:

```jsx
import { useMemo } from "react";
import { buscarMedidas, atendeNorma } from "../../lib/spdaBusca";
import { cientifica } from "./formato";

function Combinacao({ c, ordem, onAplicar }) {
  return (
    <div className="rounded-xs border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Opção {ordem}
        </span>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          R1 = {cientifica(c.r1)}
          {c.r3 !== null && <> · R3 = {cientifica(c.r3)}</>}
          {c.piorF && <> · F = {cientifica(c.piorF.maior)}</>}
        </span>
        <button
          type="button"
          onClick={() => onAplicar(c.entrada)}
          className="ml-auto rounded-xs bg-copper-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-copper-700"
        >
          aplicar
        </button>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {c.escolhas.map((e) => (
          <li key={e.eixo} className="text-xs text-slate-600 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">{e.eixo}:</span> {e.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Painel que responde "o que fazer", e não só "precisa de proteção".
//
// Só aparece quando algum critério reprova: com tudo aprovado não há o que
// recomendar, e um painel vazio na tela sugeriria que falta alguma coisa.
export default function SugestaoMedidas({ entrada, resultado, onAplicar }) {
  // A busca é cara e só faz sentido quando algo reprova. O `useMemo` fica
  // antes do return porque hook não pode ser condicional, mas a busca em si
  // não roda quando não há o que recomendar.
  const precisa = !atendeNorma(resultado);
  const busca = useMemo(() => (precisa ? buscarMedidas(entrada) : null), [entrada, precisa]);

  if (!precisa) return null;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Como atender a norma
      </h2>
      <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
        Combinações que trazem R1, R3 e a frequência de danos para dentro dos limites, da menor
        para a maior intervenção em obra. A ordem é julgamento de engenharia, não valor normativo.
        <b className="ml-1 text-amber-700 dark:text-amber-400">
          Aplicar altera campos dos painéis Estrutura e Proteções.
        </b>
      </p>

      {busca.combinacoes.length === 0 ? (
        <div className="rounded-xs border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <b>Nenhuma combinação de medidas resolve.</b> Mesmo com tudo aplicado o risco continua
          acima do tolerável — o caminho aqui passa por reduzir a ocupação da zona, dividir a
          estrutura em zonas ou rever a geometria.
          {busca.melhorParcial && (
            <div className="mt-1 font-mono">
              melhor encontrado: R1 = {cientifica(busca.melhorParcial.r1)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {busca.combinacoes.map((c, i) => (
            <Combinacao key={c.indices.join(",")} c={c} ordem={i + 1} onAplicar={onAplicar} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Montar na aba**

Em `src/components/SpdaTab.jsx`, importar `SugestaoMedidas` e renderizar logo depois de `FrequenciaDanos`:

```jsx
      {entrada.estrutura.ng != null && (
        <SugestaoMedidas
          entrada={entrada}
          resultado={resultado}
          onAplicar={(nova) => setEntrada(nova)}
        />
      )}
```

- [ ] **Step 3: Verificar no navegador**

Abrir a aba SPDA, escolher um município e conferir:
1. o painel "Como atender a norma" aparece com até três opções;
2. cada opção lista medidas e mostra R1, R3 e F resultantes;
3. clicar em "aplicar" muda os campos dos painéis Estrutura e Proteções, e o veredito passa a verde nos três cartões;
4. depois de aplicar, o painel some (nada mais a recomendar);
5. o console não acusa erro novo — conferir que erros exibidos não são resíduo de HMR, comparando com o DOM renderizado e com `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/components/spda/SugestaoMedidas.jsx src/components/SpdaTab.jsx
git commit -m "feat: painel de sugestao de medidas de protecao"
```

---

### Task 10: Changelog e fechamento

**Files:**
- Modify: `src/data/changelog.js` (fim do array `CHANGELOG`)

- [ ] **Step 1: Acrescentar a entrada**

Depois da entrada `1.21.0`, dentro do array:

```js
  {
    versao: "1.22.0",
    data: "2026-08-06",
    titulo: "Frequência de danos e sugestão de medidas no SPDA",
    tipo: "novo",
    itens: [
      "A aba passa a avaliar a frequência de danos F da Seção 7 da NBR 5419-2:2026, critério novo da edição de 2026 e independente do risco: uma estrutura pode ficar abaixo do R1 tolerável e ainda assim reprovar.",
      "Cada sistema interno ganha as marcações de crítico (frequência tolerável cai de 1/ano para 0,1/ano) e de equipamento em ZPR₀ᴬ, que decide se F_B é contabilizado.",
      "Novo painel \"Como atender a norma\": quando algum critério reprova, o app procura as combinações de medidas mais enxutas que trazem R1, R3 e F para dentro dos limites, e aplica a escolhida nos campos.",
      "A ordem das sugestões usa um peso de esforço de obra definido no código, não valor normativo — mudá-lo muda só a ordem de apresentação, nunca se a combinação atende.",
    ],
  },
```

- [ ] **Step 2: Rodar tudo**

```bash
cd /c/Users/gusta/Desktop/CLAUDE/eletrocalha-app && npm test -- --run && npm run lint && npm run build
```

Esperado: todos os testes passando (≈305), nenhum aviso de lint além dos preexistentes em `CircuitoForm.jsx` e `capacitorBank.test.js`, `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/data/changelog.js
git commit -m "docs: changelog 1.22.0"
```

- [ ] **Step 4: Parar e relatar**

Não fazer merge. Relatar o que foi entregue, o número de testes, o custo medido da busca (avaliações e milissegundos) e qualquer decisão tomada que fuja do plano.

---

## Cobertura do spec

| Requisito do spec | Task |
|---|---|
| P_C e P_M por sistema, P_EB expostos | 1 |
| `FREQUENCIA_TOLERAVEL` 0,1 / 1 por ano | 1 |
| Tabela 7 completa (F_C, F_M, F_W, F_V, F_Z, F_B) | 2 |
| Nota "a": F_B só em ZPR₀ᴬ | 2, 4 |
| Criticidade por sistema, manual | 3, 4 |
| `frequencias` e `precisa.f` no resultado | 3 |
| Cartão de F na barra fixa | 5 |
| Tabela de F por sistema | 6 |
| Cartão ausente sem sistema interno | 5, 6 |
| Catálogo de medidas com pesos de esforço | 7 |
| Blindagem em cinco degraus | 7 |
| Piso e providências só melhorando | 8 |
| Busca melhor-primeiro, três combinações | 8 |
| Critério conjunto R1 + R3 + F | 8 |
| Aviso quando nada resolve, com o melhor parcial | 8, 9 |
| Botão que aplica a combinação | 9 |
| Aviso de que mexe nos dois painéis | 9 |
| Desempenho medido, não presumido | 8 |
