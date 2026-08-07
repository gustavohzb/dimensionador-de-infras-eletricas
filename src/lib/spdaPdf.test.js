import { describe, it, expect } from "vitest";
import { rowsAreasExposicao, rowsNumeroEventos } from "./spdaPdf";

const resultadoBase = {
  eventos: {
    ad: 9127.43,
    am: 865398.16,
    porLinha: [
      { id: "l1", al: 40000, ai: 4000000, adj: null, nl: 0.32, ni: 32, ndj: 0 },
    ],
  },
};

describe("rowsAreasExposicao", () => {
  it("inclui A_D, A_M e A_L/A_I por linha, com as refs de equação corretas", () => {
    const linhas = rowsAreasExposicao(resultadoBase);
    expect(linhas.find((l) => l.simbolo === "A_D")).toMatchObject({ resultado: 9127.43, ref: "A.1" });
    expect(linhas.find((l) => l.simbolo === "A_M")).toMatchObject({ resultado: 865398.16, ref: "A.6" });
    expect(linhas.find((l) => l.simbolo === "A_L")).toMatchObject({ resultado: 40000, ref: "A.8" });
    expect(linhas.find((l) => l.simbolo === "A_I")).toMatchObject({ resultado: 4000000, ref: "A.10" });
    expect(linhas.find((l) => l.simbolo === "A_DJ")).toBeUndefined();
  });

  it("com estrutura adjacente, inclui A_DJ", () => {
    const comAdj = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], adj: 1225 }] },
    };
    const linha = rowsAreasExposicao(comAdj).find((l) => l.simbolo === "A_DJ");
    expect(linha).toMatchObject({ resultado: 1225, ref: "A.1" });
  });
});

describe("rowsNumeroEventos", () => {
  it("inclui N_D, N_M e N_L/N_I por linha, com as refs de equação corretas", () => {
    const linhas = rowsNumeroEventos(resultadoBase);
    expect(linhas.find((l) => l.simbolo === "N_D" && l.parametro === "Estrutura")).toMatchObject({ ref: "A.3" });
    expect(linhas.find((l) => l.simbolo === "N_M")).toMatchObject({ ref: "A.5" });
    expect(linhas.find((l) => l.simbolo === "N_L")).toMatchObject({ resultado: 0.32, ref: "A.7" });
    expect(linhas.find((l) => l.simbolo === "N_I")).toMatchObject({ resultado: 32, ref: "A.9" });
    expect(linhas.find((l) => l.simbolo === "N_DJ")).toBeUndefined();
  });

  it("com N_DJ diferente de zero, inclui a linha N_DJ", () => {
    const comNdj = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], ndj: 0.05 }] },
    };
    const linha = rowsNumeroEventos(comNdj).find((l) => l.simbolo === "N_DJ");
    expect(linha).toMatchObject({ resultado: 0.05, ref: "A.4" });
  });
});
