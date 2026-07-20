// Relatório PDF do banco de capacitores: parâmetros, tabela por estágio,
// totais, comparação com o trafo e a vista superior da placa de montagem —
// pronto para anexar ao memorial ou mandar ao cliente.

// Cores do tema escuro da PlacaMontagem → equivalente claro. O relatório é
// papel: mesmo com o app em dark mode, a placa sai clara no PDF. O mapa
// acompanha as cores hardcoded do componente (CapacitoresTab.jsx).
const CORES_DARK_PARA_CLARO = {
  "#232a30": "#e8ebee", // fundo da placa
  "#4b565f": "#94a3b8", // contorno da placa
  "#8f9aa5": "#64748b", // cotas (linhas e texto)
  "#39424a": "#5c6670", // terminal central da caneca
};

// Converte o SVG da placa num PNG (dataURL) para embutir no PDF. Rasteriza a
// partir do viewBox (mm) numa resolução própria (pxPorMm), não do tamanho do
// SVG na tela — assim o relatório fica nítido independentemente da escala de
// exibição da placa. Exportada para permitir verificação de ponta a ponta.
export function svgToPng(svgEl, pxPorMm = 3) {
  const vb = svgEl.viewBox.baseVal;
  const w = Math.max(1, Math.round(vb.width * pxPorMm));
  const h = Math.max(1, Math.round(vb.height * pxPorMm));
  // Clona e fixa largura/altura em px: o SVG da tela usa style width/height,
  // que sobreporia os atributos e faria a imagem rasterizar pequena.
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  clone.style.width = "";
  clone.style.height = "";
  // Dark mode → claro, elemento a elemento (fill e stroke).
  for (const el of clone.querySelectorAll("*")) {
    for (const attr of ["fill", "stroke"]) {
      const clara = CORES_DARK_PARA_CLARO[el.getAttribute(attr)?.toLowerCase()];
      if (clara) el.setAttribute(attr, clara);
    }
  }
  const source = new XMLSerializer().serializeToString(clone);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL("image/png"), w, h });
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(source)));
  });
}

const num = (n, d = 1) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

export async function exportCapacitorPDF({ svgEl, params, banco, placa, projectName, equipamentos }) {
  const { vRede, vCapacitor, fatorDisjEstagio, fatorDisjGeral, fatorContator, percentualAlvo } = params;
  // Import dinâmico: o jspdf é pesado (~400 kB) e só é necessário na hora de
  // gerar o relatório — assim não entra no bundle inicial do app.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (text) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(text, margin, y);
    y += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const keyValue = (label, value) => {
    ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), margin + 62, y);
    y += 5.5;
  };

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("Banco de Capacitores", margin, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  doc.text(
    `Dimensionador do Gustavo — ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - margin,
    y + 2,
    { align: "right" }
  );
  y += 9;

  // Parâmetros
  sectionTitle("Parâmetros");
  if (projectName) keyValue("Projeto", projectName);
  keyValue("Tensão da rede", `${vRede} V`);
  keyValue("Tensão do capacitor", `${vCapacitor} V`);
  keyValue("Fator de correção", `(${vRede}/${vCapacitor})² = ${num(banco.fatorTensao, 3)}`);
  keyValue("Fator disj. estágio", num(fatorDisjEstagio, 2));
  keyValue("Fator disj. geral", num(fatorDisjGeral, 2));
  keyValue("Fator contator", num(fatorContator, 2));
  if (equipamentos) keyValue("Marca", "Siemens");
  y += 2;

  // Tabela de estágios
  sectionTitle(`Estágios (${banco.estagios.length})`);
  const cols = [
    { t: "#", x: margin, w: 8, a: "left" },
    { t: `kvar @${vCapacitor}V`, x: margin + 10, w: 26, a: "right" },
    { t: `kvar @${vRede}V`, x: margin + 38, w: 26, a: "right" },
    { t: "Corrente", x: margin + 66, w: 24, a: "right" },
    { t: "Contator", x: margin + 92, w: 28, a: "right" },
    { t: "Disjuntor", x: margin + 126, w: contentW - 126, a: "left" },
  ];
  const cellX = (c) => (c.a === "right" ? c.x + c.w : c.x);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  cols.forEach((c) => doc.text(c.t, cellX(c), y, { align: c.a }));
  y += 1.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  banco.estagios.forEach((e) => {
    ensureSpace(6);
    // "->" em ASCII, não a seta Unicode "→": a fonte padrão do jsPDF é WinAnsi
    // e não tem U+2192 — ela saía como um glifo errado, embaralhando a coluna.
    const disj = e.disjComercial ? `${num(e.disjCalculado)} A -> ${e.disjComercial} A` : `${num(e.disjCalculado)} A -> acima da escala`;
    const vals = [
      String(e.numero).padStart(2, "0"),
      num(e.kvarNominal),
      num(e.kvarReal),
      `${num(e.corrente)} A`,
      // ">=" em ASCII pelo mesmo motivo do "->": WinAnsi não tem U+2265.
      `>= ${num(e.contatorMin)} A`,
      disj,
    ];
    cols.forEach((c, i) => {
      doc.setTextColor(i === 0 ? 148 : 30, i === 0 ? 163 : 41, i === 0 ? 184 : 59);
      if (i === 5 && !e.disjComercial) doc.setTextColor(220, 38, 38);
      doc.text(vals[i], cellX(c), y, { align: c.a });
    });
    y += 5.5;
  });
  y += 2;

  // Equipamentos Siemens — presente só com a marca Siemens selecionada.
  // Contator e proteção POR CÉLULA, no modelo do configurador oficial.
  if (equipamentos) {
    sectionTitle("Equipamentos Siemens (configurador)");
    const eCols = [
      { t: "#", x: margin, w: 8, a: "left" },
      { t: "Célula", x: margin + 10, w: 24, a: "left" },
      { t: "Capacitor", x: margin + 36, w: 40, a: "left" },
      { t: "Contator", x: margin + 78, w: 38, a: "left" },
      { t: "Disjuntor", x: margin + 118, w: 38, a: "left" },
      { t: "Fusível", x: margin + 152, w: contentW - 152, a: "left" },
    ];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    eCols.forEach((c) => doc.text(c.t, c.x, y));
    y += 1.5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    for (const e of equipamentos) {
      for (let j = 0; j < e.itens.length; j++) {
        const it = e.itens[j];
        ensureSpace(6);
        doc.setTextColor(148, 163, 184);
        if (j === 0) doc.text(String(e.numero).padStart(2, "0"), eCols[0].x, y);
        if (it.encontrado) {
          doc.setTextColor(30, 41, 59);
          doc.text(`${it.qtd}x ${num(it.kvar)} kvar`, eCols[1].x, y);
          doc.text(it.codigo, eCols[2].x, y);
          doc.text(it.contator, eCols[3].x, y);
          doc.text(it.disjuntor ?? "usar fusível", eCols[4].x, y);
          doc.text(`${it.fusivel} ${it.fusivelIn}A`, eCols[5].x, y);
        } else {
          doc.setTextColor(180, 120, 10);
          doc.text(`${it.qtd}x ${num(it.kvar)} kvar — fora do catálogo Siemens em ${vCapacitor}V`, eCols[1].x, y);
        }
        y += 4.5;
      }
    }
    y += 1;
    ensureSpace(8);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      doc.splitTextToSize(
        "Contator (bobina 240V 50-60Hz) e proteção por célula, conforme o configurador Siemens. Base porta-fusível: 3NP1123-1CA20 (3NH3 230-0RC acima de 690V). Onde consta \"usar fusível\", o configurador não indica disjuntor para a célula.",
        contentW
      ),
      margin,
      y
    );
    y += 8;
  }

  // Totais
  sectionTitle("Totais do banco");
  keyValue(`kvar @${vCapacitor}V`, num(banco.kvarNominalTotal));
  keyValue(`kvar @${vRede}V`, num(banco.kvarRealTotal));
  keyValue("Corrente total", `${num(banco.correnteTotal)} A`);
  keyValue(
    "Disjuntor geral",
    banco.disjGeralComercial
      ? `${num(banco.disjGeralCalculado)} A -> ${banco.disjGeralComercial} A`
      : `${num(banco.disjGeralCalculado)} A -> acima da escala`
  );

  // Comparação com o trafo
  if (banco.trafo) {
    const dentro = Math.abs(banco.trafo.percentualAtingido - percentualAlvo) <= percentualAlvo * 0.1;
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(dentro ? 5 : 180, dentro ? 150 : 120, dentro ? 105 : 10);
    doc.text(
      `Banco = ${num(banco.trafo.percentualAtingido)}% do trafo (alvo ${num(percentualAlvo, 0)}% = ${num(banco.trafo.alvoKvar)} kvar)`,
      margin,
      y
    );
    y += 8;
  }

  // Placa de montagem
  if (svgEl && placa) {
    sectionTitle(`Placa de montagem — ${Math.round(placa.largura)} × ${Math.round(placa.altura)} mm`);
    const { dataUrl, w, h } = await svgToPng(svgEl);
    const imgW = Math.min(contentW, 165);
    const imgH = (h / w) * imgW;
    ensureSpace(imgH + 4);
    doc.addImage(dataUrl, "PNG", (pageW - imgW) / 2, y, imgW, imgH);
    y += imgH + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      doc.splitTextToSize(
        "Layout de referência: a placa mínima vai até a última posição ocupada (margem + células + espaçamentos). Confira os diâmetros no catálogo do fabricante antes de fabricar.",
        contentW
      ),
      margin,
      y
    );
  }

  // Com projeto ativo, o arquivo leva o nome dele (mesma sanitização do
  // relatório da Infraestrutura).
  const nome = (projectName || "banco-de-capacitores").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "banco-de-capacitores";
  doc.save(`${nome}.pdf`);
}
