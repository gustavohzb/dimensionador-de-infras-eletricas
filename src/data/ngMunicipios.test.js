import { describe, it, expect } from "vitest";
import {
  NG_MUNICIPIOS,
  estadosNG,
  cidadesNG,
  buscarNG,
  totalMunicipios,
} from "./ngMunicipios";

describe("tabela de N_G por município", () => {
  it("cobre as 27 unidades federativas", () => {
    expect(estadosNG()).toHaveLength(27);
    expect(estadosNG()).toContain("DF");
  });

  it("tem os 5.572 municípios do país", () => {
    expect(totalMunicipios()).toBe(5572);
  });

  it("dá um N_G válido a todo município", () => {
    // O mapa normativo tem resolução de 2 raios/km²/ano; um valor ímpar ou
    // fracionário indicaria dado corrompido na geração do arquivo.
    for (const [uf, lista] of Object.entries(NG_MUNICIPIOS)) {
      for (const [nome, ng] of lista) {
        expect(typeof nome, `${uf} ${nome}`).toBe("string");
        expect(Number.isInteger(ng), `${uf} ${nome} = ${ng}`).toBe(true);
        expect(ng, `${uf} ${nome}`).toBeGreaterThan(0);
        expect(ng % 2, `${uf} ${nome} = ${ng}`).toBe(0);
      }
    }
  });

  it("não repete município dentro de um estado", () => {
    for (const [uf, lista] of Object.entries(NG_MUNICIPIOS)) {
      const nomes = lista.map(([nome]) => nome);
      expect(new Set(nomes).size, uf).toBe(nomes.length);
    }
  });

  it("lista as cidades em ordem alfabética respeitando acentos", () => {
    const al = cidadesNG("AL");
    // Sem localeCompare, "Água Branca" cairia depois de "Xingó".
    expect(al[0]).toBe("Água Branca");
    expect(al).toEqual([...al].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("busca o N_G de um município", () => {
    expect(buscarNG("DF", "Brasília")).toBe(NG_MUNICIPIOS.DF[0][1]);
    expect(buscarNG("AC", "Rio Branco")).toBe(14);
  });

  it("devolve null para estado ou município desconhecido", () => {
    expect(buscarNG("XX", "Qualquer")).toBeNull();
    expect(buscarNG("AC", "Não Existe")).toBeNull();
    expect(cidadesNG("XX")).toEqual([]);
  });
});
