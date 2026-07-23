// Dimensionamento de cabos de iluminação por queda de tensão (NBR 5410).
// Todos os valores esperados foram calculados à mão pela fórmula
// ΔV = 2·ρ·L·I·cosφ/S (2 condutores: F-N, F-F ou CC), não copiados do código.

import { describe, it, expect } from "vitest";
import { calcularIluminacao, RESISTIVIDADE_COBRE } from "./lightingDrop";

const rho = RESISTIVIDADE_COBRE; // 0,0178 Ω·mm²/m (1/56, prática usual)

describe("calcularIluminacao — CC", () => {
  // 10 luminárias de 20W em 24V CC, trecho único de 20m com as 10 à jusante.
  const base = {
    sistema: "cc",
    tensao: 24,
    potencia: 20,
    numLuminarias: 10,
    quedaMaxPct: 4,
    metodo: "B1",
    trechos: [{ distancia: 20, pontos: 10 }],
  };

  it("corrente CC: P/V, sem fator de potência", () => {
    const r = calcularIluminacao({ ...base, fp: 0.5 }); // fp deve ser ignorado
    expect(r.correnteTotal).toBeCloseTo(200 / 24, 10); // 8,333 A
    expect(r.trechos[0].corrente).toBeCloseTo(8.3333, 3);
  });

  it("24V: queda governa — 6mm² dá 4,12% (reprova), 10mm² dá 2,47% (passa)", () => {
    const r = calcularIluminacao(base);
    // ΔV(6) = 2×0,0178×20×8,3333/6 = 0,98889V → 4,1204% > 4%
    // ΔV(10) = 0,59333V → 2,4722% ≤ 4%
    expect(r.secaoPorQueda).toBe(10);
    expect(r.quedaFinalPct).toBeCloseTo((2 * rho * 20 * (200 / 24) / 10 / 24) * 100, 8);
    expect(r.secaoPorAmpacidade).toBe(1.5); // 8,3A cabe em 1,5mm² (17,5A B1/2c)
    expect(r.secaoSugerida).toBe(10); // max(10; 1,5; 1,5)
  });
});

describe("calcularIluminacao — CA", () => {
  // 10 luminárias de 50W, 220V F-N, fp 0,92. Trechos: 30m/10pts, 10m/8pts,
  // 10m/4pts (acumulado à jusante).
  const base = {
    sistema: "ca",
    tensao: 220,
    fp: 0.92,
    potencia: 50,
    numLuminarias: 10,
    quedaMaxPct: 4,
    metodo: "B1",
    trechos: [
      { distancia: 30, pontos: 10 },
      { distancia: 10, pontos: 8 },
      { distancia: 10, pontos: 4 },
    ],
  };
  // I_j = pontos×50/(220×0,92); ΔV_j = 2·ρ·L·I·0,92/S — o fp cancela e
  // ΔV_j = 2·ρ·L·(pontos×50)/(S×220).
  const dvTotal = (S) =>
    [[30, 10], [10, 8], [10, 4]].reduce((a, [L, n]) => a + (2 * rho * L * n * 50) / (S * 220), 0);

  it("em 220V a queda é folgada: 1,5mm² já fica em ~1,03%", () => {
    const r = calcularIluminacao(base);
    // Âncora manual: 2×(1/56)×103,755×0,92... ⇒ ΣL·n·P/V = 51875/220;
    // ΔV(1,5) = 2×(1/56)×(51875/220)/1,5 = 2,2727V → 1,0331%.
    expect(dvTotal(1.5) / 220 * 100).toBeCloseTo(1.0331, 3);
    expect(r.secaoPorQueda).toBe(1.5);
    expect(r.secaoSugerida).toBe(1.5);
    expect(r.quedaFinalPct).toBeCloseTo(dvTotal(1.5) / 220 * 100, 8);
  });

  it("corrente usa o fp: I = P/(V·cosφ)", () => {
    const r = calcularIluminacao(base);
    expect(r.correnteTotal).toBeCloseTo(500 / (220 * 0.92), 10); // 2,4704 A
    expect(r.trechos[1].corrente).toBeCloseTo(400 / (220 * 0.92), 10);
  });

  it("limite apertado (1%) empurra para 2,5mm²", () => {
    const r = calcularIluminacao({ ...base, quedaMaxPct: 1 });
    // 1,5mm² → 1,0298% > 1%; 2,5mm² → 0,6179% ≤ 1%
    expect(r.secaoPorQueda).toBe(2.5);
    expect(r.secaoSugerida).toBe(2.5);
  });

  it("queda por trecho soma a total e vem na seção sugerida", () => {
    const r = calcularIluminacao(base);
    const soma = r.trechos.reduce((a, t) => a + t.quedaPct, 0);
    expect(soma).toBeCloseTo(r.quedaFinalPct, 8);
    expect(r.trechos[0].quedaVolts).toBeCloseTo((2 * rho * 30 * 500) / (1.5 * 220), 8);
  });

  it("ampacidade governa quando a corrente é alta e o trecho é curto", () => {
    // 30×200W em 127V fp 1 → 47,24A: precisa 10mm² (57A B1/2c; 6mm²=41A não).
    // Queda em 5m: 2,5mm² já fica ≤4% (2,65%).
    const r = calcularIluminacao({
      sistema: "ca", tensao: 127, fp: 1, potencia: 200, numLuminarias: 30,
      quedaMaxPct: 4, metodo: "B1", trechos: [{ distancia: 5, pontos: 30 }],
    });
    expect(r.correnteTotal).toBeCloseTo(6000 / 127, 8);
    expect(r.secaoPorQueda).toBe(2.5);
    expect(r.secaoPorAmpacidade).toBe(10);
    expect(r.secaoSugerida).toBe(10);
  });
});

describe("regras da norma e validações", () => {
  it("mínimo de iluminação é 1,5mm² mesmo com queda e corrente ínfimas", () => {
    const r = calcularIluminacao({
      sistema: "ca", tensao: 220, fp: 0.92, potencia: 10, numLuminarias: 1,
      quedaMaxPct: 4, metodo: "B1", trechos: [{ distancia: 2, pontos: 1 }],
    });
    expect(r.secaoMinNorma).toBe(1.5);
    expect(r.secaoSugerida).toBe(1.5);
  });

  it("nenhuma seção atende a queda: secaoPorQueda null e sugerida null", () => {
    // 12V CC, 2000W, 100m — queda absurda até em 300mm².
    const r = calcularIluminacao({
      sistema: "cc", tensao: 12, potencia: 100, numLuminarias: 20,
      quedaMaxPct: 4, metodo: "B1", trechos: [{ distancia: 100, pontos: 20 }],
    });
    expect(r.secaoPorQueda).toBeNull();
    expect(r.secaoSugerida).toBeNull();
  });

  it("aviso quando o 1º trecho não carrega todas as luminárias", () => {
    const r = calcularIluminacao({
      sistema: "cc", tensao: 24, potencia: 20, numLuminarias: 10,
      quedaMaxPct: 4, metodo: "B1", trechos: [{ distancia: 20, pontos: 7 }],
    });
    expect(r.avisos.some((a) => /1º trecho/.test(a))).toBe(true);
  });

  it("aviso quando pontos acumulados crescem ao longo do circuito", () => {
    const r = calcularIluminacao({
      sistema: "cc", tensao: 24, potencia: 20, numLuminarias: 10,
      quedaMaxPct: 4, metodo: "B1",
      trechos: [{ distancia: 10, pontos: 10 }, { distancia: 10, pontos: 12 }],
    });
    expect(r.avisos.some((a) => /crescem|aumenta/.test(a))).toBe(true);
  });

  it("sem trechos: retorno null", () => {
    expect(
      calcularIluminacao({ sistema: "cc", tensao: 24, potencia: 20, numLuminarias: 10, quedaMaxPct: 4, metodo: "B1", trechos: [] })
    ).toBeNull();
  });

  it("método de instalação muda a ampacidade (B2 é mais restritivo que B1)", () => {
    // 47,24A: B1 pede 10mm² (57A), B2 também 10mm² (52A) — mas 6mm² B2=38A.
    const b2 = calcularIluminacao({
      sistema: "ca", tensao: 127, fp: 1, potencia: 200, numLuminarias: 30,
      quedaMaxPct: 4, metodo: "B2", trechos: [{ distancia: 5, pontos: 30 }],
    });
    expect(b2.secaoPorAmpacidade).toBe(10);
  });
});
