import { describe, it, expect } from "vitest";
import { rowsAreasExposicao, rowsNumeroEventos, rowsProbabilidades, rowsPerdas, rowsComponentes, rowsFrequencia, linhasEstrutura, linhasLinhaEletrica, linhasProtecoes, linhasSistemaInterno } from "./spdaPdf";
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
  const entradaBase = defaultEntrada();

  it("inclui A_D, A_M e A_L/A_I por linha, com as refs de equação corretas", () => {
    const linhas = rowsAreasExposicao(entradaBase, resultadoBase);
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
    const linha = rowsAreasExposicao(entradaBase, comAdj).find((l) => l.simbolo === "A_DJ");
    expect(linha).toMatchObject({ resultado: 1225, ref: "A.1" });
  });

  it("com H_P (saliência) definido, a ref de A_D avisa que A.2 pode se aplicar", () => {
    const comHp = { estrutura: { ...entradaBase.estrutura, Hp: 15 } };
    const linhas = rowsAreasExposicao(comHp, resultadoBase);
    expect(linhas.find((l) => l.simbolo === "A_D")).toMatchObject({ ref: "A.1/A.2" });
  });

  it("sem H_P, a ref de A_D permanece só A.1", () => {
    const linhas = rowsAreasExposicao(entradaBase, resultadoBase);
    expect(linhas.find((l) => l.simbolo === "A_D")).toMatchObject({ ref: "A.1" });
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
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], adj: 1225, ndj: 0.05 }] },
    };
    const linha = rowsNumeroEventos(comNdj).find((l) => l.simbolo === "N_DJ");
    expect(linha).toMatchObject({ resultado: 0.05, ref: "A.4" });
  });

  it("com estrutura adjacente declarada (adj != null) mas N_DJ = 0, ainda inclui a linha N_DJ", () => {
    const adjComNdjZero = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], adj: 1225, ndj: 0 }] },
    };
    const linha = rowsNumeroEventos(adjComNdjZero).find((l) => l.simbolo === "N_DJ");
    expect(linha).toMatchObject({ resultado: 0, ref: "A.4" });
  });

  it("sem estrutura adjacente (adj == null), não inclui N_DJ mesmo que o campo ndj esteja ausente", () => {
    const semAdj = {
      eventos: { ...resultadoBase.eventos, porLinha: [{ ...resultadoBase.eventos.porLinha[0], adj: null }] },
    };
    expect(rowsNumeroEventos(semAdj).find((l) => l.simbolo === "N_DJ")).toBeUndefined();
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
  const entradaSemDps = defaultEntrada(); // protecoes.dpsNp === "nenhum" por padrão

  it("inclui P_A, P_B e P_EB da estrutura com as refs corretas", () => {
    const linhas = rowsProbabilidades(entradaSemDps, resultado);
    expect(linhas.find((l) => l.simbolo === "P_A")).toMatchObject({ resultado: 0.02, ref: "B.1" });
    expect(linhas.find((l) => l.simbolo === "P_B")).toMatchObject({ resultado: 0.05, ref: "B.2" });
    expect(linhas.find((l) => l.simbolo === "P_EB")).toMatchObject({ resultado: 0.05, ref: "B.7" });
  });

  it("inclui P_C e P_M por sistema interno", () => {
    const linhas = rowsProbabilidades(entradaSemDps, resultado);
    const pc = linhas.find((l) => l.simbolo === "P_C" && l.parametro.includes("S1"));
    const pm = linhas.find((l) => l.simbolo === "P_M" && l.parametro.includes("S1"));
    expect(pc).toMatchObject({ resultado: 0.02, ref: "B.2" });
    expect(pm).toMatchObject({ resultado: 0.0004, ref: "B.4" });
  });

  it("com um só sistema, não duplica com a linha composta", () => {
    const linhas = rowsProbabilidades(entradaSemDps, resultado);
    expect(linhas.filter((l) => l.parametro === "Composto (todos os sistemas)")).toHaveLength(0);
  });

  it("com mais de um sistema, inclui a linha composta (equações 12 e 13)", () => {
    const doisSistemas = {
      probs: {
        ...resultado.probs,
        porSistema: [{ id: "s1", pc: 0.02, pm: 0.0004 }, { id: "s2", pc: 0.01, pm: 0.0002 }],
      },
    };
    const linhas = rowsProbabilidades(entradaSemDps, doisSistemas);
    const compostoPc = linhas.find((l) => l.parametro === "Composto (todos os sistemas)" && l.simbolo === "P_C");
    expect(compostoPc).toMatchObject({ resultado: 0.031, ref: "eq. 12" });
  });

  it("inclui P_U, P_V, P_W e P_Z por linha", () => {
    const linhas = rowsProbabilidades(entradaSemDps, resultado);
    expect(linhas.find((l) => l.simbolo === "P_U")).toMatchObject({ resultado: 0.0025, ref: "B.8" });
    expect(linhas.find((l) => l.simbolo === "P_V")).toMatchObject({ resultado: 0.05, ref: "B.9" });
    expect(linhas.find((l) => l.simbolo === "P_W")).toMatchObject({ resultado: 0.02, ref: "B.10" });
    expect(linhas.find((l) => l.simbolo === "P_Z")).toMatchObject({ resultado: 0.02, ref: "B.11" });
  });

  it("sem DPS coordenado (dpsNp = nenhum), a equação de P_M é só K_S1..K_S4 (B.4)", () => {
    const linhas = rowsProbabilidades(entradaSemDps, resultado);
    const pm = linhas.find((l) => l.simbolo === "P_M" && l.parametro.includes("S1"));
    expect(pm).toMatchObject({ equacao: "(K_S1×K_S2×K_S3×K_S4)²", ref: "B.4" });
  });

  it("com DPS coordenado, a equação de P_M inclui P_SPD (B.3/B.4)", () => {
    const entradaComDps = { ...entradaSemDps, protecoes: { ...entradaSemDps.protecoes, dpsNp: "npIIIIV" } };
    const linhas = rowsProbabilidades(entradaComDps, resultado);
    const pm = linhas.find((l) => l.simbolo === "P_M" && l.parametro.includes("S1"));
    expect(pm).toMatchObject({ equacao: "P_SPD×(K_S1×K_S2×K_S3×K_S4)²", ref: "B.3/B.4" });
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

describe("linhasEstrutura", () => {
  it("traduz os ids da estrutura padrão em rótulos legíveis", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.ng = 8;
    entrada.estrutura.municipio = "Curitiba";
    entrada.estrutura.uf = "PR";
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.find(([label]) => label === "Município")).toEqual(["Município", "Curitiba/PR"]);
    expect(pares.find(([label]) => label.includes("C_D"))?.[1]).toBe("Isolada: sem objetos nas vizinhanças");
    expect(pares.find(([label]) => label.includes("r_S"))?.[1]).toBe("Robusta: estrutura metálica ou concreto armado");
  });

  it("omite os campos de patrimônio cultural quando a marcação está desligada", () => {
    const entrada = defaultEntrada();
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.some(([label]) => label.includes("acervo"))).toBe(false);
  });

  it("inclui c_z/c_t quando há patrimônio cultural", () => {
    const entrada = defaultEntrada();
    entrada.estrutura.patrimonioCultural = true;
    entrada.estrutura.cz = 1;
    entrada.estrutura.ct = 2;
    const pares = linhasEstrutura(entrada.estrutura);
    expect(pares.find(([label]) => label.includes("acervo"))).toEqual(["Valor do acervo / total (c_z / c_t)", "1 / 2"]);
  });
});

describe("linhasLinhaEletrica", () => {
  it("traduz os ids da linha em rótulos legíveis", () => {
    const entrada = defaultEntrada();
    const [linha] = entrada.linhas;
    const pares = linhasLinhaEletrica(linha);
    expect(pares.find(([label]) => label === "Tipo")).toEqual(["Tipo", "Energia"]);
    expect(pares.find(([label]) => label.includes("Instalação"))?.[1]).toBe("Aéreo");
  });

  it("inclui a estrutura adjacente quando declarada", () => {
    const linha = { ...defaultEntrada().linhas[0], adjacente: { L: 20, W: 20, H: 5, cd: "isolada" } };
    const pares = linhasLinhaEletrica(linha);
    expect(pares.find(([label]) => label === "Estrutura adjacente")?.[1]).toContain("20 × 20 × 5 m");
  });
});

describe("linhasProtecoes", () => {
  it("traduz as medidas marcáveis em lista de rótulos", () => {
    const protecoes = { ...defaultEntrada().protecoes, medidasPta: ["avisos", "descidaNatural"] };
    const pares = linhasProtecoes(protecoes);
    expect(pares.find(([label]) => label.includes("P_TA"))?.[1]).toBe(
      "Avisos de alerta; Estrutura metálica ou concreto armado como descida natural"
    );
  });

  it("sem nenhuma medida marcada, mostra 'Nenhuma'", () => {
    const pares = linhasProtecoes(defaultEntrada().protecoes);
    expect(pares.find(([label]) => label.includes("P_TA"))?.[1]).toBe("Nenhuma");
  });
});

describe("linhasSistemaInterno", () => {
  it("traduz as marcações do sistema interno", () => {
    const [sistema] = defaultEntrada().protecoes.sistemas;
    const pares = linhasSistemaInterno(sistema);
    expect(pares.find(([label]) => label === "U_W")).toEqual(["U_W", "2,5 kV"]);
    expect(pares.find(([label]) => label === "Blindado")).toEqual(["Blindado", "Não"]);
  });
});

describe("rowsComponentes", () => {
  const resultado = {
    componentes: { RA: 1e-6, RB: 2e-6, RC: 3e-7, RM: 4e-7, RU: 5e-8, RV: 6e-8, RW: 7e-9, RZ: 8e-9 },
    chavesR1: ["RA", "RB", "RU", "RV"],
    r1: 1e-6 + 2e-6 + 5e-8 + 6e-8,
    dominante: "RB",
  };

  it("inclui as 8 componentes", () => {
    const linhas = rowsComponentes(resultado);
    expect(linhas).toHaveLength(8);
  });

  it("um componente em chavesR1 recebe ref com percentual de R1", () => {
    const linhas = rowsComponentes(resultado);
    const ra = linhas.find((l) => l.simbolo === "R_A");
    expect(ra.ref).toMatch(/% de R1$/);
  });

  it("um componente fora de chavesR1 recebe ref 'fora de R1'", () => {
    const linhas = rowsComponentes(resultado);
    const rc = linhas.find((l) => l.simbolo === "R_C");
    expect(rc.ref).toBe("fora de R1");
  });

  it("o componente dominante tem '(dominante)' no parametro", () => {
    const linhas = rowsComponentes(resultado);
    const rb = linhas.find((l) => l.simbolo === "R_B");
    expect(rb.parametro).toContain("(dominante)");
    const ra = linhas.find((l) => l.simbolo === "R_A");
    expect(ra.parametro).not.toContain("(dominante)");
  });
});

describe("rowsFrequencia", () => {
  const resultado = {
    frequencias: [
      { id: "s1", fc: 1e-5, fm: 2e-5, fw: 3e-5, fv: 4e-5, fz: 5e-5, fb: 6e-5, maior: 6e-5, ft: 1e-3, atende: true },
    ],
  };

  it("inclui as seis fontes por sistema (F_C, F_M, F_W, F_V, F_Z, F_B)", () => {
    const linhas = rowsFrequencia(resultado);
    ["F_C", "F_M", "F_W", "F_V", "F_Z", "F_B"].forEach((simbolo) => {
      expect(linhas.find((l) => l.simbolo === simbolo && l.parametro.includes("S1"))).toBeDefined();
    });
  });

  it("inclui F_T e o veredito por sistema quando atende: true", () => {
    const linhas = rowsFrequencia(resultado);
    const ft = linhas.find((l) => l.simbolo === "F_T" && l.parametro.includes("S1"));
    expect(ft).toMatchObject({ resultado: 1e-3 });
    const veredito = linhas.find((l) => l.parametro.includes("S1") && l.simbolo === "Veredito");
    expect(veredito.resultado).toBe("Atende");
  });

  it("mostra veredito 'Não atende' quando atende: false", () => {
    const resultadoNaoAtende = {
      frequencias: [
        { id: "s1", fc: 1e-5, fm: 2e-5, fw: 3e-5, fv: 4e-5, fz: 5e-5, fb: 6e-5, maior: 6e-5, ft: 1e-3, atende: false },
      ],
    };
    const linhas = rowsFrequencia(resultadoNaoAtende);
    const veredito = linhas.find((l) => l.parametro.includes("S1") && l.simbolo === "Veredito");
    expect(veredito.resultado).toBe("Não atende");
  });
});
