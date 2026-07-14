// Testes da decisão automática de tipo de cabo (multipolar × unipolar) feita
// em computeCircuito: tenta multipolar; se a seção resultante passa do limite
// `secaoMaxMultipolar` do preset, refaz como unipolar. Valores conferidos à
// mão a partir das tabelas de ampacidade (ver cableSizingPro.test.js).

import { describe, it, expect } from "vitest";
import { computeCircuito } from "./CircuitoForm";

const trecho = (over = {}) => ({
  condutoId: "eletrocalha",
  distribuicao: null,
  camadas: 1,
  circuitos: 1,
  temperatura: 30,
  distancia: 10,
  ...over,
});

const circuito = (over = {}) => ({
  modo: "corrente",
  corrente: 80,
  fatorServico: 1,
  esquemaId: "trifCnCt",
  tensao: 380,
  formaPartidaId: "nenhuma",
  porFase: 1,
  trechos: [trecho()],
  ...over,
});

const preset = (over = {}) => ({
  fp: 0.92,
  material: "cobre",
  condutorTemp: 90,
  quedaMaxRegime: 4,
  secaoMinima: 2.5,
  secaoMaxMultipolar: 16,
  ...over,
});

describe("computeCircuito — escolha automática do tipo de cabo", () => {
  it("mantém multipolar quando a seção fica dentro do limite (80 A → 16 mm²)", () => {
    // B2 (multipolar) 3-carreg: 16→80 A. 16 ≤ secaoMaxMultipolar 16 ⇒ multipolar.
    const r = computeCircuito(circuito({ corrente: 80 }), preset());
    expect(r.error).toBeUndefined();
    expect(r.tipoCabo).toBe("multipolar");
    expect(r.secaoFinal).toBe(16);
  });

  it("troca para unipolar quando multipolar passaria do limite (250 A)", () => {
    // Multipolar B2 pediria 120 mm² (>16) ⇒ refaz unipolar. B1 3-carreg:
    // 70→222 (<250), 95→269 (≥250) ⇒ 95 mm² unipolar.
    const r = computeCircuito(circuito({ corrente: 250 }), preset({ secaoMaxMultipolar: 16 }));
    expect(r.tipoCabo).toBe("unipolar");
    expect(r.secaoFinal).toBe(95);
  });

  it("converte potência em corrente antes de dimensionar (motor 10 CV)", () => {
    // I ≈ 13,2 A ⇒ B2 3-carreg 2,5→26 cobre; mínimo do preset 2,5 ⇒ 2,5 mm².
    const r = computeCircuito(
      circuito({ modo: "potencia", potencia: 10, unidade: "CV", rendimento: 0.92, corrente: undefined }),
      preset()
    );
    expect(r.error).toBeUndefined();
    expect(r.corrente).toBeCloseTo(13.21, 1);
    expect(r.tipoCabo).toBe("multipolar");
  });

  it("usa a queda máx. de partida do próprio circuito (não do preset)", () => {
    // Dois motores idênticos, só muda o limite de partida: 10% → 10 mm²,
    // 5% → 16 mm². Prova que o limite é por circuito.
    const base = circuito({ corrente: 40, formaPartidaId: "PD1", trechos: [trecho({ distancia: 30 })] });
    const r10 = computeCircuito({ ...base, quedaMaxPartida: 10 }, preset());
    const r5 = computeCircuito({ ...base, quedaMaxPartida: 5 }, preset());
    expect(r10.secaoFinal).toBe(10);
    expect(r5.secaoFinal).toBe(16);
  });
});
