// Formato do circuito de média tensão e migração do estado salvo.
//
// A aba de BT precisou de normalização depois de pronta, e enquanto não tinha,
// reabrir projeto antigo chegou a produzir cabo subdimensionado. Aqui ela nasce
// junto — por isso há teste de migração antes de existir uma versão anterior
// para migrar.

import { describe, it, expect } from "vitest";
import {
  CAMPOS_AGRUPAMENTO,
  defaultCircuitoMT,
  defaultPresetMT,
  defaultTrechoMT,
  normalizarCircuitoMT,
  normalizarCircuitosMT,
  normalizarProjetoMT,
  normalizarTrechoMT,
} from "./mtModelo";
import { METODOS_MT, METODOS_SEM_AGRUPAMENTO } from "../data/cabosNBR14039";

describe("defaults", () => {
  it("o trecho padrão usa um método que a norma classifica, não um ambíguo", () => {
    // Se o default caísse em C ou D, a aba abriria já sem conseguir calcular:
    // fatorTemperaturaMT devolve null nesses métodos até alguém escolher a
    // referência. Um app que abre travado é pior que um que abre calculando.
    const t = defaultTrechoMT();
    const m = METODOS_MT.find((x) => x.id === t.metodo);
    expect(m).toBeTruthy();
    expect(m.enterrado).not.toBeNull();
  });

  it("a referência de temperatura nasce nula, sem lado escolhido", () => {
    expect(defaultTrechoMT().referenciaTemp).toBeNull();
  });

  it("o solo nasce nas condições de referência das Tabelas 32 e 33", () => {
    const t = defaultTrechoMT();
    expect(t.resistividadeSolo).toBe(2.5);
    expect(t.profundidade).toBe(0.9);
  });

  it("a formação do cabo é do circuito, não do trecho", () => {
    // Um circuito não vira tripolar no meio do caminho. A escolha decide qual
    // tabela de agrupamento vale (34 para unipolares em trifólio, 35 para
    // tripolares) e entra na designação do cabo.
    expect(defaultCircuitoMT().formacao).toBe("unipolar");
    expect(defaultTrechoMT()).not.toHaveProperty("cabo");
  });

  it("o circuito nasce com um trecho", () => {
    expect(defaultCircuitoMT().trechos).toHaveLength(1);
  });

  it("cada chamada devolve um trecho novo, não o mesmo objeto", () => {
    // Compartilhar o array entre circuitos faria editar um trecho mexer em
    // todos os circuitos da tela.
    const a = defaultCircuitoMT();
    const b = defaultCircuitoMT();
    expect(a.trechos[0]).not.toBe(b.trechos[0]);
  });

  it("o preset traz a reatância como número editável, porque é premissa", () => {
    // A NBR 14039 não tabela impedância. O valor tem de estar à vista e ser
    // trocável pelo do catálogo do fabricante.
    expect(typeof defaultPresetMT().reatancia).toBe("number");
    expect(defaultPresetMT().reatancia).toBeGreaterThan(0);
  });

  it("o tempo de curto e o Icc ficam no circuito, não no preset", () => {
    // Cada alimentador tem seu cubículo e seu relé. Misturar dado por circuito
    // com preset global foi o defeito de desenho da funcionalidade de proteção
    // que abortamos.
    const c = defaultCircuitoMT();
    const p = defaultPresetMT();
    expect(c.tempoCurto).toBeGreaterThan(0);
    expect(c.iccTrifasico).toBeGreaterThan(0);
    expect(p).not.toHaveProperty("tempoCurto");
    expect(p).not.toHaveProperty("iccTrifasico");
  });

  it("o aterramento do neutro fica no preset, porque é da fonte", () => {
    expect(defaultPresetMT()).toHaveProperty("aterramentoNeutro");
    expect(defaultCircuitoMT()).not.toHaveProperty("aterramentoNeutro");
  });
});

describe("CAMPOS_AGRUPAMENTO", () => {
  it("todo método ou tem campos de agrupamento ou está na lista dos sem tabela", () => {
    for (const m of METODOS_MT) {
      const temCampos = Array.isArray(CAMPOS_AGRUPAMENTO[m.id]);
      const semTabela = METODOS_SEM_AGRUPAMENTO.includes(m.id);
      expect(temCampos || semTabela).toBe(true);
      expect(temCampos && semTabela).toBe(false);
    }
  });

  it("os campos pedidos são os que a tabela daquele método consome", () => {
    expect(CAMPOS_AGRUPAMENTO.A1).toEqual(["arranjo", "espacamentoRelativo"]);
    expect(CAMPOS_AGRUPAMENTO.F1).toEqual(["dutos", "espacamento"]);
    expect(CAMPOS_AGRUPAMENTO.F2).toEqual(["dutos"]);
    expect(CAMPOS_AGRUPAMENTO.G1).toEqual(["dutos", "espacamento"]);
    expect(CAMPOS_AGRUPAMENTO.G2).toEqual(["dutos"]);
    expect(CAMPOS_AGRUPAMENTO.H).toEqual(["condutoresIsolados"]);
    expect(CAMPOS_AGRUPAMENTO.I).toEqual(["regime", "cabos"]);
  });
});

describe("normalizarTrechoMT", () => {
  it("preenche o que falta sem tocar no que veio", () => {
    const t = normalizarTrechoMT({ metodo: "H", temperatura: 40 });
    expect(t.metodo).toBe("H");
    expect(t.temperatura).toBe(40);
    expect(t.distancia).toBe(defaultTrechoMT().distancia);
  });

  it("não escolhe referência para C e D no lugar do projetista", () => {
    // O ponto todo da revisão de C e D: a norma não decide, e o app também
    // não. Um default aqui seria a decisão silenciosa que evitamos.
    expect(normalizarTrechoMT({ metodo: "C" }).referenciaTemp).toBeNull();
    expect(normalizarTrechoMT({ metodo: "D" }).referenciaTemp).toBeNull();
  });

  it("preserva a referência já escolhida num projeto salvo", () => {
    expect(normalizarTrechoMT({ metodo: "C", referenciaTemp: "enterrado" }).referenciaTemp)
      .toBe("enterrado");
  });

  it("false e 0 salvos vencem o default", () => {
    // Regressão clássica de `||`: agrupado:false viraria o default.
    const t = normalizarTrechoMT({ agrupado: false, distancia: 0 });
    expect(t.agrupado).toBe(false);
    expect(t.distancia).toBe(0);
  });

  it("mantém método desconhecido em vez de trocar por um válido", () => {
    // Trocar calado o método mudaria a ampacidade sem o usuário saber. Quem
    // recusa é o motor, com o método à vista.
    expect(normalizarTrechoMT({ metodo: "Z9" }).metodo).toBe("Z9");
  });

  it("entrada que não é objeto vira o trecho padrão", () => {
    expect(normalizarTrechoMT(null)).toEqual(defaultTrechoMT());
    expect(normalizarTrechoMT("F1")).toEqual(defaultTrechoMT());
  });
});

describe("normalizarCircuitoMT", () => {
  it("circuito sem trechos ganha um trecho padrão", () => {
    const c = normalizarCircuitoMT({ tag: "AL-01", potenciaKVA: 1500 });
    expect(c.trechos).toHaveLength(1);
    expect(c.trechos[0]).toEqual(defaultTrechoMT());
    expect(c.potenciaKVA).toBe(1500);
  });

  it("normaliza cada trecho da lista", () => {
    const c = normalizarCircuitoMT({ trechos: [{ metodo: "I" }, null] });
    expect(c.trechos).toHaveLength(2);
    expect(c.trechos[0].metodo).toBe("I");
    expect(c.trechos[1]).toEqual(defaultTrechoMT());
  });

  it("trechos que não são lista viram um trecho padrão", () => {
    expect(normalizarCircuitoMT({ trechos: "50m" }).trechos).toEqual([defaultTrechoMT()]);
  });
});

describe("normalizarCircuitosMT", () => {
  it("descarta entradas que não são objeto em vez de inventar circuito", () => {
    const lista = normalizarCircuitosMT([{ tag: "A" }, null, "B", 7]);
    expect(lista).toHaveLength(1);
    expect(lista[0].tag).toBe("A");
  });

  it("entrada que não é lista devolve lista vazia", () => {
    expect(normalizarCircuitosMT(null)).toEqual([]);
  });
});

describe("normalizarProjetoMT", () => {
  it("devolve preset e circuitos completos a partir de um salvo parcial", () => {
    const { preset, circuitos } = normalizarProjetoMT({
      preset: { material: "aluminio" },
      circuitos: [{ tag: "AL-01" }],
    });
    expect(preset.material).toBe("aluminio");
    expect(preset.isolacao).toBe(defaultPresetMT().isolacao);
    expect(circuitos[0].trechos).toHaveLength(1);
  });

  it("estado salvo vazio abre com preset padrão e nenhum circuito", () => {
    const { preset, circuitos } = normalizarProjetoMT(null);
    expect(preset).toEqual(defaultPresetMT());
    expect(circuitos).toEqual([]);
  });
});
