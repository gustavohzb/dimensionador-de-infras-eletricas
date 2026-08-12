// Migração do quadro salvo. Os casos aqui são os formatos que realmente
// existiram no app (e que hoje estão em projetos no Supabase), não hipóteses:
// circuito sem `trechos` (antes da 0.10.0) e temperatura ambiente no preset
// global (antes de 19230dc devolvê-la ao trecho).

import { describe, it, expect } from "vitest";
import {
  defaultCircuito,
  defaultPreset,
  defaultTrecho,
  normalizarCircuito,
  normalizarCircuitos,
  normalizarQuadro,
  normalizarTrecho,
} from "./circuitoModelo";

describe("normalizarCircuito", () => {
  it("circuito sem trechos ganha um trecho padrão em vez de derrubar a aba", () => {
    // Era o crash real: `c.trechos.length` em CircuitoForm com trechos undefined.
    const c = normalizarCircuito({ tag: "QDLF-01", corrente: 63 });

    expect(c.trechos).toHaveLength(1);
    expect(c.trechos[0]).toEqual(defaultTrecho());
    expect(c.tag).toBe("QDLF-01");
    expect(c.corrente).toBe(63);
  });

  it("trechos como lista vazia também rende um trecho", () => {
    expect(normalizarCircuito({ trechos: [] }).trechos).toHaveLength(1);
  });

  it("trechos de tipo errado não passam adiante", () => {
    expect(normalizarCircuito({ trechos: "eletrocalha" }).trechos).toHaveLength(1);
    expect(normalizarCircuito({ trechos: null }).trechos).toHaveLength(1);
  });

  it("campos que faltam vêm do default, os salvos são preservados", () => {
    const c = normalizarCircuito({ tensao: 220, esquemaId: "monoCnCt" });

    expect(c.tensao).toBe(220);
    expect(c.esquemaId).toBe("monoCnCt");
    expect(c.corrente).toBe(defaultCircuito().corrente);
    expect(c.porFase).toBe(defaultCircuito().porFase);
  });

  it("campo gravado como undefined não vence o default", () => {
    // Spread puro deixaria `tensao: undefined`, e o input do React nasceria
    // não controlado.
    const c = normalizarCircuito({ tag: "AL-09", tensao: undefined });

    expect(c.tensao).toBe(defaultCircuito().tensao);
    expect(c.tag).toBe("AL-09");
  });

  it("valores falsos legítimos (0, string vazia) sobrevivem", () => {
    const c = normalizarCircuito({ descricao: "", fatorServico: 0 });

    expect(c.descricao).toBe("");
    expect(c.fatorServico).toBe(0);
  });

  it("campo desconhecido é mantido, não descartado", () => {
    const c = normalizarCircuito({ campoDeVersaoNova: "x" });
    expect(c.campoDeVersaoNova).toBe("x");
  });

  it("cada trecho é completado sem perder o que estava salvo", () => {
    const c = normalizarCircuito({
      trechos: [{ condutoId: "eletroduto", distancia: 85 }, { camadas: 2 }],
    });

    expect(c.trechos).toHaveLength(2);
    expect(c.trechos[0].condutoId).toBe("eletroduto");
    expect(c.trechos[0].distancia).toBe(85);
    expect(c.trechos[0].temperatura).toBe(defaultTrecho().temperatura);
    expect(c.trechos[1].camadas).toBe(2);
  });

  it("não compartilha referência com o que veio salvo", () => {
    // Se o array de trechos fosse reaproveitado, editar um circuito mexeria no
    // objeto que ainda está no localStorage/Supabase.
    const salvo = { trechos: [{ distancia: 10 }] };
    const c = normalizarCircuito(salvo);

    c.trechos[0].distancia = 999;
    expect(salvo.trechos[0].distancia).toBe(10);
  });
});

describe("normalizarCircuitos", () => {
  it("entrada que não é lista vira lista vazia", () => {
    expect(normalizarCircuitos(undefined)).toEqual([]);
    expect(normalizarCircuitos(null)).toEqual([]);
    expect(normalizarCircuitos({ circuitos: [] })).toEqual([]);
    expect(normalizarCircuitos("AL-01")).toEqual([]);
  });

  it("descarta entrada ilegível em vez de inventar um circuito", () => {
    const cs = normalizarCircuitos([null, { tag: "AL-01" }, "lixo", 42, { tag: "AL-02" }]);

    expect(cs.map((c) => c.tag)).toEqual(["AL-01", "AL-02"]);
  });
});

describe("normalizarQuadro", () => {
  it("projeto antigo, com circuitos sem trechos, carrega inteiro", () => {
    const salvo = {
      circuitos: [{ tag: "AL-01", corrente: 40 }, { tag: "AL-02", corrente: 25 }],
      preset: { material: "aluminio" },
    };

    const { circuitos, preset } = normalizarQuadro(salvo);

    expect(circuitos).toHaveLength(2);
    expect(circuitos.every((c) => c.trechos.length >= 1)).toBe(true);
    expect(preset.material).toBe("aluminio");
    expect(preset.fp).toBe(defaultPreset().fp);
  });

  it("temperatura do preset global desce para os trechos que não têm a sua", () => {
    // Antes de 19230dc a temperatura ambiente era do quadro inteiro. Sem
    // migrar, um forno a 45 °C voltava como 30 °C e o cabo saía subdimensionado.
    const { circuitos, preset } = normalizarQuadro({
      preset: { temperatura: 45 },
      circuitos: [{ tag: "AL-01" }],
    });

    expect(circuitos[0].trechos[0].temperatura).toBe(45);
    expect(preset.temperatura).toBeUndefined();
  });

  it("temperatura já gravada no trecho ganha da do preset antigo", () => {
    const { circuitos } = normalizarQuadro({
      preset: { temperatura: 45 },
      circuitos: [{ trechos: [{ temperatura: 20 }, {}] }],
    });

    expect(circuitos[0].trechos[0].temperatura).toBe(20);
    expect(circuitos[0].trechos[1].temperatura).toBe(45);
  });

  it("sem preset antigo, o trecho fica com o default", () => {
    const { circuitos } = normalizarQuadro({ circuitos: [{ tag: "AL-01" }] });
    expect(circuitos[0].trechos[0].temperatura).toBe(defaultTrecho().temperatura);
  });

  it("preset de tipo errado não polui o preset final", () => {
    // Spread de texto espalharia os caracteres como chaves 0,1,2…
    const { preset } = normalizarQuadro({ preset: "cobre", circuitos: [] });
    expect(preset).toEqual(defaultPreset());
  });

  it("entrada vazia ou inválida devolve um quadro utilizável", () => {
    for (const entrada of [undefined, null, {}, "x", []]) {
      const q = normalizarQuadro(entrada);
      expect(q.circuitos).toEqual([]);
      expect(q.preset).toEqual(defaultPreset());
    }
  });

  it("quadro já no formato atual passa inalterado", () => {
    const atual = { circuitos: [defaultCircuito()], preset: defaultPreset() };
    expect(normalizarQuadro(structuredClone(atual))).toEqual(atual);
  });

  it("normalizar duas vezes dá o mesmo resultado", () => {
    const uma = normalizarQuadro({ preset: { temperatura: 45 }, circuitos: [{ tag: "AL-01" }] });
    expect(normalizarQuadro(structuredClone(uma))).toEqual(uma);
  });
});

describe("normalizarTrecho", () => {
  it("completa o trecho e aceita entrada inútil", () => {
    expect(normalizarTrecho(null)).toEqual(defaultTrecho());
    expect(normalizarTrecho(undefined)).toEqual(defaultTrecho());
    expect(normalizarTrecho({ distancia: 12 }).distancia).toBe(12);
  });

  it("temperatura herdada só entra quando o trecho não tem a sua", () => {
    expect(normalizarTrecho({}, 45).temperatura).toBe(45);
    expect(normalizarTrecho({ temperatura: 20 }, 45).temperatura).toBe(20);
    expect(normalizarTrecho({ temperatura: 0 }, 45).temperatura).toBe(0);
  });
});
