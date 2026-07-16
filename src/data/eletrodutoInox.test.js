// Eletroduto de aço inox, séries 10S e 40S (ASTM A312 / ASME B36.19).
// Os diâmetros internos abaixo foram calculados à mão a partir do catálogo
// Elecon (od − 2×parede), não copiados da saída do código — senão o teste só
// confirmaria o próprio erro de transcrição.

import { describe, it, expect } from "vitest";
import { INOX_SCH10_SIZES, INOX_SCH40_SIZES, ELETRODUTO_NORMAS, getDimensions } from "./corfioHEPR";
import { findBestFits } from "../lib/reverseSearch";

// Ø interno esperado por bitola, conferido à mão contra o catálogo.
const SCH10_ID = { '1/2"': 17.1, '3/4"': 22.5, '1"': 28.2, '1.1/4"': 36.9, '1.1/2"': 42.8, '2"': 54.8 };
const SCH40_ID = {
  '1/2"': 15.8, '3/4"': 21.0, '1"': 26.9, '1.1/4"': 35.3, '1.1/2"': 40.9,
  '2"': 52.5, '2.1/2"': 62.7, '3"': 77.9, '4"': 102.3,
};

const idPorBitola = (sizes) => Object.fromEntries(sizes.map((s) => [s.bitola, s.id]));

describe("Diâmetro interno derivado de od − 2×parede", () => {
  it("Sch 10 confere com o catálogo em todas as bitolas", () => {
    expect(idPorBitola(INOX_SCH10_SIZES)).toEqual(SCH10_ID);
  });

  it("Sch 40 confere com o catálogo em todas as bitolas", () => {
    expect(idPorBitola(INOX_SCH40_SIZES)).toEqual(SCH40_ID);
  });
});

describe("Faixa de bitolas — segue o catálogo, não a norma", () => {
  // O Sch 10 para em 2" porque é onde a Elecon para. A B36.19 define a série
  // acima disso; completar a tabela por ela ofereceria bitola que não se compra
  // como eletroduto. Se alguém estender, que seja com esta conversa aberta.
  it("Sch 10 tem 6 bitolas, de 1/2\" a 2\"", () => {
    expect(INOX_SCH10_SIZES).toHaveLength(6);
    expect(INOX_SCH10_SIZES.at(-1).bitola).toBe('2"');
  });

  it("Sch 40 tem 9 bitolas, de 1/2\" a 4\"", () => {
    expect(INOX_SCH40_SIZES).toHaveLength(9);
    expect(INOX_SCH40_SIZES.at(-1).bitola).toBe('4"');
  });
});

describe("Invariante físico: parede fina dá mais espaço", () => {
  it("em toda bitola comum, o Ø interno do Sch 10 é maior que o do Sch 40", () => {
    const sch40 = idPorBitola(INOX_SCH40_SIZES);
    INOX_SCH10_SIZES.forEach((s) => {
      expect(s.id).toBeGreaterThan(sch40[s.bitola]);
    });
  });
});

describe("Integração com o cadastro de eletrodutos", () => {
  it("as duas séries estão em ELETRODUTO_NORMAS", () => {
    const ids = ELETRODUTO_NORMAS.map((n) => n.id);
    expect(ids).toContain("inoxSch10");
    expect(ids).toContain("inoxSch40");
  });

  it("getDimensions resolve o Sch 10 como duto, com default 3/4\"", () => {
    const dim = getDimensions("eletroduto", "inoxSch10");
    expect(dim.kind).toBe("duct");
    expect(dim.sizes).toHaveLength(6);
    expect(dim.default).toEqual({ w: SCH10_ID['3/4"'], h: SCH10_ID['3/4"'] });
  });

  it("getDimensions resolve o Sch 40 como duto, com 9 bitolas", () => {
    const dim = getDimensions("eletroduto", "inoxSch40");
    expect(dim.kind).toBe("duct");
    expect(dim.sizes).toHaveLength(9);
  });
});

describe("Busca reversa considera o inox", () => {
  // Decisão de projeto: o inox compete na busca Auto como as demais normas.
  it("findBestFits devolve opções nas duas séries de inox", () => {
    // 3 unipolares de 10mm² (Ø7,4) cabem folgado até nas bitolas pequenas.
    const cables = Array.from({ length: 3 }, (_, i) => ({ id: i, section: 10, d: 7.4, type: "unipolar", vias: 1 }));
    const normas = findBestFits(cables).map((r) => r.eletrodutoNorma);
    expect(normas).toContain("inoxSch10");
    expect(normas).toContain("inoxSch40");
  });
});
