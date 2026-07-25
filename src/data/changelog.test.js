import { describe, it, expect } from "vitest";
import { CHANGELOG, APP_VERSION, TIPOS, compararVersao } from "./changelog";

describe("changelog", () => {
  it("a versão só anda para frente", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      const anterior = CHANGELOG[i - 1].versao;
      const atual = CHANGELOG[i].versao;
      expect(
        compararVersao(atual, anterior),
        `${atual} não vem depois de ${anterior}`
      ).toBeGreaterThan(0);
    }
    expect(new Set(CHANGELOG.map((u) => u.versao)).size).toBe(CHANGELOG.length);
  });

  it("a casa que sobe zera as menores", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      const [maiorAnt, menorAnt] = CHANGELOG[i - 1].versao.split(".").map(Number);
      const [maior, menor, correcao] = CHANGELOG[i].versao.split(".").map(Number);
      const onde = `${CHANGELOG[i - 1].versao} -> ${CHANGELOG[i].versao}`;
      if (maior > maiorAnt) {
        expect([menor, correcao], `${onde}: subiu a maior, menor e correção deviam zerar`).toEqual([0, 0]);
      } else if (menor > menorAnt) {
        expect(correcao, `${onde}: subiu a menor, correção devia zerar`).toBe(0);
      }
    }
  });

  it("compararVersao ordena por número, não por texto", () => {
    expect(compararVersao("1.9.0", "1.10.0")).toBeLessThan(0);
    expect(compararVersao("1.0.0", "0.14.5")).toBeGreaterThan(0);
    expect(compararVersao("1.2.3", "1.2.3")).toBe(0);
  });

  it("APP_VERSION é a da última atualização", () => {
    expect(APP_VERSION).toBe(CHANGELOG[CHANGELOG.length - 1].versao);
  });

  it("toda entrada tem versão, data, título, tipo conhecido e ao menos um item", () => {
    for (const u of CHANGELOG) {
      expect(u.versao, `versão fora do formato maior.menor.correção: ${u.versao}`).toMatch(/^\d+\.\d+\.\d+$/);
      expect(u.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(u.titulo.length).toBeGreaterThan(0);
      expect(TIPOS[u.tipo], `tipo desconhecido em v${u.versao}: ${u.tipo}`).toBeDefined();
      expect(u.itens.length, `v${u.versao} sem itens`).toBeGreaterThan(0);
      for (const item of u.itens) expect(item.length).toBeGreaterThan(0);
    }
  });

  it("as datas não andam para trás — a ordem da lista é cronológica", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(
        CHANGELOG[i].data >= CHANGELOG[i - 1].data,
        `v${CHANGELOG[i].versao} (${CHANGELOG[i].data}) vem antes de v${CHANGELOG[i - 1].versao} (${CHANGELOG[i - 1].data})`
      ).toBe(true);
    }
  });
});
