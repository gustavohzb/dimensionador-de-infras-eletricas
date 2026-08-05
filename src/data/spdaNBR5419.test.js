import { describe, it, expect } from "vitest";
import {
  LOCALIZACAO_CD, INSTALACAO_CI, TIPO_LINHA_CT, AMBIENTE_CE, MEDIDAS_PTA,
  SPDA_PB, DPS_PSPD, LINHA_CLD_CLI, FIACAO_KS3, MEDIDAS_PTU, DPS_PEB,
  BLINDAGEM_RS, PLI_POR_TIPO, TIPO_ESTRUTURA_LF, LO_POR_ESTRUTURA, PISO_RT,
  PROVIDENCIAS_RP, RISCO_RF, PERIGO_HZ, CONSTRUCAO_RS, RISCO_TOLERAVEL,
  UW_VALORES, LT, LF_L3,
} from "./spdaNBR5419";

const TODAS = {
  LOCALIZACAO_CD, INSTALACAO_CI, TIPO_LINHA_CT, AMBIENTE_CE, MEDIDAS_PTA,
  SPDA_PB, DPS_PSPD, LINHA_CLD_CLI, FIACAO_KS3, MEDIDAS_PTU, DPS_PEB,
  BLINDAGEM_RS, TIPO_ESTRUTURA_LF, LO_POR_ESTRUTURA, PISO_RT, PROVIDENCIAS_RP,
  RISCO_RF, PERIGO_HZ, CONSTRUCAO_RS,
};

describe("tabelas da NBR 5419-2:2026", () => {
  it("toda tabela tem ids únicos e rótulo não vazio", () => {
    for (const [nome, tabela] of Object.entries(TODAS)) {
      const ids = tabela.map((t) => t.id);
      expect(new Set(ids).size, `${nome} tem id repetido`).toBe(ids.length);
      for (const t of tabela) expect(t.label.length, `${nome}.${t.id} sem rótulo`).toBeGreaterThan(0);
    }
  });

  it("Tabela A.1 — fator de localização C_D", () => {
    expect(LOCALIZACAO_CD.map((t) => t.valor)).toEqual([0.25, 0.5, 1, 2]);
  });

  it("Tabela A.2/A.3/A.4 — fatores da linha", () => {
    expect(INSTALACAO_CI.map((t) => t.valor)).toEqual([1, 0.5, 0.01]);
    expect(TIPO_LINHA_CT.map((t) => t.valor)).toEqual([1, 0.2]);
    expect(AMBIENTE_CE.map((t) => t.valor)).toEqual([1, 0.5, 0.1, 0.01]);
  });

  it("Tabela B.2 — P_B por nível de proteção", () => {
    const porId = Object.fromEntries(SPDA_PB.map((t) => [t.id, t.valor]));
    expect(porId.nenhum).toBe(1);
    expect(porId.npIV).toBe(0.2);
    expect(porId.npIII).toBe(0.1);
    expect(porId.npII).toBe(0.05);
    expect(porId.npI).toBe(0.02);
    expect(porId.coberturaMetalica).toBe(0.001);
  });

  it("Tabela B.3 — P_SPD por NP dos DPS", () => {
    expect(DPS_PSPD.map((t) => t.valor)).toEqual([1, 0.05, 0.02, 0.01, 0.005]);
  });

  it("Tabela B.4 — C_LD e C_LI", () => {
    const porId = Object.fromEntries(LINHA_CLD_CLI.map((t) => [t.id, t]));
    expect(porId.aereaNaoBlindada).toMatchObject({ cld: 1, cli: 1 });
    expect(porId.neutroMultiaterrado).toMatchObject({ cld: 1, cli: 0.2 });
    expect(porId.blindadaInterligada).toMatchObject({ cld: 1, cli: 0 });
    expect(porId.dutoMetalico).toMatchObject({ cld: 0, cli: 0 });
  });

  it("Tabela B.8 — P_LD cobre todos os U_W da norma", () => {
    for (const b of BLINDAGEM_RS) {
      for (const uw of UW_VALORES) {
        expect(b.pld[uw], `${b.id} sem P_LD para U_W=${uw}`).toBeTypeOf("number");
      }
    }
    expect(BLINDAGEM_RS.find((b) => b.id === "rsAte1").pld[6]).toBe(0.02);
    expect(BLINDAGEM_RS.find((b) => b.id === "naoBlindada").pld[6]).toBe(1);
  });

  it("Tabela B.9 — P_LI de energia e de sinal", () => {
    expect(PLI_POR_TIPO.energia[2.5]).toBe(0.3);
    expect(PLI_POR_TIPO.sinal[2.5]).toBe(0.2);
    expect(PLI_POR_TIPO.energia[1]).toBe(1);
  });

  it("Anexo C — perdas e fatores", () => {
    expect(LT).toBe(0.01);
    expect(LF_L3).toBe(0.1);
    expect(TIPO_ESTRUTURA_LF.find((t) => t.id === "industrial").lf).toBe(0.02);
    expect(PISO_RT.map((t) => t.valor)).toEqual([0.01, 0.001, 0.0001, 0.00001]);
    expect(PROVIDENCIAS_RP.map((t) => t.valor)).toEqual([1, 0.5, 0.2]);
    expect(RISCO_RF.find((t) => t.id === "incendioNormal").valor).toBe(0.01);
    expect(PERIGO_HZ.map((t) => t.valor)).toEqual([1, 2, 5, 5, 10]);
    expect(CONSTRUCAO_RS.map((t) => t.valor)).toEqual([2, 1]);
  });

  it("Tabela 4 — riscos toleráveis", () => {
    expect(RISCO_TOLERAVEL).toEqual({ R1: 1e-5, R3: 1e-4 });
  });
});
