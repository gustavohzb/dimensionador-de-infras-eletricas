// Integridade do catálogo Siemens extraído do configurador oficial (xlsm).
// Os valores esperados vêm da planilha, não do código gerado.

import { describe, it, expect } from "vitest";
import {
  CAPACITORES_MONO_SIEMENS,
  CAPACITORES_TRI_SIEMENS,
  MODULOS_TRI_SIEMENS,
  siemensTri,
  equipamentosSiemens,
  CONTATOR_TETO,
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

  it("estágio de 1 célula: capacitor, contator e proteção da linha do catálogo", () => {
    const eq = equipamentosSiemens([{ celulas: [30] }], 440);
    expect(eq[0].numero).toBe(1);
    expect(eq[0].kvarTotal).toBe(30);
    expect(eq[0].celulas).toEqual([
      { kvar: 30, qtd: 1, encontrado: true, codigo: "B32344E4252Z040", codigoPedido: "A7B10001207361" },
    ]);
    expect(eq[0].contator).toBe("3MT70033JA126AP2");
    expect(eq[0].protecao).toMatchObject({
      kvarRef: 30, disjuntor: "3VM1180-5ED32-0AA0",
      fusivel: "3NA3824", fusivelIn: 80, baseFusivel: "3NP1123-1CA20",
    });
  });

  it("2 células acopladas: contator e proteção pelo kvar TOTAL do estágio", () => {
    // 2×15 = 30 kvar: mesmo contator e proteção de uma célula única de 30 —
    // o estágio chaveia inteiro (mesma régua dos módulos MT do configurador,
    // ex.: MT300-440 de 30 kvar usa 3MT70033).
    const eq = equipamentosSiemens([{ celulas: [15, 15] }], 440);
    expect(eq[0].kvarTotal).toBe(30);
    expect(eq[0].celulas).toEqual([
      { kvar: 15, qtd: 2, encontrado: true, codigo: "B32344E4151Z040", codigoPedido: "A7B10001207348" },
    ]);
    expect(eq[0].contator).toBe("3MT70033JA126AP2");
    expect(eq[0].protecao.disjuntor).toBe("3VM1180-5ED32-0AA0");
  });

  it("total sem linha exata no catálogo sobe para a próxima: 12,5+15 = 27,5 → linha de 30", () => {
    const eq = equipamentosSiemens([{ celulas: [12.5, 15] }], 440);
    expect(eq[0].kvarTotal).toBe(27.5);
    expect(eq[0].celulas.map((c) => c.codigo)).toEqual(["B32344E4121Z540", "B32344E4151Z040"]);
    expect(eq[0].protecao).toMatchObject({ kvarRef: 30, disjuntor: "3VM1180-5ED32-0AA0" });
    expect(eq[0].contator).toBe("3MT70033JA126AP2"); // 27,5 ≤ 30 (teto do 0033 no catálogo)
  });

  it("2×33,7 = 67,4 kvar estoura o catálogo: contator e proteção nulos, sem inventar", () => {
    const eq = equipamentosSiemens([{ celulas: [33.7, 33.7] }], 440);
    expect(eq[0].kvarTotal).toBeCloseTo(67.4, 10);
    expect(eq[0].celulas[0]).toMatchObject({ qtd: 2, codigo: "B32344E4282Z040" });
    expect(eq[0].contator).toBeNull(); // maior 3MT7 do configurador cobre 60 kvar
    expect(eq[0].protecao).toBeNull(); // maior célula 440V é 33,7 kvar
  });

  it("CONTATOR_TETO é o maior 3MT7 do configurador (3MT70060, 60 kvar)", () => {
    // O limite que a mensagem de 'fora do catálogo' cita ao explicar por que
    // um estágio (ex.: 2×33,7 = 67,4) não tem contator Siemens.
    expect(CONTATOR_TETO).toEqual({ codigo: "3MT70060JA126AP2", maxKvar: 60 });
  });

  it("célula fora do catálogo vem marcada, sem inventar código", () => {
    const eq = equipamentosSiemens([{ celulas: [99] }], 440);
    expect(eq[0].celulas).toEqual([{ kvar: 99, qtd: 1, encontrado: false }]);
    expect(eq[0].protecao).toBeNull();
  });

  it('"TROCAR POR FUSÍVEL" do configurador vira disjuntor null', () => {
    // 480V 3 kvar: sem disjuntor adequado; a proteção é o fusível.
    const eq = equipamentosSiemens([{ celulas: [3] }], 480);
    expect(eq[0].protecao.disjuntor).toBeNull();
    expect(eq[0].protecao.fusivel).toBe("3NA3803");
  });

  it("módulos trazem fusível, cabo e composição de células", () => {
    for (const m of MODULOS_TRI_SIEMENS) {
      expect(m.fusivelIn).toBeGreaterThan(0);
      expect(m.caboMm2).toBeGreaterThan(0);
      expect([3, 6, 9, 12, 15]).toContain(m.numCelulas);
    }
  });
});
