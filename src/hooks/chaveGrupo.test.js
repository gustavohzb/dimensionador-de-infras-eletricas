// A chave da linha em "Cabos no trecho" serve para agrupar E para remover. Se
// ela não separasse trifólio encostado de trifólio 2D, as duas linhas virariam
// uma só — e o Remover de uma apagaria cabo da outra.
import { describe, it, expect } from "vitest";
import { chaveGrupo, agruparIguais, temGruposParaAgrupar } from "./useCableTray";

const trif = (over = {}) => ({ type: "unipolar", section: 6, vias: 1, trifolio: true, material: "cobre", ...over });

describe("chaveGrupo", () => {
  it("separa trifólio encostado de trifólio 2D da mesma seção", () => {
    expect(chaveGrupo(trif())).not.toBe(chaveGrupo(trif({ espacado: true })));
  });

  it("separa trifólio de unipolar solto", () => {
    expect(chaveGrupo(trif())).not.toBe(chaveGrupo(trif({ trifolio: false })));
  });

  it("agrupa dois trifólios 2D iguais na mesma linha", () => {
    expect(chaveGrupo(trif({ espacado: true }))).toBe(chaveGrupo(trif({ espacado: true })));
  });

  it("espacado num cabo que não é trifólio não muda nada", () => {
    const solto = trif({ trifolio: false });
    expect(chaveGrupo({ ...solto, espacado: true })).toBe(chaveGrupo(solto));
  });
});

// Importação de planilha e simulação marcam cada ramal com um groupId próprio,
// então cabos idênticos viram dezenas de linhas. "Agrupar iguais" apaga essa
// marca e as linhas de mesma especificação se fundem.
describe("agruparIguais", () => {
  const cabo = (over = {}) => ({ type: "multipolar", section: 2.5, vias: 4, material: "cobre", ...over });

  it("funde cabos iguais vindos de ramais diferentes", () => {
    const cabos = [cabo({ groupId: "imp-1-0-0" }), cabo({ groupId: "imp-1-1-0" })];
    const chaves = new Set(agruparIguais(cabos).map(chaveGrupo));
    expect(chaves.size).toBe(1);
  });

  it("mantém separados cabos de especificação diferente", () => {
    const cabos = [cabo({ groupId: "a" }), cabo({ section: 4, groupId: "b" }), trif({ groupId: "c" }), trif({ espacado: true, groupId: "d" })];
    expect(new Set(agruparIguais(cabos).map(chaveGrupo)).size).toBe(4);
  });

  it("não perde nenhum cabo", () => {
    const cabos = [cabo({ id: 1, groupId: "a" }), cabo({ id: 2 }), trif({ id: 3, groupId: "c" })];
    expect(agruparIguais(cabos).map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("temGruposParaAgrupar só é verdadeiro quando alguma linha se fundiria", () => {
    expect(temGruposParaAgrupar([cabo({ groupId: "a" }), cabo({ groupId: "b" })])).toBe(true);
    expect(temGruposParaAgrupar([cabo(), cabo()])).toBe(false);
    expect(temGruposParaAgrupar([cabo({ groupId: "a" }), cabo({ section: 4, groupId: "b" })])).toBe(false);
  });
});
