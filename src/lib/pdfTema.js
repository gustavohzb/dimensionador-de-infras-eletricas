// Tema compartilhado dos memoriais em PDF: cores, cabeçalho com emblema,
// tabela com bordas, ficha e numeração de página.
//
// Atenção WinAnsi (fonte padrão do jsPDF): sem "→", "≥", "Δ" ou "ρ" — usar
// "->", ">=" e "Queda". Acentos, "×", "²" e "…" existem e são ok.

import emblemaUrl from "../assets/emblema.png";

// As cores que os geradores de PDF do app repetiam como literais RGB soltos.
// Congelado: são espalhadas por spread em dezenas de chamadas, e uma mutação
// acidental valeria pelo resto da sessão.
export const TEMA = Object.freeze({
  copper: [180, 98, 42],
  copperClaro: [243, 227, 214],
  tinta: [30, 41, 59],
  suave: [100, 116, 139],
  linha: [203, 213, 225],
  zebra: [248, 250, 252],
  ok: [5, 150, 105],
  erro: [220, 38, 38],
});

// Corta o texto pela largura real disponível (mm). Truncar por número fixo de
// caracteres deixa colunas estreitas vazarem por cima da coluna seguinte, que
// era o defeito do memorial antigo. `medir` é injetado porque medir texto de
// verdade exige um documento jsPDF, e isto precisa ser testável sem um.
export function ajustarLargura(texto, maxWidth, medir) {
  if (medir(texto) <= maxWidth) return texto;
  let cut = texto;
  while (cut.length > 1 && medir(`${cut}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// Posições x acumuladas de colunas de largura fixa. `sobra` negativa avisa que
// as colunas não cabem na largura útil da página — quem chama decide o que
// fazer, o helper só reporta.
export function distribuirColunas(larguras, x0, larguraUtil) {
  const xs = [];
  let x = x0;
  for (const w of larguras) {
    xs.push(x);
    x += w;
  }
  return { xs, total: x - x0, sobra: larguraUtil - (x - x0) };
}

// `undefined` = ainda não tentou; `null` = tentou e falhou (não tenta de novo).
let emblemaCache;

// O emblema já está no bundle (a aba Sobre o usa), então embutir no PDF não
// muda o peso do app. Reduzido para ~80 px porque enfiar os 183 kB do
// original em cada PDF gerado seria desperdício.
//
// Qualquer falha vira `null` e o cabeçalho cai para só texto: um PDF sem
// emblema é melhor que uma exportação que não acontece.
async function carregarEmblema() {
  if (emblemaCache !== undefined) return emblemaCache;
  emblemaCache = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const lado = 80;
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = Math.max(1, Math.round((img.height / img.width) * lado));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
      } catch (err) {
        console.error("Emblema não pôde ser preparado para o PDF:", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = emblemaUrl;
  });
  return emblemaCache;
}

const MARGEM = 12;
const ALTURA_FAIXA = 14;
const ALTURA_RODAPE = 10;

export async function novoDocumento({ orientation = "portrait", titulo, subtitulo = "" }) {
  // Import dinâmico: o jspdf é pesado (~400 kB) e só faz falta na hora de
  // gerar — assim não entra no bundle inicial do app.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation });
  const emblema = await carregarEmblema();

  // Dimensões de cada página, na ordem em que foram criadas. A segunda
  // passada do rodapé precisa delas, e não dá para perguntar ao jsPDF depois:
  // a orientação varia de página para página neste documento.
  const paginas = [];

  const s = { doc, margin: MARGEM, y: 0 };

  // Rechamado a cada página: quando a orientação muda, largura útil e limite
  // inferior mudam junto. Fixar isso na criação faria a ficha em retrato
  // herdar a largura da paisagem e vazar para fora do papel.
  const medirPagina = () => {
    s.pageW = doc.internal.pageSize.getWidth();
    s.pageH = doc.internal.pageSize.getHeight();
    s.contentW = s.pageW - MARGEM * 2;
    s.limiteY = s.pageH - MARGEM - ALTURA_RODAPE;
    paginas.push({ w: s.pageW, h: s.pageH });
  };

  const desenharFaixa = () => {
    doc.setFillColor(...TEMA.copper);
    doc.rect(0, 0, s.pageW, ALTURA_FAIXA, "F");
    let x = MARGEM;
    if (emblema) {
      const h = ALTURA_FAIXA - 5;
      const w = (emblema.w / emblema.h) * h;
      doc.addImage(emblema.dataUrl, "PNG", x, 2.5, w, h);
      x += w + 3;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, x, ALTURA_FAIXA / 2 + 1.5);
    if (subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEMA.copperClaro);
      doc.text(subtitulo, s.pageW - MARGEM, ALTURA_FAIXA / 2 + 1.5, { align: "right" });
    }
    s.y = ALTURA_FAIXA + 8;
  };

  s.novaPagina = ({ orientation: nova } = {}) => {
    const atual = s.pageW > s.pageH ? "landscape" : "portrait";
    doc.addPage("a4", nova ?? atual);
    medirPagina();
    desenharFaixa();
  };

  s.ensureSpace = (mm) => {
    if (s.y + mm > s.limiteY) s.novaPagina();
  };

  s.secao = (texto) => {
    s.ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEMA.tinta);
    doc.text(texto, MARGEM, s.y);
    s.y += 1.5;
    doc.setDrawColor(...TEMA.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, s.y, s.pageW - MARGEM, s.y);
    s.y += 5;
  };

  s.par = (rotulo, valor, x = MARGEM, larguraRotulo = 62) => {
    s.ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEMA.suave);
    doc.text(rotulo, x, s.y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEMA.tinta);
    doc.text(String(valor), x + larguraRotulo, s.y);
    s.y += 5.5;
  };

  s.nota = (texto) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const linhas = doc.splitTextToSize(texto, s.contentW);
    s.ensureSpace(linhas.length * 3.4 + 2);
    doc.setTextColor(...TEMA.suave);
    doc.text(linhas, MARGEM, s.y);
    s.y += linhas.length * 3.4 + 2;
  };

  // `linhas` é uma matriz de strings já formatadas: o módulo não conhece o
  // domínio, só desenha. O cabeçalho é redesenhado a cada quebra de página.
  s.tabela = ({ cols, linhas, fontSize = 8 }) => {
    const ALTURA = 5.2;
    const { xs, total } = distribuirColunas(cols.map((c) => c.w), MARGEM, s.contentW);

    const celula = (texto, i) => {
      const t = ajustarLargura(String(texto), cols[i].w - 2, (x) => doc.getTextWidth(x));
      if (cols[i].align === "right") {
        doc.text(t, xs[i] + cols[i].w - 1, s.y + 3.6, { align: "right" });
      } else {
        doc.text(t, xs[i] + 1, s.y + 3.6);
      }
    };

    const cabecalho = () => {
      doc.setFillColor(...TEMA.copper);
      doc.rect(MARGEM, s.y, total, ALTURA, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      cols.forEach((c, i) => celula(c.label, i));
      s.y += ALTURA;
    };

    cabecalho();
    linhas.forEach((linha, n) => {
      if (s.y + ALTURA > s.limiteY) {
        s.novaPagina();
        cabecalho();
      }
      if (n % 2 === 1) {
        doc.setFillColor(...TEMA.zebra);
        doc.rect(MARGEM, s.y, total, ALTURA, "F");
      }
      // Bordas depois do preenchimento: na ordem inversa a zebra as cobriria.
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.2);
      cols.forEach((c, i) => doc.rect(xs[i], s.y, c.w, ALTURA, "S"));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(...TEMA.tinta);
      linha.forEach((v, i) => celula(v, i));
      s.y += ALTURA;
    });
  };

  // A numeração só pode ser escrita agora: "1 / 6" exige saber que são 6. É o
  // que obriga o módulo a ter um `finalizar`, em vez de cada gerador chamar
  // `doc.save()` por conta própria.
  s.finalizar = ({ rodape, arquivo }) => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const { w, h } = paginas[i - 1];
      const base = h - MARGEM;
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.3);
      doc.line(MARGEM, base - 5, w - MARGEM, base - 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...TEMA.suave);
      const numero = `página ${i} / ${total}`;
      const espacoNota = w - MARGEM * 2 - doc.getTextWidth(numero) - 6;
      doc.text(ajustarLargura(rodape, espacoNota, (t) => doc.getTextWidth(t)), MARGEM, base - 1);
      doc.text(numero, w - MARGEM, base - 1, { align: "right" });
    }
    doc.save(arquivo);
  };

  medirPagina();
  desenharFaixa();
  return s;
}
