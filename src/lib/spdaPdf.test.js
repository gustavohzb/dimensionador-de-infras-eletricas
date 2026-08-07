import { describe, it, expect } from "vitest";
import { rowsAreasExposicao, rowsNumeroEventos, rowsProbabilidades, rowsPerdas } from "./spdaPdf";
import { defaultEntrada } from "./spdaRisco";

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

describe("rowsProbabilidades", () => {
  const resultado = {
    probs: {
      pa: 0.02, pb: 0.05, peb: 0.05,
      pc: 0.031, pm: 0.0004,
      porSistema: [{ id: "s1", pc: 0.02, pm: 0.0004 }],
      porLinha: [{ id: "l1", pu: 0.0025, pv: 0.05, pw: 0.02, pz: 0.02 }],
    },
  };

  it("inclui P_A, P_B e P_EB da estrutura com as refs corretas", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.find((l) => l.simbolo === "P_A")).toMatchObject({ resultado: 0.02, ref: "B.1" });
    expect(linhas.find((l) => l.simbolo === "P_B")).toMatchObject({ resultado: 0.05, ref: "B.2" });
    expect(linhas.find((l) => l.simbolo === "P_EB")).toMatchObject({ resultado: 0.05, ref: "B.7" });
  });

  it("inclui P_C e P_M por sistema interno", () => {
    const linhas = rowsProbabilidades(resultado);
    const pc = linhas.find((l) => l.simbolo === "P_C" && l.parametro.includes("S1"));
    const pm = linhas.find((l) => l.simbolo === "P_M" && l.parametro.includes("S1"));
    expect(pc).toMatchObject({ resultado: 0.02, ref: "B.2" });
    expect(pm).toMatchObject({ resultado: 0.0004, ref: "B.4" });
  });

  it("com um só sistema, não duplica com a linha composta", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.filter((l) => l.parametro === "Composto (todos os sistemas)")).toHaveLength(0);
  });

  it("com mais de um sistema, inclui a linha composta (equações 12 e 13)", () => {
    const doisSistemas = {
      probs: {
        ...resultado.probs,
        porSistema: [{ id: "s1", pc: 0.02, pm: 0.0004 }, { id: "s2", pc: 0.01, pm: 0.0002 }],
      },
    };
    const linhas = rowsProbabilidades(doisSistemas);
    const compostoPc = linhas.find((l) => l.parametro === "Composto (todos os sistemas)" && l.simbolo === "P_C");
    expect(compostoPc).toMatchObject({ resultado: 0.031, ref: "eq. 12" });
  });

  it("inclui P_U, P_V, P_W e P_Z por linha", () => {
    const linhas = rowsProbabilidades(resultado);
    expect(linhas.find((l) => l.simbolo === "P_U")).toMatchObject({ resultado: 0.0025, ref: "B.8" });
    expect(linhas.find((l) => l.simbolo === "P_V")).toMatchObject({ resultado: 0.05, ref: "B.9" });
    expect(linhas.find((l) => l.simbolo === "P_W")).toMatchObject({ resultado: 0.02, ref: "B.10" });
    expect(linhas.find((l) => l.simbolo === "P_Z")).toMatchObject({ resultado: 0.02, ref: "B.11" });
  });
});

describe("rowsPerdas", () => {
  const resultado = { perdas: { la: 0.0001, lb: 0.0002, lc: 0.00003 } };

  it("inclui L_A, L_B e L_C do L1, sem L3 quando não há patrimônio cultural", () => {
    const entrada = defaultEntrada();
    const linhas = rowsPerdas(entrada, resultado);
    expect(linhas.find((l) => l.simbolo === "L_A")).toMatchObject({ resultado: 0.0001, ref: "C.1/C.2" });
    expect(linhas.find((l) => l.simbolo === "L_B" && l.parametro.includes("L1"))).toMatchObject({ resultado: 0.0002, ref: "C.3" });
    expect(linhas.find((l) => l.simbolo === "L_C")).toMatchObject({ resultado: 0.00003, ref: "C.4" });
    expect(linhas.filter((l) => l.parametro.includes("L3"))).toHaveLength(0);
  });

  it("com patrimônio cultural, inclui L_B do L3 pela equação C.7", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.patrimonioCultural = true;
    entrada.estrutura.providencias = "nenhuma";
    entrada.estrutura.riscoIncendio = "incendioNormal";
    entrada.estrutura.cz = 500000;
    entrada.estrutura.ct = 2000000;
    const linhas = rowsPerdas(entrada, resultado);
    const l3 = linhas.find((l) => l.parametro.includes("L3"));
    expect(l3).toMatchObject({ simbolo: "L_B", ref: "C.7" });
    // r_p=1 (nenhuma providência) × r_f=0,01 (incêndio normal) × L_F=0,1 × (500000/2000000)
    expect(l3.resultado).toBeCloseTo(1 * 0.01 * 0.1 * (500000 / 2000000), 8);
  });
});
