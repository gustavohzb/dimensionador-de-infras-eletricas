// Geometria do desenho do trecho.
//
// O teste central é o de CONTENÇÃO: o canvas contém todos os blocos, em
// qualquer combinação de entrada. É o invariante que teria pego os dois bugs
// de corte que já apareceram no desenho, e vale para qualquer layout futuro —
// não depende de como as posições são calculadas hoje.
//
// (Houve aqui um bloco de equivalência com as fórmulas anteriores à extração
// deste módulo, para provar que aquela refatoração não mudou nenhum número.
// Cumpriu o papel e saiu quando o layout mudou de propósito, movendo a lista
// de circuitos da coluna lateral para baixo do desenho.)

import { describe, it, expect } from "vitest";
import {
  LEGENDA_W,
  LEGENDA_LINHA,
  RESUMO_LINHA,
  CIRCUITOS_POR_COLUNA,
  alturaLegenda,
  larguraLegenda,
  colunasDeCircuitos,
  posicaoCircuito,
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

// As medidas dos eletrodutos não são redondas (Ø22,4 vira raio 13,7; Ø62,7
// vira 35,112), então somar na ordem A+(B+C) ou (A+B)+C dá resultados que
// diferem no último bit. Contenção é geometria, não aritmética exata: a
// tolerância separa esse ruído de um corte de verdade, que é de dezenas de
// unidades.
const EPS = 1e-6;

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
      if (fundo > L.altura + EPS) falhas.push(`${c.trayWidth}×${c.trayHeight} ${c.bitolas} bitolas: ${fundo} > ${L.altura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: a cota de largura cabe na altura do SVG", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      expect(L.desenho.y + L.cota.textoY).toBeLessThanOrEqual(L.altura + EPS);
    }
  });

  it("calha: a lista de circuitos cabe inteira, por mais longa que seja", () => {
    const falhas = [];
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.circuitos) continue;
      const fundo = L.desenho.y + L.circuitos.y + alturaLegenda(c.circuitos);
      if (fundo > L.altura + EPS) falhas.push(`${c.trayWidth}×${c.trayHeight} ${c.circuitos} circuitos`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: todas as colunas de circuitos cabem na largura do SVG", () => {
    const falhas = [];
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.circuitos) continue;
      const direita = L.desenho.x + larguraLegenda(c.circuitos);
      if (direita > L.largura + EPS) falhas.push(`${c.circuitos} circuitos: ${direita} > ${L.largura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("calha: a lista de circuitos vem ANTES do resumo, sem sobrepor", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.circuitos || !L.resumo) continue;
      expect(L.circuitos.y + alturaLegenda(c.circuitos)).toBeLessThanOrEqual(L.resumo.y + EPS);
    }
  });

  it("calha: a cota de altura cabe na largura, mesmo sem legenda", () => {
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      expect(L.desenho.x + L.cotaAltura.textoX).toBeLessThanOrEqual(L.largura + EPS);
    }
  });

  it("eletroduto: o tubo inteiro cabe no canvas, em cima e embaixo", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (L.centro.y - c.outerR < -EPS) falhas.push(`R=${c.outerR}: topo cortado`);
      if (L.centro.y + c.outerR > L.altura + EPS) falhas.push(`R=${c.outerR}: base cortada`);
      if (L.centro.x - c.outerR < -EPS || L.centro.x + c.outerR > L.largura + EPS) falhas.push(`R=${c.outerR}: lateral`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: o resumo cabe inteiro abaixo do tubo", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.resumo) continue;
      const fundo = L.centro.y + L.resumo.y + alturaResumo(c.bitolas);
      if (fundo > L.altura + EPS) falhas.push(`R=${c.outerR} ${c.bitolas} bitolas: ${fundo} > ${L.altura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: a lista de circuitos cabe inteira, em altura e em largura", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.circuitos) continue;
      const fundo = L.centro.y + L.circuitos.y + alturaLegenda(c.circuitos);
      if (fundo > L.altura + EPS) falhas.push(`R=${c.outerR}: altura ${fundo} > ${L.altura}`);
      const direita = L.centro.x + L.circuitos.x + larguraLegenda(c.circuitos);
      if (direita > L.largura + EPS) falhas.push(`R=${c.outerR}: largura ${direita} > ${L.largura}`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: a lista de circuitos vem ANTES do resumo, sem sobrepor", () => {
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.circuitos || !L.resumo) continue;
      expect(L.circuitos.y + alturaLegenda(c.circuitos)).toBeLessThanOrEqual(L.resumo.y);
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
        expect(fundo).toBeLessThanOrEqual(L.altura + EPS);
        expect(L.altura).toBeGreaterThanOrEqual(anterior);
        anterior = L.altura;
      }
    }
  });
});

// A largura em px vem com `height: auto`, então a altura renderizada é
// consequência da proporção. Com largura fixa, um desenho estreito e alto era
// ampliado até virar uma parede de pixels — não adianta encurtar o viewBox se
// a escala desfaz o ganho na tela.
describe("tamanho na tela", () => {
  const alturaRenderizada = (L) => (L.larguraCss * L.altura) / L.largura;

  it("calha: a imagem nunca passa de 780×700px, por mais circuitos que tenha", () => {
    const falhas = [];
    for (const c of CASOS_RET) {
      const L = layoutRetangular(c);
      if (!L.circuitos && !L.resumo) continue; // a aba Infra tem largura própria
      const h = alturaRenderizada(L);
      if (L.larguraCss > 780 + EPS || h > 700 + EPS)
        falhas.push(`${c.circuitos} circuitos, ${c.bitolas} bitolas: ${L.larguraCss.toFixed(0)}×${h.toFixed(0)}px`);
    }
    expect(falhas).toEqual([]);
  });

  it("eletroduto: idem", () => {
    const falhas = [];
    for (const c of CASOS_CIRC) {
      const L = layoutCircular(c);
      if (!L.circuitos && !L.resumo) continue;
      const h = alturaRenderizada(L);
      if (L.larguraCss > 780 + EPS || h > 700 + EPS)
        falhas.push(`R=${c.outerR}: ${L.larguraCss.toFixed(0)}×${h.toFixed(0)}px`);
    }
    expect(falhas).toEqual([]);
  });

  it("um trecho com muitos circuitos não fica maior na tela que um com poucos", () => {
    // O ponto todo da mudança: antes, cada circuito a mais esticava a imagem
    // para baixo sem limite.
    const area = (n) => {
      const L = layoutRetangular({ trayWidth: 200, trayHeight: 100, circuitos: n, bitolas: 4 });
      return L.larguraCss * alturaRenderizada(L);
    };
    expect(area(50)).toBeLessThanOrEqual(area(10) * 1.5);
  });
});

describe("quebra da lista de circuitos em colunas", () => {
  it("até 10 circuitos, uma coluna só", () => {
    for (const n of [1, 5, 9, 10]) {
      expect(colunasDeCircuitos(n)).toBe(1);
      expect(larguraLegenda(n)).toBe(LEGENDA_W);
    }
  });

  it("o 11º circuito abre a segunda coluna, no topo dela", () => {
    expect(colunasDeCircuitos(11)).toBe(2);
    // Mesma altura do primeiro, uma coluna à direita.
    expect(posicaoCircuito(10)).toEqual({ x: LEGENDA_W, y: posicaoCircuito(0).y });
  });

  it("desce dentro da coluna, uma linha por circuito", () => {
    expect(posicaoCircuito(1).y - posicaoCircuito(0).y).toBe(LEGENDA_LINHA);
    expect(posicaoCircuito(1).x).toBe(0);
  });

  it("a altura para de crescer no décimo circuito — é esse o ponto", () => {
    // Sem a quebra, 40 circuitos empurrariam a imagem para quatro vezes essa
    // altura. É o que deixava o desenho comprido demais.
    const dez = alturaLegenda(10);
    for (const n of [11, 20, 21, 40, 100]) {
      expect(alturaLegenda(n)).toBe(dez);
    }
  });

  it("a largura cresce em degraus de uma coluna", () => {
    expect(larguraLegenda(10)).toBe(LEGENDA_W);
    expect(larguraLegenda(11)).toBe(2 * LEGENDA_W);
    expect(larguraLegenda(20)).toBe(2 * LEGENDA_W);
    expect(larguraLegenda(21)).toBe(3 * LEGENDA_W);
  });

  it("sem circuitos não há coluna nenhuma", () => {
    expect(colunasDeCircuitos(0)).toBe(0);
    expect(larguraLegenda(0)).toBe(0);
    expect(alturaLegenda(0)).toBe(0);
  });

  it("cada circuito tem posição própria — nenhum se sobrepõe a outro", () => {
    const vistas = new Set();
    for (let i = 0; i < 45; i++) {
      const { x, y } = posicaoCircuito(i);
      const chave = `${x}:${y}`;
      expect(vistas.has(chave)).toBe(false);
      vistas.add(chave);
    }
  });

  it("o limite por coluna é o que a interface promete", () => {
    expect(CIRCUITOS_POR_COLUNA).toBe(10);
  });
});

describe("o desenho da aba Infraestrutura não muda", () => {
  // Lá não há lista de circuitos nem resumo; estas medidas são as mesmas
  // desde antes de tudo isso, e servem de âncora contra regressão.
  it("calha 100×50 continua 228×146", () => {
    expect(layoutRetangular({ trayWidth: 100, trayHeight: 50, circuitos: 0, bitolas: 0 }))
      .toMatchObject({ largura: 228, altura: 146, larguraCss: 520, desenho: { x: 32, y: 32 } });
  });

  it("eletroduto Ø22,4 continua 155,4×155,4 com o tubo centralizado", () => {
    expect(layoutCircular({ outerR: 13.7, circuitos: 0, bitolas: 0 }))
      .toMatchObject({ largura: 155.4, altura: 155.4, larguraCss: 420, centro: { x: 77.7, y: 77.7 } });
  });
});

describe("a simulação empilha desenho, circuitos e resumo", () => {
  it("calha: a lista fica entre a cota e o resumo", () => {
    const L = layoutRetangular({ trayWidth: 50, trayHeight: 100, circuitos: 3, bitolas: 6 });
    expect(L.cota.textoY).toBeLessThan(L.circuitos.y);
    expect(L.circuitos.y).toBeLessThan(L.resumo.y);
    // Uma coluna só: a largura é a do desenho, não a de uma coluna lateral.
    expect(L.circuitos.largura).toBe(LEGENDA_W);
  });

  it("calha: 18 circuitos ocupam duas colunas e não esticam a altura", () => {
    const dez = layoutRetangular({ trayWidth: 50, trayHeight: 100, circuitos: 10, bitolas: 6 });
    const dezoito = layoutRetangular({ trayWidth: 50, trayHeight: 100, circuitos: 18, bitolas: 6 });
    expect(dezoito.altura).toBe(dez.altura);
    expect(dezoito.largura).toBeGreaterThan(dez.largura);
    expect(dezoito.circuitos.largura).toBe(2 * LEGENDA_W);
  });

  it("eletroduto: mesma pilha abaixo do tubo", () => {
    const L = layoutCircular({ outerR: 35.112, circuitos: 3, bitolas: 6 });
    expect(L.circuitos.y).toBeLessThan(L.resumo.y);
    expect(L.centro.y).toBe(32 + 35.112); // tubo ancorado no topo
  });
});

describe("alturas dos blocos de texto", () => {
  it("a legenda cresce uma linha por circuito", () => {
    expect(alturaLegenda(3) - alturaLegenda(2)).toBe(LEGENDA_LINHA);
    // Sem circuito nenhum o bloco não existe — não ocupa nem a altura do título.
    expect(alturaLegenda(0)).toBe(0);
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
