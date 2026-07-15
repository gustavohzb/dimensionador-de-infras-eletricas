// Trava o catálogo físico Corfio Alumínio (XLPE 90°C, NBR 7287) e o
// comportamento material-aware de getDiameter. Os diâmetros vêm do PDF do
// fabricante (ALUMINIO Corfio.pdf), conferidos à mão.

import { describe, it, expect } from "vitest";
import { getDiameter, corfioAluminio, corfioHEPR } from "./corfioHEPR";

describe("getDiameter — alumínio", () => {
  it("unipolar de alumínio usa o diâmetro do catálogo de alumínio", () => {
    expect(getDiameter(25, "unipolar", 1, "aluminio")).toBe(10.5);
    expect(getDiameter(240, "unipolar", 1, "aluminio")).toBe(26.8);
  });

  it("multipolar de alumínio (2/3/4 vias) usa o catálogo de alumínio", () => {
    expect(getDiameter(35, "multipolar", 2, "aluminio")).toBe(21.7);
    expect(getDiameter(35, "multipolar", 3, "aluminio")).toBe(23.2);
    expect(getDiameter(35, "multipolar", 4, "aluminio")).toBe(25.8);
  });

  it("mesma seção tem diâmetro distinto entre cobre e alumínio", () => {
    expect(getDiameter(25, "unipolar", 1, "cobre")).not.toBe(getDiameter(25, "unipolar", 1, "aluminio"));
  });

  it("default é cobre quando o material é omitido", () => {
    expect(getDiameter(25, "unipolar", 1)).toBe(corfioHEPR.unipolar[25]);
  });

  it("gaps do catálogo de alumínio falham alto", () => {
    // alumínio não existe abaixo de 10mm²
    expect(() => getDiameter(4, "unipolar", 1, "aluminio")).toThrow(/alumínio/);
    // multipolar de alumínio só até 35mm²
    expect(() => getDiameter(50, "multipolar", 3, "aluminio")).toThrow(/alumínio/);
    // alumínio não tem 5 vias
    expect(() => getDiameter(16, "multipolar", 5, "aluminio")).toThrow(/alumínio/);
  });

  it("o catálogo de alumínio tem exatamente as faixas esperadas", () => {
    expect(Object.keys(corfioAluminio.unipolar).map(Number)).toEqual([10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]);
    expect(Object.keys(corfioAluminio.multipolar)).toEqual(["2", "3", "4"]); // sem 5 vias
    for (const vias of [2, 3, 4]) {
      expect(Object.keys(corfioAluminio.multipolar[vias]).map(Number)).toEqual([10, 16, 25, 35]);
    }
  });
});
