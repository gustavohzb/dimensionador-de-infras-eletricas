import { describe, it, expect } from "vitest";
import {
  areaExposicaoEstrutura, areaExposicaoProxima, areasLinha, numeroEventos,
} from "./spdaRisco";

describe("áreas de exposição (Anexo A)", () => {
  it("A_D de estrutura retangular pela equação A.1", () => {
    // L=50, W=30, H=10 → 1500 + 2×30×80 + π×900 = 1500 + 4800 + 2827,433…
    expect(areaExposicaoEstrutura({ L: 50, W: 30, H: 10 })).toBeCloseTo(9127.43, 1);
  });

  it("com saliência, adota o maior entre A.1 e A.2", () => {
    // Estrutura baixa e saliência alta: A'_D = π×(3×30)² = 25446,9 vence.
    const comSaliencia = areaExposicaoEstrutura({ L: 10, W: 10, H: 3, Hp: 30 });
    expect(comSaliencia).toBeCloseTo(25446.9, 1);
    // Saliência pequena não muda nada: vence a área da própria estrutura.
    const semEfeito = areaExposicaoEstrutura({ L: 50, W: 30, H: 10, Hp: 11 });
    expect(semEfeito).toBeCloseTo(9127.43, 1);
  });

  it("A_M pela equação A.6", () => {
    // 2×500×80 + π×500² = 80000 + 785398,16
    expect(areaExposicaoProxima({ L: 50, W: 30 })).toBeCloseTo(865398.16, 1);
  });

  it("A_L e A_I pelas equações A.8 e A.10", () => {
    expect(areasLinha(1000)).toEqual({ al: 40000, ai: 4000000 });
  });
});

describe("número de eventos perigosos (Anexo A)", () => {
  const base = {
    estrutura: { L: 50, W: 30, H: 10, Hp: null, ng: 8, cd: "isolada" },
    linhas: [],
  };

  it("N_D pela equação A.3", () => {
    const { nd } = numeroEventos(base);
    // 8 × 9127,43 × 1 × 10⁻⁶
    expect(nd).toBeCloseTo(0.0730, 4);
  });

  it("C_D da Tabela A.1 entra em N_D", () => {
    const cercada = { ...base, estrutura: { ...base.estrutura, cd: "cercadaAltos" } };
    expect(numeroEventos(cercada).nd).toBeCloseTo(0.0730 * 0.25, 4);
  });

  it("N_M pela equação A.5", () => {
    // 8 × 865398,16 × 10⁻⁶
    expect(numeroEventos(base).nm).toBeCloseTo(6.923, 3);
  });

  it("N_L e N_I pelas equações A.7 e A.9", () => {
    const comLinha = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal", adjacente: null }],
    };
    const [linha] = numeroEventos(comLinha).porLinha;
    expect(linha.nl).toBeCloseTo(8 * 40000 * 1e-6, 6); // 0,32
    expect(linha.ni).toBeCloseTo(8 * 4000000 * 1e-6, 6); // 32
    expect(linha.ndj).toBe(0);
  });

  it("os fatores C_I, C_E e C_T multiplicam N_L", () => {
    const comLinha = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 500, ci: "enterrado", ce: "urbano", ct: "atComTrafo", adjacente: null }],
    };
    const [linha] = numeroEventos(comLinha).porLinha;
    // 8 × (40×500) × 0,5 × 0,1 × 0,2 × 10⁻⁶
    expect(linha.nl).toBeCloseTo(8 * 20000 * 0.5 * 0.1 * 0.2 * 1e-6, 9);
  });

  it("estrutura adjacente dá N_DJ pela equação A.4", () => {
    const comAdjacente = {
      ...base,
      linhas: [{
        id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
        adjacente: { L: 20, W: 20, H: 5, cd: "isolada" },
      }],
    };
    const [linha] = numeroEventos(comAdjacente).porLinha;
    const adj = 20 * 20 + 2 * 15 * 40 + Math.PI * 225; // A.1 com L=W=20, H=5
    expect(linha.ndj).toBeCloseTo(8 * adj * 1 * 1 * 1e-6, 8);
  });

  it("sem linhas, a lista sai vazia", () => {
    expect(numeroEventos(base).porLinha).toEqual([]);
  });
});
