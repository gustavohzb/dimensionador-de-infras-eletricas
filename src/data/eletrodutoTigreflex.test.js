// Eletroduto corrugado flexível PVC Tigreflex (Tigre), ABNT NBR 15465.
// Diâmetros conferidos à mão contra a Ficha Técnica Tigreflex Amarelo
// (set/2025), tabela "Dimensões (mm)" — não copiados da saída do código.

import { describe, it, expect } from "vitest";
import { TIGREFLEX_SIZES, ELETRODUTO_NORMAS, getDimensions } from "./corfioHEPR";
import { findBestFits } from "../lib/reverseSearch";

describe("Diâmetros conferem com a ficha técnica", () => {
  it("3 bitolas, Di direto da tabela (DE 20/25/32, Di 15/19,5/25,7)", () => {
    expect(TIGREFLEX_SIZES).toEqual([
      { bitola: '1/2"', dn: 20, od: 20, id: 15, wall: 2.5 },
      { bitola: '3/4"', dn: 25, od: 25, id: 19.5, wall: 2.8 },
      { bitola: '1"', dn: 32, od: 32, id: 25.7, wall: 3.2 },
    ]);
  });
});

describe("Integração com o cadastro de eletrodutos", () => {
  it("está em ELETRODUTO_NORMAS", () => {
    expect(ELETRODUTO_NORMAS.map((n) => n.id)).toContain("tigreflex");
  });

  it("getDimensions resolve como duto, 3 bitolas, default 3/4\" (19,5mm)", () => {
    const dim = getDimensions("eletroduto", "tigreflex");
    expect(dim.kind).toBe("duct");
    expect(dim.sizes).toHaveLength(3);
    expect(dim.default).toEqual({ w: 19.5, h: 19.5 });
  });
});

describe("Busca reversa considera o Tigreflex", () => {
  it("findBestFits devolve opções na norma tigreflex para cabos pequenos", () => {
    // 2 unipolares de 2,5mm² (Ø5,35) cabem folgado até na menor bitola (Di 15mm).
    const cables = [
      { id: 0, section: 2.5, d: 5.35, type: "unipolar", vias: 1 },
      { id: 1, section: 2.5, d: 5.35, type: "unipolar", vias: 1 },
    ];
    const normas = findBestFits(cables).map((r) => r.eletrodutoNorma);
    expect(normas).toContain("tigreflex");
  });
});
