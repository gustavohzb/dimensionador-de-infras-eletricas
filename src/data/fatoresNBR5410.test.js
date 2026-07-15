// Trava fatores de correção e seções derivadas contra a ABNT NBR 5410:2004
// (Tabelas 40 temperatura, 42/43 agrupamento, 45 dutos, 48 neutro reduzido,
// 58 condutor de proteção). Mesma lógica de cableSizingPro.test.js e
// ampacidadeNBR5410.test.js: os valores do fixture foram conferidos à mão
// contra o PDF da norma, não são snapshot do código.
//
// Os arrays de agrupamento no código (AGRUPAMENTO.*) às vezes se estendem
// além do que a norma imprime explicitamente (ex.: leito/perfilado só têm
// valores impressos até 9 circuitos; o código repete o último valor para
// 10-12). Este teste confere apenas as posições literalmente impressas na
// norma — a extensão para além disso é uma escolha de engenharia razoável
// (repetir o último fator), mas não verificável linha a linha no PDF.

import { describe, it, expect } from "vitest";
import { AGRUPAMENTO, FATOR_TEMP_AMBIENTE, FATOR_TEMP_SOLO, NEUTRO_REDUZIDO, PROTECAO } from "./cabosNBR5410";
import { FATOR_TEMP_AMBIENTE_PVC, FATOR_TEMP_SOLO_PVC } from "./nbr5410AmpacidadePvc";
import norma from "./__fixtures__/fatoresNBR5410.norma.json";

describe("Fator de temperatura × Tabela 40", () => {
  it("EPR/XLPE 90°C — ambiente", () => {
    expect(FATOR_TEMP_AMBIENTE).toEqual(norma.fatorTempAmbiente90);
  });
  it("EPR/XLPE 90°C — solo", () => {
    expect(FATOR_TEMP_SOLO).toEqual(norma.fatorTempSolo90);
  });
  it("PVC 70°C — ambiente (corta em 60°C)", () => {
    expect(FATOR_TEMP_AMBIENTE_PVC).toEqual(norma.fatorTempAmbiente70);
  });
  it("PVC 70°C — solo (corta em 60°C)", () => {
    expect(FATOR_TEMP_SOLO_PVC).toEqual(norma.fatorTempSolo70);
  });
});

describe("Fator de agrupamento × Tabela 42/43 (posições impressas na norma)", () => {
  it("feixe / conduto fechado — 1 a 20 circuitos (linha 1 da Tab. 42)", () => {
    expect(AGRUPAMENTO.feixe).toEqual(norma.agrupamentoFeixe_n1a20);
  });
  it("camada única sobre leito — 1 a 9 circuitos (linha 5 da Tab. 42)", () => {
    expect(AGRUPAMENTO.leito1.slice(0, 9)).toEqual(norma.agrupamentoLeito_n1a9);
  });
  it("camada única em bandeja perfurada — 1 a 9 circuitos (linha 4 da Tab. 42)", () => {
    expect(AGRUPAMENTO.perfilado1.slice(0, 9)).toEqual(norma.agrupamentoPerfilado_n1a9);
  });
  it("2 camadas — 2 a 12 circuitos/camada (Tab. 43, linha '2')", () => {
    expect(AGRUPAMENTO.camadas2.slice(1)).toEqual(norma.agrupamentoCamadas2_n2a12);
  });
  it("3 camadas — 2 a 12 circuitos/camada (Tab. 43, linha '3')", () => {
    expect(AGRUPAMENTO.camadas3.slice(1)).toEqual(norma.agrupamentoCamadas3_n2a12);
  });
});

describe("Fator de agrupamento em dutos subterrâneos × Tabela 45 (multipolar)", () => {
  it("1 circ./duto, dutos próximos (espaçamento nulo) — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosProximos.slice(1, 6)).toEqual(norma.agrupamentoDutosNulo_n2a6);
  });
  it("1 circ./duto, espaçados 0,25 m — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosEsp025.slice(1, 6)).toEqual(norma.agrupamentoDutosEsp025_n2a6);
  });
  it("1 circ./duto, espaçados 0,5 m — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosEsp05.slice(1, 6)).toEqual(norma.agrupamentoDutosEsp05_n2a6);
  });
  it("vários circuitos por duto reaproveita o fator de feixe (Tab. 42, não a Tab. 45)", () => {
    // Documenta a escolha de modelagem: "vários circuitos no mesmo duto" é
    // tratado como agrupamento em feixe (conduto fechado), não como a Tab.
    // 45 (que pressupõe um cabo por eletroduto, com eletrodutos espaçados).
    expect(AGRUPAMENTO.variosPorDuto).toEqual(AGRUPAMENTO.feixe);
  });
});

describe("Fator de agrupamento em dutos subterrâneos × Tabela 45 (condutores isolados/unipolares)", () => {
  it("1 circ./duto, dutos próximos (espaçamento nulo) — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosProximosUni.slice(1, 6)).toEqual(norma.agrupamentoDutosNuloUni_n2a6);
  });
  it("1 circ./duto, espaçados 0,25 m — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosEsp025Uni.slice(1, 6)).toEqual(norma.agrupamentoDutosEsp025Uni_n2a6);
  });
  it("1 circ./duto, espaçados 0,5 m — 2 a 6 circuitos", () => {
    expect(AGRUPAMENTO.dutosEsp05Uni.slice(1, 6)).toEqual(norma.agrupamentoDutosEsp05Uni_n2a6);
  });
  it("sub-tabela unipolar é mais rigorosa (fator menor) que a multipolar", () => {
    for (const par of [["dutosProximos", "dutosProximosUni"], ["dutosEsp025", "dutosEsp025Uni"], ["dutosEsp05", "dutosEsp05Uni"]]) {
      const [multi, uni] = par;
      for (let i = 1; i < 5; i++) {
        expect(AGRUPAMENTO[uni][i]).toBeLessThanOrEqual(AGRUPAMENTO[multi][i]);
      }
    }
  });
});

describe("Seções derivadas × Tabelas 48 e 58", () => {
  it("neutro reduzido (Tab. 48)", () => {
    expect(NEUTRO_REDUZIDO).toEqual(norma.neutroReduzido);
  });
  it("condutor de proteção — S/2 arredondado para a seção comercial acima (Tab. 58)", () => {
    expect(PROTECAO).toEqual(norma.protecao);
  });
});
