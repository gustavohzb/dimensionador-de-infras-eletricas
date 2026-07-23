// Linha do quadro de cargas: agrega o resultado do motor por circuito.

import { describe, it, expect } from "vitest";
import { resumoCircuito } from "./iluminacaoPdf";
import { calcularIluminacaoArvore } from "./lightingTree";

// O caso de derivação dos testes do motor: 24V CC, 20W, tronco 10 mm² e
// ramais 2,5 / 6 mm², pior caminho 3,72% (dentro de 4%).
const circuito = {
  nome: "Galpão",
  params: { sistema: "cc", tensao: 24, potencia: 20, quedaMaxPct: 4, metodo: "B1" },
};
const resultado = calcularIluminacaoArvore({
  sistema: "cc", tensao: 24, potencia: 20, quedaMaxPct: 4, metodo: "B1",
  nos: [
    { id: "q", tipo: "quadro" },
    { id: "cx", tipo: "caixa" },
    { id: "l1", tipo: "luminaria", qtd: 5 },
    { id: "l2", tipo: "luminaria", qtd: 5 },
  ],
  ligacoes: [
    { id: "t", de: "q", para: "cx", distancia: 10 },
    { id: "b1", de: "cx", para: "l1", distancia: 10 },
    { id: "b2", de: "cx", para: "l2", distancia: 20 },
  ],
});

describe("resumoCircuito", () => {
  it("agrega luminárias, potência, corrente, seções e pior queda", () => {
    const r = resumoCircuito(circuito, resultado);
    expect(r.nome).toBe("Galpão");
    expect(r.sistema).toBe("CC");
    expect(r.luminarias).toBe(10);
    expect(r.potenciaW).toBe(200);
    expect(r.corrente).toBeCloseTo(200 / 24, 8);
    expect(r.secoes).toEqual([2.5, 6, 10]); // únicas, ordenadas
    expect(r.piorQuedaPct).toBeCloseTo(3.7202, 3);
    expect(r.ok).toBe(true);
    expect(r.temErro).toBe(false);
  });

  it("circuito sem resultado vira linha vazia (sem quebrar)", () => {
    const r = resumoCircuito(circuito, null);
    expect(r.luminarias).toBeNull();
    expect(r.potenciaW).toBeNull();
    expect(r.secoes).toEqual([]);
    expect(r.ok).toBe(false);
  });
});
