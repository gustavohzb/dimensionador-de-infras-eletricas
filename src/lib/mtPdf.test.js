// Memorial de média tensão em PDF.
//
// O teste que mais importa aqui é o do WinAnsi. A fonte padrão do jsPDF não tem
// Ω, √ nem subscrito, e o texto de média tensão é cheio dos três: "0,1326 Ω/km",
// "espaçamento e/Dₑ", "I = K·S·√(...)". Sem tratamento, o PDF sai com lixo no
// lugar do símbolo — e sai calado, porque o jsPDF não reclama.

import { describe, it, expect } from "vitest";
import {
  RESSALVAS_MT,
  linhaResumoMT,
  montarMemorialMT,
  rodapeMT,
  sanitizarWinAnsi,
  textoSeguroPdf,
} from "./mtPdf";
import { TEMA } from "./pdfTema";
import { defaultCircuitoMT, defaultPresetMT, defaultTrechoMT } from "./mtModelo";
import { dimensionarCircuitoMT } from "./mtSizing";

// WinAnsi (CP1252): Latin-1 imprimível mais os 32 caracteres especiais da faixa
// 0x80–0x9F. Qualquer coisa fora disso não tem glifo na fonte padrão.
const ESPECIAIS_CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const cabeNoWinAnsi = (texto) =>
  [...texto].every((ch) => {
    const c = ch.codePointAt(0);
    return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || ESPECIAIS_CP1252.includes(ch);
  });

describe("sanitizarWinAnsi", () => {
  it("troca o ohm pelo nome da unidade", () => {
    expect(sanitizarWinAnsi("0,1326 Ω/km")).toBe("0,1326 ohm/km");
  });

  it("desce o subscrito do diâmetro externo", () => {
    expect(sanitizarWinAnsi("espaçamento e/Dₑ")).toBe("espaçamento e/De");
  });

  it("troca símbolos matemáticos por texto", () => {
    expect(sanitizarWinAnsi("S ≥ I·√t / k")).toBe("S >= I·raiz(t) / k");
    expect(sanitizarWinAnsi("θf")).toBe("teta-f");
  });

  it("preserva o que a fonte tem", () => {
    // Acento, "²", "×", "·", travessão e grau existem em WinAnsi — trocá-los
    // deixaria o memorial pior sem necessidade.
    const bom = "50 mm² × 0,93 · 90 °C — instalação";
    expect(sanitizarWinAnsi(bom)).toBe(bom);
  });

  it("aceita valor que não é texto sem quebrar", () => {
    expect(sanitizarWinAnsi(null)).toBe("");
    expect(sanitizarWinAnsi(42)).toBe("42");
  });
});

describe("textoSeguroPdf", () => {
  it("tudo que sai do motor cabe na fonte do PDF", () => {
    // Varre o resultado inteiro de um dimensionamento real: designação,
    // procedências e rótulos. É a rede que pega um símbolo novo introduzido
    // meses depois em qualquer mensagem do motor.
    const r = dimensionarCircuitoMT({
      preset: defaultPresetMT(),
      circuito: { ...defaultCircuitoMT(), trechos: [{ ...defaultTrechoMT(), metodo: "C", referenciaTemp: "aoAr" }] },
    });
    const textos = [r.designacao, ...r.procedencias.map((p) => p.texto)];
    expect(textos.length).toBeGreaterThan(2);
    for (const t of textos) {
      expect(cabeNoWinAnsi(textoSeguroPdf(t))).toBe(true);
    }
  });

  it("as mensagens de recusa também cabem", () => {
    // As recusas são o texto mais técnico do app — e o mais provável de
    // ganhar um símbolo novo.
    const casos = [
      { trechos: [{ ...defaultTrechoMT(), metodo: "C" }] },
      { trechos: [{ ...defaultTrechoMT(), metodo: "E", agrupado: true }] },
      { trechos: [{ ...defaultTrechoMT(), metodo: "F1", agrupado: true }] },
      { trechos: [{ ...defaultTrechoMT(), temperatura: 33 }] },
      { tempoCurto: 6 },
    ];
    for (const extra of casos) {
      const r = dimensionarCircuitoMT({
        preset: defaultPresetMT(),
        circuito: { ...defaultCircuitoMT(), ...extra },
      });
      expect(r.error).toBeTruthy();
      expect(cabeNoWinAnsi(textoSeguroPdf(r.error))).toBe(true);
    }
  });

  it("as ressalvas do memorial cabem", () => {
    expect(cabeNoWinAnsi(textoSeguroPdf(RESSALVAS_MT))).toBe(true);
  });
});

describe("linhaResumoMT", () => {
  const preset = defaultPresetMT();

  it("monta a linha do circuito calculado", () => {
    const circuito = defaultCircuitoMT();
    const r = dimensionarCircuitoMT({ preset, circuito });
    const linha = linhaResumoMT(circuito, r);
    expect(linha[0]).toBe("AL-MT-01");
    expect(linha).toContain("50 mm²");
    expect(linha.some((c) => c.includes("CT"))).toBe(true); // critério: curto no condutor
  });

  it("circuito recusado vira linha legível em vez de sumir do memorial", () => {
    // Sumir seria pior: o memorial passaria a ideia de que o quadro está
    // inteiro dimensionado.
    const circuito = { ...defaultCircuitoMT(), trechos: [{ ...defaultTrechoMT(), metodo: "C" }] };
    const r = dimensionarCircuitoMT({ preset, circuito });
    const linha = linhaResumoMT(circuito, r);
    expect(linha[0]).toBe("AL-MT-01");
    expect(linha.join(" ")).toMatch(/não calculado/i);
    expect(linha.every((c) => typeof c === "string")).toBe(true);
  });

  it("toda célula cabe na fonte do PDF", () => {
    const circuito = defaultCircuitoMT();
    const r = dimensionarCircuitoMT({ preset, circuito });
    for (const celula of linhaResumoMT(circuito, r)) {
      expect(cabeNoWinAnsi(celula)).toBe(true);
    }
  });
});

describe("montarMemorialMT", () => {
  // Documento falso com a mesma superfície de pdfTema.js, para exercitar a
  // montagem inteira sem instanciar um jsPDF (que precisaria de DOM e canvas
  // para o emblema). É o mesmo motivo pelo qual ajustarLargura recebe o
  // medidor de fora.
  function docFalso() {
    const chamadas = [];
    const textos = [];
    const colher = (v) => {
      if (typeof v === "string") textos.push(v);
      else if (Array.isArray(v)) v.forEach(colher);
      else if (v && typeof v === "object") Object.values(v).forEach(colher);
    };
    const registra = (nome) => (...args) => { chamadas.push({ nome, args }); args.forEach(colher); };
    return {
      chamadas,
      textos,
      secao: registra("secao"),
      par: registra("par"),
      nota: registra("nota"),
      tabela: registra("tabela"),
      ficha: registra("ficha"),
      novaPagina: registra("novaPagina"),
    };
  }

  const preset = defaultPresetMT();
  const circuitos = [
    { ...defaultCircuitoMT(), tag: "AL-MT-01" },
    { ...defaultCircuitoMT(), tag: "AL-MT-02", trechos: [{ ...defaultTrechoMT(), metodo: "C" }] },
  ];
  const resultados = circuitos.map((c) => dimensionarCircuitoMT({ preset, circuito: c }));

  it("desenha uma ficha por circuito, inclusive o que não calculou", () => {
    const s = docFalso();
    montarMemorialMT(s, { circuitos, resultados, preset, projectName: "SE-01" });
    expect(s.chamadas.filter((c) => c.nome === "ficha")).toHaveLength(2);
  });

  it("o circuito recusado sai marcado em vermelho, com o motivo", () => {
    const s = docFalso();
    montarMemorialMT(s, { circuitos, resultados, preset, projectName: "SE-01" });
    const fichas = s.chamadas.filter((c) => c.nome === "ficha").map((c) => c.args[0]);
    const recusada = fichas.find((f) => f.destaque.cor === TEMA.erro);
    expect(recusada).toBeTruthy();
    expect(recusada.destaque.texto).toMatch(/refer[eê]ncia/i);
  });

  it("todo texto que chega ao documento cabe na fonte do PDF", () => {
    // A varredura é o ponto: a ficha monta dezenas de strings, e basta uma
    // com Ω para o PDF sair com lixo — calado, porque o jsPDF não reclama.
    const s = docFalso();
    montarMemorialMT(s, { circuitos, resultados, preset, projectName: "SE-01" });
    expect(s.textos.length).toBeGreaterThan(50);
    const ruins = s.textos.filter((t) => !cabeNoWinAnsi(t));
    expect(ruins).toEqual([]);
  });

  it("vira para retrato antes do detalhamento", () => {
    // O resumo é largo e precisa de paisagem; a ficha é estreita e alta. Sem a
    // virada, a ficha desenharia com a largura da paisagem.
    const s = docFalso();
    montarMemorialMT(s, { circuitos, resultados, preset, projectName: "SE-01" });
    const iVirada = s.chamadas.findIndex((c) => c.nome === "novaPagina");
    const iPrimeiraFicha = s.chamadas.findIndex((c) => c.nome === "ficha");
    expect(iVirada).toBeGreaterThan(-1);
    expect(iVirada).toBeLessThan(iPrimeiraFicha);
    expect(s.chamadas[iVirada].args[0]).toEqual({ orientation: "portrait" });
  });

  it("a procedência de cada número vai junto da ficha", () => {
    const s = docFalso();
    montarMemorialMT(s, { circuitos, resultados, preset, projectName: "SE-01" });
    const notas = s.chamadas.filter((c) => c.nome === "nota").map((c) => c.args[0]);
    expect(notas.some((n) => n.includes("[convencao]"))).toBe(true);
    expect(notas.some((n) => n.includes("[catalogo]"))).toBe(true);
  });

  it("memorial sem circuito nenhum não quebra", () => {
    const s = docFalso();
    montarMemorialMT(s, { circuitos: [], resultados: [], preset, projectName: "" });
    expect(s.chamadas.filter((c) => c.nome === "ficha")).toHaveLength(0);
    expect(s.chamadas.some((c) => c.nome === "tabela")).toBe(true);
  });
});

describe("rodapeMT", () => {
  it("declara a norma e a isolação, que é o que muda a tabela de ampacidade", () => {
    const r = rodapeMT(defaultPresetMT());
    expect(r).toMatch(/14039/);
    expect(r).toMatch(/90/);
    expect(cabeNoWinAnsi(r)).toBe(true);
  });

  it("não promete classe de tensão no cálculo", () => {
    // A classe entra só na designação. Citá-la no rodapé de base normativa
    // sugeriria que ela participou da conta.
    expect(rodapeMT(defaultPresetMT())).not.toMatch(/8,7\/15/);
  });
});
