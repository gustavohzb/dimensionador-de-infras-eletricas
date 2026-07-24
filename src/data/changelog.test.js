import { describe, it, expect } from "vitest";
import { CHANGELOG, APP_VERSION, TIPOS, versaoDoIndice } from "./changelog";

describe("changelog", () => {
  it("começa na 0.00 e soma 0,01 por atualização, sem pular nem repetir", () => {
    expect(CHANGELOG[0].versao).toBe("0.00");
    CHANGELOG.forEach((u, i) => expect(u.versao).toBe(versaoDoIndice(i)));
    expect(new Set(CHANGELOG.map((u) => u.versao)).size).toBe(CHANGELOG.length);
  });

  it("passa de 0.99 para 1.00 (a centena vira, não fica 0.100)", () => {
    expect(versaoDoIndice(99)).toBe("0.99");
    expect(versaoDoIndice(100)).toBe("1.00");
    expect(versaoDoIndice(101)).toBe("1.01");
  });

  it("APP_VERSION é a da última atualização", () => {
    expect(APP_VERSION).toBe(CHANGELOG[CHANGELOG.length - 1].versao);
  });

  it("toda entrada tem data, título, tipo conhecido e ao menos um item", () => {
    for (const u of CHANGELOG) {
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
