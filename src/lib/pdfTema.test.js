import { describe, it, expect } from "vitest";
import { TEMA, ajustarLargura, distribuirColunas } from "./pdfTema";

// Medidor falso: 1 mm por caractere. Evita instanciar um documento jsPDF só
// para medir texto — a função recebe o medidor justamente para ser testável.
const medir = (t) => t.length;

describe("ajustarLargura", () => {
  it("texto que cabe volta intacto", () => {
    expect(ajustarLargura("AL-01", 10, medir)).toBe("AL-01");
  });

  it("texto na largura exata volta intacto", () => {
    expect(ajustarLargura("AL-01", 5, medir)).toBe("AL-01");
  });

  it("texto que não cabe volta truncado com reticência e dentro do limite", () => {
    const r = ajustarLargura("Bomba de recalque 01", 10, medir);
    expect(r.endsWith("…")).toBe(true);
    expect(medir(r)).toBeLessThanOrEqual(10);
    expect("Bomba de recalque 01".startsWith(r.slice(0, -1))).toBe(true);
  });

  // Sem o piso de 1 caractere o laço rodaria para sempre numa largura em que
  // nem a reticência sozinha cabe.
  it("largura pequena demais não entra em laço infinito", () => {
    expect(ajustarLargura("Bomba", 0.5, medir)).toBe("B…");
  });

  it("texto vazio volta vazio", () => {
    expect(ajustarLargura("", 10, medir)).toBe("");
  });
});

describe("distribuirColunas", () => {
  it("acumula as posições x a partir de x0", () => {
    const { xs } = distribuirColunas([10, 20, 30], 12, 273);
    expect(xs).toEqual([12, 22, 42]);
  });

  it("soma a largura total e o que sobra da largura útil", () => {
    const { total, sobra } = distribuirColunas([10, 20, 30], 12, 100);
    expect(total).toBe(60);
    expect(sobra).toBe(40);
  });

  // Sobra negativa é o sinal de que as colunas não cabem na página. Quem
  // chama decide o que fazer; o helper só reporta.
  it("sobra fica negativa quando as colunas estouram a largura útil", () => {
    expect(distribuirColunas([200, 200], 12, 273).sobra).toBe(-127);
  });

  it("lista vazia devolve total zero", () => {
    expect(distribuirColunas([], 12, 273)).toEqual({ xs: [], total: 0, sobra: 273 });
  });
});

describe("TEMA", () => {
  it("traz as cores como triplas RGB", () => {
    expect(TEMA.copper).toEqual([180, 98, 42]);
    expect(TEMA.ok).toEqual([5, 150, 105]);
    expect(TEMA.erro).toEqual([220, 38, 38]);
  });

  // Congelado porque as cores são espalhadas por spread (`...TEMA.copper`) em
  // dezenas de chamadas; uma mutação acidental corromperia o resto da sessão.
  it("está congelado", () => {
    expect(Object.isFrozen(TEMA)).toBe(true);
  });
});
