import { describe, it, expect } from "vitest";
import {
  areaExposicaoEstrutura, areaExposicaoProxima, areasLinha, numeroEventos,
  probabilidades, produtoMedidas, perdasL1, perdaL3, providenciasRP, avaliarRisco, defaultEntrada,
  horasPorAno,
} from "./spdaRisco";
import { MEDIDAS_PTA } from "../data/spdaNBR5419";

describe("áreas de exposição (Anexo A)", () => {
  it("A_D de estrutura retangular pela equação A.1", () => {
    // L=50, W=30, H=10 → 1500 + 2×30×80 + π×900 = 1500 + 4800 + 2827,433…
    expect(areaExposicaoEstrutura({ L: 50, W: 30, H: 10 })).toBeCloseTo(9127.43, 1);
  });

  it("com saliência, adota o maior entre A.1 e A.2", () => {
    // Estrutura baixa e saliência alta: A'_D = π×(3×30)² = 25446,9 vence.
    const comSaliencia = areaExposicaoEstrutura({ L: 10, W: 10, H: 3, Hp: 30 });
    expect(comSaliencia).toBeCloseTo(25446.9, 1);
    // Saliência pequena não muda nada: vence a área da própria estrutura.
    const semEfeito = areaExposicaoEstrutura({ L: 50, W: 30, H: 10, Hp: 11 });
    expect(semEfeito).toBeCloseTo(9127.43, 1);
  });

  it("A_M pela equação A.6", () => {
    // 2×500×80 + π×500² = 80000 + 785398,16
    expect(areaExposicaoProxima({ L: 50, W: 30 })).toBeCloseTo(865398.16, 1);
  });

  it("A_L e A_I pelas equações A.8 e A.10", () => {
    expect(areasLinha(1000)).toEqual({ al: 40000, ai: 4000000 });
  });
});

describe("número de eventos perigosos (Anexo A)", () => {
  const base = {
    estrutura: { L: 50, W: 30, H: 10, Hp: null, ng: 8, cd: "isolada" },
    linhas: [],
  };

  it("N_D pela equação A.3", () => {
    const { nd } = numeroEventos(base);
    // 8 × 9127,43 × 1 × 10⁻⁶
    expect(nd).toBeCloseTo(0.0730, 4);
  });

  it("C_D da Tabela A.1 entra em N_D", () => {
    const cercada = { ...base, estrutura: { ...base.estrutura, cd: "cercadaAltos" } };
    expect(numeroEventos(cercada).nd).toBeCloseTo(0.0730 * 0.25, 4);
  });

  it("N_M pela equação A.5", () => {
    // 8 × 865398,16 × 10⁻⁶
    expect(numeroEventos(base).nm).toBeCloseTo(6.923, 3);
  });

  it("N_L e N_I pelas equações A.7 e A.9", () => {
    const comLinha = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal", adjacente: null }],
    };
    const [linha] = numeroEventos(comLinha).porLinha;
    expect(linha.nl).toBeCloseTo(8 * 40000 * 1e-6, 6); // 0,32
    expect(linha.ni).toBeCloseTo(8 * 4000000 * 1e-6, 6); // 32
    expect(linha.ndj).toBe(0);
  });

  it("os fatores C_I, C_E e C_T multiplicam N_L", () => {
    const comLinha = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 500, ci: "enterrado", ce: "urbano", ct: "atComTrafo", adjacente: null }],
    };
    const [linha] = numeroEventos(comLinha).porLinha;
    // 8 × (40×500) × 0,5 × 0,1 × 0,2 × 10⁻⁶
    expect(linha.nl).toBeCloseTo(8 * 20000 * 0.5 * 0.1 * 0.2 * 1e-6, 9);
  });

  it("estrutura adjacente dá N_DJ pela equação A.4", () => {
    const comAdjacente = {
      ...base,
      linhas: [{
        id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
        adjacente: { L: 20, W: 20, H: 5, cd: "isolada" },
      }],
    };
    const [linha] = numeroEventos(comAdjacente).porLinha;
    const adj = 20 * 20 + 2 * 15 * 40 + Math.PI * 225; // A.1 com L=W=20, H=5
    expect(linha.ndj).toBeCloseTo(8 * adj * 1 * 1 * 1e-6, 8);
  });

  it("expõe a área da estrutura adjacente (adj) para a tabela E.5 do memorial", () => {
    const comAdjacente = {
      ...base,
      linhas: [{
        id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
        adjacente: { L: 20, W: 20, H: 5, cd: "isolada" },
      }],
    };
    const [linha] = numeroEventos(comAdjacente).porLinha;
    const esperado = 20 * 20 + 2 * 15 * 40 + Math.PI * 225; // A.1 com L=W=20, H=5
    expect(linha.adj).toBeCloseTo(esperado, 8);
  });

  it("sem estrutura adjacente, adj é null", () => {
    const semAdjacente = {
      ...base,
      linhas: [{ id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal", adjacente: null }],
    };
    const [linha] = numeroEventos(semAdjacente).porLinha;
    expect(linha.adj).toBeNull();
  });

  it("sem linhas, a lista sai vazia", () => {
    expect(numeroEventos(base).porLinha).toEqual([]);
  });
});

describe("probabilidades de dano (Anexo B)", () => {
  const base = {
    estrutura: { L: 50, W: 30, H: 10, ng: 8, cd: "isolada" },
    linhas: [{
      id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
      blindagem: "aereaNaoBlindada", rs: "naoBlindada", adjacente: null,
    }],
    protecoes: {
      spdaNp: "nenhum", dpsNp: "nenhum", dpsClasseI: "nenhum",
      medidasPta: [], medidasPtu: [], fiacao: "semCuidado",
      larguraMalha: null, blindagemContinua: false,
      sistemas: [{ id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" }],
    },
  };

  it("produtoMedidas multiplica as marcadas e vale 1 sem nenhuma", () => {
    expect(produtoMedidas(MEDIDAS_PTA, [])).toBe(1);
    expect(produtoMedidas(MEDIDAS_PTA, ["avisos"])).toBeCloseTo(0.1, 10);
    expect(produtoMedidas(MEDIDAS_PTA, ["avisos", "descidaNatural"])).toBeCloseTo(1e-4, 10);
  });

  it("P_A = P_TA × P_B (B.1)", () => {
    const semNada = probabilidades(base);
    expect(semNada.pb).toBe(1);
    expect(semNada.pa).toBe(1);

    const comSpda = {
      ...base,
      protecoes: { ...base.protecoes, spdaNp: "npII", medidasPta: ["avisos"] },
    };
    const r = probabilidades(comSpda);
    expect(r.pb).toBe(0.05);
    expect(r.pa).toBeCloseTo(0.1 * 0.05, 10);
  });

  it("P_C = P_SPD × C_LD, composto entre sistemas internos (B.2 e eq. 12)", () => {
    const dois = {
      ...base,
      protecoes: {
        ...base.protecoes,
        dpsNp: "npII", // P_SPD = 0,02
        sistemas: [
          { id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" },
          { id: "s2", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" },
        ],
      },
    };
    // C_LD = 1 (linha aérea não blindada) → P_Ci = 0,02 cada
    // P_C = 1 − (1 − 0,02)² = 0,0396
    expect(probabilidades(dois).pc).toBeCloseTo(0.0396, 6);
  });

  it("sistema interno sem linha externa tem C_LD = 0", () => {
    const semLinha = {
      ...base,
      linhas: [],
      protecoes: {
        ...base.protecoes,
        dpsNp: "npII",
        sistemas: [{ id: "s1", uw: 2.5, blindado: true, interfaceIsolante: false, linhaId: null }],
      },
    };
    expect(probabilidades(semLinha).pc).toBe(0);
  });

  it("sistema interno não blindado força C_LD = 1 (B.4.4)", () => {
    const naoBlindado = {
      ...base,
      linhas: [{ ...base.linhas[0], blindagem: "dutoMetalico" }], // C_LD tabelado = 0
      protecoes: { ...base.protecoes, dpsNp: "npI" },
    };
    // sistemas[0].blindado === false → C_LD volta a 1 → P_C = P_SPD = 0,01
    expect(probabilidades(naoBlindado).pc).toBeCloseTo(0.01, 10);
  });

  it("P_M = P_SPD × P_MS, com P_MS = (K_S1 K_S2 K_S3 K_S4)² (B.3 e B.4)", () => {
    const comMalha = {
      ...base,
      protecoes: {
        ...base.protecoes,
        dpsNp: "npI", // P_SPD = 0,01
        fiacao: "pequenosLacos", // K_S3 = 0,01
        larguraMalha: 5, // K_S1 = K_S2 = 0,12 × 5 = 0,6
        sistemas: [{ id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" }],
      },
    };
    // K_S4 = 1/2,5 = 0,4 → produto = 0,6 × 0,6 × 0,01 × 0,4 = 0,00144
    // P_MS = 0,00144² = 2,0736e-6 → P_M = 0,01 × isso
    expect(probabilidades(comMalha).pm).toBeCloseTo(0.01 * 0.00144 ** 2, 15);
  });

  it("K_S1 e K_S4 são limitados a 1", () => {
    const malhaLarga = {
      ...base,
      protecoes: {
        ...base.protecoes,
        larguraMalha: 50, // 0,12 × 50 = 6 → limitado a 1
        fiacao: "semCuidado",
        sistemas: [{ id: "s1", uw: 0.35, blindado: false, interfaceIsolante: false, linhaId: "l1" }],
      },
    };
    // K_S4 = 1/0,35 = 2,857 → limitado a 1; tudo 1 → P_MS = 1 → P_M = 1
    expect(probabilidades(malhaLarga).pm).toBe(1);
  });

  it("blindagem contínua dá K_S1 = K_S2 = 1e-4", () => {
    const continua = {
      ...base,
      protecoes: {
        ...base.protecoes,
        blindagemContinua: true, fiacao: "blindado",
        sistemas: [{ id: "s1", uw: 6, blindado: true, interfaceIsolante: false, linhaId: "l1" }],
      },
    };
    const produto = 1e-4 * 1e-4 * 1e-4 * (1 / 6);
    expect(probabilidades(continua).pm).toBeCloseTo(produto ** 2, 30);
  });

  it("interface isolante zera P_MS (B.4.11)", () => {
    const isolante = {
      ...base,
      protecoes: {
        ...base.protecoes,
        sistemas: [{ id: "s1", uw: 2.5, blindado: false, interfaceIsolante: true, linhaId: "l1" }],
      },
    };
    expect(probabilidades(isolante).pm).toBe(0);
  });

  it("P_U, P_V, P_W e P_Z pelas equações B.8 a B.11", () => {
    const protegida = {
      ...base,
      protecoes: {
        ...base.protecoes,
        dpsNp: "npII", // P_SPD = 0,02
        dpsClasseI: "npII", // P_EB = 0,02
        medidasPtu: ["avisos"], // P_TU = 0,1
      },
    };
    const [linha] = probabilidades(protegida).porLinha;
    // Linha aérea não blindada, U_W = 2,5 → P_LD = 1, P_LI (energia) = 0,3, C_LD = C_LI = 1
    expect(linha.pu).toBeCloseTo(0.1 * 0.02 * 1 * 1, 10);
    expect(linha.pv).toBeCloseTo(0.02 * 1 * 1, 10);
    expect(linha.pw).toBeCloseTo(0.02 * 1 * 1, 10);
    expect(linha.pz).toBeCloseTo(0.02 * 0.3 * 1, 10);
  });

  it("P_LD e P_LI usam o menor U_W entre os sistemas da linha (pior caso)", () => {
    const doisUw = {
      ...base,
      linhas: [{ ...base.linhas[0], rs: "rsAte1", blindagem: "blindadaInterligada" }],
      protecoes: {
        ...base.protecoes,
        dpsNp: "npI",
        sistemas: [
          { id: "s1", uw: 6, blindado: true, interfaceIsolante: false, linhaId: "l1" },
          { id: "s2", uw: 1.5, blindado: true, interfaceIsolante: false, linhaId: "l1" },
        ],
      },
    };
    const [linha] = probabilidades(doisUw).porLinha;
    // menor U_W = 1,5 → P_LD (R_S ≤ 1) = 0,4; C_LD = 1
    expect(linha.pw).toBeCloseTo(0.01 * 0.4 * 1, 10);
  });

  it("expõe P_C e P_M de cada sistema, além do composto", () => {
    const e = defaultEntrada();
    e.protecoes.dpsNp = "npI"; // P_SPD = 0,01
    e.protecoes.sistemas = [
      { id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" },
      { id: "s2", uw: 2.5, blindado: false, interfaceIsolante: true, linhaId: "l1" },
    ];
    const p = probabilidades(e);

    expect(p.porSistema.map((s) => s.id)).toEqual(["s1", "s2"]);
    // s1 não é blindado e tem linha: C_LD = 1 por B.4.4, então P_C = P_SPD.
    expect(p.porSistema[0].pc).toBeCloseTo(0.01, 12);
    // s2 tem interface isolante: P_M = 0 por B.4.11.
    expect(p.porSistema[1].pm).toBe(0);
    // O composto continua sendo o de antes e não é a soma dos individuais.
    expect(p.pc).toBeCloseTo(1 - (1 - 0.01) * (1 - 0.01), 12);
  });

  it("expõe P_EB, que R_V e F_V usam direto", () => {
    const e = defaultEntrada();
    e.protecoes.dpsClasseI = "npII"; // Tabela B.7 = 0,02
    expect(probabilidades(e).peb).toBe(0.02);
  });
});

describe("perdas (Anexo C)", () => {
  const estrutura = {
    construcao: "robusta", // r_S = 1
    tipoEstrutura: "industrial", // L_F = 0,02
    piso: "terraConcreto", // r_t = 0,01
    riscoIncendio: "incendioNormal", // r_f = 0,01
    providencias: "nenhuma", // r_p = 1
    perigoEspecial: "nenhum", // h_z = 1
    loEstrutura: "explosao", // L_O = 0,1
    nz: 20, nt: 20, horasDia: 24, diasSemana: 7,
    patrimonioCultural: false, cz: 0, ct: 1,
  };

  it("horasPorAno converte o turno em t_z", () => {
    // Operação contínua tem de dar exatamente o ano inteiro.
    expect(horasPorAno({ horasDia: 24, diasSemana: 7 })).toBeCloseTo(8760, 6);
    // Fábrica de 8 h, segunda a sexta: 8 × (5/7) × 365 ≈ 2 085,7 h/ano —
    // e não 2 920, que sairia de multiplicar por 365 dias corridos.
    expect(horasPorAno({ horasDia: 8, diasSemana: 5 })).toBeCloseTo(2085.71, 2);
    expect(horasPorAno({ horasDia: 0, diasSemana: 5 })).toBe(0);
  });

  it("a fração do ano nunca passa de 1", () => {
    // 25 h/dia é erro de digitação; sem teto, a perda passaria do máximo.
    const impossivel = { ...estrutura, horasDia: 25, diasSemana: 7 };
    expect(perdasL1(impossivel).la).toBeCloseTo(perdasL1(estrutura).la, 12);
  });

  it("L_A pela equação C.1", () => {
    // r_t × L_T × (n_z/n_t) × (t_z/8760) × r_S = 0,01 × 0,01 × 1 × 1 × 1
    expect(perdasL1(estrutura).la).toBeCloseTo(1e-4, 10);
  });

  it("L_B pela equação C.3", () => {
    // r_p × r_f × h_z × L_F × 1 × 1 × r_S = 1 × 0,01 × 1 × 0,02 × 1
    expect(perdasL1(estrutura).lb).toBeCloseTo(2e-4, 10);
  });

  it("L_C pela equação C.4", () => {
    // L_O × (n_z/n_t) × (t_z/8760) × r_S = 0,1
    expect(perdasL1(estrutura).lc).toBeCloseTo(0.1, 10);
  });

  it("presença parcial de pessoas reduz a perda", () => {
    // Metade das pessoas, 12 h por dia: 1e-4 × 0,5 × 0,5
    const meioTempo = { ...estrutura, nz: 10, nt: 20, horasDia: 12, diasSemana: 7 };
    expect(perdasL1(meioTempo).la).toBeCloseTo(2.5e-5, 10);
  });

  it("construção simples dobra a perda (r_S = 2)", () => {
    const simples = { ...estrutura, construcao: "simples" };
    expect(perdasL1(simples).la).toBeCloseTo(2e-4, 10);
  });

  it("perigo especial e providências entram só em L_B", () => {
    const comPanico = { ...estrutura, perigoEspecial: "panicoAlto", providencias: "automaticas" };
    // 0,2 × 0,01 × 10 × 0,02 = 4e-4
    expect(perdasL1(comPanico).lb).toBeCloseTo(4e-4, 10);
    expect(perdasL1(comPanico).la).toBeCloseTo(1e-4, 10); // inalterada
  });

  it("L3 pela equação C.7", () => {
    const museu = {
      ...estrutura, patrimonioCultural: true,
      providencias: "manuais", riscoIncendio: "incendioAlto", cz: 500000, ct: 2000000,
    };
    // r_p × r_f × L_F × c_z/c_t = 0,5 × 0,1 × 0,1 × 0,25
    expect(perdaL3(museu)).toBeCloseTo(0.00125, 10);
  });
});

describe("avaliarRisco", () => {
  // Galpão industrial sem proteção nenhuma, com uma linha de energia aérea.
  const galpao = () => ({
    estrutura: {
      L: 60, W: 40, H: 8, Hp: null, ng: 10, cd: "isolada",
      construcao: "robusta", tipoEstrutura: "industrial", piso: "terraConcreto",
      riscoIncendio: "incendioNormal", providencias: "nenhuma", perigoEspecial: "nenhum",
      loEstrutura: "explosao", nz: 30, nt: 30, horasDia: 24, diasSemana: 7,
      explosaoOuRiscoVida: false, patrimonioCultural: false, cz: 0, ct: 1,
    },
    linhas: [{
      id: "l1", tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
      blindagem: "aereaNaoBlindada", rs: "naoBlindada", adjacente: null,
    }],
    protecoes: {
      spdaNp: "nenhum", dpsNp: "nenhum", dpsClasseI: "nenhum",
      medidasPta: [], medidasPtu: [], fiacao: "semCuidado",
      larguraMalha: null, blindagemContinua: false,
      sistemas: [{ id: "s1", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l1" }],
    },
  });

  it("R_A = N_D × P_A × L_A", () => {
    const r = avaliarRisco(galpao());
    expect(r.componentes.RA).toBeCloseTo(r.eventos.nd * r.probs.pa * r.perdas.la, 15);
  });

  it("R_U e R_V usam (N_L + N_DJ)", () => {
    const r = avaliarRisco(galpao());
    const [linha] = r.eventos.porLinha;
    const [prob] = r.probs.porLinha;
    expect(r.componentes.RU).toBeCloseTo((linha.nl + linha.ndj) * prob.pu * r.perdas.la, 15);
    expect(r.componentes.RV).toBeCloseTo((linha.nl + linha.ndj) * prob.pv * r.perdas.lb, 15);
  });

  it("sem explosão nem risco à vida, R_C/R_M/R_W/R_Z ficam fora de R1", () => {
    const r = avaliarRisco(galpao());
    expect(r.componentes.RC).toBeGreaterThan(0); // calculada
    expect(r.r1).toBeCloseTo(r.componentes.RA + r.componentes.RB + r.componentes.RU + r.componentes.RV, 15);
  });

  it("chavesR1 diz quais componentes a soma usou", () => {
    expect(avaliarRisco(galpao()).chavesR1).toEqual(["RA", "RB", "RU", "RV"]);

    const comExplosao = galpao();
    comExplosao.estrutura.explosaoOuRiscoVida = true;
    expect(avaliarRisco(comExplosao).chavesR1).toEqual(
      ["RA", "RB", "RU", "RV", "RC", "RM", "RW", "RZ"]
    );
  });

  it("com explosão marcada, as quatro entram em R1", () => {
    const entrada = galpao();
    entrada.estrutura.explosaoOuRiscoVida = true;
    const r = avaliarRisco(entrada);
    const soma = r.componentes.RA + r.componentes.RB + r.componentes.RC + r.componentes.RM
      + r.componentes.RU + r.componentes.RV + r.componentes.RW + r.componentes.RZ;
    expect(r.r1).toBeCloseTo(soma, 15);
  });

  it("duas linhas somam suas contribuições", () => {
    const entrada = galpao();
    const uma = avaliarRisco(entrada).componentes.RU;
    entrada.linhas.push({ ...entrada.linhas[0], id: "l2", tipo: "sinal" });
    entrada.protecoes.sistemas.push({ id: "s2", uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: "l2" });
    expect(avaliarRisco(entrada).componentes.RU).toBeCloseTo(uma * 2, 15);
  });

  it("sem linhas, as componentes de linha zeram", () => {
    const entrada = galpao();
    entrada.linhas = [];
    entrada.protecoes.sistemas = [];
    const { componentes } = avaliarRisco(entrada);
    expect(componentes.RU).toBe(0);
    expect(componentes.RV).toBe(0);
    expect(componentes.RW).toBe(0);
    expect(componentes.RZ).toBe(0);
  });

  it("estrutura desprotegida excede o risco tolerável", () => {
    const r = avaliarRisco(galpao());
    expect(r.r1).toBeGreaterThan(1e-5);
    expect(r.precisa.r1).toBe(true);
    expect(r.rt.R1).toBe(1e-5);
  });

  it("SPDA NP I e DPS derrubam R1 abaixo do tolerável", () => {
    const entrada = galpao();
    entrada.protecoes.spdaNp = "npI";
    entrada.protecoes.dpsNp = "npI";
    entrada.protecoes.dpsClasseI = "npI";
    entrada.protecoes.medidasPta = ["descidaNatural"];
    entrada.protecoes.medidasPtu = ["restricoesFisicas"];
    const r = avaliarRisco(entrada);
    expect(r.r1).toBeLessThan(1e-5);
    expect(r.precisa.r1).toBe(false);
  });

  it("identifica a componente dominante", () => {
    const r = avaliarRisco(galpao());
    const somadas = ["RA", "RB", "RU", "RV"];
    const maior = somadas.reduce((a, b) => (r.componentes[a] >= r.componentes[b] ? a : b));
    expect(r.dominante).toBe(maior);
  });

  it("R3 só é avaliado quando há patrimônio cultural", () => {
    expect(avaliarRisco(galpao()).r3).toBeNull();
    expect(avaliarRisco(galpao()).precisa.r3).toBeNull();

    const museu = galpao();
    museu.estrutura.patrimonioCultural = true;
    museu.estrutura.cz = 1000000;
    museu.estrutura.ct = 1000000;
    const r = avaliarRisco(museu);
    expect(r.r3).toBeGreaterThan(0);
    expect(typeof r.precisa.r3).toBe("boolean");
  });

  it("caso completo conferido à mão contra a norma", () => {
    // Galpão 60 × 40 × 8 m, isolado, N_G = 10, sem proteção nenhuma.
    //   A_D = 60×40 + 2×(3×8)×(60+40) + π×(3×8)²
    //       = 2 400 + 4 800 + 1 809,5574 = 9 009,5574 m²      (A.1)
    //   N_D = 10 × 9 009,5574 × 1 × 10⁻⁶ = 0,090095574        (A.3)
    //   P_A = P_TA × P_B = 1 × 1 = 1                          (B.1)
    //   L_A = r_t × L_T × 1 × 1 × r_S = 0,01 × 0,01 × 1 = 10⁻⁴ (C.1)
    //   R_A = 0,090095574 × 1 × 10⁻⁴ = 9,0095574 × 10⁻⁶
    //   L_B = r_p × r_f × h_z × L_F × 1 × r_S
    //       = 1 × 0,01 × 1 × 0,02 = 2 × 10⁻⁴                  (C.3)
    //   R_B = 0,090095574 × 1 × 2 × 10⁻⁴ = 1,80191148 × 10⁻⁵
    const r = avaliarRisco(galpao());
    expect(r.eventos.ad).toBeCloseTo(9009.5574, 3);
    expect(r.eventos.nd).toBeCloseTo(0.090095574, 9);
    expect(r.perdas.la).toBeCloseTo(1e-4, 12);
    expect(r.perdas.lb).toBeCloseTo(2e-4, 12);
    expect(r.componentes.RA).toBeCloseTo(9.0095574e-6, 12);
    expect(r.componentes.RB).toBeCloseTo(1.80191148e-5, 12);
  });

  it("defaultEntrada roda sem erro e produz números finitos", () => {
    const r = avaliarRisco(defaultEntrada());
    expect(Number.isFinite(r.r1)).toBe(true);
    for (const v of Object.values(r.componentes)) expect(Number.isFinite(v)).toBe(true);
  });

  it("traz as frequências de dano e o veredito de F", () => {
    const e = defaultEntrada();
    e.estrutura.ng = 14;
    const r = avaliarRisco(e);

    expect(r.frequencias).toHaveLength(1);
    expect(r.frequencias[0].id).toBe("s1");
    // O galpão padrão não tem proteção nenhuma. Quem domina não é F_C (a
    // estrutura em si é pequena), e sim F_Z: a linha de 1000 m desprotegida
    // expõe N_I = 56 eventos próximos/ano, contra N_D ≈ 0,1 da estrutura.
    // F_Z = N_I × P_Z = 56 × 0,3 = 16,8, que passa de 1/ano (F_T não crítico).
    expect(r.frequencias[0].maior).toBeCloseTo(r.frequencias[0].fz, 12);
    expect(r.frequencias[0].maior).toBeCloseTo(16.8, 10);
    expect(r.precisa.f).toBe(true);
  });

  it("não exige F quando não há sistema interno", () => {
    const e = defaultEntrada();
    e.estrutura.ng = 14;
    e.protecoes.sistemas = [];
    const r = avaliarRisco(e);
    expect(r.frequencias).toEqual([]);
    expect(r.precisa.f).toBe(false);
  });

  it("dá aos sistemas do estado inicial as marcações da Seção 7", () => {
    const [s] = defaultEntrada().protecoes.sistemas;
    expect(s.critico).toBe(false);
    expect(s.zpr0a).toBe(false);
  });

  it("ignora providências contra incêndio em zona com risco de explosão", () => {
    // Tabela C.4: a primeira linha é "Nenhuma providência, OU zona com risco de
    // explosão" — ali r_p vale 1 e nenhuma medida compra redução. O formulário
    // deixa escolher "instalações fixas automáticas" junto com zona 1 de
    // explosão, e honrar essa escolha fazia o app aprovar projeto que a norma
    // reprova por quase o dobro do limite.
    const base = defaultEntrada();
    base.estrutura.ng = 6;
    base.estrutura.riscoIncendio = "explosaoZ1";

    const sem = { ...base, estrutura: { ...base.estrutura, providencias: "nenhuma" } };
    const com = { ...base, estrutura: { ...base.estrutura, providencias: "automaticas" } };

    expect(providenciasRP(com.estrutura)).toBe(1);
    expect(avaliarRisco(com).r1).toBe(avaliarRisco(sem).r1);
  });

  it("aplica as providências normalmente fora de zona explosiva", () => {
    const e = defaultEntrada();
    e.estrutura.ng = 6;
    e.estrutura.riscoIncendio = "incendioAlto";
    e.estrutura.providencias = "automaticas";

    expect(providenciasRP(e.estrutura)).toBe(0.2); // Tabela C.4
    expect(avaliarRisco(e).r1).toBeLessThan(
      avaliarRisco({ ...e, estrutura: { ...e.estrutura, providencias: "nenhuma" } }).r1
    );
  });
});
