import { describe, it, expect } from "vitest";
import { frequenciaDanos } from "./spdaFrequencia";

// N e P redondos: cada F esperado sai de uma multiplicação de cabeça.
const EVENTOS = {
  nd: 0.1,
  nm: 0.02,
  porLinha: [{ id: "l1", nl: 0.004, ni: 0.05, ndj: 0.001 }],
};

const PROBS = {
  pb: 0.2,
  peb: 0.05,
  porSistema: [{ id: "s1", pc: 0.5, pm: 0.25 }],
  porLinha: [{ id: "l1", pw: 0.1, pz: 0.4 }],
};

const SISTEMA = { id: "s1", linhaId: "l1", critico: false, zpr0a: false };

describe("frequência de danos (Seção 7, Tabela 7)", () => {
  it("calcula as seis frequências da Tabela 7", () => {
    const [f] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(f.fc).toBeCloseTo(0.05, 12); // N_D × P_C = 0,1 × 0,5
    expect(f.fm).toBeCloseTo(0.005, 12); // N_M × P_M = 0,02 × 0,25
    expect(f.fw).toBeCloseTo(0.0005, 12); // (N_L + N_DJ) × P_W = 0,005 × 0,1
    expect(f.fv).toBeCloseTo(0.00025, 12); // (N_L + N_DJ) × P_EB = 0,005 × 0,05
    expect(f.fz).toBeCloseTo(0.02, 12); // N_I × P_Z = 0,05 × 0,4
  });

  it("zera F_B fora de ZPR₀ᴬ e o calcula dentro", () => {
    const [fora] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(fora.fb).toBe(0);

    const [dentro] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, zpr0a: true }],
    });
    expect(dentro.fb).toBeCloseTo(0.02, 12); // N_D × P_B = 0,1 × 0,2
  });

  it("toma o maior F e compara com o F_T do sistema", () => {
    const [naoCritico] = frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [SISTEMA] });
    expect(naoCritico.maior).toBeCloseTo(0.05, 12); // F_C é o maior
    expect(naoCritico.ft).toBe(1);
    expect(naoCritico.atende).toBe(true);

    const [critico] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, critico: true }],
    });
    expect(critico.ft).toBe(0.1);
    expect(critico.atende).toBe(true); // 0,05 ≤ 0,1
  });

  it("reprova o sistema crítico cujo maior F passa de 0,1/ano", () => {
    const [f] = frequenciaDanos({
      eventos: { ...EVENTOS, nd: 1 }, // F_C = 0,5
      probs: PROBS,
      sistemas: [{ ...SISTEMA, critico: true }],
    });
    expect(f.maior).toBeCloseTo(0.5, 12);
    expect(f.atende).toBe(false);
  });

  it("zera as frequências de linha quando o sistema não tem linha", () => {
    const [f] = frequenciaDanos({
      eventos: EVENTOS,
      probs: PROBS,
      sistemas: [{ ...SISTEMA, linhaId: null }],
    });
    expect(f.fw).toBe(0);
    expect(f.fv).toBe(0);
    expect(f.fz).toBe(0);
    expect(f.fc).toBeCloseTo(0.05, 12); // as de estrutura continuam valendo
  });

  it("devolve uma linha por sistema, na ordem recebida", () => {
    const r = frequenciaDanos({
      eventos: EVENTOS,
      probs: {
        ...PROBS,
        porSistema: [
          { id: "s1", pc: 0.5, pm: 0.25 },
          { id: "s2", pc: 0.1, pm: 0.1 },
        ],
      },
      sistemas: [SISTEMA, { id: "s2", linhaId: "l1", critico: true, zpr0a: false }],
    });
    expect(r.map((f) => f.id)).toEqual(["s1", "s2"]);
    expect(r[1].ft).toBe(0.1);
  });

  it("devolve lista vazia sem sistemas internos", () => {
    expect(frequenciaDanos({ eventos: EVENTOS, probs: PROBS, sistemas: [] })).toEqual([]);
  });

  it("zera F_C e F_M quando o sistema não tem entrada em probs.porSistema", () => {
    expect(() => {
      const [f] = frequenciaDanos({
        eventos: EVENTOS,
        probs: PROBS,
        sistemas: [{ ...SISTEMA, id: "s-sem-probs" }],
      });
      expect(f.fc).toBe(0);
      expect(f.fm).toBe(0);
    }).not.toThrow();
  });

  it("atende quando o maior F é exatamente igual ao F_T", () => {
    const [f] = frequenciaDanos({
      eventos: { ...EVENTOS, nd: 1 }, // F_C = 1 × 1 = 1
      probs: { ...PROBS, porSistema: [{ id: "s1", pc: 1, pm: 0.25 }] },
      sistemas: [SISTEMA], // não crítico: F_T = 1
    });
    expect(f.maior).toBe(1);
    expect(f.ft).toBe(1);
    expect(f.atende).toBe(true);
  });
});
