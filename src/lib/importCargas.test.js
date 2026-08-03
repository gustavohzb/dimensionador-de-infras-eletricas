import { describe, it, expect } from "vitest";
import { parseLista, parseNumero, parsePotencia, parseTensao, detectarColunas } from "./importCargas";

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

describe("detectarColunas", () => {
  it("texto vira descrição e número vira potência", () => {
    const grade = parseLista("Exaustor\t15\nBomba\t7,5");
    expect(detectarColunas(grade)).toEqual({
      papeis: ["descricao", "potencia"],
      temCabecalho: false,
    });
  });
  it("coluna única numérica é potência", () => {
    expect(detectarColunas(parseLista("15\n7,5")).papeis).toEqual(["potencia"]);
  });
  it("unidades misturadas na mesma coluna ainda é potência", () => {
    expect(detectarColunas(parseLista("15 CV\n3,7 kW")).papeis).toEqual(["potencia"]);
  });
  it("coluna com só 127/220/380/440/660 é tensão", () => {
    const grade = parseLista("Exaustor\t15\t380\nBomba\t7,5\t220");
    expect(detectarColunas(grade).papeis).toEqual(["descricao", "potencia", "tensao"]);
  });
  it("segunda coluna numérica genérica vira distância", () => {
    const grade = parseLista("Exaustor\t15\t45\nBomba\t7,5\t80");
    expect(detectarColunas(grade).papeis).toEqual(["descricao", "potencia", "distancia"]);
  });
  it("TAG no padrão XX-99 é reconhecida", () => {
    const grade = parseLista("AL-01\tExaustor\t15\nAL-02\tBomba\t7,5");
    expect(detectarColunas(grade).papeis).toEqual(["tag", "descricao", "potencia"]);
  });
  it("cabeçalho é detectado e usado como dica de mapeamento", () => {
    const grade = parseLista("Descrição\tPotência (kW)\tDistância\nExaustor\t15\t45");
    const r = detectarColunas(grade);
    expect(r.temCabecalho).toBe(true);
    expect(r.papeis).toEqual(["descricao", "potencia", "distancia"]);
  });
  it("lista de uma linha só não tem cabeçalho", () => {
    expect(detectarColunas(parseLista("Exaustor\t15")).temCabecalho).toBe(false);
  });
  it("corrente nunca é detectada sozinha", () => {
    // Coluna de números genéricos vira potência/distância — corrente só à mão.
    const { papeis } = detectarColunas(parseLista("42\n18"));
    expect(papeis).not.toContain("corrente");
  });
});
