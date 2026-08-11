// Geometria do desenho do trecho.
//
// Dois grupos de teste com propósitos diferentes:
//
// 1. CONTENÇÃO — o canvas contém todos os blocos. É o invariante que teria
//    pego os dois bugs de corte que já apareceram no desenho. Vale para
//    qualquer combinação de entrada, não para casos escolhidos a dedo.
//
// 2. EQUIVALÊNCIA — a extração para este módulo não mudou nenhum número. As
//    fórmulas antigas, que viviam dentro do TrayVisualization, estão
//    transcritas aqui como oráculo. Elas podem (e devem) ser apagadas quando
//    alguém deliberadamente mudar o layout; até lá, provam que a refatoração
//    foi de estrutura, não de comportamento.

import { describe, it, expect } from "vitest";
import {
  PADDING,
  WALL,
  LEGENDA_W,
  LEGENDA_GAP,
  RESUMO_LINHA,
  alturaLegenda,
  alturaResumo,
  truncar,
  cabemEm,
  layoutRetangular,
  layoutCircular,
} from "./trayLayout";

// Combinações que cobrem os quatro quadrantes (com/sem legenda × com/sem
// resumo) em calhas de proporções bem diferentes, incluindo as mais altas que
// largas — que foi onde o resumo apareceu cortado.
const CASOS_RET = [];
for (const [trayWidth, trayHeight] of [[100, 50], [50, 100], [300, 50], [50, 300], [200, 200], [25, 25]]) {
  for (const circuitos of [0, 1, 3, 18, 40]) {
    for (const bitolas of [0, 1, 6, 20]) {
      CASOS_RET.push({ trayWidth, trayHeight, circuitos, bitolas });
    }
  }
}

const CASOS_CIRC = [];
for (const outerR of [13.7, 20, 35.112, 60]) {
  for (const circuitos of [0, 1, 3, 18, 40]) {
    for (const bitolas of [0, 1, 6, 20]) {
      CASOS_CIRC.push({ outerR, circuitos, bitolas });
    }
  }
}

describe("contenção — nada é desenhado fora do canvas", () => {
  it("calha: o resumo cabe inteiro na altura do SVG", () => {
    // O bug real: a altura esquecia o PADDING/2 do topo em que o desenho é
    // transladado, e a última linha do resumo caía fora do viewBox.
    const falhas = [];
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.resumo) continue;
      const fundo = L.desenho.y + L.resumo.y + alturaResumo(c.bitolas);
      if (fundo > L.altura) falhas.push(`${c.trayWidth}×${c.trayHeight} ${c.bitolas} bitolas: ${fundo} > ${L.altura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: a cota de largura cabe na altura do SVG", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      expect(L.desenho.y + L.cota.textoY).toBeLessThanOrEqual(L.altura);
    }
  });

  it("calha: a legenda de circuitos cabe inteira, por mais longa que seja", () => {
    const falhas = [];
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.legenda) continue;
      const fundo = L.legenda.y + alturaLegenda(c.circuitos);
      if (fundo > L.altura) falhas.push(`${c.trayWidth}×${c.trayHeight} ${c.circuitos} circuitos`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: a coluna da legenda cabe na largura do SVG", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.legenda) continue;
      expect(L.legenda.x + LEGENDA_W).toBeLessThanOrEqual(L.largura);
    }
  });

  it("calha: a cota de altura cabe na largura, mesmo sem legenda", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      expect(L.desenho.x + L.cotaAltura.textoX).toBeLessThanOrEqual(L.largura);
    }
  });

  it("eletroduto: o tubo inteiro cabe no canvas, em cima e embaixo", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (L.centro.y - c.outerR < 0) falhas.push(`R=${c.outerR}: topo cortado`);
      if (L.centro.y + c.outerR > L.altura) falhas.push(`R=${c.outerR}: base cortada`);
      if (L.centro.x - c.outerR < 0 || L.centro.x + c.outerR > L.largura) falhas.push(`R=${c.outerR}: lateral`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: o resumo cabe inteiro abaixo do tubo", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.resumo) continue;
      const fundo = L.centro.y + L.resumo.y + alturaResumo(c.bitolas);
      if (fundo > L.altura) falhas.push(`R=${c.outerR} ${c.bitolas} bitolas: ${fundo} > ${L.altura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: a legenda cabe inteira, em altura e em largura", () => {
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.legenda) continue;
      expect(L.legenda.y + alturaLegenda(c.circuitos)).toBeLessThanOrEqual(L.altura);
      expect(L.legenda.x + LEGENDA_W).toBeLessThanOrEqual(L.largura);
    }
  });

  it("o resumo cresce a altura junto: mais bitolas nunca cortam mais", () => {
    // Se a altura parasse de acompanhar o número de linhas, o corte voltaria
    // silenciosamente só nos trechos com muitos cabos.
    for (const trayHeight of [50, 100, 300]) {
      let anterior = 0;
      for (const bitolas of [1, 2, 5, 10, 30]) {
        const L = layoutRetangular({ trayWidth: 100, trayHeight, circuitos: 0, bitolas });
        const fundo = L.desenho.y + L.resumo.y + alturaResumo(bitolas);
        expect(fundo).toBeLessThanOrEqual(L.altura);
        expect(L.altura).toBeGreaterThanOrEqual(anterior);
        anterior = L.altura;
      }
    }
  });
});

// Fórmulas antigas, copiadas do TrayVisualization antes da extração.
const legado = {
  ret: ({ trayWidth, trayHeight, circuitos, bitolas }) => {
    const temLegenda = circuitos > 0;
    const temResumo = bitolas > 0;
    const legendaX = PADDING / 2 + trayWidth + LEGENDA_GAP;
    const width = temLegenda ? legendaX + LEGENDA_W : trayWidth + PADDING * 2;
    const alturaSemResumo = trayHeight + PADDING * 1.5;
    const alturaComResumo = temResumo
      ? Math.max(alturaSemResumo, PADDING / 2 + trayHeight + WALL + 46 + alturaResumo(bitolas))
      : alturaSemResumo;
    const height = temLegenda
      ? Math.max(alturaComResumo, alturaLegenda(circuitos) + PADDING)
      : alturaComResumo;
    return {
      largura: width,
      altura: height,
      larguraCss: temLegenda ? 780 : 520,
      desenhoY: PADDING / 2,
      resumoY: temResumo ? trayHeight + WALL + 46 : null,
      legendaX: temLegenda ? legendaX : null,
      cotaLinhaY: trayHeight + WALL + 14,
      cotaTextoY: trayHeight + WALL + 30,
    };
  },
  circ: ({ outerR, circuitos, bitolas }) => {
    const temLegenda = circuitos > 0;
    const temResumo = bitolas > 0;
    const size = (outerR + PADDING) * 2;
    const c0 = size / 2;
    const legendaX = size + 6;
    const alturaBase = temResumo ? PADDING / 2 + 2 * outerR + 16 + alturaResumo(bitolas) : size;
    const larguraSvg = temLegenda ? legendaX + LEGENDA_W : size;
    const alturaSvg = temLegenda ? Math.max(alturaBase, alturaLegenda(circuitos) + PADDING) : alturaBase;
    const centroY = temResumo ? PADDING / 2 + outerR : alturaSvg / 2;
    return {
      largura: larguraSvg,
      altura: alturaSvg,
      larguraCss: temLegenda ? 760 : 420,
      centroX: c0,
      centroY,
      resumoX: temResumo ? -outerR : null,
      resumoY: temResumo ? outerR + 16 : null,
      legendaX: temLegenda ? legendaX : null,
    };
  },
};

describe("equivalência com o layout anterior à extração", () => {
  it("calha: mesmos números em todas as combinações", () => {
    for (const c of CASOS_RET) {
      const novo = layoutRetangular(c);
      const velho = legado.ret(c);
      expect({
        largura: novo.largura,
        altura: novo.altura,
        larguraCss: novo.larguraCss,
        desenhoY: novo.desenho.y,
        resumoY: novo.resumo?.y ?? null,
        legendaX: novo.legenda?.x ?? null,
        cotaLinhaY: novo.cota.linhaY,
        cotaTextoY: novo.cota.textoY,
      }).toEqual(velho);
    }
  });

  it("eletroduto: mesmos números em todas as combinações", () => {
    for (const c of CASOS_CIRC) {
      const novo = layoutCircular(c);
      const velho = legado.circ(c);
      expect({
        largura: novo.largura,
        altura: novo.altura,
        larguraCss: novo.larguraCss,
        centroX: novo.centro.x,
        centroY: novo.centro.y,
        resumoX: novo.resumo?.x ?? null,
        resumoY: novo.resumo?.y ?? null,
        legendaX: novo.legenda?.x ?? null,
      }).toEqual(velho);
    }
  });

  it("reproduz os quatro desenhos capturados do app antes da extração", () => {
    // Assinaturas lidas do SVG renderizado, para ancorar a equivalência em
    // saída real e não só na fórmula transcrita.
    expect(layoutRetangular({ trayWidth: 100, trayHeight: 50, circuitos: 0, bitolas: 0 }))
      .toMatchObject({ largura: 228, altura: 146, larguraCss: 520, desenho: { x: 32, y: 32 } });

    const simRet = layoutRetangular({ trayWidth: 50, trayHeight: 100, circuitos: 3, bitolas: 6 });
    expect(simRet).toMatchObject({ largura: 382, altura: 280, larguraCss: 780 });
    expect(simRet.resumo.y).toBe(152);
    expect(simRet.legenda).toEqual({ x: 132, y: 32 });

    expect(layoutCircular({ outerR: 13.7, circuitos: 0, bitolas: 0 }))
      .toMatchObject({ largura: 155.4, altura: 155.4, larguraCss: 420, centro: { x: 77.7, y: 77.7 } });

    const simDuct = layoutCircular({ outerR: 35.112, circuitos: 3, bitolas: 6 });
    expect(simDuct).toMatchObject({ largura: 454.224, altura: 214.224, larguraCss: 760 });
    expect(simDuct.centro).toEqual({ x: 99.112, y: 67.112 });
    expect(simDuct.resumo).toMatchObject({ x: -35.112, y: 51.112 });
    expect(simDuct.legenda).toEqual({ x: 204.224, y: 32 });
  });
});

describe("alturas dos blocos de texto", () => {
  it("a legenda cresce uma linha por circuito", () => {
    expect(alturaLegenda(3) - alturaLegenda(2)).toBe(26);
    expect(alturaLegenda(0)).toBe(20); // só o título
  });

  it("o resumo cresce uma linha por bitola, e some quando não há nenhuma", () => {
    expect(alturaResumo(0)).toBe(0);
    expect(alturaResumo(3) - alturaResumo(2)).toBe(RESUMO_LINHA);
  });
});

describe("truncar", () => {
  it("deixa passar o texto que cabe", () => {
    expect(truncar("QDLF-01", 10)).toBe("QDLF-01");
    expect(truncar("QDLF-01", 7)).toBe("QDLF-01");
  });

  it("corta com reticências, respeitando o limite", () => {
    const r = truncar("QDLF-CLASSIFICAÇÃO-C-C", 10);
    expect(r).toBe("QDLF-CLAS…");
    expect(r.length).toBe(10);
  });

  it("o resultado nunca passa do limite pedido", () => {
    for (const n of [2, 3, 5, 14, 40]) {
      expect(truncar("A".repeat(100), n).length).toBeLessThanOrEqual(n);
    }
  });

  it("largura ridícula devolve só as reticências, sem estourar", () => {
    expect(truncar("qualquer coisa", 1)).toBe("…");
    expect(truncar("qualquer coisa", 0)).toBe("…");
    expect(truncar("qualquer coisa", -5)).toBe("…");
  });

  it("cabemEm nunca devolve negativo", () => {
    expect(cabemEm(-10, 5.6)).toBe(0);
    expect(cabemEm(0, 5.6)).toBe(0);
    expect(cabemEm(56, 5.6)).toBe(10);
  });
});
