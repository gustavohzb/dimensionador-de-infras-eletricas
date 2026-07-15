// Ida-e-volta: a linha de memorial gerada a partir de um circuito, ao passar de
// volta por parseMemorial, reproduz a quantidade/seção/tipo/vias esperados dos
// condutores físicos. É o contrato que liga o Quadro de Cargas à importação da
// aba Infraestrutura — se designacaoCabos ou o parser mudarem de formato de um
// jeito incompatível, estes testes quebram.

import { describe, it, expect } from "vitest";
import { circuitosParaLinhas } from "./quadroToMemorial";
import { parseMemorial } from "./importCables";

// Circuito mínimo + resultado que designacaoCabos consome (secaoFinal, neutro,
// protecao, porFase, tipoCabo). Valores escolhidos à mão, não do motor real.
const circ = (over = {}) => ({ tag: "AL-01", descricao: "", esquemaId: "trifCnCt", ...over });
const res = (over = {}) => ({ secaoFinal: 25, neutro: 25, protecao: 16, porFase: 1, tipoCabo: "unipolar", ...over });

// Soma a quantidade de condutores por (tipo, vias, seção) num parse de 1 linha.
function specsDe(linhas, material = "cobre") {
  const parsed = parseMemorial(linhas, material);
  return parsed.flatMap((l) => l.specs);
}

describe("circuitosParaLinhas — ida e volta pelo parser", () => {
  it("trifásico unipolar c/ neutro e terra → 3 fases + 1 neutro + 1 terra", () => {
    const linhas = circuitosParaLinhas([circ()], [res()]);
    const specs = specsDe(linhas);
    // 3#25 (fases), 1#25 (neutro), 1#16 (terra)
    expect(specs).toHaveLength(3);
    expect(specs[0]).toMatchObject({ cableType: "unipolar", quantity: 3, section: 25 });
    expect(specs[1]).toMatchObject({ cableType: "unipolar", quantity: 1, section: 25 });
    expect(specs[2]).toMatchObject({ cableType: "unipolar", quantity: 1, section: 16 });
    // grupo de 3 fases iguais é sugerível como trifólio
    expect(specs[0].canBeTrifolio).toBe(true);
  });

  it("multipolar → 1 cabo de N vias + terra unipolar", () => {
    const linhas = circuitosParaLinhas([circ()], [res({ tipoCabo: "multipolar", secaoFinal: 16, neutro: 16, protecao: 16 })]);
    const specs = specsDe(linhas);
    // 1#4x16 (3 fases + neutro num cabo) + 1#16 (terra)
    expect(specs[0]).toMatchObject({ cableType: "multipolar", quantity: 1, vias: 4, section: 16 });
    expect(specs[1]).toMatchObject({ cableType: "unipolar", quantity: 1, section: 16 });
  });

  it("condutores em paralelo (porFase 2) → 6 fases soltas, sem trifólio automático", () => {
    const linhas = circuitosParaLinhas([circ()], [res({ porFase: 2 })]);
    const specs = specsDe(linhas);
    // 6#25 fases (2 por fase). quantity 6 ≠ 3 ⇒ não sugere trifólio.
    expect(specs[0]).toMatchObject({ cableType: "unipolar", quantity: 6, section: 25 });
    expect(specs[0].canBeTrifolio).toBe(false);
  });

  it("sem neutro nem terra → só as fases", () => {
    const linhas = circuitosParaLinhas([circ({ esquemaId: "trifSnSt" })], [res({ neutro: null, protecao: null })]);
    const specs = specsDe(linhas);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({ cableType: "unipolar", quantity: 3, section: 25 });
  });

  it("ignora circuitos com erro de cálculo", () => {
    const linhas = circuitosParaLinhas(
      [circ({ tag: "AL-01" }), circ({ tag: "AL-02" })],
      [{ error: "sem corrente" }, res()]
    );
    // só o segundo (válido) vira linha
    expect(linhas.split("\n")).toHaveLength(1);
    expect(linhas).toContain("AL-02");
  });

  it("preserva a TAG como rótulo do ramal na revisão", () => {
    const linhas = circuitosParaLinhas([circ({ tag: "QGBT-05", descricao: "Bomba" })], [res()]);
    const parsed = parseMemorial(linhas);
    expect(parsed[0].label).toContain("QGBT-05");
  });

  it("alumínio: o diâmetro de pré-visualização é o do catálogo de alumínio", () => {
    const linhas = circuitosParaLinhas([circ()], [res({ secaoFinal: 25 })]);
    const cobre = specsDe(linhas, "cobre")[0].d;
    const aluminio = specsDe(linhas, "aluminio")[0].d;
    // 25mm² unipolar: cobre 10,4mm vs alumínio 10,5mm — diâmetros distintos.
    expect(cobre).toBe(10.4);
    expect(aluminio).toBe(10.5);
  });
});
