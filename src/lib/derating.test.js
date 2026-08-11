// Fatores de agrupamento da NBR 5410 Tabela 42. São números tabelados, não
// calculados: o teste existe para que ninguém os "ajuste" sem perceber. Um
// fator alto demais superdimensiona a capacidade de condução e deixa o cabo
// esquentar além do previsto.

import { describe, it, expect } from "vitest";
import { ARRANJOS, getFator, defaultArranjo, estimateCircuits } from "./derating";

// Colunas de 1 a 9 circuitos de cada linha da Tabela 42, transcritas da norma.
const TABELA_42 = {
  feixe: [1.0, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5],
  naoPerfurada: [1.0, 0.85, 0.79, 0.75, 0.73, 0.72, 0.72, 0.71, 0.7],
  teto: [0.95, 0.81, 0.72, 0.68, 0.66, 0.64, 0.63, 0.62, 0.61],
  perfurada: [1.0, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72],
  leito: [1.0, 0.87, 0.82, 0.8, 0.8, 0.79, 0.79, 0.78, 0.78],
};

describe("getFator — Tabela 42 da NBR 5410", () => {
  for (const [arranjo, esperados] of Object.entries(TABELA_42)) {
    it(`${arranjo}: de 1 a 9 circuitos bate com a tabela`, () => {
      expect(esperados.map((_, i) => getFator(arranjo, i + 1))).toEqual(esperados);
    });
  }

  it("um único circuito não sofre redução — exceto no teto, que já parte de 0,95", () => {
    // O arranjo "fixado no teto" é o único cuja coluna de 1 circuito não é 1,00:
    // a proximidade da laje já prejudica a dissipação antes de haver agrupamento.
    expect(getFator("teto", 1)).toBe(0.95);
    for (const arranjo of ["feixe", "naoPerfurada", "perfurada", "leito"]) {
      expect(getFator(arranjo, 1)).toBe(1.0);
    }
  });

  it("em feixe, a redução continua em faixas acima de 9 circuitos", () => {
    // A tabela dá colunas para 12, 16 e 20; cada uma vale da sua coluna até
    // a anterior à próxima.
    expect([9, 10, 11].map((n) => getFator("feixe", n))).toEqual([0.5, 0.5, 0.5]);
    expect([12, 13, 15].map((n) => getFator("feixe", n))).toEqual([0.45, 0.45, 0.45]);
    expect([16, 18, 19].map((n) => getFator("feixe", n))).toEqual([0.41, 0.41, 0.41]);
    expect([20, 50, 200].map((n) => getFator("feixe", n))).toEqual([0.38, 0.38, 0.38]);
  });

  it("nos arranjos em camada única não há redução adicional depois de 9 circuitos", () => {
    for (const arranjo of ["naoPerfurada", "teto", "perfurada", "leito"]) {
      const noNove = getFator(arranjo, 9);
      for (const n of [10, 12, 16, 20, 50, 200]) {
        expect(getFator(arranjo, n)).toBe(noNove);
      }
    }
  });

  it("o feixe é sempre o arranjo mais severo — é o que menos dissipa calor", () => {
    // Confinados num tubo, os cabos aquecem uns aos outros; espalhados numa
    // bandeja, o ar circula. A partir de 2 circuitos a diferença tem que aparecer.
    for (let n = 2; n <= 20; n++) {
      for (const arranjo of ["naoPerfurada", "teto", "perfurada", "leito"]) {
        expect(getFator("feixe", n)).toBeLessThan(getFator(arranjo, n));
      }
    }
  });

  it("o fator nunca sobe quando entram mais circuitos", () => {
    for (const { id } of ARRANJOS) {
      for (let n = 2; n <= 30; n++) {
        expect(getFator(id, n)).toBeLessThanOrEqual(getFator(id, n - 1));
      }
    }
  });

  it("arranjo desconhecido ou contagem inválida devolve null, em vez de um fator inventado", () => {
    expect(getFator("inexistente", 3)).toBeNull();
    expect(getFator(undefined, 3)).toBeNull();
    expect(getFator("feixe", 0)).toBeNull();
    expect(getFator("feixe", -1)).toBeNull();
  });

  it("todo arranjo oferecido na interface tem fatores tabelados", () => {
    for (const { id } of ARRANJOS) expect(getFator(id, 1)).not.toBeNull();
  });
});

describe("defaultArranjo", () => {
  it.each([
    ["eletroduto", "feixe"],
    ["leito", "leito"],
    ["perfilado", "perfurada"],
    ["aramado", "perfurada"],
    ["eletrocalha", "naoPerfurada"],
  ])("%s parte de %s", (infra, esperado) => {
    expect(defaultArranjo(infra)).toBe(esperado);
  });

  it("infra não mapeada cai na eletrocalha lisa", () => {
    expect(defaultArranjo("canaletaEmbutida")).toBe("naoPerfurada");
    expect(defaultArranjo(undefined)).toBe("naoPerfurada");
  });

  it("o padrão é sempre um arranjo que existe na lista da interface", () => {
    const ids = new Set(ARRANJOS.map((a) => a.id));
    for (const infra of ["eletroduto", "leito", "perfilado", "aramado", "eletrocalha", "?"]) {
      expect(ids.has(defaultArranjo(infra))).toBe(true);
    }
  });
});

describe("estimateCircuits", () => {
  const uni = (section, over = {}) => ({ d: 10, type: "unipolar", vias: 1, section, ...over });
  const multi = (section) => ({ d: 18, type: "multipolar", vias: 4, section });

  it("trecho vazio não tem circuito", () => {
    expect(estimateCircuits([])).toBe(0);
  });

  it("cada multipolar é um circuito", () => {
    expect(estimateCircuits([multi(16), multi(16), multi(6)])).toBe(3);
  });

  it("cada trifólio é um circuito, não três", () => {
    expect(estimateCircuits([uni(70, { trifolio: true }), uni(70, { trifolio: true })])).toBe(2);
  });

  it("cabo de comando conta como circuito próprio", () => {
    expect(estimateCircuits([{ d: 8, type: "comando", vias: 7, section: 1.5 }])).toBe(1);
  });

  it("unipolares soltos são agrupados de três em três", () => {
    expect(estimateCircuits([uni(70), uni(70), uni(70)])).toBe(1);
    expect(estimateCircuits(Array.from({ length: 6 }, () => uni(70)))).toBe(2);
  });

  it("a sobra arredonda para cima — 4 unipolares já são dois circuitos", () => {
    expect(estimateCircuits(Array.from({ length: 4 }, () => uni(70)))).toBe(2);
  });

  it("o agrupamento é por seção: bitolas diferentes não fecham o mesmo trio", () => {
    // 3#70 + 1#35 + 1#35 é UM circuito trifásico real, mas o app não conhece a
    // composição dos circuitos e só enxerga a lista de cabos: os dois de 35mm²
    // viram um segundo grupo. Erra para o lado seguro (mais circuitos → fator
    // menor → cabo mais folgado), e é por isso que o campo é editável na tela.
    expect(estimateCircuits([uni(70), uni(70), uni(70), uni(35), uni(35)])).toBe(2);
  });

  it("nunca devolve menos circuitos do que o número de multipolares e trifólios", () => {
    const cabos = [multi(16), uni(70, { trifolio: true }), uni(6), uni(6)];
    expect(estimateCircuits(cabos)).toBeGreaterThanOrEqual(2);
  });
});
