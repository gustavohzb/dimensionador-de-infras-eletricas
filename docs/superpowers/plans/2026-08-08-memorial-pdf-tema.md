# Tema de PDF e redesenho do Memorial de Cabos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair um módulo de tema compartilhado para os memoriais em PDF e redesenhar o Memorial de Cabos em cima dele — resumo em paisagem com tabela de verdade, detalhamento em fichas retrato, cabeçalho com emblema e numeração de página.

**Architecture:** `src/lib/pdfTema.js` (novo) concentra cores, criação do documento, faixa de cabeçalho, quebra de página, tabela, ficha e a segunda passada que carimba "página i / N". `src/lib/memorialPdf.js` é reescrito para consumir esse módulo e não conhece mais jsPDF diretamente. Nenhum outro gerador de PDF é tocado.

**Tech Stack:** JavaScript (ESM), React 19, Vite, jsPDF 4.2 (import dinâmico), Vitest, oxlint.

Spec: `docs/superpowers/specs/2026-08-08-memorial-pdf-tema-design.md`
Branch: `memorial-pdf-tema` (já criada, já tem o commit do spec).

## Global Constraints

- **Fonte WinAnsi.** A fonte padrão do jsPDF não tem `→`, `≥`, `Δ` nem `ρ`. Usar `->`, `>=` e "Queda". `×` (0xD7), `²` (0xB2), `…` (0x85) e acentos existem e podem ser usados.
- **Nenhuma dependência nova.** Sem `jspdf-autotable`, sem fonte embutida.
- **Nenhum campo de identificação novo.** O PDF conhece apenas `projectName`, `circuitos`, `resultados`, `preset` — exatamente o que as assinaturas atuais recebem. Nenhuma mudança em componentes React, hooks ou schema.
- **As assinaturas exportadas não mudam:** `exportMemorialPDF({ projectName, circuitos, resultados, preset })` e `exportCircuitoPDF({ circuito, result, preset })`. `src/components/QuadroCargasTab.jsx` (linhas 243 e 430) chama as duas e não deve precisar de edição.
- **Nenhum outro gerador de PDF é modificado** neste plano: `spdaPdf.js`, `capacitorPdf.js`, `iluminacaoPdf.js` e `reportPdf.js` ficam intactos.
- **Cores** (RGB, usar sempre via `TEMA`, nunca literais): `copper` 180,98,42 · `copperClaro` 243,227,214 · `tinta` 30,41,59 · `suave` 100,116,139 · `linha` 203,213,225 · `zebra` 248,250,252 · `ok` 5,150,105 · `erro` 220,38,38.
- **Comentários em português**, explicando o *porquê* (não o *o quê*), no estilo dos arquivos vizinhos.
- Testes: `npx vitest run`. Lint: `npx oxlint`. Build: `npm run build`. Rodar de `C:\Users\gusta\Desktop\CLAUDE\eletrocalha-app`.

## Armadilha importante (afeta a Task 6)

Em `src/lib/cableSizingPro.js`, o `return` de sucesso (linha 237) mapeia `detalhesTrechos` acrescentando `condutoLabel`. O `return` de **erro** (linha 197) devolve o array **cru** — sem `condutoLabel`, e ainda com `conduto` e `getCap` dentro. Portanto a ficha de um circuito com erro **não pode** desenhar a minitabela de trechos: `t.condutoLabel` seria `undefined`. O código de hoje não tropeça nisso porque retorna cedo no erro; o código novo precisa manter esse cuidado.

---

### Task 1: Helpers puros do tema, com testes

Os dois pedaços testáveis do módulo. Ficam primeiro para o resto do arquivo já nascer usando-os.

**Files:**
- Create: `src/lib/pdfTema.js`
- Create: `src/lib/pdfTema.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `TEMA` — objeto congelado com as oito cores acima, cada uma um array `[r, g, b]`.
  - `ajustarLargura(texto: string, maxWidth: number, medir: (t: string) => number): string`
  - `distribuirColunas(larguras: number[], x0: number, larguraUtil: number): { xs: number[], total: number, sobra: number }`

- [ ] **Step 1: Write the failing tests**

Criar `src/lib/pdfTema.test.js`:

```js
import { describe, it, expect } from "vitest";
import { TEMA, ajustarLargura, distribuirColunas } from "./pdfTema";

// Medidor falso: 1 mm por caractere. Evita instanciar um documento jsPDF só
// para medir texto — a função recebe o medidor justamente para ser testável.
const medir = (t) => t.length;

describe("ajustarLargura", () => {
  it("texto que cabe volta intacto", () => {
    expect(ajustarLargura("AL-01", 10, medir)).toBe("AL-01");
  });

  it("texto na largura exata volta intacto", () => {
    expect(ajustarLargura("AL-01", 5, medir)).toBe("AL-01");
  });

  it("texto que não cabe volta truncado com reticência e dentro do limite", () => {
    const r = ajustarLargura("Bomba de recalque 01", 10, medir);
    expect(r.endsWith("…")).toBe(true);
    expect(medir(r)).toBeLessThanOrEqual(10);
    expect("Bomba de recalque 01".startsWith(r.slice(0, -1))).toBe(true);
  });

  // Sem o piso de 1 caractere o laço rodaria para sempre numa largura em que
  // nem a reticência sozinha cabe.
  it("largura pequena demais não entra em laço infinito", () => {
    expect(ajustarLargura("Bomba", 0.5, medir)).toBe("B…");
  });

  it("texto vazio volta vazio", () => {
    expect(ajustarLargura("", 10, medir)).toBe("");
  });
});

describe("distribuirColunas", () => {
  it("acumula as posições x a partir de x0", () => {
    const { xs } = distribuirColunas([10, 20, 30], 12, 273);
    expect(xs).toEqual([12, 22, 42]);
  });

  it("soma a largura total e o que sobra da largura útil", () => {
    const { total, sobra } = distribuirColunas([10, 20, 30], 12, 100);
    expect(total).toBe(60);
    expect(sobra).toBe(40);
  });

  // Sobra negativa é o sinal de que as colunas não cabem na página. Quem
  // chama decide o que fazer; o helper só reporta.
  it("sobra fica negativa quando as colunas estouram a largura útil", () => {
    expect(distribuirColunas([200, 200], 12, 273).sobra).toBe(-127);
  });

  it("lista vazia devolve total zero", () => {
    expect(distribuirColunas([], 12, 273)).toEqual({ xs: [], total: 0, sobra: 273 });
  });
});

describe("TEMA", () => {
  it("traz as cores como triplas RGB", () => {
    expect(TEMA.copper).toEqual([180, 98, 42]);
    expect(TEMA.ok).toEqual([5, 150, 105]);
    expect(TEMA.erro).toEqual([220, 38, 38]);
  });

  // Congelado porque as cores são espalhadas por spread (`...TEMA.copper`) em
  // dezenas de chamadas; uma mutação acidental corromperia o resto da sessão.
  it("está congelado", () => {
    expect(Object.isFrozen(TEMA)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/pdfTema.test.js
```

Esperado: FAIL — `Failed to resolve import "./pdfTema"`.

- [ ] **Step 3: Write the minimal implementation**

Criar `src/lib/pdfTema.js`:

```js
// Tema compartilhado dos memoriais em PDF: cores, cabeçalho com emblema,
// tabela com bordas, ficha e numeração de página.
//
// Atenção WinAnsi (fonte padrão do jsPDF): sem "→", "≥", "Δ" ou "ρ" — usar
// "->", ">=" e "Queda". Acentos, "×", "²" e "…" existem e são ok.

// As cores que os geradores de PDF do app repetiam como literais RGB soltos.
// Congelado: são espalhadas por spread em dezenas de chamadas, e uma mutação
// acidental valeria pelo resto da sessão.
export const TEMA = Object.freeze({
  copper: [180, 98, 42],
  copperClaro: [243, 227, 214],
  tinta: [30, 41, 59],
  suave: [100, 116, 139],
  linha: [203, 213, 225],
  zebra: [248, 250, 252],
  ok: [5, 150, 105],
  erro: [220, 38, 38],
});

// Corta o texto pela largura real disponível (mm). Truncar por número fixo de
// caracteres deixa colunas estreitas vazarem por cima da coluna seguinte, que
// era o defeito do memorial antigo. `medir` é injetado porque medir texto de
// verdade exige um documento jsPDF, e isto precisa ser testável sem um.
export function ajustarLargura(texto, maxWidth, medir) {
  if (medir(texto) <= maxWidth) return texto;
  let cut = texto;
  while (cut.length > 1 && medir(`${cut}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// Posições x acumuladas de colunas de largura fixa. `sobra` negativa avisa que
// as colunas não cabem na largura útil da página — quem chama decide o que
// fazer, o helper só reporta.
export function distribuirColunas(larguras, x0, larguraUtil) {
  const xs = [];
  let x = x0;
  for (const w of larguras) {
    xs.push(x);
    x += w;
  }
  return { xs, total: x - x0, sobra: larguraUtil - (x - x0) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/pdfTema.test.js
```

Esperado: PASS — 10 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdfTema.js src/lib/pdfTema.test.js
git commit -m "feat: helpers puros do tema de PDF (cores, ajuste de largura, colunas)"
```

---

### Task 2: Núcleo do documento — cabeçalho, emblema, quebra de página, numeração

**Files:**
- Modify: `src/lib/pdfTema.js` (acrescentar ao fim; não mexer no que a Task 1 escreveu)

**Interfaces:**
- Consumes: `TEMA`, `ajustarLargura` (Task 1).
- Produces: `novoDocumento({ orientation?: "portrait" | "landscape", titulo: string, subtitulo?: string }): Promise<Estado>`, onde `Estado` tem, ao fim desta task:
  - propriedades `doc`, `pageW`, `pageH`, `margin`, `contentW`, `limiteY`, `y`
  - `novaPagina({ orientation? }): void`
  - `ensureSpace(mm: number): void`
  - `finalizar({ rodape: string, arquivo: string }): void`

- [ ] **Step 1: Acrescentar o import do emblema no topo do arquivo**

Logo abaixo do comentário de cabeçalho de `src/lib/pdfTema.js`, antes de `export const TEMA`:

```js
import emblemaUrl from "../assets/emblema.png";
```

- [ ] **Step 2: Acrescentar o carregamento do emblema ao fim do arquivo**

```js
// `undefined` = ainda não tentou; `null` = tentou e falhou (não tenta de novo).
let emblemaCache;

// O emblema já está no bundle (a aba Sobre o usa), então embutir no PDF não
// muda o peso do app. Reduzido para ~80 px porque enfiar os 183 kB do
// original em cada PDF gerado seria desperdício.
//
// Qualquer falha vira `null` e o cabeçalho cai para só texto: um PDF sem
// emblema é melhor que uma exportação que não acontece.
async function carregarEmblema() {
  if (emblemaCache !== undefined) return emblemaCache;
  emblemaCache = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const lado = 80;
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = Math.max(1, Math.round((img.height / img.width) * lado));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
      } catch (err) {
        console.error("Emblema não pôde ser preparado para o PDF:", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = emblemaUrl;
  });
  return emblemaCache;
}
```

- [ ] **Step 3: Acrescentar `novoDocumento` ao fim do arquivo**

```js
const MARGEM = 12;
const ALTURA_FAIXA = 14;
const ALTURA_RODAPE = 10;

export async function novoDocumento({ orientation = "portrait", titulo, subtitulo = "" }) {
  // Import dinâmico: o jspdf é pesado (~400 kB) e só faz falta na hora de
  // gerar — assim não entra no bundle inicial do app.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation });
  const emblema = await carregarEmblema();

  // Dimensões de cada página, na ordem em que foram criadas. A segunda
  // passada do rodapé precisa delas, e não dá para perguntar ao jsPDF depois:
  // a orientação varia de página para página neste documento.
  const paginas = [];

  const s = { doc, margin: MARGEM, y: 0 };

  // Rechamado a cada página: quando a orientação muda, largura útil e limite
  // inferior mudam junto. Fixar isso na criação faria a ficha em retrato
  // herdar a largura da paisagem e vazar para fora do papel.
  const medirPagina = () => {
    s.pageW = doc.internal.pageSize.getWidth();
    s.pageH = doc.internal.pageSize.getHeight();
    s.contentW = s.pageW - MARGEM * 2;
    s.limiteY = s.pageH - MARGEM - ALTURA_RODAPE;
    paginas.push({ w: s.pageW, h: s.pageH });
  };

  const desenharFaixa = () => {
    doc.setFillColor(...TEMA.copper);
    doc.rect(0, 0, s.pageW, ALTURA_FAIXA, "F");
    let x = MARGEM;
    if (emblema) {
      const h = ALTURA_FAIXA - 5;
      const w = (emblema.w / emblema.h) * h;
      doc.addImage(emblema.dataUrl, "PNG", x, 2.5, w, h);
      x += w + 3;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, x, ALTURA_FAIXA / 2 + 1.5);
    if (subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEMA.copperClaro);
      doc.text(subtitulo, s.pageW - MARGEM, ALTURA_FAIXA / 2 + 1.5, { align: "right" });
    }
    s.y = ALTURA_FAIXA + 8;
  };

  s.novaPagina = ({ orientation: nova } = {}) => {
    const atual = s.pageW > s.pageH ? "landscape" : "portrait";
    doc.addPage("a4", nova ?? atual);
    medirPagina();
    desenharFaixa();
  };

  s.ensureSpace = (mm) => {
    if (s.y + mm > s.limiteY) s.novaPagina();
  };

  // A numeração só pode ser escrita agora: "1 / 6" exige saber que são 6. É o
  // que obriga o módulo a ter um `finalizar`, em vez de cada gerador chamar
  // `doc.save()` por conta própria.
  s.finalizar = ({ rodape, arquivo }) => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const { w, h } = paginas[i - 1];
      const base = h - MARGEM;
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.3);
      doc.line(MARGEM, base - 5, w - MARGEM, base - 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...TEMA.suave);
      const numero = `página ${i} / ${total}`;
      const espacoNota = w - MARGEM * 2 - doc.getTextWidth(numero) - 6;
      doc.text(ajustarLargura(rodape, espacoNota, (t) => doc.getTextWidth(t)), MARGEM, base - 1);
      doc.text(numero, w - MARGEM, base - 1, { align: "right" });
    }
    doc.save(arquivo);
  };

  medirPagina();
  desenharFaixa();
  return s;
}
```

- [ ] **Step 4: Conferir que os testes da Task 1 continuam passando**

O novo código importa `../assets/emblema.png`, o que faz o Vitest ter de resolver um PNG. Se falhar, é sinal de que a configuração precisa de atenção — não contorne mudando o teste.

```bash
npx vitest run src/lib/pdfTema.test.js
```

Esperado: PASS — os mesmos 10 testes.

- [ ] **Step 5: Conferir lint e build**

```bash
npx oxlint src/lib/pdfTema.js
```

Esperado: sem avisos novos neste arquivo.

```bash
npm run build
```

Esperado: build conclui. O aviso de "chunk > 500kB" é pré-existente e não conta.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdfTema.js
git commit -m "feat: nucleo do tema de PDF — faixa com emblema, quebra de pagina e numeracao"
```

---

### Task 3: Primitivas de conteúdo — seção, par, nota e tabela

**Files:**
- Modify: `src/lib/pdfTema.js` (acrescentar dentro de `novoDocumento`, antes do `medirPagina(); desenharFaixa(); return s;` final)

**Interfaces:**
- Consumes: `TEMA`, `ajustarLargura`, `distribuirColunas` (Task 1); `s.ensureSpace`, `s.novaPagina`, `s.y`, `s.contentW`, `s.limiteY` (Task 2).
- Produces, no estado `s`:
  - `secao(texto: string): void`
  - `par(rotulo: string, valor: string, x?: number, larguraRotulo?: number): void`
  - `nota(texto: string): void`
  - `tabela({ cols, linhas, fontSize? }): void` — `cols: { w: number, label: string, align?: "right" }[]` em mm; `linhas: string[][]`, uma linha por registro, já formatadas (o módulo não conhece o domínio).

- [ ] **Step 1: Acrescentar `secao`, `par` e `nota`**

Dentro de `novoDocumento`, logo depois de `s.ensureSpace`:

```js
  s.secao = (texto) => {
    s.ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEMA.tinta);
    doc.text(texto, MARGEM, s.y);
    s.y += 1.5;
    doc.setDrawColor(...TEMA.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, s.y, s.pageW - MARGEM, s.y);
    s.y += 5;
  };

  s.par = (rotulo, valor, x = MARGEM, larguraRotulo = 62) => {
    s.ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEMA.suave);
    doc.text(rotulo, x, s.y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEMA.tinta);
    doc.text(String(valor), x + larguraRotulo, s.y);
    s.y += 5.5;
  };

  s.nota = (texto) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const linhas = doc.splitTextToSize(texto, s.contentW);
    s.ensureSpace(linhas.length * 3.4 + 2);
    doc.setTextColor(...TEMA.suave);
    doc.text(linhas, MARGEM, s.y);
    s.y += linhas.length * 3.4 + 2;
  };
```

`splitTextToSize` mede com a fonte corrente, por isso `setFont`/`setFontSize` vêm antes dele — invertido, a quebra sairia calculada na fonte errada.

- [ ] **Step 2: Acrescentar `tabela`**

Logo depois de `s.nota`:

```js
  // `linhas` é uma matriz de strings já formatadas: o módulo não conhece o
  // domínio, só desenha. O cabeçalho é redesenhado a cada quebra de página.
  s.tabela = ({ cols, linhas, fontSize = 8 }) => {
    const ALTURA = 5.2;
    const { xs, total } = distribuirColunas(cols.map((c) => c.w), MARGEM, s.contentW);

    const celula = (texto, i) => {
      const t = ajustarLargura(String(texto), cols[i].w - 2, (x) => doc.getTextWidth(x));
      if (cols[i].align === "right") {
        doc.text(t, xs[i] + cols[i].w - 1, s.y + 3.6, { align: "right" });
      } else {
        doc.text(t, xs[i] + 1, s.y + 3.6);
      }
    };

    const cabecalho = () => {
      doc.setFillColor(...TEMA.copper);
      doc.rect(MARGEM, s.y, total, ALTURA, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      cols.forEach((c, i) => celula(c.label, i));
      s.y += ALTURA;
    };

    cabecalho();
    linhas.forEach((linha, n) => {
      if (s.y + ALTURA > s.limiteY) {
        s.novaPagina();
        cabecalho();
      }
      if (n % 2 === 1) {
        doc.setFillColor(...TEMA.zebra);
        doc.rect(MARGEM, s.y, total, ALTURA, "F");
      }
      // Bordas depois do preenchimento: na ordem inversa a zebra as cobriria.
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.2);
      cols.forEach((c, i) => doc.rect(xs[i], s.y, c.w, ALTURA, "S"));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(...TEMA.tinta);
      linha.forEach((v, i) => celula(v, i));
      s.y += ALTURA;
    });
  };
```

- [ ] **Step 3: Conferir testes, lint e build**

```bash
npx vitest run
```

Esperado: PASS, incluindo os 10 de `pdfTema.test.js` e as suítes já existentes do projeto.

```bash
npx oxlint src/lib/pdfTema.js && npm run build
```

Esperado: sem avisos novos; build conclui.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdfTema.js
git commit -m "feat: primitivas de conteudo do tema — secao, par, nota e tabela com bordas"
```

---

### Task 4: A ficha

**Files:**
- Modify: `src/lib/pdfTema.js` (acrescentar dentro de `novoDocumento`, depois de `s.tabela`)

**Interfaces:**
- Consumes: tudo das tasks 1–3.
- Produces, no estado `s`:
  ```
  ficha({
    titulo: string,
    subtitulo?: string,
    colunas: [ [string, string][], [string, string][] ],  // esquerda, direita
    trechos?: { cols: { w, label, align? }[], linhas: string[][] } | null,
    destaque?: { texto: string, cor: [number, number, number] } | null,
  }): void
  ```

- [ ] **Step 1: Acrescentar `ficha`**

```js
  // Caixa fechada de um item: barra de título, dois blocos de pares lado a
  // lado, uma minitabela opcional e uma faixa de destaque no rodapé.
  //
  // A altura é calculada antes de qualquer traço para que a ficha inteira
  // caiba na página: uma ficha partida ao meio, com o resultado numa folha e
  // a entrada em outra, é pior que uma folha com sobra.
  s.ficha = ({ titulo, subtitulo = "", colunas, trechos = null, destaque = null }) => {
    const [esq, dir] = colunas;
    const BARRA = 7;
    const PAD = 3;
    const LINHA = 4.6;
    const ALTURA_TRECHO = 4.4;

    const linhasPares = Math.max(esq.length, dir.length);
    const alturaTrechos = trechos && trechos.linhas.length
      ? (trechos.linhas.length + 1) * ALTURA_TRECHO + 3
      : 0;
    const alturaDestaque = destaque ? 8 : 0;
    const altura = BARRA + PAD + linhasPares * LINHA + alturaTrechos + alturaDestaque + PAD;

    s.ensureSpace(altura + 4);
    const topo = s.y;
    const larguraCol = (s.contentW - PAD * 3) / 2;

    doc.setFillColor(...TEMA.copperClaro);
    doc.rect(MARGEM, topo, s.contentW, BARRA, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEMA.tinta);
    doc.text(titulo, MARGEM + PAD, topo + 5);
    if (subtitulo) {
      const usado = doc.getTextWidth(titulo) + PAD * 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        ajustarLargura(subtitulo, s.contentW - usado - PAD * 2, (t) => doc.getTextWidth(t)),
        MARGEM + usado + PAD,
        topo + 5
      );
    }

    const bloco = (pares, x) => {
      let yy = topo + BARRA + PAD + 3;
      pares.forEach(([rotulo, valor]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...TEMA.suave);
        doc.text(rotulo, x, yy);
        const recuo = larguraCol * 0.45;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEMA.tinta);
        doc.text(
          ajustarLargura(String(valor), larguraCol - recuo, (t) => doc.getTextWidth(t)),
          x + recuo,
          yy
        );
        yy += LINHA;
      });
    };

    bloco(esq, MARGEM + PAD);
    bloco(dir, MARGEM + PAD * 2 + larguraCol);

    let yy = topo + BARRA + PAD + linhasPares * LINHA + 3;

    if (alturaTrechos) {
      const { xs } = distribuirColunas(trechos.cols.map((c) => c.w), MARGEM + PAD, s.contentW);
      const escrever = (valor, i, y) => {
        const t = ajustarLargura(String(valor), trechos.cols[i].w - 2, (x) => doc.getTextWidth(x));
        if (trechos.cols[i].align === "right") doc.text(t, xs[i] + trechos.cols[i].w - 1, y, { align: "right" });
        else doc.text(t, xs[i], y);
      };
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...TEMA.suave);
      trechos.cols.forEach((c, i) => escrever(c.label, i, yy));
      yy += 1.5;
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.2);
      doc.line(MARGEM + PAD, yy, MARGEM + s.contentW - PAD, yy);
      yy += 3;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEMA.tinta);
      trechos.linhas.forEach((linha) => {
        linha.forEach((v, i) => escrever(v, i, yy));
        yy += ALTURA_TRECHO;
      });
      yy += 1;
    }

    if (destaque) {
      doc.setFillColor(...destaque.cor);
      doc.rect(MARGEM + PAD, yy - 3.5, s.contentW - PAD * 2, 6.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        ajustarLargura(destaque.texto, s.contentW - PAD * 4, (t) => doc.getTextWidth(t)),
        MARGEM + PAD * 2,
        yy + 1
      );
      yy += alturaDestaque;
    }

    // A borda fecha por cima do que já foi desenhado, então usa a altura
    // realmente consumida — não a estimada, que só serviu para reservar
    // espaço e pode sobrar alguns décimos de milímetro.
    const alturaReal = Math.max(altura, yy + PAD - topo);
    doc.setDrawColor(...TEMA.linha);
    doc.setLineWidth(0.3);
    doc.rect(MARGEM, topo, s.contentW, alturaReal, "S");

    s.y = topo + alturaReal + 5;
  };
```

- [ ] **Step 2: Conferir testes, lint e build**

```bash
npx vitest run && npx oxlint src/lib/pdfTema.js && npm run build
```

Esperado: testes PASS, sem avisos novos, build conclui.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdfTema.js
git commit -m "feat: ficha do tema de PDF — duas colunas, minitabela e faixa de destaque"
```

---

### Task 5: Memorial — resumo em paisagem sobre o tema

Nesta task o memorial passa a usar o tema para a parte de resumo. O detalhamento continua com o `blocoCircuito` antigo, para que a task feche com o app funcionando; a Task 6 o substitui pela ficha.

**Files:**
- Modify: `src/lib/memorialPdf.js`

**Interfaces:**
- Consumes: `TEMA`, `novoDocumento` (tasks 1–4).
- Produces: `exportMemorialPDF` e `exportCircuitoPDF` com as mesmas assinaturas; helpers internos `isolacaoLabel(preset)`, `rodapeNorma(preset)`, `agora()`, `nomeArquivo(base)`.

- [ ] **Step 1: Trocar os imports e os helpers de topo**

Em `src/lib/memorialPdf.js`, substituir o bloco de imports e as funções `fmt`, `fitWidth`, `cargaLabel` e `novoDoc` (linhas 1–100) por:

```js
// Memorial de cálculo em PDF para o dimensionamento de cabos: relatório
// detalhado de um circuito (aba Dimensionar Cabo) e memorial do quadro de
// cargas completo — resumo tabular em paisagem e uma ficha por circuito em
// retrato. A apresentação toda vem de pdfTema.js.

import { ESQUEMAS, FORMAS_PARTIDA } from "../data/cabosNBR5410";
import { designacaoCabos } from "./cableSizingPro";
import { CRITERIO_LABEL, CRITERIO_SIGLA, CRITERIO_LEGENDA } from "../components/cabos/CircuitoForm";
import { TEMA, novoDocumento } from "./pdfTema";

const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d).replace(".", ","));

function cargaLabel(c, preset) {
  if (c.modo === "corrente") return `${fmt(c.corrente, 1)} A`;
  const fp = preset?.fp ?? c.fp;
  return `${fmt(c.potencia, 1)} ${c.unidade} — FP ${fmt(fp)} · Rend. ${fmt(c.rendimento)}`;
}

const isolacaoLabel = (preset) => (preset?.condutorTemp === 70 ? "PVC 70°C" : "EPR/XLPE 90°C");

// Cabe numa linha de rodapé, então é mais curto que o parágrafo que saía uma
// vez só na última página do memorial antigo.
function rodapeNorma(preset) {
  const tabs = preset?.condutorTemp === 70
    ? "36/38/40/42/45/46/48/58"
    : "37/39/40/42/45/46/48/58";
  return `NBR 5410 (Tabelas ${tabs}) · isolação ${isolacaoLabel(preset)} · não substitui a coordenação com a proteção (Ib <= In <= Iz) nem a verificação de curto-circuito`;
}

function agora() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}

const nomeArquivo = (base, alternativa) =>
  `memorial-${(base || alternativa).replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || alternativa}.pdf`;
```

- [ ] **Step 2: Adaptar `blocoCircuito` ao estado novo (temporário)**

`blocoCircuito` usava `s.sectionTitle` e `s.keyValue`, que não existem mais. Trocar as duas chamadas por `s.secao` e `s.par`, e as cores literais por `TEMA`, mantendo o resto do corpo como está:

- `s.sectionTitle(...)` → `s.secao(...)`
- `s.keyValue(a, b)` → `s.par(a, b)`
- `s.doc.setTextColor(220, 38, 38)` → `s.doc.setTextColor(...TEMA.erro)`
- `s.doc.setTextColor(30, 41, 59)` → `s.doc.setTextColor(...TEMA.tinta)`
- `s.doc.setTextColor(5, 150, 105)` → `s.doc.setTextColor(...TEMA.ok)`

Isto é andaime: a Task 6 apaga `blocoCircuito` inteiro.

- [ ] **Step 3: Reescrever `exportMemorialPDF`**

Substituir a função inteira (o corpo antigo, da criação do doc até o `doc.save`) por:

```js
// Memorial do quadro de cargas: resumo tabular em paisagem + uma ficha por
// circuito em retrato.
export async function exportMemorialPDF({ projectName, circuitos, resultados, preset }) {
  const s = await novoDocumento({
    orientation: "landscape",
    titulo: "Memorial de cálculo — quadro de cargas",
    subtitulo: [projectName, agora()].filter(Boolean).join(" · "),
  });

  s.par("Projeto", projectName || "—");
  if (preset) {
    s.par(
      "Preset",
      `${preset.material === "aluminio" ? "Alumínio" : "Cobre"} · ${isolacaoLabel(preset)} · seção mín. ${preset.secaoMinima}mm² · multipolar até ${preset.secaoMaxMultipolar}mm² · queda regime ${preset.quedaMaxRegime}%`
    );
  }
  s.par("Circuitos", String(circuitos.length));
  s.y += 3;

  // Somam 259 mm; a largura útil em paisagem é 273 mm (297 - 2×12).
  const cols = [
    { w: 9, label: "Nº" },
    { w: 20, label: "TAG" },
    { w: 58, label: "Descrição" },
    { w: 16, label: "Tensão" },
    { w: 44, label: "Carga" },
    { w: 16, label: "Ib (A)", align: "right" },
    { w: 50, label: "Cabos" },
    { w: 14, label: "%R", align: "right" },
    { w: 14, label: "%P", align: "right" },
    { w: 18, label: "Critério" },
  ];

  s.tabela({
    cols,
    linhas: circuitos.map((c, i) => {
      const r = resultados[i];
      return [
        String(i + 1).padStart(2, "0"),
        c.tag,
        c.descricao || "—",
        `${c.tensao}V`,
        cargaLabel(c, preset),
        r.error ? "—" : fmt(r.corrente, 1),
        r.error ? "erro" : designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r }),
        r.error ? "—" : fmt(r.quedaRegime),
        r.error ? "—" : fmt(r.quedaPartida),
        r.error ? "—" : CRITERIO_SIGLA[r.criterio],
      ];
    }),
  });

  s.y += 3;
  s.nota("%R: queda de tensão em regime (limite usual 4%). %P: queda de tensão na partida do motor, quando aplicável (limite usual 10%).");
  s.nota(`${CRITERIO_LEGENDA}.`);

  s.novaPagina({ orientation: "portrait" });
  s.secao("Detalhamento por circuito");
  circuitos.forEach((c, i) => blocoCircuito(s, c, resultados[i], preset));

  s.finalizar({
    rodape: rodapeNorma(preset),
    arquivo: nomeArquivo(projectName, "quadro-de-cargas"),
  });
}
```

- [ ] **Step 4: Reescrever `exportCircuitoPDF`**

```js
// Relatório de um circuito só (aba Dimensionar Cabo).
export async function exportCircuitoPDF({ circuito, result, preset }) {
  const s = await novoDocumento({
    orientation: "portrait",
    titulo: "Memorial de dimensionamento de cabo",
    subtitulo: agora(),
  });
  blocoCircuito(s, circuito, result, preset);
  s.finalizar({
    rodape: rodapeNorma(preset),
    arquivo: nomeArquivo(circuito.tag, "circuito"),
  });
}
```

- [ ] **Step 5: Conferir testes, lint e build**

```bash
npx vitest run && npx oxlint src/lib/memorialPdf.js && npm run build
```

Esperado: testes PASS, sem avisos novos, build conclui.

- [ ] **Step 6: Commit**

```bash
git add src/lib/memorialPdf.js
git commit -m "feat: memorial usa o tema — resumo em paisagem com tabela e numeracao"
```

---

### Task 6: Memorial — a ficha substitui o `blocoCircuito`

**Files:**
- Modify: `src/lib/memorialPdf.js`

**Interfaces:**
- Consumes: `s.ficha` (Task 4); os helpers da Task 5.
- Produces: `fichaCircuito(s, c, r, preset): void`, usada pelas duas funções exportadas. `blocoCircuito` deixa de existir.

- [ ] **Step 1: Substituir `blocoCircuito` por `fichaCircuito`**

Apagar a função `blocoCircuito` inteira e pôr no lugar:

```js
// Colunas da minitabela de trechos: somam 132 mm, e a largura útil em retrato
// é 186 mm (210 - 2×12), com 6 mm de recuo dentro da ficha.
const COLS_TRECHO = [
  { w: 10, label: "Nº" },
  { w: 34, label: "Conduto" },
  { w: 16, label: "Método" },
  { w: 18, label: "Dist.", align: "right" },
  { w: 16, label: "FCT", align: "right" },
  { w: 16, label: "FCA", align: "right" },
  { w: 22, label: "I' (A)", align: "right" },
];

// Uma ficha de circuito. `preset` fornece material e temperatura (globais do
// quadro); o tipo de cabo vem do resultado, decidido pela seção máxima
// multipolar.
function fichaCircuito(s, c, r, preset) {
  const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);
  const partida = FORMAS_PARTIDA.find((f) => f.id === c.formaPartidaId);
  const material = preset?.material === "aluminio" ? "Alumínio" : "Cobre";

  const entrada = [
    ["Carga", cargaLabel(c, preset)],
    ["Condutores", esquema?.label ?? "—"],
    ["Tensão", `${c.tensao} V`],
  ];
  if (partida && partida.fator > 1) {
    entrada.push(["Partida", `${partida.label} (Ip ~ ${partida.fator}×In)`]);
  }
  entrada.push([
    "Condutor",
    `${material} ${isolacaoLabel(preset)} ${r.tipoCabo ?? ""} — ${c.porFase}× por fase`
      .replace(/\s+/g, " ")
      .trim(),
  ]);

  // No caminho de erro, cableSizingPro devolve `detalhesTrechos` cru — sem o
  // `condutoLabel`, que só é montado no retorno de sucesso. Por isso a ficha
  // com erro não desenha a minitabela: não há o que desenhar.
  if (r.error) {
    s.ficha({
      titulo: c.tag,
      subtitulo: c.descricao || "",
      colunas: [entrada, []],
      destaque: { texto: r.error, cor: TEMA.erro },
    });
    return;
  }

  const resultado = [
    ["Ib", `${fmt(r.corrente, 1)} A${r.porFase > 1 ? ` (${fmt(r.correntePorCabo, 1)} A/cabo)` : ""}`],
  ];
  if (r.correntePartida != null) resultado.push(["Ip", `${fmt(r.correntePartida, 1)} A`]);
  resultado.push(
    ["Capacidade corrigida", `${fmt(r.capacidadeCorrigida, 1)} A`],
    ["Seção por capacidade", `${r.secaoCapacidade} mm²`],
    ["Por queda em regime", r.secaoQuedaRegime ? `${r.secaoQuedaRegime} mm²` : "não verificada"],
    ["Por queda na partida", r.secaoQuedaPartida ? `${r.secaoQuedaPartida} mm²` : "não verificada"],
    ["Critério dominante", CRITERIO_LABEL[r.criterio]]
  );
  if (r.quedaRegime != null) {
    resultado.push([`Queda regime (${fmt(r.comprimentoTotal, 0)}m)`, `${fmt(r.quedaRegime)}%`]);
  }
  if (r.quedaPartida != null) {
    resultado.push([`Queda partida (lim. ${fmt(c.quedaMaxPartida ?? 10, 1)}%)`, `${fmt(r.quedaPartida)}%`]);
  }

  s.ficha({
    titulo: c.tag,
    subtitulo: c.descricao || "",
    colunas: [entrada, resultado],
    trechos: {
      cols: COLS_TRECHO,
      linhas: r.detalhesTrechos.map((t, i) => [
        String(i + 1).padStart(2, "0"),
        t.condutoLabel,
        t.metodo,
        `${fmt(t.distancia, 0)} m`,
        fmt(t.fct),
        fmt(t.fca),
        fmt(t.iCorrigida, 1),
      ]),
    },
    destaque: {
      texto: `CABOS: ${designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}`,
      cor: TEMA.ok,
    },
  });
}
```

- [ ] **Step 2: Trocar as duas chamadas**

Em `exportMemorialPDF`, trocar

```js
  circuitos.forEach((c, i) => blocoCircuito(s, c, resultados[i], preset));
```

por

```js
  circuitos.forEach((c, i) => fichaCircuito(s, c, resultados[i], preset));
```

E em `exportCircuitoPDF`, trocar `blocoCircuito(s, circuito, result, preset);` por `fichaCircuito(s, circuito, result, preset);`.

- [ ] **Step 3: Conferir que nada ficou órfão**

```bash
grep -n "blocoCircuito\|sectionTitle\|keyValue\|fitWidth\|novoDoc\b" src/lib/memorialPdf.js
```

Esperado: nenhuma saída. Qualquer ocorrência é resto do código antigo.

- [ ] **Step 4: Conferir testes, lint e build**

```bash
npx vitest run && npx oxlint src/lib/memorialPdf.js && npm run build
```

Esperado: testes PASS, sem avisos novos, build conclui.

- [ ] **Step 5: Commit**

```bash
git add src/lib/memorialPdf.js
git commit -m "feat: detalhamento do memorial em fichas retrato, com minitabela de trechos"
```

---

### Task 7: Verificação no navegador e changelog

**Files:**
- Modify: `src/data/changelog.js`

**Interfaces:**
- Consumes: tudo.
- Produces: entrada `1.25.0` no changelog. `APP_VERSION` passa a `1.25.0` automaticamente (é derivado do último item do array).

- [ ] **Step 1: Subir o app**

Usar a ferramenta de preview do harness (`preview_start` com `.claude/launch.json`), **não** `npm run dev` via terminal. Se `.claude/launch.json` não existir, criar com:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "eletrocalha-app", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 2: Montar um quadro de três circuitos**

Na aba **Cabos Elétricos**, deixar o quadro com exatamente estes três casos — cada um exercita um caminho diferente da ficha:

1. `AL-01` — o circuito padrão que já vem na tela (trifásico 380 V, 40 A), com **dois trechos** (usar "+ trecho") para conferir a minitabela com mais de uma linha.
2. `MOT-01` — descrição "Bomba de recalque 01", forma de partida "Direta com carga — Ip ~ 6×In". Exercita as linhas de Ip e de queda na partida, que só aparecem quando há motor.
3. `ERR-01` — corrente Ib de `5000` A com 1 condutor por fase. Força o erro "Nenhuma seção até 300mm² atende", que exercita a faixa vermelha e a ficha sem minitabela.

- [ ] **Step 3: Gerar e conferir o memorial completo**

Clicar em **Memorial PDF**. Abrir o PDF baixado e conferir item a item:

- página 1 em paisagem, faixa copper no topo com o emblema à esquerda e "projeto · data" à direita em copper claro;
- as três linhas de identificação (Projeto, Preset, Circuitos);
- tabela com cabeçalho copper, texto branco, bordas de célula visíveis e zebra na 2ª linha;
- nenhuma coluna vazando texto por cima da vizinha;
- a seção "Detalhamento por circuito" começa numa página **retrato**;
- `AL-01` e `MOT-01` com duas colunas preenchidas, minitabela de trechos e faixa verde "CABOS: …";
- `ERR-01` com faixa vermelha, coluna direita vazia e **sem** minitabela;
- nenhuma ficha partida entre duas páginas;
- rodapé em **todas** as páginas, com a nota de norma à esquerda e "página i / N" à direita — inclusive nas páginas paisagem, onde a largura é outra.

Se a nota do rodapé sair truncada cedo demais ou o número de página fora da margem numa das orientações, o defeito está no cálculo de `paginas[i - 1]` em `finalizar` (Task 2) — corrigir lá, não maquiar no memorial.

- [ ] **Step 4: Conferir o PDF de circuito único**

Selecionar `MOT-01` e clicar em **PDF do circuito**. Esperado: uma página retrato, mesma faixa e mesmo rodapé, uma ficha só, arquivo `memorial-MOT-01.pdf`.

- [ ] **Step 5: Conferir o console**

Ler as mensagens de console do preview. Esperado: nenhum erro. Se aparecer "Emblema não pôde ser preparado para o PDF", o cabeçalho está caindo no modo só-texto — investigar antes de seguir, porque o PDF entregue sairia sem a marca.

- [ ] **Step 6: Acrescentar a entrada no changelog**

Em `src/data/changelog.js`, acrescentar como **último** item do array `CHANGELOG`, logo antes do `];`:

```js
  {
    versao: "1.25.0",
    data: "2026-08-08",
    titulo: "Memorial de cabos com apresentação nova",
    tipo: "melhoria",
    itens: [
      "O Memorial PDF do quadro de cargas ganha cabeçalho com o emblema, tabela com bordas e numeração de página em todas as folhas.",
      "O detalhamento de cada circuito virou uma ficha fechada em página retrato — entrada e resultado lado a lado, trechos numa minitabela e os cabos numa faixa destacada. Antes era texto corrido numa página deitada quase vazia.",
      "O PDF de um circuito só usa a mesma ficha, então os dois documentos ficam visualmente iguais.",
      "As cores, o cabeçalho e a tabela saíram para um módulo de tema compartilhado, primeiro passo para os outros PDFs do app usarem a mesma cara.",
    ],
  },
```

- [ ] **Step 7: Checagens finais**

```bash
npx vitest run && npx oxlint && npm run build
```

Esperado: todos os testes passam (incluindo `changelog.test.js`, que trava ordem cronológica e formato de versão); nenhum aviso novo de lint; build conclui.

- [ ] **Step 8: Commit**

```bash
git add src/data/changelog.js
git commit -m "Changelog 1.25.0 — memorial de cabos com apresentacao nova"
```

---

## Self-review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| `TEMA` com as oito cores nomeadas | 1 |
| `ajustarLargura` e `distribuirColunas` com teste | 1 |
| `novoDocumento`, `ensureSpace`, `novaPagina` | 2 |
| Recalcular `pageW`/`pageH`/`contentW` ao trocar de orientação | 2 |
| Numeração em segunda passada (`finalizar`) | 2 |
| Emblema com cache e queda para só texto | 2 |
| `secao`, `par`, `nota` | 3 |
| `tabela` com bordas, zebra e cabeçalho repetido | 3 |
| `ficha` medida antes de desenhar, nunca partida | 4 |
| Faixa copper com emblema, título e projeto/data | 2 |
| Caixa de identificação (Projeto, Preset, Circuitos) | 5 |
| Tabela resumo com as dez colunas de hoje | 5 |
| Legendas %R/%P e critérios | 5 |
| Seção "Detalhamento por circuito" em retrato | 5 |
| Ficha com duas colunas, minitabela e faixa de destaque | 6 |
| Ficha de erro sem minitabela | 6 |
| `exportCircuitoPDF` usando a mesma ficha | 5 e 6 |
| Rodapé com norma e "página i / N" em toda página | 2 |
| Verificação visual no navegador | 7 |
| Restrição WinAnsi | Global Constraints |
| Nenhum outro gerador tocado | Global Constraints |

Sem lacunas.

**Consistência de tipos:** `s.ficha` recebe `colunas` como par de arrays de pares `[rotulo, valor]` na Task 4 e é chamada assim na Task 6. `trechos.cols` usa o mesmo formato `{ w, label, align }` de `s.tabela`. `destaque.cor` recebe as triplas de `TEMA`. `ajustarLargura` é sempre chamada com o medidor `(t) => doc.getTextWidth(t)`. `distribuirColunas` devolve `{ xs, total, sobra }` e é desestruturada só nos campos que cada chamador usa.

**Placeholders:** nenhum. Todo passo que muda código traz o código.
