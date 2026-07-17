// Layout da placa de montagem: as dimensões esperadas foram calculadas à mão
// pela fórmula L = 2×margem + n×Ø + (n−1)×esp, não copiadas da saída do código.

import { describe, it, expect } from "vitest";
import { layoutPlaca, reconciliarOrdem, celulasDosEstagios, trocarNaOrdem } from "./plateLayout";

const base = { diametro: 85, espacamento: 40, margem: 50, celulasPorFileira: 6 };
// Estágio com id estável — é assim que a aba monta os estágios de verdade.
const est = (id, ...celulas) => ({ id, celulas });

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

describe("Ø automático por kvar (catálogo Siemens BR B32, 440V/60Hz)", () => {
  it("faixas: 2,5→53, 5→63, 10→79,5, 25/33,7/40→89,5", () => {
    const { celulas } = layoutPlaca({
      ...base,
      diametro: "auto",
      estagios: [{ celulas: [2.5, 5] }, { celulas: [10, 25] }, { celulas: [33.7, 40] }],
    });
    expect(celulas.map((c) => c.d)).toEqual([53, 63, 79.5, 89.5, 89.5, 89.5]);
  });

  it("banco da planilha (33,7 e 30) sai todo em Ø89,5 — B32344-E4282/E4252", () => {
    const { celulas, diametro } = layoutPlaca({
      ...base,
      diametro: "auto",
      estagios: [{ celulas: [33.7, 33.7] }, { celulas: [30] }],
    });
    expect(celulas.every((c) => c.d === 89.5)).toBe(true);
    expect(diametro).toBe(89.5);
  });

  it("grade mista: passo e placa governados pela maior célula", () => {
    // 1 célula de 40 (Ø89,5) + 1 de 5 (Ø63), lado a lado
    const p = layoutPlaca({ ...base, diametro: "auto", estagios: [{ celulas: [40, 5] }] });
    // largura: 2×50 + 2×89,5 + 40 = 319; altura: 2×50 + 89,5 = 189,5
    expect(p.largura).toBe(319);
    expect(p.altura).toBe(189.5);
    // ambas centradas nos slots de 89,5: cx 94,75 e 224,25
    expect(p.celulas[0]).toMatchObject({ d: 89.5, cx: 94.75, cy: 94.75 });
    expect(p.celulas[1]).toMatchObject({ d: 63, cx: 224.25, cy: 94.75 });
  });

  it("Ø manual numérico segue valendo para todas", () => {
    const { celulas } = layoutPlaca({ ...base, diametro: 100, estagios: [{ celulas: [5, 40] }] });
    expect(celulas.map((c) => c.d)).toEqual([100, 100]);
  });
});

describe("reconciliarOrdem — o arranjo sobrevive a mexer na lista", () => {
  const estagios = [est("a", 10, 10), est("b", 20)];

  it("sem arranjo salvo: ordem canônica dos estágios", () => {
    expect(reconciliarOrdem(estagios, null)).toEqual(["a:0", "a:1", "b:0"]);
  });

  it("preserva o arranjo do usuário", () => {
    expect(reconciliarOrdem(estagios, ["b:0", "a:1", "a:0"])).toEqual(["b:0", "a:1", "a:0"]);
  });

  it("estágio novo entra no fim, sem bagunçar o que já estava arranjado", () => {
    const comNovo = [...estagios, est("c", 30)];
    expect(reconciliarOrdem(comNovo, ["b:0", "a:1", "a:0"])).toEqual(["b:0", "a:1", "a:0", "c:0"]);
  });

  it("estágio removido vira buraco — quem vem depois não se desloca", () => {
    // remove o "a"; as chaves do "b" continuam válidas porque o id não desloca
    expect(reconciliarOrdem([est("b", 20)], ["a:0", "b:0", "a:1"])).toEqual([null, "b:0"]);
  });

  it("célula nova ocupa o primeiro buraco antes de ir para o fim", () => {
    const comNovo = [...estagios, est("c", 30)];
    expect(reconciliarOrdem(comNovo, ["a:0", null, "b:0", "a:1"])).toEqual(["a:0", "c:0", "b:0", "a:1"]);
  });

  it("chaves de lixo no arranjo salvo viram buraco, e não somem", () => {
    expect(reconciliarOrdem(estagios, ["z:9", "b:0"])).toEqual(["a:0", "b:0", "a:1"]);
  });
});

describe("layoutPlaca com arranjo do usuário", () => {
  const estagios = [est("a", 10, 10), est("b", 20)];

  it("as células ocupam os slots na ordem dada, mantendo o estágio de origem", () => {
    const { celulas } = layoutPlaca({ ...base, estagios, ordem: ["b:0", "a:1", "a:0"] });
    // slot 0 passa a ser a célula do estágio 2
    expect(celulas.map((c) => c.key)).toEqual(["b:0", "a:1", "a:0"]);
    expect(celulas.map((c) => c.estagio)).toEqual([2, 1, 1]);
    expect(celulas.map((c) => c.kvar)).toEqual([20, 10, 10]);
  });

  it("trocar duas células troca só as posições — a placa não muda", () => {
    const auto = layoutPlaca({ ...base, estagios });
    const trocado = layoutPlaca({ ...base, estagios, ordem: ["b:0", "a:1", "a:0"] });
    expect(trocado.largura).toBe(auto.largura);
    expect(trocado.altura).toBe(auto.altura);
    // os slots (cx/cy) são os mesmos; muda quem está em cada um
    expect(trocado.celulas.map((c) => c.cx)).toEqual(auto.celulas.map((c) => c.cx));
  });

  it("devolve a ordem com a grade completa, pronta para o próximo arrasto", () => {
    // 3 células numa fileira de 6: os 3 slots que sobram viram buraco
    const { ordem } = layoutPlaca({ ...base, estagios, ordem: ["b:0"] });
    expect(ordem).toEqual(["b:0", "a:0", "a:1", null, null, null]);
  });

  it("Ø automático acompanha a célula, não o slot", () => {
    const mistos = [est("a", 5), est("b", 33.7)];
    const { celulas } = layoutPlaca({ ...base, diametro: "auto", estagios: mistos, ordem: ["b:0", "a:0"] });
    // a célula grande foi para o slot 0 e levou o Ø dela junto
    expect(celulas.map((c) => c.d)).toEqual([89.5, 63]);
  });
});

describe("buracos na grade — arrastar para slot vazio encolhe a placa", () => {
  // 7 células de 25 kvar, 6 por fileira: o arranjo automático dá 6+1.
  const sete = Array.from({ length: 7 }, (_, i) => est(`e${i}`, 25));
  const chaves = sete.map((e) => `${e.id}:0`);

  it("automático: 7 células viram 6+1 e a placa tem 6 colunas", () => {
    const p = layoutPlaca({ ...base, estagios: sete });
    expect([p.cols, p.rows]).toEqual([6, 2]);
    expect(p.largura).toBe(810); // 2×50 + 6×85 + 5×40
  });

  it("a grade completa as fileiras: 7 células ocupadas + 5 slots vazios", () => {
    const p = layoutPlaca({ ...base, estagios: sete });
    expect(p.slots).toHaveLength(12); // 6 por fileira × 2 fileiras
    expect(p.celulas).toHaveLength(7);
    expect(p.slots.filter((s) => !s.key).map((s) => s.idx)).toEqual([7, 8, 9, 10, 11]);
  });

  it("rearranjado em 4+3, a placa encolhe de 6 para 4 colunas", () => {
    // as duas últimas da fileira de cima descem para os buracos 7 e 8
    const ordem = [chaves[0], chaves[1], chaves[2], chaves[3], null, null, chaves[6], chaves[4], chaves[5], null, null, null];
    const p = layoutPlaca({ ...base, estagios: sete, ordem });
    expect([p.cols, p.rows]).toEqual([4, 2]);
    expect(p.largura).toBe(560); // 2×50 + 4×85 + 3×40
    expect(p.altura).toBe(310); // inalterada: continuam 2 fileiras
  });

  it("a grade é sempre mais larga que a placa consolidada — é a vista do arrasto", () => {
    const ordem = [chaves[0], chaves[1], chaves[2], chaves[3], null, null, chaves[6], chaves[4], chaves[5], null, null, null];
    const p = layoutPlaca({ ...base, estagios: sete, ordem });
    expect(p.largura).toBe(560); // a placa encolheu para 4 colunas
    expect(p.gradeLargura).toBe(810); // mas a grade continua com as 6
  });

  it("pré-visualização: trocarNaOrdem dá a placa que o usuário veria antes de soltar", () => {
    const p = layoutPlaca({ ...base, estagios: sete });
    expect(p.largura).toBe(810);
    // arrastar a célula do slot 5 (última da fileira de cima) para o buraco 8
    const previa = layoutPlaca({ ...base, estagios: sete, ordem: trocarNaOrdem(p.ordem, 5, 8) });
    expect(previa.largura).toBe(685); // 2×50 + 5×85 + 4×40 — encolheu uma coluna
    expect(previa.altura).toBe(p.altura); // continuam 2 fileiras
  });

  it("trocarNaOrdem não mexe no array original", () => {
    const ordem = ["a:0", null, "b:0"];
    expect(trocarNaOrdem(ordem, 0, 1)).toEqual([null, "a:0", "b:0"]);
    expect(ordem).toEqual(["a:0", null, "b:0"]);
  });

  it("os buracos têm posição própria — é o alvo do arrasto", () => {
    const p = layoutPlaca({ ...base, estagios: sete });
    const vazio = p.slots.find((s) => s.idx === 8); // fileira 1, coluna 2
    expect(vazio).toMatchObject({ key: null, col: 2, row: 1, cx: 342.5, cy: 217.5 });
  });

  it("buraco no meio não desloca quem vem depois", () => {
    // as 7 células presentes, mas com a coluna 1 deixada vazia pelo usuário
    const ordem = [chaves[0], null, chaves[1], chaves[2], chaves[3], chaves[4], chaves[5], chaves[6]];
    const { celulas } = layoutPlaca({ ...base, estagios: sete, ordem });
    expect(celulas.find((c) => c.key === chaves[1])).toMatchObject({ col: 2, row: 0 });
    expect(celulas.map((c) => c.idx)).toEqual([0, 2, 3, 4, 5, 6, 7]);
  });
});

describe("celulasDosEstagios", () => {
  it("achata os estágios em células com chave estável", () => {
    expect(celulasDosEstagios([est("a", 10, 10), est("b", 20)])).toEqual([
      { key: "a:0", estagio: 1, kvar: 10 },
      { key: "a:1", estagio: 1, kvar: 10 },
      { key: "b:0", estagio: 2, kvar: 20 },
    ]);
  });
});
