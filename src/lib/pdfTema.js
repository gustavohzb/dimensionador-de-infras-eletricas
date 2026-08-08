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

    // As linhas ganham a checagem de espaço dentro do laço, mas o cabeçalho
    // não tinha nenhuma: uma tabela começando perto do fim da página
    // desenhava a faixa por cima do rodapé.
    s.ensureSpace(ALTURA * 2);
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

  // Caixa fechada de um item: barra de título, dois blocos de pares lado a
  // lado, uma minitabela opcional e uma faixa de destaque no rodapé.
  //
  // A altura é calculada antes de qualquer traço para que a ficha inteira
  // caiba na página: uma ficha partida ao meio, com o resultado numa folha e
  // a entrada em outra, é pior que uma folha com sobra.
  s.ficha = ({ titulo, subtitulo = "", colunas, trechos = null, destaque = null }) => {
    const [esq, dir] = colunas;
    const BARRA = 7;
    const PAD = 3;
    const LINHA = 4.6;
    const ALTURA_TRECHO = 4.4;
    // Deslocamento da primeira linha de base das colunas em relação à barra
    // de título. Entra na conta da altura: sem ele a estimativa fica 3 mm
    // curta e só não estoura por causa da folga do ensureSpace — folga que
    // some se alguém mexer nos espaçamentos.
    const BASE_COLUNAS = 3;

    const linhasPares = Math.max(esq.length, dir.length);
    const alturaTrechos = trechos && trechos.linhas.length
      ? (trechos.linhas.length + 1) * ALTURA_TRECHO + 3
      : 0;
    const alturaDestaque = destaque ? 8 : 0;
    const altura = BARRA + PAD + BASE_COLUNAS + linhasPares * LINHA + alturaTrechos + alturaDestaque + PAD;

    s.ensureSpace(altura + 4);
    const topo = s.y;
    const larguraCol = (s.contentW - PAD * 3) / 2;

    doc.setFillColor(...TEMA.copperClaro);
    doc.rect(MARGEM, topo, s.contentW, BARRA, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEMA.tinta);
    doc.text(titulo, MARGEM + PAD, topo + 5);
    if (subtitulo) {
      const usado = doc.getTextWidth(titulo) + PAD * 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        ajustarLargura(subtitulo, s.contentW - usado - PAD * 2, (t) => doc.getTextWidth(t)),
        MARGEM + usado + PAD,
        topo + 5
      );
    }

    const bloco = (pares, x) => {
      let yy = topo + BARRA + PAD + BASE_COLUNAS;
      pares.forEach(([rotulo, valor]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...TEMA.suave);
        const recuo = larguraCol * 0.45;
        doc.text(ajustarLargura(rotulo, recuo - 1, (t) => doc.getTextWidth(t)), x, yy);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEMA.tinta);
        doc.text(
          ajustarLargura(String(valor), larguraCol - recuo, (t) => doc.getTextWidth(t)),
          x + recuo,
          yy
        );
        yy += LINHA;
      });
    };

    bloco(esq, MARGEM + PAD);
    bloco(dir, MARGEM + PAD * 2 + larguraCol);

    let yy = topo + BARRA + PAD + linhasPares * LINHA + BASE_COLUNAS;

    if (alturaTrechos) {
      const { xs } = distribuirColunas(trechos.cols.map((c) => c.w), MARGEM + PAD, s.contentW - PAD * 2);
      const escrever = (valor, i, y) => {
        const t = ajustarLargura(String(valor), trechos.cols[i].w - 2, (x) => doc.getTextWidth(x));
        if (trechos.cols[i].align === "right") doc.text(t, xs[i] + trechos.cols[i].w - 1, y, { align: "right" });
        else doc.text(t, xs[i], y);
      };
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...TEMA.suave);
      trechos.cols.forEach((c, i) => escrever(c.label, i, yy));
      yy += 1.5;
      doc.setDrawColor(...TEMA.linha);
      doc.setLineWidth(0.2);
      doc.line(MARGEM + PAD, yy, MARGEM + s.contentW - PAD, yy);
      yy += 3;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEMA.tinta);
      trechos.linhas.forEach((linha) => {
        linha.forEach((v, i) => escrever(v, i, yy));
        yy += ALTURA_TRECHO;
      });
      yy += 1;
    }

    if (destaque) {
      doc.setFillColor(...destaque.cor);
      doc.rect(MARGEM + PAD, yy - 3.5, s.contentW - PAD * 2, 6.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        ajustarLargura(destaque.texto, s.contentW - PAD * 4, (t) => doc.getTextWidth(t)),
        MARGEM + PAD * 2,
        yy + 1
      );
      yy += alturaDestaque;
    }

    // `altura` já reserva o espaço certo, então normalmente é ela quem
    // vence aqui. O Math.max fica como rede de segurança: se algum ajuste
    // futuro nos espaçamentos fizer o desenho passar da estimativa, a
    // borda ainda fecha sobre o que foi realmente desenhado, em vez de
    // cortar conteúdo.
    const alturaReal = Math.max(altura, yy + PAD - topo);
    doc.setDrawColor(...TEMA.linha);
    doc.setLineWidth(0.3);
    doc.rect(MARGEM, topo, s.contentW, alturaReal, "S");

    s.y = topo + alturaReal + 5;
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
