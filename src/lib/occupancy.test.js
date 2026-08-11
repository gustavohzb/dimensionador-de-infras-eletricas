// A conta que decide se o trecho é legal. Um erro aqui não quebra nada na
// tela — entrega um projeto fora do limite de ocupação com cara de aprovado,
// que é o pior tipo de defeito que este app pode ter.

import { describe, it, expect } from "vitest";
import { computeOccupancy } from "./occupancy";

const cabo = (over = {}) => ({ d: 10, type: "unipolar", vias: 1, ...over });
const area = (d) => Math.PI * (d / 2) ** 2;

// Área grande o bastante para a ocupação nunca ser o assunto do teste.
const FOLGADA = 1e6;

describe("computeOccupancy — área ocupada", () => {
  it("soma a área do círculo externo de cada cabo", () => {
    const { cableArea } = computeOccupancy([cabo({ d: 10 }), cabo({ d: 20 })], FOLGADA, false);
    expect(cableArea).toBeCloseTo(area(10) + area(20), 9);
  });

  it("o trifólio ocupa a área de 3 condutores, não a de 1", () => {
    // É uma entrada só na lista, mas fisicamente são 3 fios amarrados.
    const feixe = computeOccupancy([cabo({ trifolio: true })], FOLGADA, false);
    const soltos = computeOccupancy([cabo(), cabo(), cabo()], FOLGADA, false);
    expect(feixe.cableArea).toBeCloseTo(soltos.cableArea, 9);
  });

  it("o multipolar ocupa a área da capa externa, contada uma vez só", () => {
    // `d` é o diâmetro externo do cabo (4×16mm² da Corfio): as vias internas
    // já estão dentro dele e não somam área extra.
    const { cableArea } = computeOccupancy(
      [cabo({ type: "multipolar", vias: 4, d: 18.32 })],
      FOLGADA,
      false
    );
    expect(cableArea).toBeCloseTo(area(18.32), 9);
  });

  it("ocupação é a fração da seção da infra tomada pelos cabos, em %", () => {
    const trayArea = area(10) * 4; // quatro cabos desses preencheriam 100%
    expect(computeOccupancy([cabo(), cabo()], trayArea, false).ocupacao).toBeCloseTo(50, 9);
  });

  it("infra sem área não divide por zero", () => {
    expect(computeOccupancy([cabo()], 0, false).ocupacao).toBe(0);
  });

  it("trecho vazio ocupa nada", () => {
    const r = computeOccupancy([], FOLGADA, false);
    expect(r.cableArea).toBe(0);
    expect(r.ocupacao).toBe(0);
  });
});

// NBR 5410, 6.2.11.1.6: a taxa máxima de ocupação do eletroduto depende de
// quantos condutores correm dentro dele.
describe("computeOccupancy — limite no eletroduto", () => {
  const limiteCom = (n) =>
    computeOccupancy(Array.from({ length: n }, () => cabo()), FOLGADA, true).limite;

  it("1 condutor → 53%", () => expect(limiteCom(1)).toBe(53));
  it("2 condutores → 31%", () => expect(limiteCom(2)).toBe(31));
  it("3 condutores → 40%", () => expect(limiteCom(3)).toBe(40));
  it("acima de 3 continua em 40%", () => {
    expect(limiteCom(4)).toBe(40);
    expect(limiteCom(30)).toBe(40);
  });

  it("conta condutores físicos: um trifólio sozinho já cai na faixa de 3 ou mais", () => {
    // Se contasse entradas da lista, cairia em 53% — quase o dobro do
    // permitido para os 3 fios que realmente estão no tubo.
    expect(computeOccupancy([cabo({ trifolio: true })], FOLGADA, true).limite).toBe(40);
  });

  it("o multipolar é um corpo só: 1 cabo de 4 vias fica na faixa de 1 condutor", () => {
    // O limite é sobre corpos que dividem o tubo, não sobre vias internas.
    expect(computeOccupancy([cabo({ type: "multipolar", vias: 4 })], FOLGADA, true).limite).toBe(53);
  });
});

describe("computeOccupancy — limite fora do eletroduto (calha, perfilado, leito, aramado)", () => {
  const limiteCom = (n) =>
    computeOccupancy(Array.from({ length: n }, () => cabo()), FOLGADA, false).limite;

  it("1 condutor → 53%", () => expect(limiteCom(1)).toBe(53));
  it("2 ou mais → 40%, sem a faixa de 31% que só existe no eletroduto", () => {
    expect(limiteCom(2)).toBe(40);
    expect(limiteCom(3)).toBe(40);
    expect(limiteCom(30)).toBe(40);
  });

  it("trifólio sozinho são 3 condutores → 40%", () => {
    expect(computeOccupancy([cabo({ trifolio: true })], FOLGADA, false).limite).toBe(40);
  });
});

describe("computeOccupancy — veredito", () => {
  // Dois condutores em calha: limite 40%.
  const doisCabos = [cabo(), cabo()];
  const areaDois = area(10) * 2;

  it("aprova abaixo do limite", () => {
    const r = computeOccupancy(doisCabos, areaDois / 0.399, false);
    expect(r.ocupacao).toBeCloseTo(39.9, 6);
    expect(r.dentroLimite).toBe(true);
  });

  it("reprova acima do limite", () => {
    const r = computeOccupancy(doisCabos, areaDois / 0.401, false);
    expect(r.ocupacao).toBeCloseTo(40.1, 6);
    expect(r.dentroLimite).toBe(false);
  });

  it("o veredito segue o limite do próprio caso, não um número fixo", () => {
    // 35% de ocupação: passa no eletroduto com 1 condutor (53%), reprova com
    // 2 (31%) — mesma geometria, veredito diferente.
    const um = computeOccupancy([cabo({ d: 10 })], area(10) / 0.35, true);
    const dois = computeOccupancy(doisCabos, areaDois / 0.35, true);
    expect(um.ocupacao).toBeCloseTo(35, 6);
    expect(dois.ocupacao).toBeCloseTo(35, 6);
    expect(um.dentroLimite).toBe(true);
    expect(dois.dentroLimite).toBe(false);
  });
});
