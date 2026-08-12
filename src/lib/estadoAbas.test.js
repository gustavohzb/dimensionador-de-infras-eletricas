// Recuperação de aba quebrada: a limpeza tem que desentupir a aba que falhou
// SEM levar junto o projeto das vizinhas nem o dado que o usuário ainda pode
// querer de volta.

import { describe, it, expect } from "vitest";
import { ABAS, CHAVES_POR_ABA, limparEstadoDaAba, rotuloDaAba } from "./estadoAbas";

// Storage de mentira: o mesmo contrato do localStorage que a função usa.
function storageFalso(inicial = {}) {
  const mapa = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    conteudo: () => Object.fromEntries(mapa),
  };
}

describe("mapa de abas", () => {
  it("toda aba do menu tem entrada de chaves", () => {
    // Sem isso, uma aba nova quebra e o botão de recuperação não acha o que
    // limpar — o `?? []` esconderia o esquecimento em silêncio.
    for (const { id } of ABAS) {
      expect(CHAVES_POR_ABA[id], `aba "${id}" sem entrada em CHAVES_POR_ABA`).toBeDefined();
    }
  });

  it("não sobra entrada de chaves para aba que não existe mais", () => {
    const ids = ABAS.map((a) => a.id);
    for (const id of Object.keys(CHAVES_POR_ABA)) {
      expect(ids, `CHAVES_POR_ABA tem "${id}", que não está no menu`).toContain(id);
    }
  });

  it("nenhuma chave pertence a duas abas", () => {
    // Uma chave repetida faria limpar uma aba apagar o projeto de outra.
    const todas = Object.values(CHAVES_POR_ABA).flat();
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("rotuloDaAba devolve o nome do menu, e não quebra com id desconhecido", () => {
    expect(rotuloDaAba("quadroCargas")).toBe("Cabos Elétricos");
    expect(rotuloDaAba("inexistente")).toBe("inexistente");
    expect(rotuloDaAba(undefined)).toBe("");
  });
});

describe("limparEstadoDaAba", () => {
  it("apaga a chave da aba e guarda o backup antes", () => {
    const st = storageFalso({ "capacitores.v1": '{"kvar":50}' });

    const limpas = limparEstadoDaAba("capacitores", st);

    expect(limpas).toEqual(["capacitores.v1"]);
    expect(st.getItem("capacitores.v1")).toBeNull();
    expect(st.getItem("capacitores.v1.backup")).toBe('{"kvar":50}');
  });

  it("não encosta no estado das outras abas", () => {
    const st = storageFalso({
      "capacitores.v1": "quebrado",
      "quadroCargas.v2": "projeto bom",
      "spdaRisco.v1": "análise boa",
      theme: "dark",
    });

    limparEstadoDaAba("capacitores", st);

    expect(st.getItem("quadroCargas.v2")).toBe("projeto bom");
    expect(st.getItem("spdaRisco.v1")).toBe("análise boa");
    expect(st.getItem("theme")).toBe("dark");
  });

  it("limpa também as versões antigas, que a aba usaria para migrar de volta", () => {
    // Era o buraco: apagar só a v2 e deixar a v1 faz a aba remontar, migrar do
    // v1 e quebrar de novo — o usuário continua preso.
    const st = storageFalso({ "quadroCargas.v2": "novo", "quadroCargas.v1": "velho" });

    const limpas = limparEstadoDaAba("quadroCargas", st);

    expect(limpas).toEqual(["quadroCargas.v2", "quadroCargas.v1"]);
    expect(st.getItem("quadroCargas.v2")).toBeNull();
    expect(st.getItem("quadroCargas.v1")).toBeNull();
  });

  it("pula chave ausente, sem gravar backup vazio", () => {
    const st = storageFalso({ "iluminacao.v3": "só a atual" });

    const limpas = limparEstadoDaAba("iluminacao", st);

    expect(limpas).toEqual(["iluminacao.v3"]);
    expect(Object.keys(st.conteudo())).not.toContain("iluminacao.v2.backup");
    expect(Object.keys(st.conteudo())).not.toContain("iluminacao.v1.backup");
  });

  it("clicar duas vezes não destrói o backup da primeira limpeza", () => {
    const st = storageFalso({ "spdaRisco.v1": "a análise original" });

    limparEstadoDaAba("spda", st);
    const segunda = limparEstadoDaAba("spda", st);

    expect(segunda).toEqual([]);
    expect(st.getItem("spdaRisco.v1.backup")).toBe("a análise original");
  });

  it("aba sem estado salvo não faz nada e não quebra", () => {
    const st = storageFalso({ theme: "dark" });

    expect(limparEstadoDaAba("infra", st)).toEqual([]);
    expect(limparEstadoDaAba("sobre", st)).toEqual([]);
    expect(st.conteudo()).toEqual({ theme: "dark" });
  });

  it("id de aba desconhecido não quebra", () => {
    const st = storageFalso({ "capacitores.v1": "x" });

    expect(limparEstadoDaAba("nao-existe", st)).toEqual([]);
    expect(limparEstadoDaAba(undefined, st)).toEqual([]);
    expect(st.getItem("capacitores.v1")).toBe("x");
  });

  it("storage cheio impede o backup, mas a chave é apagada assim mesmo", () => {
    // Desentupir a aba vale mais que a cópia: sem isso o usuário fica preso na
    // tela de erro justamente quando o storage está estourado.
    const st = storageFalso({ "capacitores.v1": "grande demais" });
    const cheio = {
      ...st,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    const limpas = limparEstadoDaAba("capacitores", cheio);

    expect(limpas).toEqual(["capacitores.v1"]);
    expect(st.getItem("capacitores.v1")).toBeNull();
  });
});
