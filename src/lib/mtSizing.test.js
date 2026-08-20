// Motor de dimensionamento de média tensão.
//
// Os casos aqui travam três coisas que a camada de dados deixou preparadas e
// que o motor poderia estragar: recusar em vez de assumir 1,00 quando não há
// tabela, deixar os fatores passarem de 1,00 quando a Tabela 38 manda, e fazer
// o curto na blindagem realmente pesar na escolha da seção.

import { describe, it, expect } from "vitest";
import {
  correnteDeFalta,
  correnteDeProjetoMT,
  designacaoCaboMT,
  dimensionarCircuitoMT,
  reatanciaMT,
} from "./mtSizing";
import { defaultCircuitoMT, defaultPresetMT, defaultTrechoMT } from "./mtModelo";

const preset = (extra) => ({ ...defaultPresetMT(), ...extra });
const trecho = (extra) => ({ ...defaultTrechoMT(), ...extra });
const circuito = (extra) => ({ ...defaultCircuitoMT(), ...extra });

describe("correnteDeProjetoMT", () => {
  it("tira a corrente da potência do transformador", () => {
    // 1000 kVA em 13,8 kV → 1000000/(√3·13800) = 41,84 A
    const r = correnteDeProjetoMT({ modo: "potencia", potenciaKVA: 1000, tensao: 13.8 });
    expect(r.corrente).toBeCloseTo(41.84, 2);
  });

  it("no modo corrente devolve o que foi digitado", () => {
    expect(correnteDeProjetoMT({ modo: "corrente", corrente: 63 }).corrente).toBe(63);
  });

  it("recusa potência sem tensão", () => {
    expect(correnteDeProjetoMT({ modo: "potencia", potenciaKVA: 1000, tensao: 0 }).error)
      .toBeTruthy();
  });
});

describe("correnteDeFalta", () => {
  it("no neutro solidamente aterrado usa o Icc trifásico, e diz que é premissa", () => {
    const r = correnteDeFalta({ aterramentoNeutro: "solido", iccTrifasico: 10 });
    expect(r.corrente).toBe(10000);
    expect(r.origem).toMatch(/premissa/i);
  });

  it("com resistor usa a corrente limitada informada", () => {
    const r = correnteDeFalta({ aterramentoNeutro: "resistor", correnteFalta: 400, iccTrifasico: 10 });
    expect(r.corrente).toBe(400);
    expect(r.origem).not.toMatch(/premissa/i);
  });

  it("no sistema isolado exige a corrente capacitiva em vez de inventar uma", () => {
    expect(correnteDeFalta({ aterramentoNeutro: "isolado", iccTrifasico: 10 }).error).toBeTruthy();
  });

  it("recusa aterramento desconhecido", () => {
    expect(correnteDeFalta({ aterramentoNeutro: "xpto", iccTrifasico: 10 }).error).toBeTruthy();
  });
});

describe("dimensionarCircuitoMT — caso base", () => {
  const r = dimensionarCircuitoMT({ preset: preset(), circuito: circuito() });

  it("calcula sem erro", () => {
    expect(r.error).toBeUndefined();
  });

  it("a capacidade sozinha daria a menor seção da tabela", () => {
    // 41,84 A contra 59 A × 0,93 = 54,9 A já em 10 mm² no método F1.
    expect(r.secaoCapacidade).toBe(10);
  });

  it("quem manda é o curto no condutor", () => {
    // 10 kA por 0,5 s com k = 143,1 → 49,4 mm², que sobe para 50 comercial.
    // É o resultado que a aba de baixa tensão não teria dado: ela não verifica
    // curto nenhum e pararia em 10 mm².
    expect(r.secaoCurtoCondutor).toBe(50);
    expect(r.secaoFinal).toBe(50);
    expect(r.criterio).toBe("curtoCondutor");
  });

  it("com o cabo no catálogo, não sobra nenhuma premissa no cálculo", () => {
    // Antes do catálogo a reatância era premissa de 0,12 Ω/km. Agora ela vem da
    // geometria do cabo com a fórmula da IEC 60287-1-1, e a única coisa que o
    // projetista arbitra neste caso é o limite de queda de tensão — que a
    // NBR 14039 realmente não fixa.
    const tipos = r.procedencias.map((p) => p.tipo);
    expect(tipos).toContain("convencao"); // limite de queda
    expect(tipos).toContain("catalogo"); // geometria do cabo
    expect(tipos).not.toContain("premissa");
  });
});

describe("dimensionarCircuitoMT — recusa em vez de assumir", () => {
  it("recusa método que não existe, nomeando o método", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "Z9" })] }),
    });
    expect(r.error).toContain("Z9");
  });

  it("recusa C sem referência de temperatura, dizendo que a norma não decide", () => {
    // O caso que motivou toda a revisão de C e D. Assumir a Tabela 30 aqui
    // daria 7 % a mais de ampacidade a 30 °C — cabo menor, decisão silenciosa.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "C" })] }),
    });
    expect(r.error).toMatch(/refer[eê]ncia/i);
    expect(r.error).toMatch(/n[aã]o (decide|classifica)/i);
  });

  it("calcula em C quando o projetista escolhe a referência", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "C", referenciaTemp: "enterrado" })] }),
    });
    expect(r.error).toBeUndefined();
    expect(r.trechos[0].fatorTemperatura).toBe(0.93); // Tabela 31 a 30 °C
  });

  it("as duas referências de C dão capacidades diferentes, e a escolha aparece", () => {
    const comum = { preset: preset(), circuito: circuito() };
    const aoAr = dimensionarCircuitoMT({
      ...comum,
      circuito: circuito({ trechos: [trecho({ metodo: "C", referenciaTemp: "aoAr" })] }),
    });
    const enterrado = dimensionarCircuitoMT({
      ...comum,
      circuito: circuito({ trechos: [trecho({ metodo: "C", referenciaTemp: "enterrado" })] }),
    });
    expect(aoAr.trechos[0].fatorTemperatura).toBe(1); // Tabela 30, exposto, 30 °C
    expect(enterrado.trechos[0].fatorTemperatura).toBe(0.93);
    expect(aoAr.procedencias.some((p) => /C e D|canaleta/i.test(p.texto))).toBe(true);
  });

  it("recusa agrupamento em método sem tabela, apontando a IEC 60287-2-2", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "E", agrupado: true })] }),
    });
    expect(r.error).toMatch(/60287/);
  });

  it("o mesmo método passa quando o circuito está sozinho", () => {
    // Sem vizinho não há o que a tabela de agrupamento corrigiria.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "E", agrupado: false })] }),
    });
    expect(r.error).toBeUndefined();
    expect(r.trechos[0].fatorAgrupamento).toBe(1);
  });

  it("recusa curto acima de 5 s, que é o limite da norma", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ tempoCurto: 6 }),
    });
    expect(r.error).toMatch(/5 s/);
  });

  it("recusa temperatura fora da tabela em vez de interpolar", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ temperatura: 33 })] }),
    });
    expect(r.error).toMatch(/33/);
  });

  it("recusa cabo exposto ao sol acima do que a norma permite", () => {
    // Isolação de 90 °C exposta ao sol: proibida acima de 60 °C ambiente. A
    // célula "–" da Tabela 30 é proibição, não fator zero.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "A2", temperatura: 65 })] }),
    });
    expect(r.error).toBeTruthy();
    expect(r.secaoFinal).toBeUndefined();
  });

  it("recusa quando nenhuma seção da tabela atende", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ modo: "corrente", corrente: 5000 }),
    });
    expect(r.error).toBeTruthy();
  });
});

describe("dimensionarCircuitoMT — fatores", () => {
  it("aplica a correção de solo nos métodos enterrados", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "F1", resistividadeSolo: 4, profundidade: 2 })] }),
    });
    expect(r.trechos[0].fatorResistividade).toBe(0.83);
    expect(r.trechos[0].fatorProfundidade).toBe(0.91);
  });

  it("ignora a correção de solo onde ela não se aplica, sem errar", () => {
    // As Tabelas 32 e 33 valem só para F1, F2, G1, G2, H e I. Num método ao ar
    // o campo pode estar preenchido de um método anterior; o motor não pode
    // aplicá-lo nem travar por causa dele.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "A1", resistividadeSolo: 4, profundidade: 2 })] }),
    });
    expect(r.error).toBeUndefined();
    expect(r.trechos[0].fatorResistividade).toBe(1);
    expect(r.trechos[0].correcaoSoloAplicavel).toBe(false);
  });

  it("a formação do circuito escolhe entre as Tabelas 34 e 35", () => {
    // Mesmo arranjo não existe nas duas tabelas: "doisHoriz" é da 35
    // (tripolares) e não da 34 (unipolares em trifólio).
    const comum = { metodo: "A1", agrupado: true, arranjo: "doisHoriz", espacamentoRelativo: 0.2 };
    const tri = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ formacao: "tripolar", trechos: [trecho(comum)] }),
    });
    const uni = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ formacao: "unipolar", trechos: [trecho(comum)] }),
    });
    expect(tri.trechos[0].fatorAgrupamento).toBe(0.89);
    expect(uni.error).toBeTruthy();
  });

  it("não limita o produto dos fatores a 1,00", () => {
    // Tabela 38, 3 dutos, seção pequena, 800 mm de espaçamento → 1,08. Um teto
    // em 1,00 aqui jogaria fora capacidade que a norma reconhece.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({
        trechos: [trecho({ metodo: "G1", agrupado: true, dutos: 3, espacamento: 800 })],
      }),
    });
    expect(r.trechos[0].fatorAgrupamento).toBeGreaterThan(1);
  });

  it("distingue campo em branco de combinação que a norma não tem", () => {
    // Achado na verificação da tela: marcar "agrupado" antes de preencher os
    // campos dava "a combinação informada não está na tabela da norma", que
    // manda o projetista procurar um defeito na norma quando o que falta é ele
    // escolher o número de dutos.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ metodo: "F1", agrupado: true })] }),
    });
    expect(r.error).toMatch(/preencha|informe/i);
    expect(r.error).not.toMatch(/não está na tabela/i);
  });

  it("recusa contagem de dutos que a tabela não tem", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({
        trechos: [trecho({ metodo: "G1", agrupado: true, dutos: 5, espacamento: 200 })],
      }),
    });
    expect(r.error).toBeTruthy();
  });

  it("o pior trecho define a seção por capacidade", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({
        modo: "corrente",
        corrente: 150,
        trechos: [trecho({ temperatura: 20 }), trecho({ temperatura: 50 })],
      }),
    });
    const piores = r.trechos.map((t) => t.fatorTemperatura);
    expect(piores).toEqual([1, 0.76]);
    // O trecho a 50 °C exige 150/0,76 = 197,4 A de tabela. Em F1, 70 mm² dá
    // 167 A e 95 mm² dá 200 A — o trecho frio sozinho teria parado em 50 mm².
    expect(r.secaoCapacidade).toBe(95);
  });
});

describe("designacaoCaboMT", () => {
  it("escreve o cabo unipolar no padrão de lista de material", () => {
    const d = designacaoCaboMT({
      secao: 50, formacao: "unipolar", classeTensao: "8,7/15 kV", isolacao: 90, blindagem: 6,
    });
    expect(d).toBe("3#1x50 mm² 8,7/15 kV EPR/XLPE 90 °C, blindagem 6 mm²");
  });

  it("o tripolar é um cabo de três veias, não três cabos", () => {
    const d = designacaoCaboMT({
      secao: 50, formacao: "tripolar", classeTensao: "8,7/15 kV", isolacao: 90, blindagem: 6,
    });
    expect(d).toBe("1#3x50 mm² 8,7/15 kV EPR/XLPE 90 °C, blindagem 6 mm²");
  });

  it("mostra a blindagem especificada, que é o que se compra", () => {
    const d = designacaoCaboMT({
      secao: 50, formacao: "unipolar", classeTensao: "8,7/15 kV", isolacao: 90, blindagem: 70,
    });
    expect(d).toContain("blindagem 70 mm²");
  });

  it("a classe de tensão aparece só aqui, nunca no cálculo", () => {
    const a = designacaoCaboMT({ secao: 50, formacao: "unipolar", classeTensao: "8,7/15 kV", isolacao: 90, blindagem: 6 });
    const b = designacaoCaboMT({ secao: 50, formacao: "unipolar", classeTensao: "15/25 kV", isolacao: 90, blindagem: 6 });
    expect(a).not.toBe(b);
  });
});

describe("reatanciaMT", () => {
  it("calcula pela geometria do cabo, não por um valor de bolso", () => {
    // IEC 60287-1-1: X = 2ω·10⁻⁷·ln(2s/d). Cabo de 50 mm² 8,7/15 kV em
    // trifólio encostado: d = 8,1 mm, s = Dₑ = 23,5 mm → 0,1326 Ω/km a 60 Hz.
    const x = reatanciaMT({ classe: "8,7/15 kV", secao: 50 });
    expect(x.reatancia).toBeCloseTo(0.1326, 4);
    expect(x.origem).toMatch(/60287/);
  });

  it("cai à medida que a seção cresce", () => {
    // Cabo mais grosso: o condutor se aproxima do vizinho em termos relativos,
    // e o laço indutivo diminui.
    const secoes = [25, 50, 95, 240, 630];
    const xs = secoes.map((s) => reatanciaMT({ classe: "8,7/15 kV", secao: s }).reatancia);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1]);
  });

  it("afastar os cabos aumenta a reatância", () => {
    const junto = reatanciaMT({ classe: "8,7/15 kV", secao: 50 }).reatancia;
    const afastado = reatanciaMT({ classe: "8,7/15 kV", secao: 50, espacamento: 200 }).reatancia;
    expect(afastado).toBeGreaterThan(junto);
  });

  it("devolve null quando o cabo não está no catálogo transcrito", () => {
    expect(reatanciaMT({ classe: "12/20 kV", secao: 50 })).toBeNull();
    expect(reatanciaMT({ classe: "8,7/15 kV", secao: 10 })).toBeNull();
  });

  it("a premissa antiga de 0,12 Ω/km errava mais nas seções pequenas", () => {
    // Não é detalhe: em 25 mm² a premissa subestimava a reatância em 24 %.
    const x25 = reatanciaMT({ classe: "8,7/15 kV", secao: 25 }).reatancia;
    expect(x25 / 0.12).toBeGreaterThan(1.2);
  });
});

describe("dimensionarCircuitoMT — queda de tensão", () => {
  it("soma a distância dos trechos", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ trechos: [trecho({ distancia: 100 }), trecho({ distancia: 250 })] }),
    });
    expect(r.comprimentoTotal).toBe(350);
  });

  it("num alimentador longo é a queda que manda", () => {
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ tempoCurto: 0.1, iccTrifasico: 5, trechos: [trecho({ distancia: 8000 })] }),
    });
    expect(r.criterio).toBe("quedaRegime");
    expect(r.quedaRegime).toBeLessThanOrEqual(3);
  });

  it("usa a resistência da norma e a reatância do catálogo", () => {
    // 35 mm² a 90 °C: Rcc(20 °C) = 0,524 Ω/km da NBR NM 280, corrigida por
    // (1 + 0,00393·70) = 0,668 Ω/km; X = 0,1415 Ω/km da geometria do cabo.
    // ΔV = √3 · 41,84 · (0,668·0,92 + 0,1415·0,392) · 8 km = 388 V → 2,82 %.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ tempoCurto: 0.1, iccTrifasico: 5, trechos: [trecho({ distancia: 8000 })] }),
    });
    expect(r.secaoFinal).toBe(35);
    expect(r.quedaRegime).toBeCloseTo(2.82, 1);
    expect(r.reatanciaUsada).toBeCloseTo(0.1415, 3);
  });

  it("a resistência da norma dá queda maior que a resistividade pura", () => {
    // ρ20/S ignora o encordoamento e subestima R em cerca de 12 %. A diferença
    // vai inteira para a queda de tensão, no sentido otimista.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ tempoCurto: 0.1, iccTrifasico: 5, trechos: [trecho({ distancia: 8000 })] }),
    });
    const rho = (0.022 * 1000) / 35;
    expect(r.resistenciaUsada).toBeGreaterThan(rho);
  });

  it("cai na reatância informada quando o cabo não está no catálogo", () => {
    const r = dimensionarCircuitoMT({
      preset: preset({ classeTensao: "12/20 kV", reatancia: 0.2 }),
      circuito: circuito({ tempoCurto: 0.1, iccTrifasico: 5, trechos: [trecho({ distancia: 8000 })] }),
    });
    expect(r.reatanciaUsada).toBe(0.2);
    expect(r.procedencias.some((p) => p.tipo === "premissa" && /reat/i.test(p.texto))).toBe(true);
  });

  it("avisa quando a seção calculada não é fabricada naquela classe", () => {
    // A norma tabela desde 10 mm²; o Eprotenax 8,7/15 kV começa em 25. Calcular
    // 10 mm² e não avisar seria mandar especificar cabo que não existe.
    const r = dimensionarCircuitoMT({
      preset: preset(),
      circuito: circuito({ modo: "corrente", corrente: 40, tempoCurto: 0.1, iccTrifasico: 1 }),
    });
    expect(r.secaoFinal).toBe(10);
    expect(r.secaoComercial).toBe(25);
    expect(r.disponivelNoCatalogo).toBe(false);
  });
});

describe("dimensionarCircuitoMT — curto na blindagem", () => {
  it("compara a blindagem exigida com a que o cabo tem de fábrica", () => {
    const r = dimensionarCircuitoMT({ preset: preset(), circuito: circuito() });
    // 400 A por 0,5 s, cobertura ST2 (final 200 °C), início 85 °C → k = 125,3
    expect(r.blindagem.secaoMinima).toBeCloseTo(2.26, 2);
    expect(r.blindagem.secaoEspecificada).toBe(6); // padrão do catálogo
    expect(r.blindagem.atende).toBe(true);
  });

  it("recusa quando a blindagem padrão não aguenta a falta, e diz quanto pedir", () => {
    // O quarto critério ganhando sozinho: o condutor de 95 mm² passa folgado
    // em tudo, e o cabo mesmo assim não serve — a blindagem de 6 mm² que vem
    // de fábrica não suporta a falta fase-terra. Quem dimensiona só a fase não
    // vê isso.
    const r = dimensionarCircuitoMT({
      preset: preset({ aterramentoNeutro: "solido" }),
      circuito: circuito({ iccTrifasico: 10, tempoCurto: 0.5 }),
    });
    expect(r.error).toMatch(/blindagem/i);
    expect(r.error).toMatch(/56|57/); // 10 kA por 0,5 s exige ~56,4 mm²
    expect(r.blindagem.atende).toBe(false);
  });

  it("aceita blindagem maior quando o projeto especifica uma", () => {
    // "Outras seções de blindagem sob consulta" — encomenda, não é o padrão.
    const r = dimensionarCircuitoMT({
      preset: preset({ aterramentoNeutro: "solido" }),
      circuito: circuito({ iccTrifasico: 10, tempoCurto: 0.5, blindagemEspecificada: 70 }),
    });
    expect(r.error).toBeUndefined();
    expect(r.blindagem.atende).toBe(true);
  });

  it("aumentar a seção do condutor não salva a blindagem", () => {
    // Diferente da fase: a blindagem do Eprotenax é 6 mm² em qualquer seção.
    // Por isso este critério nunca escolhe a seção do condutor — ele decide a
    // especificação da blindagem.
    const r = dimensionarCircuitoMT({
      preset: preset({ aterramentoNeutro: "solido" }),
      circuito: circuito({ iccTrifasico: 10, tempoCurto: 0.5, modo: "corrente", corrente: 400 }),
    });
    expect(r.error).toMatch(/blindagem/i);
  });

  it("a designação do cabo sai com a blindagem que o projeto exige", () => {
    const r = dimensionarCircuitoMT({ preset: preset(), circuito: circuito() });
    expect(r.blindagem.designacao).toMatch(/6 mm/);
  });

  it("a cobertura muda a seção da blindagem, porque é ela que dá a temperatura final", () => {
    // Tabela 44: ST3 vai a 150 °C, SE1/A vai a 220 °C. Mesma falta, blindagens
    // diferentes — e quem escolhe isso é a cobertura, não a blindagem.
    const com = (cobertura) => dimensionarCircuitoMT({
      preset: preset({ cobertura }), circuito: circuito(),
    }).blindagem.secaoMinima;
    expect(com("ST3")).toBeGreaterThan(com("SE1/A"));
  });

  it("recusa cobertura que não está na Tabela 44", () => {
    const r = dimensionarCircuitoMT({
      preset: preset({ cobertura: "XPTO" }),
      circuito: circuito(),
    });
    expect(r.error).toMatch(/cobertura/i);
  });
});
