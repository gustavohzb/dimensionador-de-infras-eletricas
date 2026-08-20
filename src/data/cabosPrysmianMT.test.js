// Verificação da geometria transcrita do catálogo Prysmian.
//
// Estes testes não são formalidade: foi a checagem de Rcc contra a NBR NM 280
// que revelou, durante a transcrição, que a linha de 120 mm² do 15/25 kV tinha
// vindo contaminada por outra tabela do mesmo PDF (espessura 8,8 mm e diâmetro
// sobre isolação 31,7 mm são do cabo de 20/35 kV). Sem isso, teria entrado um
// diâmetro errado, e com ele uma reatância errada.

import { describe, it, expect } from "vitest";
import {
  BLINDAGEM_PADRAO_MM2,
  CLASSES_TENSAO_MT,
  EPROTENAX,
  RESISTENCIA_CC_20,
  geometriaCabo,
  secoesDisponiveis,
} from "./cabosPrysmianMT";

describe("estrutura", () => {
  it("cobre as duas classes de tensão mais usadas no Brasil", () => {
    expect(CLASSES_TENSAO_MT.map((c) => c.id)).toEqual(["8,7/15 kV", "15/25 kV"]);
  });

  it("o cabo de 15/25 kV começa em 50 mm², porque o produto não existe abaixo disso", () => {
    // A NBR 14039 tabela ampacidade desde 10 mm², mas o catálogo não fabrica
    // 25 e 35 mm² nessa classe. É limite de produto, não de norma.
    expect(secoesDisponiveis("8,7/15 kV")[0]).toBe(25);
    expect(secoesDisponiveis("15/25 kV")[0]).toBe(50);
  });

  it("o diâmetro do condutor não depende da classe de tensão", () => {
    // O condutor é o mesmo; o que muda é a isolação em volta dele. Serve de
    // conferência cruzada entre as duas tabelas.
    for (const secao of secoesDisponiveis("15/25 kV")) {
      const a = geometriaCabo({ classe: "8,7/15 kV", secao });
      const b = geometriaCabo({ classe: "15/25 kV", secao });
      expect(a.diametroCondutor).toBe(b.diametroCondutor);
    }
  });
});

describe("coerência física de cada linha", () => {
  for (const classe of CLASSES_TENSAO_MT) {
    it(`${classe.id}: o diâmetro externo cresce com a seção`, () => {
      const des = secoesDisponiveis(classe.id).map((s) => geometriaCabo({ classe: classe.id, secao: s }).diametroExterno);
      for (let i = 1; i < des.length; i++) expect(des[i]).toBeGreaterThan(des[i - 1]);
    });

    it(`${classe.id}: o diâmetro sobre a isolação fica a uma distância fixa do condutor`, () => {
      // D_iso − d = 2 × (semicondutora interna + isolação + semicondutora
      // externa), que é construção constante dentro da classe. Foi esta regra
      // que denunciou a linha contaminada.
      const diffs = secoesDisponiveis(classe.id)
        .map((s) => geometriaCabo({ classe: classe.id, secao: s }))
        .filter((g) => g.diametroSobreIsolacao != null)
        .map((g) => Math.round((g.diametroSobreIsolacao - g.diametroCondutor) * 10) / 10);
      const semOMaior = diffs.slice(0, -1); // 630 mm² tem blindagem mais espessa
      expect(new Set(semOMaior).size).toBe(1);
    });

    it(`${classe.id}: a cobertura engrossa com a seção, nunca afina`, () => {
      const gs = secoesDisponiveis(classe.id)
        .map((s) => geometriaCabo({ classe: classe.id, secao: s }))
        .filter((g) => g.diametroSobreIsolacao != null);
      const capas = gs.map((g) => Math.round((g.diametroExterno - g.diametroSobreIsolacao) * 10) / 10);
      for (let i = 1; i < capas.length; i++) expect(capas[i]).toBeGreaterThanOrEqual(capas[i - 1]);
    });

    it(`${classe.id}: cabo de mais tensão é mais grosso na mesma seção`, () => {
      if (classe.id === "8,7/15 kV") return;
      for (const s of secoesDisponiveis(classe.id)) {
        const menor = geometriaCabo({ classe: "8,7/15 kV", secao: s });
        const maior = geometriaCabo({ classe: classe.id, secao: s });
        expect(maior.diametroExterno).toBeGreaterThan(menor.diametroExterno);
      }
    });
  }
});

describe("resistência em corrente contínua", () => {
  it("bate com o catálogo em todas as seções que ele publica", () => {
    // Dupla procedência: a tabela é da NBR NM 280 (IEC 60228), e o catálogo
    // publica os mesmos valores. Duas fontes independentes concordando.
    const doCatalogo = { 25: 0.727, 35: 0.524, 50: 0.387, 70: 0.268, 95: 0.193, 120: 0.153, 150: 0.124, 185: 0.0991, 240: 0.0754, 300: 0.0601, 400: 0.047, 500: 0.0366, 630: 0.0283 };
    for (const [secao, valor] of Object.entries(doCatalogo)) {
      expect(RESISTENCIA_CC_20.cobre[secao]).toBe(valor);
    }
  });

  it("é maior que a resistividade pura dividida pela seção, por causa do encordoamento", () => {
    // ρ20/S daria 0,345 Ω/km em 50 mm²; a norma tabela 0,387. Usar ρ/S
    // subestima a resistência em cerca de 12 %, e com ela a queda de tensão.
    const puro = (17.241 / 50) * 1000 / 1000;
    expect(RESISTENCIA_CC_20.cobre[50]).toBeGreaterThan(puro);
    expect(RESISTENCIA_CC_20.cobre[50] / puro).toBeLessThan(1.2);
  });

  it("cai com a seção, sem exceção", () => {
    const secoes = Object.keys(RESISTENCIA_CC_20.cobre).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < secoes.length; i++) {
      expect(RESISTENCIA_CC_20.cobre[secoes[i]]).toBeLessThan(RESISTENCIA_CC_20.cobre[secoes[i - 1]]);
    }
  });
});

describe("blindagem", () => {
  it("a blindagem padrão é de 6 mm², independente da seção do condutor", () => {
    // O ponto que muda o quarto critério: a blindagem NÃO acompanha a seção do
    // condutor. É 6 mm² de fios de cobre nu em todo o catálogo, e outras seções
    // são "sob consulta".
    expect(BLINDAGEM_PADRAO_MM2).toBe(6);
  });
});

describe("geometriaCabo", () => {
  it("devolve null em vez de chutar quando a combinação não está no catálogo", () => {
    expect(geometriaCabo({ classe: "8,7/15 kV", secao: 10 })).toBeNull();
    expect(geometriaCabo({ classe: "20/35 kV", secao: 50 })).toBeNull();
    expect(geometriaCabo({ classe: "8,7/15 kV", secao: 999 })).toBeNull();
  });

  it("entrega os dois números que o motor consome", () => {
    const g = geometriaCabo({ classe: "8,7/15 kV", secao: 50 });
    expect(g.diametroCondutor).toBe(8.1);
    expect(g.diametroExterno).toBe(23.5);
  });
});

describe("EPROTENAX", () => {
  it("declara de qual documento cada tabela veio", () => {
    for (const classe of CLASSES_TENSAO_MT) {
      expect(EPROTENAX[classe.id].documento).toMatch(/Eprotenax/i);
    }
  });
});
