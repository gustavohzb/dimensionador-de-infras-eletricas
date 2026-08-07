import { describe, it, expect } from "vitest";
import { EIXOS_FIXOS } from "./spdaEsforco";
import { SPDA_PB, DPS_PSPD, DPS_PEB, FIACAO_KS3, MEDIDAS_PTA, MEDIDAS_PTU } from "./spdaNBR5419";

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

  // Quando o catálogo omite uma linha da norma, a busca varre tudo o que conhece
  // e conclui que "nenhuma combinação resolve" — sobre uma grade menor que a da
  // norma. Foi o que acontecia com `npIDescidaNatural` (P_B = 0,01) e
  // `coberturaMetalica` (0,001), justamente os dois degraus mais fortes de SPDA:
  // havia estrutura que a norma resolve e o app declarava insolúvel.
  it("cobre todas as linhas das tabelas normativas que os eixos representam", () => {
    const acha = (id) => EIXOS_FIXOS.find((x) => x.id === id);
    const idsSimples = (eixo) => acha(eixo).opcoes.map((o) => Object.values(o.patch)[0]);
    // Nos eixos de conjunto, cada opção é uma lista; o que precisa estar
    // coberto é cada medida da tabela, em alguma das listas.
    const idsDeConjunto = (eixo) => acha(eixo).opcoes.flatMap((o) => Object.values(o.patch)[0]);

    expect([...idsSimples("spdaNp")].sort()).toEqual([...SPDA_PB.map((t) => t.id)].sort());
    expect([...idsSimples("dpsNp")].sort()).toEqual([...DPS_PSPD.map((t) => t.id)].sort());
    expect([...idsSimples("dpsClasseI")].sort()).toEqual([...DPS_PEB.map((t) => t.id)].sort());
    expect([...idsSimples("fiacao")].sort()).toEqual([...FIACAO_KS3.map((t) => t.id)].sort());

    for (const t of MEDIDAS_PTA) expect(idsDeConjunto("medidasPta"), t.id).toContain(t.id);
    for (const t of MEDIDAS_PTU) expect(idsDeConjunto("medidasPtu"), t.id).toContain(t.id);
  });
});
