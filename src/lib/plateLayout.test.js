// Layout da placa de montagem: as dimensões esperadas foram calculadas à mão
// pela fórmula L = 2×margem + n×Ø + (n−1)×esp, não copiadas da saída do código.

import { describe, it, expect } from "vitest";
import { layoutPlaca } from "./plateLayout";

const base = { diametro: 85, espacamento: 40, margem: 50, celulasPorFileira: 6 };

describe("layoutPlaca", () => {
  it("banco da planilha (8×2 + 4×1 = 20 células): grade 6×4 e placa 810×560", () => {
    const estagios = [
      ...Array.from({ length: 8 }, () => ({ celulas: [33.7, 33.7] })),
      ...Array.from({ length: 4 }, () => ({ celulas: [30] })),
    ];
    const p = layoutPlaca({ ...base, estagios });
    expect(p.celulas).toHaveLength(20);
    expect(p.cols).toBe(6);
    expect(p.rows).toBe(4); // ceil(20/6)
    // largura: 2×50 + 6×85 + 5×40 = 810; altura: 2×50 + 4×85 + 3×40 = 560
    expect(p.largura).toBe(810);
    expect(p.altura).toBe(560);
  });

  it("menos células que a fileira: placa encolhe na largura", () => {
    const p = layoutPlaca({ ...base, estagios: [{ celulas: [25, 25] }] });
    expect(p.cols).toBe(2);
    expect(p.rows).toBe(1);
    // 2×50 + 2×85 + 1×40 = 310; altura: 2×50 + 85 = 185
    expect(p.largura).toBe(310);
    expect(p.altura).toBe(185);
  });

  it("posições: primeira célula em (margem+Ø/2), passo Ø+espaçamento, quebra de fileira", () => {
    const estagios = Array.from({ length: 7 }, () => ({ celulas: [10] }));
    const { celulas } = layoutPlaca({ ...base, estagios });
    expect(celulas[0]).toMatchObject({ cx: 92.5, cy: 92.5 }); // 50 + 42,5
    expect(celulas[1].cx).toBe(217.5); // 92,5 + 125
    expect(celulas[6]).toMatchObject({ cx: 92.5, cy: 217.5 }); // 7ª quebra pra 2ª fileira
  });

  it("células do mesmo estágio ficam adjacentes e rotuladas com o estágio", () => {
    const { celulas } = layoutPlaca({ ...base, estagios: [{ celulas: [20, 20] }, { celulas: [30] }] });
    expect(celulas.map((c) => c.estagio)).toEqual([1, 1, 2]);
    expect(celulas.map((c) => c.kvar)).toEqual([20, 20, 30]);
  });

  it("todas as células cabem dentro da placa", () => {
    const estagios = Array.from({ length: 13 }, () => ({ celulas: [10, 10] }));
    const p = layoutPlaca({ ...base, estagios });
    p.celulas.forEach((c) => {
      expect(c.cx - 85 / 2).toBeGreaterThanOrEqual(0);
      expect(c.cx + 85 / 2).toBeLessThanOrEqual(p.largura);
      expect(c.cy + 85 / 2).toBeLessThanOrEqual(p.altura);
    });
  });

  it("sem estágios: placa zerada, sem NaN", () => {
    const p = layoutPlaca({ ...base, estagios: [] });
    expect(p.celulas).toHaveLength(0);
    expect(p.largura).toBe(0);
    expect(p.altura).toBe(0);
  });
});

describe("Ø automático por kvar (catálogo)", () => {
  it("faixas: 5→63,5, 10→75, 25 e 33,7→85, 40→90", () => {
    const { celulas } = layoutPlaca({
      ...base,
      diametro: "auto",
      estagios: [{ celulas: [5, 10] }, { celulas: [25, 33.7] }, { celulas: [40] }],
    });
    expect(celulas.map((c) => c.d)).toEqual([63.5, 75, 85, 85, 90]);
  });

  it("banco da planilha (33,7 e 30) sai todo em Ø85 — bate com o datasheet HD", () => {
    const { celulas, diametro } = layoutPlaca({
      ...base,
      diametro: "auto",
      estagios: [{ celulas: [33.7, 33.7] }, { celulas: [30] }],
    });
    expect(celulas.every((c) => c.d === 85)).toBe(true);
    expect(diametro).toBe(85);
  });

  it("grade mista: passo e placa governados pela maior célula", () => {
    // 1 célula de 40 (Ø90) + 1 de 5 (Ø63,5), lado a lado
    const p = layoutPlaca({ ...base, diametro: "auto", estagios: [{ celulas: [40, 5] }] });
    // largura: 2×50 + 2×90 + 40 = 320; altura: 2×50 + 90 = 190
    expect(p.largura).toBe(320);
    expect(p.altura).toBe(190);
    // ambas centradas nos slots de 90: cx 95 e 225
    expect(p.celulas[0]).toMatchObject({ d: 90, cx: 95, cy: 95 });
    expect(p.celulas[1]).toMatchObject({ d: 63.5, cx: 225, cy: 95 });
  });

  it("Ø manual numérico segue valendo para todas", () => {
    const { celulas } = layoutPlaca({ ...base, diametro: 100, estagios: [{ celulas: [5, 40] }] });
    expect(celulas.map((c) => c.d)).toEqual([100, 100]);
  });
});
