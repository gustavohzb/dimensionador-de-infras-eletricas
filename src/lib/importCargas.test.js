import { describe, it, expect } from "vitest";
import { parseLista, parseNumero, parsePotencia, parseTensao } from "./importCargas";

describe("parseNumero", () => {
  it("aceita vírgula decimal e ponto de milhar", () => {
    expect(parseNumero("3,7")).toBe(3.7);
    expect(parseNumero("7.5")).toBe(7.5);
    expect(parseNumero("1.234,5")).toBe(1234.5);
  });
  it("rejeita o que não é número", () => {
    expect(parseNumero("")).toBeNull();
    expect(parseNumero("abc")).toBeNull();
    expect(parseNumero(null)).toBeNull();
  });
});

describe("parsePotencia", () => {
  it("lê a unidade da própria célula quando presente", () => {
    expect(parsePotencia("15 CV")).toEqual({ valor: 15, unidade: "CV" });
    expect(parsePotencia("3,7kW")).toEqual({ valor: 3.7, unidade: "kW" });
    expect(parsePotencia("500 w")).toEqual({ valor: 500, unidade: "W" });
    expect(parsePotencia("10 kVA")).toEqual({ valor: 10, unidade: "kVA" });
  });
  it("número puro vem sem unidade", () => {
    expect(parsePotencia("15")).toEqual({ valor: 15, unidade: null });
  });
  it("texto não é potência", () => {
    expect(parsePotencia("Exaustor")).toBeNull();
    expect(parsePotencia("")).toBeNull();
  });
});

describe("parseTensao", () => {
  it("aceita o número com ou sem V", () => {
    expect(parseTensao("380")).toBe(380);
    expect(parseTensao("380 V")).toBe(380);
    expect(parseTensao("220v")).toBe(220);
  });
  it("rejeita texto e unidades de potência", () => {
    expect(parseTensao("15 CV")).toBeNull();
    expect(parseTensao("Exaustor")).toBeNull();
  });
});

describe("parseLista", () => {
  it("separa por TAB (colar do Excel)", () => {
    expect(parseLista("Exaustor\t15 CV\nBomba\t7,5 CV")).toEqual([
      ["Exaustor", "15 CV"],
      ["Bomba", "7,5 CV"],
    ]);
  });
  it("separa por ponto e vírgula quando não há TAB", () => {
    expect(parseLista("Exaustor;15\nBomba;7,5")).toEqual([
      ["Exaustor", "15"],
      ["Bomba", "7,5"],
    ]);
  });
  it("coluna única, ignorando linhas vazias", () => {
    expect(parseLista("15\n\n7,5\n")).toEqual([["15"], ["7,5"]]);
  });
  it("completa linhas curtas com células vazias", () => {
    expect(parseLista("A\t1\t380\nB\t2")).toEqual([
      ["A", "1", "380"],
      ["B", "2", ""],
    ]);
  });
  it("texto vazio vira lista vazia", () => {
    expect(parseLista("")).toEqual([]);
    expect(parseLista("   \n  ")).toEqual([]);
  });
});
