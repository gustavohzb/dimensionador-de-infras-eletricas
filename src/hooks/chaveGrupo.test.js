// A chave da linha em "Cabos no trecho" serve para agrupar E para remover. Se
// ela não separasse trifólio encostado de trifólio 2D, as duas linhas virariam
// uma só — e o Remover de uma apagaria cabo da outra.
import { describe, it, expect } from "vitest";
import { chaveGrupo } from "./useCableTray";

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
