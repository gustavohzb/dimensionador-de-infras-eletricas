import { describe, it, expect } from "vitest";
import { parseTabelaNG, estadosDaTabela, cidadesDoEstado, buscarNG } from "./importNG";

const TRECHO = [
  "Município\tUF\tNG",
  "Abadia de Goiás\tGO\t14",
  "Abadia dos Dourados\tMG\t12",
  "Abadiânia\tGO\t16",
  "Abaeté\tMG\t14",
  "Abaetetuba\tPA\t24",
].join("\n");

describe("parseTabelaNG", () => {
  it("lê linhas Município | UF | N_G separadas por TAB", () => {
    const { linhas, avisos } = parseTabelaNG(TRECHO);
    expect(avisos).toEqual([]);
    expect(linhas).toHaveLength(5);
    expect(linhas[0]).toEqual({ municipio: "Abadia de Goiás", uf: "GO", ng: 14 });
    expect(linhas[4]).toEqual({ municipio: "Abaetetuba", uf: "PA", ng: 24 });
  });

  it("descarta o cabeçalho", () => {
    const { linhas } = parseTabelaNG(TRECHO);
    expect(linhas.some((l) => l.municipio.toLowerCase() === "município")).toBe(false);
  });

  it("aceita ponto e vírgula como separador", () => {
    const { linhas } = parseTabelaNG("Acari;RN;8\nAcauã;PI;4");
    expect(linhas).toEqual([
      { municipio: "Acari", uf: "RN", ng: 8 },
      { municipio: "Acauã", uf: "PI", ng: 4 },
    ]);
  });

  it("aceita vírgula decimal no N_G", () => {
    const { linhas } = parseTabelaNG("Cidade X\tSP\t12,5");
    expect(linhas[0].ng).toBe(12.5);
  });

  it("linha malformada vira aviso e é pulada", () => {
    const { linhas, avisos } = parseTabelaNG("Boa\tSP\t10\nRuim sem colunas\nOutra\tRJ\tabc");
    expect(linhas).toHaveLength(1);
    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toMatch(/Linha 2/);
    expect(avisos[1]).toMatch(/Linha 3/);
  });

  it("normaliza a UF para maiúsculas e ignora linhas vazias", () => {
    const { linhas } = parseTabelaNG("Cidade\tsp\t10\n\n\nOutra\t rj \t8");
    expect(linhas.map((l) => l.uf)).toEqual(["SP", "RJ"]);
  });

  it("a última ocorrência de um município repetido vence", () => {
    const { linhas } = parseTabelaNG("Cidade\tSP\t10\nCidade\tSP\t20");
    expect(linhas).toHaveLength(1);
    expect(linhas[0].ng).toBe(20);
  });

  it("texto vazio não produz linhas", () => {
    expect(parseTabelaNG("").linhas).toEqual([]);
    expect(parseTabelaNG("   \n  ").linhas).toEqual([]);
  });
});

describe("consulta da tabela", () => {
  const { linhas } = parseTabelaNG(TRECHO);

  it("lista os estados em ordem alfabética, sem repetir", () => {
    expect(estadosDaTabela(linhas)).toEqual(["GO", "MG", "PA"]);
  });

  it("lista as cidades de um estado em ordem alfabética", () => {
    expect(cidadesDoEstado(linhas, "GO")).toEqual(["Abadia de Goiás", "Abadiânia"]);
    expect(cidadesDoEstado(linhas, "PA")).toEqual(["Abaetetuba"]);
    expect(cidadesDoEstado(linhas, "XX")).toEqual([]);
  });

  it("ordena cidades respeitando acentos", () => {
    const { linhas: l } = parseTabelaNG("Órgãos\tRJ\t8\nAcari\tRJ\t6\nZumbi\tRJ\t4");
    expect(cidadesDoEstado(l, "RJ")).toEqual(["Acari", "Órgãos", "Zumbi"]);
  });

  it("busca o N_G de um município", () => {
    expect(buscarNG(linhas, "MG", "Abaeté")).toBe(14);
    expect(buscarNG(linhas, "GO", "Abadiânia")).toBe(16);
    expect(buscarNG(linhas, "GO", "Inexistente")).toBeNull();
  });
});
