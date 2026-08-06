import { describe, it, expect } from "vitest";
import { montarEixos, aplicarEscolhas, atendeNorma, buscarMedidas } from "./spdaBusca";
import { defaultEntrada, avaliarRisco } from "./spdaRisco";

// Galpão padrão com N_G real: reprova em R1 e em F sem proteção nenhuma.
function galpao() {
  const e = defaultEntrada();
  e.estrutura.ng = 14;
  return e;
}

describe("busca de medidas de proteção", () => {
  it("monta os eixos fixos mais piso e providências", () => {
    const ids = montarEixos(galpao()).map((x) => x.id);
    expect(ids).toContain("spdaNp");
    expect(ids).toContain("piso");
    expect(ids).toContain("providencias");
  });

  it("não oferece piso pior do que o já informado", () => {
    const e = galpao();
    e.estrutura.piso = "asfaltoMadeira"; // o melhor da Tabela C.3
    const piso = montarEixos(e).find((x) => x.id === "piso");
    expect(piso.opcoes).toHaveLength(1); // só "manter como está"
    expect(piso.opcoes[0].esforco).toBe(0);
  });

  it("aplica as escolhas nas duas partes do estado", () => {
    const e = galpao();
    const eixos = montarEixos(e);
    const indices = eixos.map((x) => (x.id === "spdaNp" ? 3 : 0));
    const nova = aplicarEscolhas(e, eixos, indices);
    expect(nova.protecoes.spdaNp).toBe("npII");
    expect(e.protecoes.spdaNp).toBe("nenhum"); // não muta a entrada original
  });

  it("subir um degrau nunca aumenta R1 (monotonicidade)", () => {
    const e = galpao();
    const eixos = montarEixos(e);
    const base = eixos.map(() => 0);
    const r1Base = avaliarRisco(aplicarEscolhas(e, eixos, base)).r1;

    for (let i = 0; i < eixos.length; i++) {
      for (let j = 1; j < eixos[i].opcoes.length; j++) {
        const indices = [...base];
        indices[i] = j;
        const r1 = avaliarRisco(aplicarEscolhas(e, eixos, indices)).r1;
        expect(r1, `${eixos[i].id} degrau ${j}`).toBeLessThanOrEqual(r1Base * (1 + 1e-12));
      }
    }
  });

  it("devolve combinações que realmente atendem, em ordem de esforço", () => {
    const r = buscarMedidas(galpao());
    expect(r.combinacoes.length).toBeGreaterThan(0);

    for (const c of r.combinacoes) {
      expect(atendeNorma(avaliarRisco(c.entrada))).toBe(true);
    }
    const esforcos = r.combinacoes.map((c) => c.esforco);
    expect(esforcos).toEqual([...esforcos].sort((a, b) => a - b));
  });

  it("promete o R1 que a combinação de fato produz", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(avaliarRisco(c.entrada).r1).toBeCloseTo(c.r1, 15);
  });

  it("lista só os eixos que saíram do degrau zero", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(c.escolhas.length).toBeGreaterThan(0);
    expect(c.escolhas.every((x) => x.esforco > 0)).toBe(true);
  });

  it("não recomenda nada quando a estrutura já atende", () => {
    const e = galpao();
    e.estrutura.nz = 0; // ninguém na zona: R1 = 0
    e.protecoes.sistemas = [];
    const r = buscarMedidas(e);
    expect(r.combinacoes).toHaveLength(1);
    expect(r.combinacoes[0].esforco).toBe(0);
    expect(r.combinacoes[0].escolhas).toEqual([]);
  });

  it("avisa quando para sem achar solução, com o melhor parcial", () => {
    // Teto de 1 avaliação: só o degrau zero é testado, e o galpão sem
    // proteção reprova. Força o caminho "não achei" de forma determinística,
    // sem depender de uma estrutura extrema que o catálogo talvez resolvesse.
    const r = buscarMedidas(galpao(), { teto: 1 });
    expect(r.combinacoes).toHaveLength(0);
    expect(r.esgotou).toBe(true);
    expect(r.melhorParcial).not.toBeNull();
    expect(r.melhorParcial.r1).toBeGreaterThan(0);
    expect(r.melhorParcial.escolhas).toEqual([]);
  });

  it("respeita o teto de avaliações", () => {
    const r = buscarMedidas(galpao(), { teto: 50 });
    expect(r.avaliadas).toBeLessThanOrEqual(50);
  });

  it("termina dentro do orçamento de um render", () => {
    const e = galpao();
    const inicio = performance.now();
    const r = buscarMedidas(e);
    const ms = performance.now() - inicio;
    // O painel roda a busca dentro de um useMemo, no mesmo quadro em que o
    // usuário digita. Acima de ~100 ms a digitação começa a engasgar.
    expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(1)} ms`).toBeLessThan(100);
  });
});
