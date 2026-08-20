import { describe, it, expect } from "vitest";
import {
  METODOS_MT, SECOES_MT, ISOLACOES_MT, AMPACIDADE_MT, capacidadeMT,
  TEMP_REFERENCIA, FATOR_TEMP_AR, FATOR_TEMP_SOLO, METODOS_COM_CORRECAO_SOLO,
  RESISTIVIDADES_SOLO, FATOR_RESISTIVIDADE_SOLO, PROFUNDIDADES,
  FATOR_PROFUNDIDADE, fatorTemperaturaMT, metodoMT, METODOS_REFERENCIA_AMBIGUA,
  TEMPO_MAX_CURTO, TEMP_INICIAL_BLINDAGEM, TEMP_FINAL_BLINDAGEM,
  kEquivalente, secaoMinimaCurtoCondutor, secaoMinimaCurtoBlindagem,
  AGRUPAMENTO_T34, AGRUPAMENTO_T35, METODOS_SEM_AGRUPAMENTO, fatorAgrupamentoMT,
  AGRUPAMENTO_T36, AGRUPAMENTO_T37, ESPACAMENTOS_T36, fatorAgrupamentoDutos,
  AGRUPAMENTO_T38, AGRUPAMENTO_T39, AGRUPAMENTO_T41,
  ESPACAMENTOS_MM, fatorAgrupamentoEncostados, fatorAgrupamentoEspacadoEnterrado,
} from "./cabosNBR14039";

// Estes testes não conferem a norma — isso foi feito na transcrição. Eles
// travam a ESTRUTURA da tabela, que é onde um erro passa despercebido: uma
// coluna a mais desloca todos os métodos seguintes e o app passa a devolver a
// ampacidade de um método pelo outro, sem sintoma visível.

const MATERIAIS = ["cobre", "aluminio"];
const TEMPS = [90, 105];

// Células "–" na norma (método D não tabelado nas seções maiores).
const AUSENTES = [
  "90/cobre/1000", "90/aluminio/1000",
  "105/cobre/800", "105/cobre/1000", "105/aluminio/1000",
];

describe("estrutura das tabelas", () => {
  it("tem 13 métodos de referência, na ordem da norma", () => {
    expect(METODOS_MT.map((m) => m.id)).toEqual(
      ["A1", "A2", "B1", "B2", "C", "D", "E", "F1", "F2", "G1", "G2", "H", "I"],
    );
  });

  it("toda linha tem exatamente uma coluna por método", () => {
    for (const t of TEMPS) {
      for (const mat of MATERIAIS) {
        for (const s of SECOES_MT) {
          expect(AMPACIDADE_MT[t][mat][s], `${t}/${mat}/${s}`).toHaveLength(METODOS_MT.length);
        }
      }
    }
  });

  it("cobre as mesmas seções em todas as combinações", () => {
    for (const t of TEMPS) {
      for (const mat of MATERIAIS) {
        expect(Object.keys(AMPACIDADE_MT[t][mat]).map(Number)).toEqual(SECOES_MT);
      }
    }
  });

  it("declara as duas isolações tabeladas", () => {
    expect(ISOLACOES_MT.map((i) => i.id)).toEqual(TEMPS);
  });
});

describe("coerência física dos valores", () => {
  it("a ampacidade cresce com a seção, em todo método", () => {
    for (const t of TEMPS) {
      for (const mat of MATERIAIS) {
        for (let c = 0; c < METODOS_MT.length; c++) {
          for (let i = 1; i < SECOES_MT.length; i++) {
            const a = AMPACIDADE_MT[t][mat][SECOES_MT[i - 1]][c];
            const b = AMPACIDADE_MT[t][mat][SECOES_MT[i]][c];
            if (a == null || b == null) continue;
            expect(b, `${t}/${mat}/${METODOS_MT[c].id} ${SECOES_MT[i - 1]}→${SECOES_MT[i]}`).toBeGreaterThan(a);
          }
        }
      }
    }
  });

  it("o cobre conduz mais que o alumínio na mesma célula", () => {
    for (const t of TEMPS) {
      for (const s of SECOES_MT) {
        for (let c = 0; c < METODOS_MT.length; c++) {
          const cu = AMPACIDADE_MT[t].cobre[s][c];
          const al = AMPACIDADE_MT[t].aluminio[s][c];
          if (cu == null || al == null) continue;
          expect(cu, `${t}/${s}/${METODOS_MT[c].id}`).toBeGreaterThan(al);
        }
      }
    }
  });

  it("a isolação de 105 °C conduz mais que a de 90 °C", () => {
    for (const mat of MATERIAIS) {
      for (const s of SECOES_MT) {
        for (let c = 0; c < METODOS_MT.length; c++) {
          const a = AMPACIDADE_MT[90][mat][s][c];
          const b = AMPACIDADE_MT[105][mat][s][c];
          if (a == null || b == null) continue;
          expect(b, `${mat}/${s}/${METODOS_MT[c].id}`).toBeGreaterThan(a);
        }
      }
    }
  });
});

describe("células não tabeladas", () => {
  it("são exatamente as do método D declaradas na norma", () => {
    const achadas = [];
    for (const t of TEMPS) {
      for (const mat of MATERIAIS) {
        for (const s of SECOES_MT) {
          AMPACIDADE_MT[t][mat][s].forEach((v, c) => {
            if (v == null) achadas.push(`${t}/${mat}/${s}@${METODOS_MT[c].id}`);
          });
        }
      }
    }
    expect(achadas.sort()).toEqual(AUSENTES.map((a) => `${a}@D`).sort());
  });
});

describe("capacidadeMT", () => {
  it("lê a coluna do método pedido", () => {
    // Tabela 28, cobre 50mm²: A1 = 218, I = 154.
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 50, metodo: "A1" })).toBe(218);
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 50, metodo: "I" })).toBe(154);
  });

  it("devolve null na célula não tabelada, em vez de cair no vizinho", () => {
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 1000, metodo: "D" })).toBeNull();
    // o vizinho continua respondendo — o null é da célula, não da linha
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 1000, metodo: "C" })).toBe(862);
  });

  it("devolve null para entrada fora das tabelas", () => {
    expect(capacidadeMT({ isolacao: 70, material: "cobre", secao: 50, metodo: "A1" })).toBeNull();
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 6, metodo: "A1" })).toBeNull();
    expect(capacidadeMT({ isolacao: 90, material: "cobre", secao: 50, metodo: "B3" })).toBeNull();
    expect(capacidadeMT({ isolacao: 90, material: "bronze", secao: 50, metodo: "A1" })).toBeNull();
  });
});

describe("fatores de temperatura (Tabelas 30 e 31)", () => {
  it("vale 1,00 exatamente na temperatura de referência", () => {
    for (const iso of [90, 105]) {
      expect(FATOR_TEMP_AR.abrigado[iso][TEMP_REFERENCIA.aoAr]).toBe(1);
      expect(FATOR_TEMP_AR.exposto[iso][TEMP_REFERENCIA.aoAr]).toBe(1);
      expect(FATOR_TEMP_SOLO[iso][TEMP_REFERENCIA.enterrado]).toBe(1);
    }
  });

  it("o fator cai conforme a temperatura ambiente sobe", () => {
    const cai = (tab, rotulo) => {
      const ts = Object.keys(tab).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < ts.length; i++) {
        const a = tab[ts[i - 1]], b = tab[ts[i]];
        if (a == null || b == null) continue;
        expect(b, `${rotulo} ${ts[i - 1]}→${ts[i]}`).toBeLessThan(a);
      }
    };
    for (const iso of [90, 105]) {
      cai(FATOR_TEMP_AR.abrigado[iso], `ar/abrigado/${iso}`);
      cai(FATOR_TEMP_AR.exposto[iso], `ar/exposto/${iso}`);
      cai(FATOR_TEMP_SOLO[iso], `solo/${iso}`);
    }
  });

  it("acima da referência, o sol penaliza mais que a sombra", () => {
    for (const iso of [90, 105]) {
      for (const t of [35, 40, 45, 50, 55, 60]) {
        expect(FATOR_TEMP_AR.exposto[iso][t], `${iso}@${t}`)
          .toBeLessThan(FATOR_TEMP_AR.abrigado[iso][t]);
      }
    }
  });

  it("acima da referência, a isolação de 105 °C sofre menos que a de 90 °C", () => {
    for (const t of [35, 40, 45, 50, 55, 60]) {
      expect(FATOR_TEMP_AR.abrigado[105][t]).toBeGreaterThan(FATOR_TEMP_AR.abrigado[90][t]);
      expect(FATOR_TEMP_SOLO[105][t]).toBeGreaterThan(FATOR_TEMP_SOLO[90][t]);
    }
  });

  it("marca como proibidas as combinações que a norma veta ao sol", () => {
    // rodapé: 90 °C não pode acima de 60 °C; EPR 105 não pode acima de 75 °C
    for (const t of [65, 70, 75, 80]) expect(FATOR_TEMP_AR.exposto[90][t]).toBeNull();
    expect(FATOR_TEMP_AR.exposto[105][75]).not.toBeNull();
    expect(FATOR_TEMP_AR.exposto[105][80]).toBeNull();
  });
});

describe("fatorTemperaturaMT", () => {
  it("usa a tabela do solo só para os métodos enterrados", () => {
    // H é enterrado: referência 20 °C
    expect(fatorTemperaturaMT({ metodo: "H", isolacao: 90, temperatura: 20 })).toBe(1);
    expect(fatorTemperaturaMT({ metodo: "H", isolacao: 90, temperatura: 10 })).toBe(1.07);
    // A1 não é enterrado: referência 30 °C
    expect(fatorTemperaturaMT({ metodo: "A1", isolacao: 90, temperatura: 30 })).toBe(1);
    expect(fatorTemperaturaMT({ metodo: "A1", isolacao: 90, temperatura: 10 })).toBe(1.15);
  });

  it("separa abrigado de exposto ao sol", () => {
    expect(fatorTemperaturaMT({ metodo: "A1", isolacao: 90, temperatura: 50 })).toBe(0.82);
    expect(fatorTemperaturaMT({ metodo: "A2", isolacao: 90, temperatura: 50 })).toBe(0.62);
  });

  // A norma não classifica C e D como enterrados nem como "demais maneiras de
  // instalar". Em vez de arbitrar — e a arbitragem cômoda subdimensiona na
  // faixa usual de temperatura — a função exige a decisão de quem chama.
  it("C e D não decidem sozinhos a referência de temperatura", () => {
    expect(METODOS_REFERENCIA_AMBIGUA.sort()).toEqual(["C", "D"]);
    for (const id of ["C", "D"]) {
      expect(metodoMT(id).enterrado).toBeNull();
      expect(fatorTemperaturaMT({ metodo: id, isolacao: 90, temperatura: 50 })).toBeNull();
    }
  });

  it("C e D respondem quando a referência é declarada", () => {
    for (const id of ["C", "D"]) {
      expect(fatorTemperaturaMT({ metodo: id, isolacao: 90, temperatura: 50, referencia: "aoAr" })).toBe(0.62);
      expect(fatorTemperaturaMT({ metodo: id, isolacao: 90, temperatura: 50, referencia: "enterrado" })).toBe(0.76);
    }
  });

  it("as duas leituras divergem, e trocam de sinal por volta de 38 °C", () => {
    const aoAr = (t) => fatorTemperaturaMT({ metodo: "C", isolacao: 90, temperatura: t, referencia: "aoAr" });
    const ent = (t) => fatorTemperaturaMT({ metodo: "C", isolacao: 90, temperatura: t, referencia: "enterrado" });
    // abaixo do cruzamento a leitura "ao ar" é a menos conservadora
    expect(aoAr(30)).toBeGreaterThan(ent(30));
    expect(aoAr(35)).toBeGreaterThan(ent(35));
    // acima dele o sinal se inverte
    expect(aoAr(40)).toBeLessThan(ent(40));
    expect(aoAr(50)).toBeLessThan(ent(50));
  });

  it("referência declarada é ignorada nos métodos que a norma classifica", () => {
    // H é enterrado pela norma; nenhuma referência do usuário muda isso
    expect(fatorTemperaturaMT({ metodo: "H", isolacao: 90, temperatura: 10, referencia: "aoAr" })).toBe(1.07);
    expect(fatorTemperaturaMT({ metodo: "A1", isolacao: 90, temperatura: 10, referencia: "enterrado" })).toBe(1.15);
  });

  it("devolve null quando a norma veta, e quando a temperatura não é tabelada", () => {
    expect(fatorTemperaturaMT({ metodo: "A2", isolacao: 90, temperatura: 65 })).toBeNull();
    expect(fatorTemperaturaMT({ metodo: "A1", isolacao: 90, temperatura: 33 })).toBeNull();
    expect(fatorTemperaturaMT({ metodo: "Z9", isolacao: 90, temperatura: 30 })).toBeNull();
  });
});

describe("fatores de solo (Tabelas 32 e 33)", () => {
  it("só existem para os métodos que as tabelas declaram", () => {
    expect(Object.keys(FATOR_RESISTIVIDADE_SOLO).sort()).toEqual([...METODOS_COM_CORRECAO_SOLO].sort());
    expect(Object.keys(FATOR_PROFUNDIDADE).sort()).toEqual([...METODOS_COM_CORRECAO_SOLO].sort());
  });

  it("não alcançam C e D, que não são enterrados", () => {
    for (const id of ["C", "D"]) {
      expect(FATOR_RESISTIVIDADE_SOLO[id]).toBeUndefined();
      expect(FATOR_PROFUNDIDADE[id]).toBeUndefined();
    }
  });

  it("solo mais resistivo conduz menos calor, então o fator cai", () => {
    for (const m of METODOS_COM_CORRECAO_SOLO) {
      for (let i = 1; i < RESISTIVIDADES_SOLO.length; i++) {
        const a = FATOR_RESISTIVIDADE_SOLO[m][RESISTIVIDADES_SOLO[i - 1]];
        const b = FATOR_RESISTIVIDADE_SOLO[m][RESISTIVIDADES_SOLO[i]];
        expect(b, `${m} ${RESISTIVIDADES_SOLO[i - 1]}→${RESISTIVIDADES_SOLO[i]}`).toBeLessThan(a);
      }
      expect(FATOR_RESISTIVIDADE_SOLO[m][2.5]).toBe(1);
    }
  });

  it("mais fundo dissipa pior, então o fator cai com a profundidade", () => {
    for (const m of METODOS_COM_CORRECAO_SOLO) {
      for (let i = 1; i < PROFUNDIDADES.length; i++) {
        const a = FATOR_PROFUNDIDADE[m][PROFUNDIDADES[i - 1]];
        const b = FATOR_PROFUNDIDADE[m][PROFUNDIDADES[i]];
        expect(b, `${m} ${PROFUNDIDADES[i - 1]}→${PROFUNDIDADES[i]}`).toBeLessThan(a);
      }
      expect(FATOR_PROFUNDIDADE[m][0.9]).toBe(1);
    }
  });
});

describe("curto-circuito (Tabelas 42 a 44)", () => {
  // A NBR 5410 tabela o k já resolvido; a 14039 dá a equação que o produz.
  // Se estas duas contas divergirem, uma das duas transcrições está errada.
  it("reproduz o k da Tabela 43 da NBR 5410 a partir das constantes da 14039", () => {
    expect(kEquivalente({ material: "cobre", inicial: 90, final: 250 })).toBeCloseTo(143, 0);
    expect(kEquivalente({ material: "aluminio", inicial: 90, final: 250 })).toBeCloseTo(94, 0);
  });

  it("k maior para cobre que para alumínio, nas mesmas temperaturas", () => {
    expect(kEquivalente({ material: "cobre", inicial: 90, final: 250 }))
      .toBeGreaterThan(kEquivalente({ material: "aluminio", inicial: 90, final: 250 }));
  });

  it("k cresce quando se permite temperatura final maior", () => {
    const normal = kEquivalente({ material: "cobre", inicial: 90, final: 250 });
    const soldada = kEquivalente({ material: "cobre", inicial: 90, final: 160 });
    expect(soldada).toBeLessThan(normal);
  });

  it("recusa temperatura final não superior à inicial", () => {
    expect(kEquivalente({ material: "cobre", inicial: 250, final: 250 })).toBeNull();
    expect(kEquivalente({ material: "cobre", inicial: 250, final: 90 })).toBeNull();
    expect(kEquivalente({ material: "ouro", inicial: 90, final: 250 })).toBeNull();
  });
});

describe("secaoMinimaCurtoCondutor", () => {
  it("segue S = I·√t / k", () => {
    const s = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "cobre", isolacao: 90 });
    expect(s).toBeCloseTo(10000 / 143.1, 0);
  });

  it("cresce com a corrente e com o tempo", () => {
    const base = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 0.5, material: "cobre", isolacao: 90 });
    const maisI = secaoMinimaCurtoCondutor({ corrente: 20000, tempo: 0.5, material: "cobre", isolacao: 90 });
    const maisT = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "cobre", isolacao: 90 });
    expect(maisI).toBeCloseTo(base * 2, 5);
    expect(maisT).toBeCloseTo(base * Math.SQRT2, 5);
  });

  it("o alumínio exige seção maior que o cobre para o mesmo curto", () => {
    const cu = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "cobre", isolacao: 90 });
    const al = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "aluminio", isolacao: 90 });
    expect(al).toBeGreaterThan(cu);
  });

  it("conexão soldada limita a 160 °C e exige seção maior", () => {
    const livre = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "cobre", isolacao: 90 });
    const sold = secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 1, material: "cobre", isolacao: 90, conexaoSoldada: true });
    expect(sold).toBeGreaterThan(livre);
  });

  it("recusa duração acima do limite normativo de 5 s", () => {
    expect(TEMPO_MAX_CURTO).toBe(5);
    expect(secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 5, material: "cobre", isolacao: 90 })).not.toBeNull();
    expect(secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 5.1, material: "cobre", isolacao: 90 })).toBeNull();
    expect(secaoMinimaCurtoCondutor({ corrente: 10000, tempo: 0, material: "cobre", isolacao: 90 })).toBeNull();
  });
});

describe("secaoMinimaCurtoBlindagem", () => {
  it("parte da blindagem 5 °C abaixo do condutor", () => {
    expect(TEMP_INICIAL_BLINDAGEM[90]).toBe(85);
    expect(TEMP_INICIAL_BLINDAGEM[105]).toBe(100);
  });

  it("a cobertura decide a temperatura final", () => {
    expect(TEMP_FINAL_BLINDAGEM.ST3).toBe(150);
    expect(TEMP_FINAL_BLINDAGEM.SHF1).toBe(180);
    expect(TEMP_FINAL_BLINDAGEM.ST1).toBe(200);
    expect(TEMP_FINAL_BLINDAGEM.SHF2).toBe(220);
  });

  it("cobertura que suporta menos exige blindagem maior", () => {
    const q = { corrente: 5000, tempo: 1, isolacao: 90 };
    const st3 = secaoMinimaCurtoBlindagem({ ...q, cobertura: "ST3" });
    const shf2 = secaoMinimaCurtoBlindagem({ ...q, cobertura: "SHF2" });
    expect(st3).toBeGreaterThan(shf2);
  });

  it("recusa cobertura desconhecida em vez de assumir uma", () => {
    expect(secaoMinimaCurtoBlindagem({ corrente: 5000, tempo: 1, isolacao: 90, cobertura: "XX9" })).toBeNull();
    expect(secaoMinimaCurtoBlindagem({ corrente: 5000, tempo: 1, isolacao: 70, cobertura: "ST1" })).toBeNull();
  });
});

describe("agrupamento (Tabelas 34 e 35)", () => {
  it("as faixas de espaçamento cobrem toda a reta sem buraco nem sobreposição", () => {
    for (const t of [AGRUPAMENTO_T34, AGRUPAMENTO_T35]) {
      for (const a of t.arranjos) {
        const f = [...a.faixas].sort((x, y) => x.min - y.min);
        expect(f[0].min, `${t.tabela}/${a.id} começa em 0`).toBe(0);
        expect(f[f.length - 1].max, `${t.tabela}/${a.id} termina aberto`).toBeNull();
        for (let i = 1; i < f.length; i++) {
          expect(f[i].min, `${t.tabela}/${a.id} emenda`).toBe(f[i - 1].max);
        }
      }
    }
  });

  it("mais espaçamento nunca penaliza mais", () => {
    for (const t of [AGRUPAMENTO_T34, AGRUPAMENTO_T35]) {
      for (const a of t.arranjos) {
        const f = [...a.faixas].sort((x, y) => x.min - y.min);
        for (let i = 1; i < f.length; i++) {
          expect(f[i].fator, `${t.tabela}/${a.id}`).toBeGreaterThan(f[i - 1].fator);
        }
      }
    }
  });

  it("o espaçamento amplo devolve sempre 1,00", () => {
    for (const t of [AGRUPAMENTO_T34, AGRUPAMENTO_T35]) {
      for (const a of t.arranjos) {
        expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: a.id, espacamentoRelativo: 10 }))
          .toBe(1);
      }
    }
  });

  it("lê os valores de fronteira do lado certo", () => {
    // T34, dois grupos em trifólio na horizontal: e ≥ Dₑ → 1,00; e < Dₑ → 0,93
    const q = { metodo: "A1", arranjo: "dois2HorizTrifolio" };
    expect(fatorAgrupamentoMT({ ...q, espacamentoRelativo: 1 })).toBe(1);
    expect(fatorAgrupamentoMT({ ...q, espacamentoRelativo: 0.999 })).toBe(0.93);
    // T35, três tripolares na vertical: faixa [1; 1,5) → 0,94
    const v = { metodo: "A1", arranjo: "tresVert" };
    expect(fatorAgrupamentoMT({ ...v, espacamentoRelativo: 1 })).toBe(0.94);
    expect(fatorAgrupamentoMT({ ...v, espacamentoRelativo: 1.5 })).toBe(0.96);
    expect(fatorAgrupamentoMT({ ...v, espacamentoRelativo: 0 })).toBe(0.85);
  });

  it("distingue trifólio de tripolar no mesmo método A1", () => {
    // mesma condição geométrica, tabelas diferentes conforme o tipo de cabo
    expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: "doisVertTrifolio", espacamentoRelativo: 0.2 })).toBe(0.88);
    expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: "doisVert", espacamentoRelativo: 0.2 })).toBe(0.9);
  });

  it("recusa método sem tabela em vez de devolver 1,00", () => {
    for (const m of METODOS_SEM_AGRUPAMENTO) {
      expect(fatorAgrupamentoMT({ metodo: m, arranjo: "doisVert", espacamentoRelativo: 1 }), m).toBeNull();
    }
  });

  it("recusa arranjo desconhecido e espaçamento inválido", () => {
    expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: "inventado", espacamentoRelativo: 1 })).toBeNull();
    expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: "doisVert", espacamentoRelativo: -1 })).toBeNull();
    expect(fatorAgrupamentoMT({ metodo: "A1", arranjo: "doisVert", espacamentoRelativo: "x" })).toBeNull();
  });

  it("os métodos ainda não transcritos não respondem por engano", () => {
    for (const m of ["F1", "F2", "G1", "G2", "H", "I"]) {
      expect(fatorAgrupamentoMT({ metodo: m, arranjo: "doisVert", espacamentoRelativo: 1 }), m).toBeNull();
    }
  });
});

describe("agrupamento por dutos (Tabelas 36 e 37)", () => {
  it("mais dutos sempre penaliza mais, em qualquer espaçamento", () => {
    for (const id of ["10a150", "185a1000"]) {
      for (const e of ESPACAMENTOS_T36) {
        const d2 = AGRUPAMENTO_T36.porDutos[2][id][e];
        const d3 = AGRUPAMENTO_T36.porDutos[3][id][e];
        const d4 = AGRUPAMENTO_T36.porDutos[4][id][e];
        expect(d3, `T36 ${id}@${e}`).toBeLessThan(d2);
        expect(d4, `T36 ${id}@${e}`).toBeLessThan(d3);
      }
      expect(AGRUPAMENTO_T37.porDutosOcupados[3][id]).toBeLessThan(AGRUPAMENTO_T37.porDutosOcupados[2][id]);
      expect(AGRUPAMENTO_T37.porDutosOcupados[4][id]).toBeLessThan(AGRUPAMENTO_T37.porDutosOcupados[3][id]);
    }
  });

  it("mais espaçamento entre dutos sempre ajuda", () => {
    for (const d of [2, 3, 4]) {
      for (const id of ["10a150", "185a1000"]) {
        const v = ESPACAMENTOS_T36.map((e) => AGRUPAMENTO_T36.porDutos[d][id][e]);
        for (let i = 1; i < v.length; i++) {
          expect(v[i], `T36 ${d} dutos ${id}`).toBeGreaterThanOrEqual(v[i - 1]);
        }
      }
    }
  });

  it("a seção maior nunca leva vantagem sobre a menor no mesmo arranjo", () => {
    for (const d of [2, 3, 4]) {
      for (const e of ESPACAMENTOS_T36) {
        expect(AGRUPAMENTO_T36.porDutos[d]["185a1000"][e], `T36 ${d}@${e}`)
          .toBeLessThanOrEqual(AGRUPAMENTO_T36.porDutos[d]["10a150"][e]);
      }
    }
  });

  it("encostados é o mesmo valor nas duas faixas de seção (célula mesclada)", () => {
    for (const d of [2, 3, 4]) {
      expect(AGRUPAMENTO_T36.porDutos[d]["10a150"].encostados)
        .toBe(AGRUPAMENTO_T36.porDutos[d]["185a1000"].encostados);
    }
  });

  it("fatorAgrupamentoDutos escolhe a faixa de seção certa", () => {
    expect(fatorAgrupamentoDutos({ metodo: "F1", dutos: 3, secao: 95, espacamento: 400 })).toBe(0.8);
    expect(fatorAgrupamentoDutos({ metodo: "F1", dutos: 3, secao: 240, espacamento: 400 })).toBe(0.75);
    expect(fatorAgrupamentoDutos({ metodo: "F2", dutos: 4, secao: 50 })).toBe(0.65);
  });

  it("recusa em vez de extrapolar fora do tabelado", () => {
    expect(fatorAgrupamentoDutos({ metodo: "F1", dutos: 5, secao: 95, espacamento: 400 })).toBeNull();
    expect(fatorAgrupamentoDutos({ metodo: "F1", dutos: 3, secao: 160, espacamento: 400 })).toBeNull();
    expect(fatorAgrupamentoDutos({ metodo: "F1", dutos: 3, secao: 95, espacamento: 1000 })).toBeNull();
    expect(fatorAgrupamentoDutos({ metodo: "A1", dutos: 3, secao: 95, espacamento: 400 })).toBeNull();
  });
});

describe("agrupamento G1, G2, H e I (Tabelas 38 a 41)", () => {
  it("T38: mais dutos penaliza mais, em toda seção e espaçamento", () => {
    const ns = [3, 6, 9, 12];
    for (const f of AGRUPAMENTO_T38.faixasSecao) {
      for (const e of ESPACAMENTOS_MM) {
        for (let i = 1; i < ns.length; i++) {
          const a = AGRUPAMENTO_T38.porDutos[ns[i - 1]][f.id][e];
          const b = AGRUPAMENTO_T38.porDutos[ns[i]][f.id][e];
          expect(b, `T38 ${f.id}@${e} ${ns[i - 1]}→${ns[i]}`).toBeLessThan(a);
        }
      }
    }
  });

  // Na T38 o espaçamento NÃO é monotonicamente favorável: nas seções pequenas
  // ajuda, nas grandes atrapalha. Está conferido na norma — o teste trava os
  // dois sentidos justamente para ninguém "corrigir" a tabela depois.
  it("T38: nas seções pequenas o espaçamento ajuda", () => {
    for (const d of [3, 6, 9, 12]) {
      for (const id of ["10a50", "70a150"]) {
        for (let i = 1; i < ESPACAMENTOS_MM.length; i++) {
          const a = AGRUPAMENTO_T38.porDutos[d][id][ESPACAMENTOS_MM[i - 1]];
          const b = AGRUPAMENTO_T38.porDutos[d][id][ESPACAMENTOS_MM[i]];
          expect(b, `T38 ${d}/${id}`).toBeGreaterThanOrEqual(a);
        }
      }
    }
  });

  it("T38: em 3 dutos de seção grande o espaçamento piora o fator", () => {
    const g = AGRUPAMENTO_T38.porDutos[3];
    expect(g["185a400"][800]).toBeLessThan(g["185a400"][200]);
    expect(g["500a1000"][800]).toBeLessThan(g["500a1000"][200]);
  });

  it("T38 tem fatores acima de 1,00 — o motor não pode limitar a 1", () => {
    const acima = [];
    for (const d of [3, 6, 9, 12]) {
      for (const f of AGRUPAMENTO_T38.faixasSecao) {
        for (const e of ESPACAMENTOS_MM) {
          if (AGRUPAMENTO_T38.porDutos[d][f.id][e] > 1) acima.push(`${d}/${f.id}@${e}`);
        }
      }
    }
    expect(acima.length).toBeGreaterThan(0);
    expect(fatorAgrupamentoDutos({ metodo: "G1", dutos: 3, secao: 25, espacamento: 800 })).toBe(1.14);
  });

  it("T39: banco maior com mais dutos conduz menos", () => {
    for (const f of AGRUPAMENTO_T39.faixasSecao) {
      expect(AGRUPAMENTO_T39.porDutos[6][f.id]).toBeLessThan(AGRUPAMENTO_T39.porDutos[4][f.id]);
      expect(AGRUPAMENTO_T39.porDutos[9][f.id]).toBeLessThan(AGRUPAMENTO_T39.porDutos[6][f.id]);
    }
    expect(fatorAgrupamentoDutos({ metodo: "G2", dutos: 9, secao: 240 })).toBe(0.61);
  });

  it("T40: só depende do número de condutores isolados", () => {
    expect(fatorAgrupamentoEncostados(6)).toBe(0.76);
    expect(fatorAgrupamentoEncostados(9)).toBe(0.65);
    expect(fatorAgrupamentoEncostados(12)).toBe(0.58);
    expect(fatorAgrupamentoEncostados(3)).toBeNull();
  });

  it("T41: o regime de 2·Dₑ vale para qualquer seção", () => {
    for (const s of [10, 240, 1000]) {
      expect(fatorAgrupamentoEspacadoEnterrado({ regime: "doisDe", cabos: 6, secao: s })).toBe(0.78);
    }
  });

  it("T41: a 200 mm a seção passa a importar, e mais cabos penaliza", () => {
    expect(fatorAgrupamentoEspacadoEnterrado({ regime: "mm200", cabos: 3, secao: 95 })).toBe(1.06);
    expect(fatorAgrupamentoEspacadoEnterrado({ regime: "mm200", cabos: 3, secao: 500 })).toBe(0.92);
    const ns = [3, 6, 9, 12];
    for (const f of AGRUPAMENTO_T41.faixasSecao) {
      for (let i = 1; i < ns.length; i++) {
        expect(AGRUPAMENTO_T41.mm200[f.id][ns[i]], `T41 ${f.id}`)
          .toBeLessThan(AGRUPAMENTO_T41.mm200[f.id][ns[i - 1]]);
      }
    }
  });

  it("T41 recusa regime e seção fora do tabelado", () => {
    expect(fatorAgrupamentoEspacadoEnterrado({ regime: "mm400", cabos: 3, secao: 95 })).toBeNull();
    expect(fatorAgrupamentoEspacadoEnterrado({ regime: "mm200", cabos: 3, secao: 130 })).toBeNull();
    expect(fatorAgrupamentoEspacadoEnterrado({ regime: "mm200", cabos: 5, secao: 95 })).toBeNull();
  });

  it("todo método de referência agora tem tabela de agrupamento, ou está declarado sem", () => {
    const comTabela = ["A1", "F1", "F2", "G1", "G2", "H", "I"];
    const todos = METODOS_MT.map((m) => m.id);
    for (const id of todos) {
      const coberto = comTabela.includes(id) || METODOS_SEM_AGRUPAMENTO.includes(id);
      expect(coberto, `${id} sem classificação`).toBe(true);
    }
    expect([...comTabela, ...METODOS_SEM_AGRUPAMENTO].sort()).toEqual([...todos].sort());
  });
});
