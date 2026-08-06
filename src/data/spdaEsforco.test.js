import { describe, it, expect } from "vitest";
import { EIXOS_FIXOS, ESFORCO_MAXIMO } from "./spdaEsforco";
import { SPDA_PB, DPS_PSPD, DPS_PEB, FIACAO_KS3 } from "./spdaNBR5419";

describe("catálogo de medidas de proteção", () => {
  it("começa cada eixo no esforço zero", () => {
    for (const eixo of EIXOS_FIXOS) {
      expect(eixo.opcoes[0].esforco, eixo.id).toBe(0);
    }
  });

  it("ordena as opções por esforço crescente", () => {
    for (const eixo of EIXOS_FIXOS) {
      const esforcos = eixo.opcoes.map((o) => o.esforco);
      expect(esforcos, eixo.id).toEqual([...esforcos].sort((a, b) => a - b));
    }
  });

  it("só usa ids que existem nas tabelas normativas", () => {
    const idsDe = (eixo) => eixo.opcoes.map((o) => Object.values(o.patch)[0]);
    const acha = (eixo) => EIXOS_FIXOS.find((x) => x.id === eixo);
    expect(idsDe(acha("spdaNp")).every((id) => SPDA_PB.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("dpsNp")).every((id) => DPS_PSPD.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("dpsClasseI")).every((id) => DPS_PEB.some((t) => t.id === id))).toBe(true);
    expect(idsDe(acha("fiacao")).every((id) => FIACAO_KS3.some((t) => t.id === id))).toBe(true);
  });

  it("mira todo eixo numa parte conhecida do estado", () => {
    for (const eixo of EIXOS_FIXOS) {
      expect(["protecoes", "estrutura"], eixo.id).toContain(eixo.alvo);
    }
  });

  it("soma o esforço máximo de todos os eixos", () => {
    const esperado = EIXOS_FIXOS.reduce(
      (acc, e) => acc + Math.max(...e.opcoes.map((o) => o.esforco)),
      0
    );
    expect(ESFORCO_MAXIMO).toBe(esperado);
  });
});
