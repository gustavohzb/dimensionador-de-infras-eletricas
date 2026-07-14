// Trava as tabelas de ampacidade do app contra os valores oficiais da ABNT NBR
// 5410:2004 (Tabelas 36, 37, 38 e 39 — cobre e alumínio, isolações PVC 70°C e
// EPR/XLPE 90°C, métodos B1/B2/C/D/E/F/G).
//
// O fixture `ampacidadeNBR5410.norma.json` foi extraído célula a célula do PDF
// da norma e confere com o código (810/810 células na verificação original).
// Se qualquer valor de tabela for editado no código e passar a divergir da
// norma, o teste correspondente falha — nenhuma tabela muda em silêncio.
//
// Colunas por método: B1/B2/C/D/E → [2 carregados, 3 carregados];
// F → [2 justapostos, 3 trifólio, 3 mesmo plano justapostos]; G → [horiz., vert.].

import { describe, it, expect } from "vitest";
import { TABELAS_POR_TEMP } from "./cabosNBR5410";
import norma from "./__fixtures__/ampacidadeNBR5410.norma.json";

describe("Ampacidade × ABNT NBR 5410 (Tab. 36/37/38/39)", () => {
  for (const temp of Object.keys(norma)) {
    for (const material of Object.keys(norma[temp])) {
      for (const metodo of Object.keys(norma[temp][material])) {
        const secoes = norma[temp][material][metodo];
        it(`${temp}°C ${material} método ${metodo} — ${Object.keys(secoes).length} seções`, () => {
          const tabCodigo = TABELAS_POR_TEMP[temp][material][metodo];
          expect(tabCodigo, `tabela ausente: ${temp}°C ${material} ${metodo}`).toBeDefined();
          for (const [secao, valoresNorma] of Object.entries(secoes)) {
            expect(
              tabCodigo[secao],
              `${temp}°C ${material} ${metodo} ${secao}mm²`
            ).toEqual(valoresNorma);
          }
        });
      }
    }
  }
});
