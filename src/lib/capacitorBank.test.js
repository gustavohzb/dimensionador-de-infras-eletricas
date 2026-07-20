// A planilha CAPAC-380 PARA 440.xlsx inteira como fixture: os valores
// esperados abaixo foram transcritos do dump da planilha (célula a célula,
// com fórmulas), não da saída deste código. Se o motor divergir da planilha
// em qualquer coluna, algum teste aqui quebra.

import { describe, it, expect } from "vitest";
import { calcularBanco } from "./capacitorBank";
import {
  disjuntorComercial, DISJUNTORES, POTENCIAS_CELULA, CELULAS_SIEMENS_440V, diametroCelula,
} from "../data/capacitores";

// O banco da planilha: 8 estágios de 2×33,7 kvar + 4 de 1×30 kvar, células
// de 440V numa rede de 380V, trafo de 1500 kVA com alvo de 33%.
const bancoPlanilha = () =>
  calcularBanco({
    vRede: 380,
    vCapacitor: 440,
    estagios: [
      ...Array.from({ length: 8 }, () => ({ celulas: [33.7, 33.7] })),
      ...Array.from({ length: 4 }, () => ({ celulas: [30] })),
    ],
    trafo: { kva: 1500, percentualAlvo: 33 },
  });

describe("fixture da planilha CAPAC-380 PARA 440", () => {
  it("estágio de 2×33,7: kvar, corrente e disjuntor (linha 3 da planilha)", () => {
    const e = bancoPlanilha().estagios[0];
    expect(e.kvarNominal).toBeCloseTo(67.4, 10);
    expect(e.kvarReal).toBeCloseTo(50.27148760330579, 10); // M3
    expect(e.corrente).toBeCloseTo(76.3796234219251, 10); // N3
    expect(e.disjCalculado).toBeCloseTo(124.49878617773791, 10); // O3
    expect(e.disjComercial).toBe(125);
  });

  it("estágio de 1×30: kvar, corrente e disjuntor (linha 11 da planilha)", () => {
    const e = bancoPlanilha().estagios[8];
    expect(e.kvarReal).toBeCloseTo(22.37603305785124, 10); // M11
    expect(e.corrente).toBeCloseTo(33.996865024595735, 10); // N11
    expect(e.disjCalculado).toBeCloseTo(55.41488999009104, 10); // O11
    expect(e.disjComercial).toBe(63);
  });

  it("totais: kvar nominal (K3), kvar real (D5) e corrente (P3)", () => {
    const b = bancoPlanilha();
    expect(b.kvarNominalTotal).toBeCloseTo(659.2, 10);
    expect(b.kvarRealTotal).toBeCloseTo(491.6760330578512, 9); // D5
    expect(b.correnteTotal).toBeCloseTo(747.0244474737839, 9); // P3
  });

  it("disjuntor geral: corrente total × 1,25 → 1000A comercial", () => {
    const b = bancoPlanilha();
    expect(b.disjGeralCalculado).toBeCloseTo(933.7805593422299, 9);
    expect(b.disjGeralComercial).toBe(1000);
  });

  it("trafo: alvo de 495 kvar (C11) e 32,78% atingidos", () => {
    const { trafo } = bancoPlanilha();
    expect(trafo.alvoKvar).toBeCloseTo(495, 10);
    expect(trafo.percentualAtingido).toBeCloseTo(32.778402203856746, 9);
  });
});

describe("casos de borda", () => {
  it("tensões iguais: fator 1, kvar real = nominal", () => {
    const b = calcularBanco({ vRede: 440, vCapacitor: 440, estagios: [{ celulas: [50] }] });
    expect(b.fatorTensao).toBe(1);
    expect(b.estagios[0].kvarReal).toBe(50);
  });

  it("sem trafo: bloco ausente do retorno", () => {
    const b = calcularBanco({ vRede: 380, vCapacitor: 440, estagios: [{ celulas: [30] }] });
    expect(b.trafo).toBeNull();
  });

  it("corrente acima da escala: disjuntor comercial null, sem inventar degrau", () => {
    // 1 estágio absurdo de 1000 kvar em 380/380 → ~1519A de corrente, ×1,63 estoura os 1250A.
    const b = calcularBanco({ vRede: 380, vCapacitor: 380, estagios: [{ celulas: [1000] }] });
    expect(b.estagios[0].disjComercial).toBeNull();
    expect(b.disjGeralComercial).toBeNull();
  });

  it("contator do estágio: corrente mínima = In × 1,43 por padrão", () => {
    // 1,43 = 1,3 (harmônicas, IEC 60831 exige suportar em regime) × 1,1
    // (tolerância de +10% na capacitância). Sobre a corrente da linha 3 da
    // planilha (76,3796... A) — o valor esperado vem da fixture, não do código.
    const e = bancoPlanilha().estagios[0];
    expect(e.contatorMin).toBeCloseTo(76.3796234219251 * 1.43, 10);
  });

  it("fator do contator é configurável", () => {
    const b = calcularBanco({
      vRede: 380, vCapacitor: 380, fatorContator: 1.5,
      estagios: [{ celulas: [100] }],
    });
    expect(b.estagios[0].contatorMin).toBeCloseTo(b.estagios[0].corrente * 1.5, 10);
  });

  it("lista vazia: totais zerados, sem NaN", () => {
    const b = calcularBanco({ vRede: 380, vCapacitor: 440, estagios: [] });
    expect(b.kvarNominalTotal).toBe(0);
    expect(b.correnteTotal).toBe(0);
    expect(b.disjGeralCalculado).toBe(0);
    expect(Number.isNaN(b.kvarRealTotal)).toBe(false);
  });
});

describe("dados de mercado", () => {
  it("disjuntorComercial sobe para o próximo degrau", () => {
    expect(disjuntorComercial(124.5)).toBe(125);
    expect(disjuntorComercial(125)).toBe(125);
    expect(disjuntorComercial(125.1)).toBe(150);
    expect(disjuntorComercial(1251)).toBeNull();
  });

  it("escala de disjuntores e potências de célula em ordem crescente", () => {
    const crescente = (arr) => arr.every((v, i) => i === 0 || v > arr[i - 1]);
    expect(crescente(DISJUNTORES)).toBe(true);
    expect(crescente(POTENCIAS_CELULA)).toBe(true);
  });

  it("células Siemens 440V: Ø do catálogo bate com a faixa de diametroCelula", () => {
    // As duas tabelas vêm da mesma página do catálogo; se uma faixa mudar sem
    // a outra, este teste acusa a inconsistência.
    for (const [kvar, cel] of Object.entries(CELULAS_SIEMENS_440V)) {
      expect(diametroCelula(Number(kvar))).toBe(cel.d);
    }
  });

  it("a célula da planilha (33,7 kvar) é a B32344-E4282-Z040, Ø89,5×348mm", () => {
    expect(CELULAS_SIEMENS_440V[33.7]).toEqual({ codigo: "B32344-E4282-Z040", d: 89.5, h: 348 });
  });
});
