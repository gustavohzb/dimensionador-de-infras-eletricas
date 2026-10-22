import { describe, it, expect } from "vitest";
import { secaoUtil, espessuraChapa, rotuloDimensao, CHAPA_PADRAO } from "./secaoUtil";

describe("secaoUtil", () => {
  it("leito 100 de altura tem 75 úteis (catálogo RP 2503B)", () => {
    expect(secaoUtil("leito", 300, 100, "14").h).toBe(75);
  });

  it("desconta a chapa das duas longarinas na largura", () => {
    expect(secaoUtil("leito", 300, 100, "14").w).toBe(296.2);
    expect(secaoUtil("leito", 300, 100, "16").w).toBe(297);
    expect(secaoUtil("leito", 300, 100, "18").w).toBe(297.6);
  });

  it("sem chapa informada usa a #14, a mais conservadora", () => {
    expect(CHAPA_PADRAO).toBe("14");
    expect(secaoUtil("leito", 100, 100).w).toBe(96.2);
  });

  it("chapa desconhecida cai na padrão em vez de quebrar a conta", () => {
    expect(espessuraChapa("99")).toBe(1.9);
  });

  it("outras infraestruturas não mudam", () => {
    for (const t of ["eletrocalha", "perfilado", "aramado"]) {
      expect(secaoUtil(t, 300, 100, "14")).toEqual({ w: 300, h: 100 });
    }
  });
});

describe("rotuloDimensao", () => {
  it("leito mostra a nominal e a útil", () => {
    expect(rotuloDimensao("leito", 300, 100, 296.2, 75)).toBe("300 × 100 mm (útil 296,2 × 75 mm)");
  });

  it("calha mostra só a nominal", () => {
    expect(rotuloDimensao("eletrocalha", 300, 100, 300, 100)).toBe("300 × 100 mm");
  });
});
