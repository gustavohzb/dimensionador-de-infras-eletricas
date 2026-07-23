// Dimensionamento de iluminação em ÁRVORE (diagrama), seção POR TRECHO.
// Todos os valores esperados foram calculados à mão por
// ΔV = 2·ρ·L·I·cosφ/S com ρ = 1/56, não copiados do código.

import { describe, it, expect } from "vitest";
import { calcularIluminacaoArvore } from "./lightingTree";

const rho = 1 / 56;

const quadro = { id: "q", tipo: "quadro" };
const lig = (r) => new Map(r.ligacoes.map((l) => [l.id, l]));

describe("cadeia linear (equivale ao modelo antigo de trechos)", () => {
  // 220V F-N fp 0,92, 50W. quadro →30m→ A(2 lum) →10m→ B(4) →10m→ C(4):
  // pontos por trecho 10 / 8 / 4, igual ao caso clássico da aba antiga.
  const base = {
    sistema: "ca", tensao: 220, fp: 0.92, potencia: 50, quedaMaxPct: 4, metodo: "B1",
    nos: [quadro,
      { id: "a", tipo: "luminaria", qtd: 2 },
      { id: "b", tipo: "luminaria", qtd: 4 },
      { id: "c", tipo: "luminaria", qtd: 4 }],
    ligacoes: [
      { id: "e1", de: "q", para: "a", distancia: 30 },
      { id: "e2", de: "a", para: "b", distancia: 10 },
      { id: "e3", de: "b", para: "c", distancia: 10 }],
  };

  it("pontos acumulados, corrente e total de luminárias saem do diagrama", () => {
    const r = calcularIluminacaoArvore(base);
    expect(r.numLuminarias).toBe(10);
    expect(r.correnteTotal).toBeCloseTo(500 / (220 * 0.92), 10);
    const m = lig(r);
    expect(m.get("e1").pontos).toBe(10);
    expect(m.get("e2").pontos).toBe(8);
    expect(m.get("e3").pontos).toBe(4);
  });

  it("220V folgado: tudo em 1,5mm² e queda no pior ponto 1,0331%", () => {
    const r = calcularIluminacaoArvore(base);
    const m = lig(r);
    for (const id of ["e1", "e2", "e3"]) expect(m.get(id).secao).toBe(1.5);
    // ΔV(e1) = 2×(1/56)×30×(500/220)/1,5 = 1,6234V (o fp cancela na queda).
    expect(m.get("e1").quedaVolts).toBeCloseTo((2 * rho * 30 * 500) / (220 * 1.5), 6);
    expect(r.piorCaminho.noId).toBe("c");
    expect(r.piorCaminho.quedaPct).toBeCloseTo(1.0331, 3);
    expect(r.dentroLimite).toBe(true);
  });
});

describe("CC e queda governando", () => {
  it("24V, 10×20W, 20m: queda pede 10mm² (6mm² daria 4,12%)", () => {
    const r = calcularIluminacaoArvore({
      sistema: "cc", tensao: 24, fp: 0.5 /* deve ser ignorado */, potencia: 20,
      quedaMaxPct: 4, metodo: "B1",
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 10 }],
      ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 20 }],
    });
    const e = lig(r).get("e1");
    expect(e.corrente).toBeCloseTo(200 / 24, 10); // 8,333A, sem fp
    expect(e.secao).toBe(10);
    // ΔV = 2×(1/56)×20×8,3333/10 = 0,59524V → 2,4802%
    expect(e.quedaPct).toBeCloseTo(2.4802, 3);
    expect(r.piorCaminho.quedaPct).toBeCloseTo(2.4802, 3);
  });
});

describe("derivação: tronco grosso, ramais finos", () => {
  // 24V CC, 20W, 4% (0,96V). quadro →10m→ caixa; caixa →10m→ L1(5);
  // caixa →20m→ L2(5).
  // Tronco: I=8,333A, pior caminho 30m → S≥2ρ·8,333·30/0,96 = 9,30 → 10mm².
  // Ramal L1: I=4,167A, caminho 20m → S≥3,10 → 4; relaxa p/ 2,5
  //   (caminho L1 = 0,2976 + 0,5952 = 0,8929V ≤ 0,96; em 1,5 estoura).
  // Ramal L2: I=4,167A, caminho 30m → S≥4,65 → 6; não relaxa
  //   (em 4mm²: 0,2976 + 0,7440 = 1,0417V > 0,96).
  const base = {
    sistema: "cc", tensao: 24, potencia: 20, quedaMaxPct: 4, metodo: "B1",
    nos: [quadro, { id: "cx", tipo: "caixa" },
      { id: "l1", tipo: "luminaria", qtd: 5 },
      { id: "l2", tipo: "luminaria", qtd: 5 }],
    ligacoes: [
      { id: "t", de: "q", para: "cx", distancia: 10 },
      { id: "b1", de: "cx", para: "l1", distancia: 10 },
      { id: "b2", de: "cx", para: "l2", distancia: 20 }],
  };

  it("seções por trecho: 10 / 2,5 / 6 mm²", () => {
    const m = lig(calcularIluminacaoArvore(base));
    expect(m.get("t").secao).toBe(10);
    expect(m.get("b1").secao).toBe(2.5);
    expect(m.get("b2").secao).toBe(6);
    expect(m.get("t").pontos).toBe(10);
    expect(m.get("b1").pontos).toBe(5);
  });

  it("após a relaxação o pior caminho vira L1 (3,72%) e ambos ficam dentro", () => {
    const r = calcularIluminacaoArvore(base);
    // L1 em 2,5mm²: 0,29762 + 0,59524 = 0,89286V → 3,7202% (pior)
    expect(r.piorCaminho.noId).toBe("l1");
    expect(r.piorCaminho.quedaVolts).toBeCloseTo(0.89286, 4);
    expect(r.piorCaminho.quedaPct).toBeCloseTo(3.7202, 3);
    // L2: 0,29762 + 0,49603 = 0,79365V → 3,3069%
    const nl2 = r.nos.find((n) => n.id === "l2");
    expect(nl2.quedaAcumVolts).toBeCloseTo(0.79365, 4);
    expect(r.dentroLimite).toBe(true);
  });
});

describe("ampacidade e limites", () => {
  it("corrente alta em trecho curto: ampacidade manda (10mm² p/ 47,2A em B1)", () => {
    const r = calcularIluminacaoArvore({
      sistema: "ca", tensao: 127, fp: 1, potencia: 200, quedaMaxPct: 4, metodo: "B1",
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 30 }],
      ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 5 }],
    });
    const e = lig(r).get("e1");
    expect(e.corrente).toBeCloseTo(6000 / 127, 8);
    expect(e.secaoPorAmpacidade).toBe(10);
    expect(e.secao).toBe(10);
  });

  it("método por trecho sobrepõe o global: 39,4A passa em 6mm² B1 (41A), mas B2 (38A) pede 10mm²", () => {
    // 25×200W em 127V fp 1 → 39,37A; trecho curto (2m) p/ queda não mandar.
    const base = {
      sistema: "ca", tensao: 127, fp: 1, potencia: 200, quedaMaxPct: 4, metodo: "B1",
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 25 }],
    };
    const semOverride = calcularIluminacaoArvore({
      ...base, ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 2 }],
    });
    expect(lig(semOverride).get("e1").metodo).toBe("B1");
    expect(lig(semOverride).get("e1").secao).toBe(6);
    const comOverride = calcularIluminacaoArvore({
      ...base, ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 2, metodo: "B2" }],
    });
    expect(lig(comOverride).get("e1").metodo).toBe("B2");
    expect(lig(comOverride).get("e1").secaoPorAmpacidade).toBe(10);
    expect(lig(comOverride).get("e1").secao).toBe(10);
  });

  it("caso impossível (12V, 2kW, 100m): trecho sem seção e dimensionado=false", () => {
    const r = calcularIluminacaoArvore({
      sistema: "cc", tensao: 12, potencia: 100, quedaMaxPct: 4, metodo: "B1",
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 20 }],
      ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 100 }],
    });
    expect(r.dimensionado).toBe(false);
    expect(lig(r).get("e1").secao).toBeNull();
    expect(r.dentroLimite).toBe(false);
  });
});

describe("validação do diagrama", () => {
  const params = { sistema: "cc", tensao: 24, potencia: 20, quedaMaxPct: 4, metodo: "B1" };

  it("nó desconectado gera aviso e fica fora da contagem", () => {
    const r = calcularIluminacaoArvore({
      ...params,
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 5 }, { id: "solto", tipo: "luminaria", qtd: 3 }],
      ligacoes: [{ id: "e1", de: "q", para: "l", distancia: 10 }],
    });
    expect(r.numLuminarias).toBe(5);
    expect(r.avisos.some((a) => /fora do circuito/.test(a))).toBe(true);
  });

  it("ramo de caixa sem luminária: seção mínima e aviso", () => {
    const r = calcularIluminacaoArvore({
      ...params,
      nos: [quadro, { id: "l", tipo: "luminaria", qtd: 5 }, { id: "cx", tipo: "caixa" }],
      ligacoes: [
        { id: "e1", de: "q", para: "l", distancia: 10 },
        { id: "e2", de: "q", para: "cx", distancia: 8 }],
    });
    expect(lig(r).get("e2").secao).toBe(1.5);
    expect(r.avisos.some((a) => /sem nenhuma luminária/.test(a))).toBe(true);
  });

  it("nó com dois pais é erro estrutural", () => {
    const r = calcularIluminacaoArvore({
      ...params,
      nos: [quadro, { id: "cx", tipo: "caixa" }, { id: "l", tipo: "luminaria", qtd: 5 }],
      ligacoes: [
        { id: "e1", de: "q", para: "cx", distancia: 10 },
        { id: "e2", de: "q", para: "l", distancia: 10 },
        { id: "e3", de: "cx", para: "l", distancia: 5 }],
    });
    expect(r.erros.length).toBeGreaterThan(0);
    expect(r.ligacoes).toEqual([]);
  });

  it("sem quadro ou sem ligações: null", () => {
    expect(calcularIluminacaoArvore({ ...params, nos: [{ id: "l", tipo: "luminaria" }], ligacoes: [] })).toBeNull();
    expect(calcularIluminacaoArvore({ ...params, nos: [quadro], ligacoes: [] })).toBeNull();
  });
});
