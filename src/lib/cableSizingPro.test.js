// Testes "golden value" do motor de dimensionamento (NBR 5410).
//
// Cada caso tem a seção final e o critério dominante CALCULADOS À MÃO a partir
// das tabelas da norma (ampacidade, agrupamento, temperatura) e da fórmula de
// queda de tensão — NÃO são snapshots do que o código produz hoje. Se um
// refactor de UI, uma edição numa tabela ou um ajuste de fator quebrar um
// resultado, o teste correspondente falha. O comentário de cada caso registra
// a conta para que o valor esperado possa ser reconferido sem rodar o código.
//
// Fórmula de queda (por fase, corrente de linha), como em cableSizingPro.js:
//   r    = (rho*1000)/(secao*porFase)        Ω/km do conjunto
//   x    = REATANCIA[tipoCabo]/porFase        (unipolar 0,08 / multipolar 0,09)
//   coef = kQueda*(r*cosφ + x*senφ)           V/(A·km)
//   dv   = coef*corrente*comprimento/1000     V
//   %    = dv/tensao*100
// ρ (Ω·mm²/m): 90°C cobre 0,022 · alumínio 0,0362 | 70°C cobre 0,0206.
// kQueda: 2 (mono/bi) · √3 (trifásico).

import { describe, it, expect } from "vitest";
import { dimensionarCircuitoPro, correnteDeProjeto } from "./cableSizingPro";

// Trecho padrão: eletrocalha (método B1/B2 — feixe), 30°C, 1 circuito, 30 m.
const trecho = (over = {}) => ({
  condutoId: "eletrocalha",
  distribuicao: null,
  camadas: 1,
  circuitos: 1,
  temperatura: 30,
  distancia: 30,
  ...over,
});

// Circuito padrão trifásico com neutro e terra (3 carregados), cobre 90°C.
const dim = (over = {}) => {
  const { trechos, ...rest } = over;
  return dimensionarCircuitoPro({
    corrente: 40,
    esquemaId: "trifCnCt",
    tensao: 380,
    fp: 0.92,
    material: "cobre",
    tipoCabo: "multipolar",
    porFase: 1,
    formaPartidaId: "nenhuma",
    quedaMaxRegime: 4,
    quedaMaxPartida: 10,
    secaoMinima: 2.5,
    condutorTemp: 90,
    trechos: trechos ?? [trecho()],
    ...rest,
  });
};

describe("dimensionarCircuitoPro — critério capacidade", () => {
  it("Caso 1 — 80 A trifásico, eletrocalha, cobre 90°C → 16 mm²", () => {
    // B2 (multipolar) col 3-carregados: 16→80 A. iCorrigida = 80/(1·1) = 80.
    // 80 A cabe em 16 mm² (80) e não em 10 (60). Queda regime (30 m) exige 6.
    // secaoFinal = max(16, 6, mín 2,5) = 16, critério capacidade.
    const r = dim({ corrente: 80 });
    expect(r.error).toBeUndefined();
    expect(r.secaoCapacidade).toBe(16);
    expect(r.secaoFinal).toBe(16);
    expect(r.criterio).toBe("capacidade");
  });

  it("Caso 2 — mesmos 80 A em PVC 70°C → sobe para 25 mm²", () => {
    // PVC cobre B2 col 3-carregados: 16→62, 25→80. 80 A já não cabe em 16.
    // Discrimina a tabela 70°C: EPR daria 16, PVC exige 25.
    const r = dim({ corrente: 80, condutorTemp: 70 });
    expect(r.secaoCapacidade).toBe(25);
    expect(r.secaoFinal).toBe(25);
    expect(r.criterio).toBe("capacidade");
  });

  it("Caso 9 — harmônicas >15% aplicam fator 0,86 (25→35 mm²)", () => {
    // trifCnCtH: fca = 1×0,86. iCorrigida = 100/0,86 = 116,3 A.
    // B2 col 3-carreg: 25→105 (<116), 35→128 (≥116) ⇒ 35. Sem harmônicas
    // (100 A) seria 25 — o caso isola exatamente o fator 0,86.
    const r = dim({ corrente: 100, esquemaId: "trifCnCtH", trechos: [trecho({ distancia: 10 })] });
    expect(r.secaoFinal).toBe(35);
    expect(r.criterio).toBe("capacidade");
    expect(r.neutro).toBe(35); // harmônicas ⇒ neutro = fase (não reduzido)
  });

  it("Caso 10 — correção de temperatura (50°C, FCT 0,82) empurra 25→35 mm²", () => {
    // FCT ambiente 90°C a 50°C = 0,82. iCorrigida = 100/0,82 = 122 A.
    // B2 col 3-carreg: 25→105 (<122), 35→128 (≥122) ⇒ 35. A 30°C seria 25.
    const r = dim({ corrente: 100, trechos: [trecho({ temperatura: 50, distancia: 5 })] });
    expect(r.secaoFinal).toBe(35);
    expect(r.criterio).toBe("capacidade");
  });

  it("Caso 11 — duto subterrâneo (método D, solo 20°C) → 25 mm²", () => {
    // dutoSubt multipolar → método D, FCT solo 20°C = 1,0, fca variosPorDuto = 1.
    // D cobre col 3-carreg: 16→79 (<100), 25→101 (≥100) ⇒ 25.
    const r = dim({
      corrente: 100,
      trechos: [trecho({ condutoId: "dutoSubt", distribuicao: "variosPorDuto", temperatura: 20, distancia: 10 })],
    });
    expect(r.secaoCapacidade).toBe(25);
    expect(r.secaoFinal).toBe(25);
  });

  it("Caso 12 — duto subt. unipolar usa a sub-tabela mais rigorosa da Tab. 45 (35→50 mm²)", () => {
    // 2 circuitos, 1 cabo/duto, dutos próximos (espaçamento nulo). Método D é
    // igual para uni/multi neste conduto — só o fca muda (Tab. 45 tem duas
    // sub-tabelas distintas). Multipolar: fca=0,85 ⇒ iCorr=100/0,85=117,6 A
    // ⇒ D col3: 25→101(falha), 35→122(passa) ⇒ 35. Unipolar: fca=0,80 ⇒
    // iCorr=100/0,80=125 A ⇒ 35→122(falha) também, 50→144(passa) ⇒ 50.
    const base = trecho({ condutoId: "dutoSubt", distribuicao: "dutosProximos", circuitos: 2, temperatura: 20, distancia: 10 });
    const multi = dim({ corrente: 100, tipoCabo: "multipolar", trechos: [base] });
    const uni = dim({ corrente: 100, tipoCabo: "unipolar", trechos: [base] });
    expect(multi.secaoCapacidade).toBe(35);
    expect(uni.secaoCapacidade).toBe(50);
    expect(uni.secaoCapacidade).toBeGreaterThan(multi.secaoCapacidade);
  });
});

describe("dimensionarCircuitoPro — outros critérios dominantes", () => {
  it("Caso 3 — trecho longo (200 m) faz a queda em regime mandar → 25 mm²", () => {
    // Capacidade (40 A) pediria só 6 mm². Queda regime 4%: 16→4,74% (falha),
    // 25→3,08% (passa) ⇒ 25. secaoFinal = max(6, 25) = 25, critério quedaRegime.
    const r = dim({ trechos: [trecho({ distancia: 200 })] });
    expect(r.secaoCapacidade).toBe(6);
    expect(r.secaoQuedaRegime).toBe(25);
    expect(r.secaoFinal).toBe(25);
    expect(r.criterio).toBe("quedaRegime");
  });

  it("Caso 4 — motor (partida direta ×6) faz a queda na partida mandar → 10 mm²", () => {
    // Ip = 40×6 = 240 A. Queda partida 10%: 6→11,19% (falha), 10→6,76% (passa)
    // ⇒ 10. Capacidade 6, queda regime 4 ⇒ secaoFinal = 10, critério quedaPartida.
    const r = dim({ formaPartidaId: "PD1" });
    expect(r.correntePartida).toBe(240);
    expect(r.secaoQuedaPartida).toBe(10);
    expect(r.secaoFinal).toBe(10);
    expect(r.criterio).toBe("quedaPartida");
    expect(r.quedaRegime).toBeCloseTo(1.13, 1);
    expect(r.quedaPartida).toBeCloseTo(6.76, 1);
  });

  it("Caso 6 — seção mínima do preset (10 mm²) domina cargas pequenas", () => {
    // 15 A: capacidade 1,5 e queda regime 1,5. Preset secaoMinima 10 ⇒
    // secaoFinal = max(1,5, 1,5, 10) = 10, critério seção mínima.
    const r = dim({ corrente: 15, secaoMinima: 10, trechos: [trecho({ distancia: 10 })] });
    expect(r.secaoCapacidade).toBe(1.5);
    expect(r.secaoFinal).toBe(10);
    expect(r.criterio).toBe("minima");
  });
});

describe("dimensionarCircuitoPro — material e paralelismo", () => {
  it("Caso 5 — 2 condutores por fase dividem a corrente por cabo", () => {
    // porFase 2 ⇒ correntePorCabo = 40/2 = 20 A. B2 col 3-carreg: 2,5→26 (≥20)
    // ⇒ capacidade 2,5. secaoFinal = max(2,5; queda; mín 2,5) = 2,5.
    const r = dim({ porFase: 2 });
    expect(r.correntePorCabo).toBe(20);
    expect(r.secaoCapacidade).toBe(2.5);
    expect(r.secaoFinal).toBe(2.5);
    expect(r.porFase).toBe(2);
  });

  it("Caso 7 — alumínio respeita a seção mínima de 16 mm²", () => {
    // Alumínio: piso do material 16 mm². 30 A caberia em seção menor, mas o
    // mínimo do alumínio força ≥ 16.
    const r = dim({ corrente: 30, material: "aluminio", trechos: [trecho({ distancia: 10 })] });
    expect(r.secaoFinal).toBeGreaterThanOrEqual(16);
  });
});

describe("correnteDeProjeto — conversão potência → corrente", () => {
  it("Motor 10 CV trifásico, fp 0,92, η 0,92 → ~13,2 A", () => {
    // I = P/(√3·V·cosφ·η) = 7360/(√3·380·0,92·0,92) = 13,21 A.
    const r = correnteDeProjeto({
      modo: "potencia", potencia: 10, unidade: "CV", tensao: 380,
      fp: 0.92, rendimento: 0.92, fatorServico: 1, esquemaId: "trifCnCt",
    });
    expect(r.corrente).toBeCloseTo(13.21, 1);
  });

  it("Mesmo motor com fp 0,70 → ~17,4 A (I ∝ 1/fp)", () => {
    const r = correnteDeProjeto({
      modo: "potencia", potencia: 10, unidade: "CV", tensao: 380,
      fp: 0.70, rendimento: 0.92, fatorServico: 1, esquemaId: "trifCnCt",
    });
    expect(r.corrente).toBeCloseTo(17.36, 1);
  });

  it("Fator de serviço multiplica a corrente informada", () => {
    const r = correnteDeProjeto({ modo: "corrente", corrente: 40, fatorServico: 1.15, esquemaId: "trifCnCt" });
    expect(r.corrente).toBeCloseTo(46, 5);
  });
});
