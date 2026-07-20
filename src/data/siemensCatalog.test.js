// Integridade do catálogo Siemens extraído do configurador oficial (xlsm).
// Os valores esperados vêm da planilha, não do código gerado.

import { describe, it, expect } from "vitest";
import {
  CAPACITORES_MONO_SIEMENS,
  CAPACITORES_TRI_SIEMENS,
  MODULOS_TRI_SIEMENS,
  siemensTri,
  equipamentosSiemens,
} from "./siemensCatalog";

const TODOS = [...CAPACITORES_MONO_SIEMENS, ...CAPACITORES_TRI_SIEMENS, ...MODULOS_TRI_SIEMENS];

describe("catálogo Siemens (configurador)", () => {
  it("tamanhos das famílias batem com a planilha", () => {
    expect(CAPACITORES_MONO_SIEMENS).toHaveLength(35);
    expect(CAPACITORES_TRI_SIEMENS).toHaveLength(118);
    expect(MODULOS_TRI_SIEMENS).toHaveLength(66);
  });

  it("(tensão, kvar) é único dentro de cada família", () => {
    for (const lista of [CAPACITORES_MONO_SIEMENS, CAPACITORES_TRI_SIEMENS, MODULOS_TRI_SIEMENS]) {
      const chaves = lista.map((c) => `${c.tensao}+${c.kvar}`);
      expect(new Set(chaves).size).toBe(chaves.length);
    }
  });

  it("todo item tem contator 3MT7 e códigos de produto", () => {
    for (const c of TODOS) {
      expect(c.contator).toMatch(/^3MT7\d/);
      expect(c.codigo).toBeTruthy();
      expect(c.codigoPedido).toBeTruthy();
      expect(c.corrente).toBeGreaterThan(0);
    }
  });

  it("CT 440V 33,7kvar: a célula da planilha CAPAC, com proteção e contator", () => {
    // Linha conferida célula a célula no configurador (abas BASE e PROTEÇÃO).
    expect(siemensTri(440, 33.7)).toEqual({
      tensao: 440, kvar: 33.7, corrente: 44.3, capacitancia: 154,
      dim: "Ø 85 x 348", peso: 1.5,
      codigo: "B32344E4282Z040", codigoPedido: "A7B10001207401",
      contator: "3MT70040JA126AP2", disjuntor: "3VM1180-5ED32-0AA0",
      fusivel: "3NA3824", fusivelIn: 80, baseFusivel: "3NP1123-1CA20",
    });
  });

  it("trifásicos até 800V têm fusível; 1000V fica sem proteção (sob consulta)", () => {
    for (const c of CAPACITORES_TRI_SIEMENS) {
      if (c.tensao <= 800) {
        expect(c.fusivel, `${c.tensao}V ${c.kvar}kvar`).toBeTruthy();
        expect(c.baseFusivel).toBeTruthy();
      } else {
        expect(c.disjuntor).toBeUndefined();
        expect(c.fusivel).toBeUndefined();
      }
    }
  });

  it("siemensTri devolve null fora do catálogo", () => {
    expect(siemensTri(440, 99)).toBeNull();
  });

  it("equipamentos por estágio: agrupa células iguais e traz os códigos", () => {
    const eq = equipamentosSiemens([{ celulas: [33.7, 33.7] }, { celulas: [30] }], 440);
    expect(eq).toHaveLength(2);
    expect(eq[0].numero).toBe(1);
    expect(eq[0].itens).toEqual([
      {
        kvar: 33.7, qtd: 2, encontrado: true,
        codigo: "B32344E4282Z040", codigoPedido: "A7B10001207401",
        contator: "3MT70040JA126AP2", disjuntor: "3VM1180-5ED32-0AA0",
        fusivel: "3NA3824", fusivelIn: 80, baseFusivel: "3NP1123-1CA20",
      },
    ]);
    expect(eq[1].itens[0]).toMatchObject({ kvar: 30, qtd: 1, contator: "3MT70033JA126AP2" });
  });

  it("célula fora do catálogo vem marcada, sem inventar código", () => {
    const eq = equipamentosSiemens([{ celulas: [33.7, 99] }], 440);
    expect(eq[0].itens).toHaveLength(2);
    const fora = eq[0].itens.find((i) => i.kvar === 99);
    expect(fora).toEqual({ kvar: 99, qtd: 1, encontrado: false });
  });

  it('"TROCAR POR FUSÍVEL" do configurador vira disjuntor null', () => {
    // 440V 0,8kvar monofásico tem isso; em trifásico 480V 3kvar também.
    const eq = equipamentosSiemens([{ celulas: [3] }], 480);
    expect(eq[0].itens[0].disjuntor).toBeNull();
    expect(eq[0].itens[0].fusivel).toBe("3NA3803");
  });

  it("módulos trazem fusível, cabo e composição de células", () => {
    for (const m of MODULOS_TRI_SIEMENS) {
      expect(m.fusivelIn).toBeGreaterThan(0);
      expect(m.caboMm2).toBeGreaterThan(0);
      expect([3, 6, 9, 12, 15]).toContain(m.numCelulas);
    }
  });
});
