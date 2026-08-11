// Numeração de rótulos sequenciais — os casos que a contagem por
// `lista.length + 1` errava (remoção no meio e dois cliques no mesmo lote).

import { describe, it, expect } from "vitest";
import { proximoNumero, proximaCopia } from "./sequencialRotulos";

const LUM = /^L(\d+)$/;
const TAG = /^AL-(\d+)/;
const CIRC = /^Circuito (\d+)$/;

describe("proximoNumero", () => {
  it("lista vazia começa em 1", () => {
    expect(proximoNumero([], LUM)).toBe(1);
  });

  it("sequência contínua segue o próximo", () => {
    expect(proximoNumero(["L1", "L2", "L3"], LUM)).toBe(4);
  });

  it("remoção no meio NÃO reaproveita rótulo existente", () => {
    // Era o bug: length + 1 daria 3, que já existe.
    expect(proximoNumero(["L1", "L3"], LUM)).toBe(4);
  });

  it("remoção do primeiro NÃO colide com o remanescente", () => {
    // length + 1 daria 2 — o rótulo do que sobrou.
    expect(proximoNumero(["L2"], LUM)).toBe(3);
  });

  it("ignora rótulos fora do padrão e renomeados à mão", () => {
    expect(proximoNumero(["Sala", "L2", "Corredor"], LUM)).toBe(3);
    expect(proximoNumero(["Sala", "Corredor"], LUM)).toBe(1);
  });

  it("tags com zero à esquerda (AL-03) são lidas como número", () => {
    expect(proximoNumero(["AL-01", "AL-03"], TAG)).toBe(4);
    expect(proximoNumero(["AL-01-C", "AL-02"], TAG)).toBe(3);
  });

  it("nomes de circuito", () => {
    expect(proximoNumero(["Circuito 1", "Sala Térreo", "Circuito 5"], CIRC)).toBe(6);
  });

  it("aceita nulos/indefinidos sem quebrar", () => {
    expect(proximoNumero([null, undefined, "L2"], LUM)).toBe(3);
  });

  it("chamado duas vezes com o estado ATUALIZADO nunca repete", () => {
    // Simula os dois cliques: o 2º já enxerga o rótulo criado pelo 1º.
    const lista = ["L1"];
    const a = proximoNumero(lista, LUM);
    lista.push(`L${a}`);
    const b = proximoNumero(lista, LUM);
    expect(a).toBe(2);
    expect(b).toBe(3);
    expect(a).not.toBe(b);
  });
});

describe("proximaCopia", () => {
  it("primeira cópia de uma tag sem número no fim vira -01", () => {
    expect(proximaCopia(["QDLF-CLASSIFICACAO"], "QDLF-CLASSIFICACAO")).toBe("QDLF-CLASSIFICACAO-01");
  });

  it("segunda cópia vira -02, não repete -01", () => {
    expect(proximaCopia(["QDLF", "QDLF-01"], "QDLF")).toBe("QDLF-02");
  });

  it("copiar uma tag que JÁ termina em número continua a mesma família, não empilha sufixo", () => {
    // "QDLF-01" já carrega a numeração da família "QDLF" — copiá-la não vira
    // "QDLF-01-01", vira o próximo número livre de "QDLF-NN".
    expect(proximaCopia(["QDLF-01"], "QDLF-01")).toBe("QDLF-02");
  });

  it("copiar uma cópia continua a mesma contagem, não aninha um segundo sufixo", () => {
    // Copiar "QDLF-01" (que por sua vez já foi copiado de "QDLF") não vira
    // "QDLF-01-01" — a base é "QDLF", e o próximo livre daquela família é -02.
    expect(proximaCopia(["QDLF", "QDLF-01"], "QDLF-01")).toBe("QDLF-02");
  });

  it("pula números já usados por edição manual, sem repetir", () => {
    expect(proximaCopia(["QDLF", "QDLF-01", "QDLF-03"], "QDLF")).toBe("QDLF-04");
  });

  it("famílias de tags diferentes não se misturam", () => {
    expect(proximaCopia(["QDLF-01", "SALA-02"], "SALA-02")).toBe("SALA-03");
  });

  it("tag com caracteres especiais de regex não quebra", () => {
    expect(proximaCopia(["QD (Anexo)"], "QD (Anexo)")).toBe("QD (Anexo)-01");
  });

  it("tag vazia ou nula não quebra", () => {
    expect(proximaCopia([], "")).toBe("-01");
    expect(proximaCopia([], undefined)).toBe("-01");
  });
});
