// Motor de empacotamento por gravidade. É ele que decide se os cabos cabem
// de verdade — a conta de área % é necessária mas não suficiente, e é a
// geometria daqui que o modo reverso usa para aprovar uma infraestrutura.
//
// Os testes centrais não são de coordenada fixa (o algoritmo pode melhorar a
// acomodação sem estar errado), e sim de INVARIANTE FÍSICO: cabo não atravessa
// cabo, nada vaza para fora da calha, e nada flutua no ar.

import { describe, it, expect } from "vitest";
import {
  layoutCables,
  layoutCablesCircular,
  layoutCablesSplit,
  splitWidthByArea,
  rectFits,
  circularFits,
  countLayers,
  SEPTUM_THICKNESS,
  FIT_EPS,
} from "./packing";

const cabo = (d, over = {}) => ({ d, type: "unipolar", vias: 1, ...over });

// O empacotamento trabalha com uma folga numérica de 0,01mm (tangência exata
// não conta como colisão, senão o erro de ponto flutuante "ergue" o cabo
// rente ao vizinho). Uma sobreposição real de projeto seria de milímetros,
// então 0,05mm separa com folga o ruído numérico do defeito.
const TOL = FIT_EPS;

function maiorSobreposicao(items) {
  let pior = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const pen = a.r + b.r - Math.hypot(a.cx - b.cx, a.cy - b.cy);
      if (pen > pior) pior = pen;
    }
  }
  return pior;
}

// Unidade de manuseio: o feixe de trifólio é uma peça só, não 3 cabos soltos.
const unidadeDe = (it, i) => it.trifolioGroup ?? `single-${i}`;

// Todo cabo repousa sobre alguma coisa. Verificado por unidade: num feixe
// rígido basta um dos condutores estar apoiado — os outros são carregados
// por ele.
function unidadesFlutuando(items, tocaOFundo) {
  const porUnidade = new Map();
  items.forEach((it, i) => {
    const u = unidadeDe(it, i);
    if (!porUnidade.has(u)) porUnidade.set(u, []);
    porUnidade.get(u).push(i);
  });

  const flutuando = [];
  for (const [u, indices] of porUnidade) {
    const apoiada = indices.some((i) => {
      if (tocaOFundo(items[i])) return true;
      return items.some((outro, j) => {
        if (unidadeDe(outro, j) === u) return false; // o próprio feixe não se apoia
        const d = Math.hypot(items[i].cx - outro.cx, items[i].cy - outro.cy);
        return Math.abs(d - (items[i].r + outro.r)) < TOL;
      });
    });
    if (!apoiada) flutuando.push(u);
  }
  return flutuando;
}

const noFundoRet = (h) => (it) => it.cy + it.r >= h - TOL;
const naParedeCirc = (R) => (it) => Math.hypot(it.cx, it.cy) + it.r >= R - TOL;

// Gerador determinístico: cenários variados, mas o mesmo conjunto em toda
// execução — um teste de empacotamento que falha só às vezes não serve.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Diâmetros externos reais do catálogo Corfio (2,5 / 25 / 70 / 4×16 / 240mm²).
const DIAMETROS = [5.35, 10.4, 15.5, 18.32, 26.4];
const areaDe = (cabos) =>
  cabos.reduce((a, c) => a + Math.PI * (c.d / 2) ** 2 * (c.trifolio ? 3 : 1), 0);

describe("layoutCables — invariantes físicos na calha", () => {
  it("um cabo sozinho repousa no fundo, encostado na parede esquerda", () => {
    const [it] = layoutCables([cabo(10)], 100, 50);
    expect(it.cx).toBeCloseTo(5, 9); // r, colado na esquerda
    expect(it.cy).toBeCloseTo(45, 9); // trayHeight - r
  });

  it("cabos iguais formam uma fileira no fundo, sem empilhar", () => {
    const items = layoutCables([cabo(10), cabo(10), cabo(10)], 100, 50);
    for (const it of items) expect(it.cy).toBeCloseTo(45, 9);
    expect(maiorSobreposicao(items)).toBeLessThan(TOL);
  });

  it("quando a fileira lota, o próximo cabo sobe — e se apoia, não flutua", () => {
    // 11 cabos de 10mm numa calha de 100mm: 10 preenchem o fundo, o 11º sobe.
    const items = layoutCables(Array.from({ length: 11 }, () => cabo(10)), 100, 50);
    const emCima = items.filter((it) => it.cy < 45 - TOL);
    expect(emCima.length).toBeGreaterThan(0);
    expect(unidadesFlutuando(items, noFundoRet(50))).toEqual([]);
  });

  it("o cabo procura o vão mais fundo, não a primeira posição livre", () => {
    // Dois grandes deixam um vale no meio; o pequeno tem que descer nele, e
    // não ficar pousado no topo de um deles.
    const items = layoutCables([cabo(30), cabo(30), cabo(10)], 100, 60);
    const pequeno = items[2];
    const topoDosGrandes = Math.min(items[0].cy, items[1].cy) - 15;
    expect(pequeno.cy).toBeGreaterThan(topoDosGrandes);
  });

  it("nenhum cabo é depositado abaixo do fundo da calha", () => {
    const items = layoutCables(Array.from({ length: 20 }, () => cabo(10)), 100, 50);
    for (const it of items) expect(it.cy + it.r).toBeLessThanOrEqual(50 + TOL);
  });

  it("o empacotamento é determinístico", () => {
    const cabos = [cabo(15.5), cabo(10.4), cabo(26.4), cabo(5.35), cabo(18.32)];
    expect(layoutCables(cabos, 100, 50)).toEqual(layoutCables(cabos, 100, 50));
  });

  it("um cabo mais largo que a calha é depositado vazando, para o rectFits reprovar", () => {
    // Não é para o motor "dar um jeito": tem que ficar evidente que não cabe.
    const items = layoutCables([cabo(200)], 100, 50);
    expect(rectFits(items, 100)).toBe(false);
  });

  it("trecho vazio não produz item nenhum", () => {
    expect(layoutCables([], 100, 50)).toEqual([]);
  });
});

describe("layoutCables — trifólio", () => {
  it("vira 3 condutores marcados com o mesmo grupo", () => {
    const items = layoutCables([cabo(15.5, { trifolio: true })], 100, 50);
    expect(items).toHaveLength(3);
    const grupos = new Set(items.map((i) => i.trifolioGroup));
    expect(grupos.size).toBe(1);
    expect([...grupos][0]).toBeTruthy();
  });

  it("os 3 formam um triângulo equilátero de lado igual ao diâmetro", () => {
    // É o que significa "trifólio": os três fios amarrados, cada um encostado
    // nos outros dois.
    const d = 15.5;
    const items = layoutCables([cabo(d, { trifolio: true })], 100, 50);
    const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
    expect(dist(items[0], items[1])).toBeCloseTo(d, 9);
    expect(dist(items[0], items[2])).toBeCloseTo(d, 9);
    expect(dist(items[1], items[2])).toBeCloseTo(d, 9);
  });

  it("os dois de baixo repousam no fundo e o terceiro fica por cima", () => {
    const items = layoutCables([cabo(15.5, { trifolio: true })], 100, 50);
    const base = items.filter((i) => i.cy > 50 - 15.5);
    expect(base).toHaveLength(2);
    const topo = items.find((i) => !base.includes(i));
    expect(topo.cy).toBeLessThan(base[0].cy);
  });

  it("o feixe herda o material do cabo", () => {
    const items = layoutCables([cabo(15.5, { trifolio: true, material: "aluminio" })], 100, 50);
    for (const it of items) expect(it.material).toBe("aluminio");
  });

  it("feixes lado a lado não se atravessam", () => {
    const cabos = Array.from({ length: 3 }, () => cabo(15.5, { trifolio: true }));
    const items = layoutCables(cabos, 150, 60);
    expect(maiorSobreposicao(items)).toBeLessThan(TOL);
  });
});

describe("layoutCablesCircular — invariantes físicos no eletroduto", () => {
  it("um cabo sozinho repousa no fundo do tubo", () => {
    const R = 25;
    const [it] = layoutCablesCircular([cabo(10)], R);
    expect(it.cx).toBeCloseTo(0, 9);
    expect(it.cy).toBeCloseTo(R - 5, 9); // encostado na parede, no ponto mais fundo
  });

  it("nenhum cabo atravessa a parede do tubo", () => {
    const R = 25;
    const items = layoutCablesCircular(Array.from({ length: 8 }, () => cabo(10)), R);
    for (const it of items) {
      expect(Math.hypot(it.cx, it.cy) + it.r).toBeLessThanOrEqual(R + TOL);
    }
    expect(circularFits(items, R)).toBe(true);
  });

  it("cabos não se atravessam dentro do tubo", () => {
    const items = layoutCablesCircular(Array.from({ length: 10 }, () => cabo(8)), 25);
    expect(maiorSobreposicao(items)).toBeLessThan(TOL);
  });

  it("nada flutua dentro do tubo", () => {
    const R = 25;
    const items = layoutCablesCircular(Array.from({ length: 7 }, () => cabo(9)), R);
    expect(unidadesFlutuando(items, naParedeCirc(R))).toEqual([]);
  });

  it("trifólio no tubo também vira triângulo equilátero", () => {
    const d = 10;
    const items = layoutCablesCircular([cabo(d, { trifolio: true })], 25);
    const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
    expect(dist(items[0], items[1])).toBeCloseTo(d, 9);
    expect(dist(items[0], items[2])).toBeCloseTo(d, 9);
    expect(dist(items[1], items[2])).toBeCloseTo(d, 9);
  });

  it("é determinístico", () => {
    const cabos = [cabo(10.4), cabo(5.35), cabo(15.5)];
    expect(layoutCablesCircular(cabos, 25)).toEqual(layoutCablesCircular(cabos, 25));
  });
});

// A varredura abaixo é o teste mais importante do arquivo: percorre centenas
// de trechos plausíveis (dentro do limite de 40% da NBR 5410, que é onde o
// app opera) e confere os invariantes em todos.
//
// Os invariantes de sobreposição valem para os layouts APROVADOS pelo
// rectFits/circularFits. Quando o conjunto não cabe — um feixe mais largo que
// a própria calha, por exemplo —, o motor deposita vazando de propósito, para
// que a reprovação seja evidente em vez de silenciosa; ali a sobreposição é o
// sinal de falha, não um defeito (ver os testes de caso degenerado abaixo).
describe("varredura de trechos realistas", () => {
  const retangulares = [];
  const circulares = [];

  for (let semente = 1; semente <= 25; semente++) {
    const sortear = rng(semente * 7919);
    for (let k = 0; k < 20; k++) {
      const cabos = () =>
        Array.from({ length: 1 + Math.floor(sortear() * 14) }, () => {
          const d = DIAMETROS[Math.floor(sortear() * DIAMETROS.length)];
          return cabo(d, sortear() < 0.3 ? { trifolio: true } : {});
        });

      const w = [50, 75, 100, 150, 200, 300, 400][Math.floor(sortear() * 7)];
      const h = [25, 50, 75, 100][Math.floor(sortear() * 4)];
      const ret = cabos();
      if (areaDe(ret) / (w * h) <= 0.4) retangulares.push({ w, h, cabos: ret });

      const R = [12.5, 20, 25, 40, 50][Math.floor(sortear() * 5)];
      const circ = cabos();
      if (areaDe(circ) / (Math.PI * R * R) <= 0.4) circulares.push({ R, cabos: circ });
    }
  }

  it("gerou cenários suficientes, com trifólio entre eles", () => {
    expect(retangulares.length).toBeGreaterThan(150);
    expect(circulares.length).toBeGreaterThan(100);
    expect(retangulares.filter((t) => t.cabos.some((c) => c.trifolio)).length).toBeGreaterThan(80);
    expect(circulares.filter((t) => t.cabos.some((c) => c.trifolio)).length).toBeGreaterThan(50);
  });

  it("calha: onde o rectFits aprova, nenhum cabo atravessa outro", () => {
    const falhas = [];
    for (const t of retangulares) {
      const items = layoutCables(t.cabos, t.w, t.h);
      if (!rectFits(items, t.w)) continue;
      const pen = maiorSobreposicao(items);
      if (pen >= TOL) falhas.push(`${t.w}×${t.h}, ${t.cabos.length} cabos: ${pen.toFixed(3)}mm`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: onde o rectFits aprova, nenhum cabo flutua no ar", () => {
    const falhas = [];
    for (const t of retangulares) {
      const items = layoutCables(t.cabos, t.w, t.h);
      if (!rectFits(items, t.w)) continue;
      const f = unidadesFlutuando(items, noFundoRet(t.h));
      if (f.length) falhas.push(`${t.w}×${t.h}, ${t.cabos.length} cabos: ${f.join(", ")}`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: nenhum cabo é depositado abaixo do fundo, caiba ou não", () => {
    // Vale sempre: a deposição por gravidade nunca ultrapassa o piso, e é
    // por isso que o rectFits não precisa checar a altura.
    for (const t of retangulares) {
      for (const it of layoutCables(t.cabos, t.w, t.h)) {
        expect(it.cy + it.r).toBeLessThanOrEqual(t.h + TOL);
      }
    }
  });

  it("eletroduto: onde o circularFits aprova, nenhum cabo atravessa outro", () => {
    const falhas = [];
    for (const t of circulares) {
      const items = layoutCablesCircular(t.cabos, t.R);
      if (!circularFits(items, t.R)) continue;
      const pen = maiorSobreposicao(items);
      if (pen >= TOL) falhas.push(`R=${t.R}, ${t.cabos.length} cabos: ${pen.toFixed(3)}mm`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: onde o circularFits aprova, nenhum cabo flutua no ar", () => {
    const falhas = [];
    for (const t of circulares) {
      const items = layoutCablesCircular(t.cabos, t.R);
      if (!circularFits(items, t.R)) continue;
      const f = unidadesFlutuando(items, naParedeCirc(t.R));
      if (f.length) falhas.push(`R=${t.R}, ${t.cabos.length} cabos: ${f.join(", ")}`);
    }
    expect(falhas).toEqual([]);
  });
});

describe("casos degenerados — não cabe, e tem que ficar evidente", () => {
  it("feixe mais largo que a própria calha é reprovado pelo rectFits", () => {
    // 3 condutores de 26,4mm ocupam 52,8mm de largura; a calha tem 50mm.
    const items = layoutCables([cabo(26.4, { trifolio: true })], 50, 100);
    expect(items).toHaveLength(3);
    expect(rectFits(items, 50)).toBe(false);
  });

  it("feixe mais largo que o eletroduto é reprovado pelo circularFits", () => {
    const items = layoutCablesCircular([cabo(26.4, { trifolio: true })], 15);
    expect(circularFits(items, 15)).toBe(false);
  });

  it("mesmo no caso degenerado devolve os 3 condutores, sem quebrar", () => {
    // O desenho ainda precisa de algo para mostrar, e a busca precisa de uma
    // resposta para reprovar — nunca null nem exceção.
    for (const largura of [1, 10, 50]) {
      expect(layoutCables([cabo(26.4, { trifolio: true })], largura, 100)).toHaveLength(3);
    }
    for (const raio of [1, 5, 15]) {
      expect(layoutCablesCircular([cabo(26.4, { trifolio: true })], raio)).toHaveLength(3);
    }
  });
});

describe("rectFits e circularFits", () => {
  it("aprovam o que está inteiramente dentro do contorno", () => {
    expect(rectFits(layoutCables([cabo(10), cabo(10)], 100, 50), 100)).toBe(true);
    expect(circularFits(layoutCablesCircular([cabo(10)], 25), 25)).toBe(true);
  });

  it("reprovam a pilha que passa da borda de cima", () => {
    // rectFits não recebe a altura: o que ele checa é o cabo ter subido acima
    // de y=0, que é justamente transbordar a calha.
    expect(rectFits([{ cx: 50, cy: -1, r: 5 }], 100)).toBe(false);
  });

  it("reprovam o que vaza pelos lados", () => {
    expect(rectFits([{ cx: 2, cy: 45, r: 5 }], 100)).toBe(false);
    expect(rectFits([{ cx: 98, cy: 45, r: 5 }], 100)).toBe(false);
  });

  it("reprovam o cabo que atravessa a parede do tubo", () => {
    expect(circularFits([{ cx: 20, cy: 0, r: 10 }], 25)).toBe(false);
  });

  it("toleram o encoste exato na borda, que é uso normal e não falha", () => {
    expect(rectFits([{ cx: 5, cy: 45, r: 5 }], 100)).toBe(true);
    expect(circularFits([{ cx: 0, cy: 15, r: 10 }], 25)).toBe(true);
  });

  it("trecho vazio cabe em qualquer lugar", () => {
    expect(rectFits([], 100)).toBe(true);
    expect(circularFits([], 25)).toBe(true);
  });
});

describe("countLayers", () => {
  const fundo = noFundoRet(50);

  it("trecho vazio não tem camada", () => {
    expect(countLayers([], fundo)).toBe(0);
  });

  it("cabos lado a lado no fundo são uma camada só", () => {
    const items = layoutCables([cabo(10), cabo(10), cabo(10)], 100, 50);
    expect(countLayers(items, fundo)).toBe(1);
  });

  it("um cabo por cima de outro são duas camadas", () => {
    const items = layoutCables(Array.from({ length: 11 }, () => cabo(10)), 100, 50);
    expect(countLayers(items, fundo)).toBe(2);
  });

  it("o feixe de trifólio conta como UMA camada, não duas", () => {
    // Fisicamente são 2 condutores embaixo e 1 em cima, mas o feixe é
    // instalado como uma peça só — quem limita camadas está limitando
    // empilhamento de peças, não de fios.
    const items = layoutCables([cabo(15.5, { trifolio: true })], 100, 50);
    expect(items).toHaveLength(3);
    expect(countLayers(items, fundo)).toBe(1);
  });

  it("um cabo pousado em cima do feixe acrescenta uma camada", () => {
    const items = layoutCables([cabo(15.5, { trifolio: true })], 100, 50);
    // Encostado exatamente sobre o condutor de cima do feixe: é o contato que
    // caracteriza empilhamento, e é de fora do grupo.
    const topo = items.reduce((a, b) => (b.cy < a.cy ? b : a));
    const empilhado = [...items, { cx: topo.cx, cy: topo.cy - 2 * topo.r, r: topo.r }];
    expect(countLayers(empilhado, fundo)).toBe(2);
  });

  it("o número de camadas cresce com o empilhamento", () => {
    const uma = countLayers(layoutCables([cabo(10), cabo(10)], 100, 50), fundo);
    const muitas = countLayers(layoutCables(Array.from({ length: 30 }, () => cabo(10)), 100, 50), fundo);
    expect(muitas).toBeGreaterThan(uma);
  });

  it("sem isGrounded, ninguém é camada 1 por tocar o fundo — mas não estoura", () => {
    const items = layoutCables([cabo(10), cabo(10)], 100, 50);
    expect(countLayers(items, undefined)).toBeGreaterThanOrEqual(1);
  });
});

describe("splitWidthByArea", () => {
  const forca = [cabo(20)];
  const comando = [cabo(10)];

  it("divide proporcionalmente à área de cada grupo", () => {
    // Área ∝ d²: 20mm contra 10mm é 4 para 1, então força fica com ~80%.
    expect(splitWidthByArea(forca, comando, 100)).toBe(80);
  });

  it("sem cabo nenhum, divide ao meio em vez de dividir por zero", () => {
    expect(splitWidthByArea([], [], 100)).toBe(50);
  });

  it("nunca deixa um compartimento com menos de 15% da largura", () => {
    // Um único cabo de comando ao lado de muita força não pode virar uma
    // fresta onde nada entra.
    const muitaForca = Array.from({ length: 50 }, () => cabo(26.4));
    expect(splitWidthByArea(muitaForca, comando, 100)).toBe(85);
    expect(splitWidthByArea(comando, muitaForca, 100)).toBe(15);
  });
});

describe("layoutCablesSplit", () => {
  const forca = [cabo(15.5), cabo(15.5)];
  const comando = [{ d: 8, type: "comando", vias: 7 }];
  const cabos = [...forca, ...comando];

  it("separa força e comando em dois compartimentos com o septo entre eles", () => {
    const r = layoutCablesSplit(cabos, 200, 50);
    expect(r.septum).toBe(SEPTUM_THICKNESS);
    expect(r.w1 + r.w2).toBe(200 - SEPTUM_THICKNESS);
    expect(r.items).toHaveLength(3);
  });

  it("o comando é deslocado para depois do septo, sem invadir a força", () => {
    const r = layoutCablesSplit(cabos, 200, 50);
    const doComando = r.items.filter((i) => i.type === "comando");
    expect(doComando).toHaveLength(1);
    expect(doComando[0].cx - doComando[0].r).toBeGreaterThanOrEqual(r.w1 + r.septum - TOL);
  });

  it("os cabos dos dois compartimentos nunca se atravessam", () => {
    const r = layoutCablesSplit(cabos, 200, 50);
    expect(maiorSobreposicao(r.items)).toBeLessThan(TOL);
  });

  it("as chaves do comando não colidem com as da força", () => {
    const r = layoutCablesSplit(cabos, 200, 50);
    expect(new Set(r.items.map((i) => i.key)).size).toBe(r.items.length);
  });

  it("aprova quando os dois lados acomodam seus cabos", () => {
    expect(layoutCablesSplit(cabos, 200, 50).fits).toBe(true);
  });

  it("reprova quando a largura não dá para os dois compartimentos", () => {
    expect(layoutCablesSplit(cabos, 20, 50).fits).toBe(false);
  });

  it("com largura menor que o septo, não inventa compartimento negativo", () => {
    const r = layoutCablesSplit(cabos, 1, 50);
    expect(r.fits).toBe(false);
    expect(r.w1).toBeGreaterThanOrEqual(0);
    expect(r.w2).toBeGreaterThanOrEqual(0);
  });

  it("aceita a divisão imposta pela busca do modo reverso", () => {
    const r = layoutCablesSplit(cabos, 200, 50, SEPTUM_THICKNESS, 120);
    expect(r.w1).toBe(120);
    expect(r.w2).toBe(200 - SEPTUM_THICKNESS - 120);
  });
});
