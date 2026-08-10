// De circuitos já dimensionados para os cabos físicos que a simulação
// empacota. É o contrato entre o Quadro de Cargas e o motor de infraestrutura
// — se designacaoCabos ou parseSecao mudarem de formato, estes testes quebram.

import { describe, it, expect } from "vitest";
import { circuitosParaCabos } from "./simulacaoTrecho";
import { getDiameter } from "../data/corfioHEPR";

// Circuito mínimo + resultado que designacaoCabos consome. Valores à mão, não
// vindos do motor real — o que se testa aqui é a conversão, não a conta.
const circ = (over = {}) => ({ tag: "AL-01", descricao: "", esquemaId: "trifCnCt", trechos: [], ...over });
const res = (over = {}) => ({ secaoFinal: 25, neutro: 25, protecao: 16, porFase: 1, tipoCabo: "unipolar", ...over });

const chamar = (over = {}) =>
  circuitosParaCabos({
    circuitos: [circ()],
    resultados: [res()],
    selecionados: [0],
    material: "cobre",
    semTrifolio: new Set(),
    ...over,
  });

describe("circuitosParaCabos", () => {
  it("agrupa 3 fases unipolares iguais num feixe de trifólio", () => {
    const { cabos } = chamar();
    // 3#25 (trifólio, 1 entrada) + 1#25 (neutro) + 1#16 (terra)
    expect(cabos).toHaveLength(3);
    expect(cabos[0]).toMatchObject({ section: 25, type: "unipolar", vias: 1, trifolio: true });
    expect(cabos[1]).toMatchObject({ section: 25, trifolio: undefined });
    expect(cabos[2]).toMatchObject({ section: 16 });
  });

  it("com o trifólio desmarcado, as 3 fases viram condutores soltos", () => {
    const { cabos } = chamar({ semTrifolio: new Set([0]) });
    // 3 fases soltas + neutro + terra
    expect(cabos).toHaveLength(5);
    expect(cabos.every((c) => !c.trifolio)).toBe(true);
    expect(cabos.filter((c) => c.section === 25)).toHaveLength(4);
  });

  it("resolve o diâmetro pelo catálogo do material pedido", () => {
    const cobre = chamar({ material: "cobre" }).cabos[0].d;
    const aluminio = chamar({ material: "aluminio" }).cabos[0].d;
    expect(cobre).toBe(getDiameter(25, "unipolar", 1, "cobre"));
    expect(aluminio).toBe(getDiameter(25, "unipolar", 1, "aluminio"));
    expect(cobre).not.toBe(aluminio);
  });

  it("multipolar vira um cabo de N vias mais o terra unipolar", () => {
    const { cabos } = chamar({
      resultados: [res({ tipoCabo: "multipolar", secaoFinal: 16, neutro: 16, protecao: 16 })],
    });
    expect(cabos).toHaveLength(2);
    expect(cabos[0]).toMatchObject({ type: "multipolar", vias: 4, section: 16 });
    expect(cabos[1]).toMatchObject({ type: "unipolar", vias: 1, section: 16 });
  });

  it("numera a legenda pela posição no quadro, não pela posição na seleção", () => {
    const { itens } = chamar({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" }), circ({ tag: "AL-03" })],
      resultados: [res(), res(), res()],
      selecionados: [2], // só o terceiro
    });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ numero: "03", tag: "AL-03" });
  });

  it("marca podeTrifolio só quando há um grupo de 3 unipolares iguais", () => {
    expect(chamar().itens[0].podeTrifolio).toBe(true);
    // porFase 2 → 6 fases soltas, não é feixe de trifólio
    const seis = chamar({ resultados: [res({ porFase: 2, neutro: null })] });
    expect(seis.itens[0].podeTrifolio).toBe(false);
    expect(seis.cabos.filter((c) => c.section === 25)).toHaveLength(6); // 6 fases
  });

  it("deixa fora da simulação o circuito com erro de cálculo, e avisa", () => {
    const { cabos, itens, avisos } = circuitosParaCabos({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" })],
      resultados: [{ error: "sem corrente" }, res()],
      selecionados: [0, 1],
      material: "cobre",
      semTrifolio: new Set(),
    });
    expect(itens).toHaveLength(1);
    expect(itens[0].tag).toBe("AL-02");
    expect(cabos.length).toBeGreaterThan(0);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("AL-01");
  });

  it("seleção vazia devolve tudo vazio, sem estourar", () => {
    const { cabos, itens, avisos } = chamar({ selecionados: [] });
    expect(cabos).toEqual([]);
    expect(itens).toEqual([]);
    expect(avisos).toEqual([]);
  });

  it("dá um groupId distinto por circuito, para a lista não fundir ramais", () => {
    const { cabos } = chamar({
      circuitos: [circ({ tag: "AL-01" }), circ({ tag: "AL-02" })],
      resultados: [res(), res()],
      selecionados: [0, 1],
    });
    const grupos = new Set(cabos.map((c) => c.groupId));
    expect(grupos.size).toBe(6); // 3 specs × 2 circuitos
  });

  it("mantém um cabo por condutor num circuito bifásico — 2 fases não viram um cabo só", () => {
    // bifSnCt: 2 fases + terra, sem neutro. As 2 fases são "2#25mm²" — quantity
    // 2 não é feixe de trifólio, e cada condutor precisa continuar sendo uma
    // entrada própria: no packing cada entrada é um círculo, e na ocupação cada
    // entrada é a área de UM condutor.
    const { cabos } = chamar({
      circuitos: [circ({ esquemaId: "bifSnCt" })],
      resultados: [res({ neutro: null })],
    });
    expect(cabos.filter((c) => c.section === 25)).toHaveLength(2);
    expect(cabos.every((c) => !c.trifolio)).toBe(true);
  });
});
