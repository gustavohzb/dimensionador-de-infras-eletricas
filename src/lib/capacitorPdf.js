// Relatório PDF do banco de capacitores: parâmetros, tabela por estágio,
// totais, comparação com o trafo e a vista superior da placa de montagem —
// pronto para anexar ao memorial ou mandar ao cliente.

// Converte o SVG da placa num PNG (dataURL) para embutir no PDF.
function svgToPng(svgEl) {
  return new Promise((resolve, reject) => {
    const source = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL("image/png"), w: img.width, h: img.height });
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(source)));
  });
}

const num = (n, d = 1) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

export async function exportCapacitorPDF({ svgEl, params, banco, placa }) {
  const { vRede, vCapacitor, fatorDisjEstagio, fatorDisjGeral, percentualAlvo } = params;
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
  keyValue("Tensão da rede", `${vRede} V`);
  keyValue("Tensão do capacitor", `${vCapacitor} V`);
  keyValue("Fator de correção", `(${vRede}/${vCapacitor})² = ${num(banco.fatorTensao, 3)}`);
  keyValue("Fator disj. estágio", num(fatorDisjEstagio, 2));
  keyValue("Fator disj. geral", num(fatorDisjGeral, 2));
  y += 2;

  // Tabela de estágios
  sectionTitle(`Estágios (${banco.estagios.length})`);
  const cols = [
    { t: "#", x: margin, w: 12, a: "left" },
    { t: `kvar @${vCapacitor}V`, x: margin + 14, w: 30, a: "right" },
    { t: `kvar @${vRede}V`, x: margin + 46, w: 30, a: "right" },
    { t: "Corrente", x: margin + 78, w: 30, a: "right" },
    { t: "Disjuntor", x: margin + 110, w: contentW - 110, a: "left" },
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
    const disj = e.disjComercial ? `${num(e.disjCalculado)} A → ${e.disjComercial} A` : `${num(e.disjCalculado)} A → acima da escala`;
    const vals = [
      String(e.numero).padStart(2, "0"),
      num(e.kvarNominal),
      num(e.kvarReal),
      `${num(e.corrente)} A`,
      disj,
    ];
    doc.setTextColor(e.disjComercial ? 30 : 220, e.disjComercial ? 41 : 38, e.disjComercial ? 59 : 38);
    cols.forEach((c, i) => {
      doc.setTextColor(i === 0 ? 148 : 30, i === 0 ? 163 : 41, i === 0 ? 184 : 59);
      if (i === 4 && !e.disjComercial) doc.setTextColor(220, 38, 38);
      doc.text(vals[i], cellX(c), y, { align: c.a });
    });
    y += 5.5;
  });
  y += 2;

  // Totais
  sectionTitle("Totais do banco");
  keyValue(`kvar @${vCapacitor}V`, num(banco.kvarNominalTotal));
  keyValue(`kvar @${vRede}V`, num(banco.kvarRealTotal));
  keyValue("Corrente total", `${num(banco.correnteTotal)} A`);
  keyValue(
    "Disjuntor geral",
    banco.disjGeralComercial
      ? `${num(banco.disjGeralCalculado)} A → ${banco.disjGeralComercial} A`
      : `${num(banco.disjGeralCalculado)} A → acima da escala`
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

  doc.save("banco-de-capacitores.pdf");
}
