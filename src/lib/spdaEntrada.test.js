import { describe, it, expect } from "vitest";
import { normalizarEntrada } from "./spdaEntrada";
import { defaultEntrada } from "./spdaRisco";

describe("normalizarEntrada", () => {
  it("sem nada salvo, devolve defaultEntrada()", () => {
    expect(normalizarEntrada(null)).toEqual(defaultEntrada());
    expect(normalizarEntrada(undefined)).toEqual(defaultEntrada());
  });

  it("migra o campo antigo tz (horas/ano) para horasDia/diasSemana", () => {
    const salvo = { estrutura: { tz: 3650 }, linhas: [], protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.estrutura.tz).toBeUndefined();
    expect(r.estrutura.horasDia).toBeCloseTo(10, 1); // 3650/365
    expect(r.estrutura.diasSemana).toBe(7);
  });

  it("não sobrescreve horasDia se já estiver presente, mesmo com tz salvo", () => {
    const salvo = { estrutura: { tz: 3650, horasDia: 8, diasSemana: 5 }, linhas: [], protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.estrutura.horasDia).toBe(8);
    expect(r.estrutura.diasSemana).toBe(5);
  });

  it("sistemas sem critico/zpr0a recebem os defaults", () => {
    const salvo = {
      estrutura: {},
      linhas: [{ id: "l1" }],
      protecoes: { sistemas: [{ id: "s1", uw: 2.5 }] },
    };
    const r = normalizarEntrada(salvo);
    expect(r.protecoes.sistemas[0]).toMatchObject({ id: "s1", uw: 2.5, critico: false, zpr0a: false });
  });

  it("sistema que já tem critico/zpr0a preserva os valores", () => {
    const salvo = {
      estrutura: {},
      linhas: [],
      protecoes: { sistemas: [{ id: "s1", critico: true, zpr0a: true }] },
    };
    const r = normalizarEntrada(salvo);
    expect(r.protecoes.sistemas[0]).toMatchObject({ critico: true, zpr0a: true });
  });

  it("sem linhas salvas, usa as linhas do default", () => {
    const salvo = { estrutura: {}, protecoes: { sistemas: [] } };
    const r = normalizarEntrada(salvo);
    expect(r.linhas).toEqual(defaultEntrada().linhas);
  });
});
