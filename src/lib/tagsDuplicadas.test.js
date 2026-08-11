import { describe, it, expect } from "vitest";
import { marcarTagsDuplicadas } from "./tagsDuplicadas";

describe("marcarTagsDuplicadas", () => {
  it("nenhuma repetida: tudo false", () => {
    expect(marcarTagsDuplicadas(["A", "B", "C"])).toEqual([false, false, false]);
  });

  it("marca todas as ocorrências da tag repetida, não só a segunda", () => {
    expect(marcarTagsDuplicadas(["A", "B", "A"])).toEqual([true, false, true]);
  });

  it("três ocorrências: todas marcadas", () => {
    expect(marcarTagsDuplicadas(["A", "A", "A"])).toEqual([true, true, true]);
  });

  it("ignora diferença de maiúscula/minúscula", () => {
    expect(marcarTagsDuplicadas(["QDLF-01", "qdlf-01"])).toEqual([true, true]);
  });

  it("ignora espaço nas pontas", () => {
    expect(marcarTagsDuplicadas(["QDLF-01", " QDLF-01 "])).toEqual([true, true]);
  });

  it("tag vazia ou nula nunca conta como duplicata, mesmo repetida", () => {
    expect(marcarTagsDuplicadas(["", "", null, undefined])).toEqual([false, false, false, false]);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(marcarTagsDuplicadas([])).toEqual([]);
  });

  it("preserva a posição original de cada tag", () => {
    expect(marcarTagsDuplicadas(["X", "A", "B", "A", "Y"])).toEqual([false, true, false, true, false]);
  });
});
