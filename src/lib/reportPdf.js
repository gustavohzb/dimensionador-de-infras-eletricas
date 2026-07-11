// Relatório PDF do dimensionamento: infraestrutura, desenho da seção,
// lista de cabos, taxa de ocupação e fator de agrupamento — tudo que o
// engenheiro precisa anexar ao memorial ou mandar pro cliente.

// Converte o SVG da visualização num PNG (dataURL) para embutir no PDF.
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

function cableLabel(c) {
  const vias = c.vias > 1 ? `${c.vias}x` : "";
  const tags = [c.trifolio ? "trifólio" : null, c.type === "comando" ? "comando" : null]
    .filter(Boolean)
    .join(", ");
  return `${c.quantity}× ${vias}${c.section}mm² (Ø ${c.d.toFixed(1)}mm)${tags ? ` — ${tags}` : ""}`;
}

export async function exportReportPDF({
  svgEl,
  projectName,
  infraLabel,
  dimensionLabel,
  groupedCables,
  occupancy: { trayArea, cableArea, ocupacao, limite, dentroLimite },
  derating: { arranjoLabel, circuitos, fator },
}) {
  // Import dinâmico: o jspdf é pesado (~400 kB) e só é necessário na hora
  // de gerar o relatório — assim não entra no bundle inicial do app.
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
  doc.text("Relatório de Dimensionamento", margin, y + 2);
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

  // Infraestrutura
  sectionTitle("Infraestrutura");
  if (projectName) keyValue("Projeto", projectName);
  keyValue("Tipo", infraLabel);
  keyValue("Dimensões", dimensionLabel);

  // Desenho da seção
  y += 2;
  const { dataUrl, w, h } = await svgToPng(svgEl);
  const imgW = Math.min(contentW, 150);
  const imgH = (h / w) * imgW;
  ensureSpace(imgH + 4);
  doc.addImage(dataUrl, "PNG", (pageW - imgW) / 2, y, imgW, imgH);
  y += imgH + 6;

  // Cabos
  sectionTitle(`Cabos do trecho (${groupedCables.reduce((a, c) => a + c.quantity, 0)} condutores)`);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  groupedCables.forEach((c) => {
    ensureSpace(5.5);
    doc.circle(margin + 1.2, y - 1.2, 0.7, "F");
    doc.text(cableLabel(c), margin + 4, y);
    y += 5.5;
  });
  y += 2;

  // Ocupação
  sectionTitle("Taxa de ocupação — NBR 5410");
  keyValue("Área útil", `${trayArea.toFixed(0)} mm²`);
  keyValue("Área ocupada pelos cabos", `${cableArea.toFixed(0)} mm²`);
  keyValue("Ocupação", `${ocupacao.toFixed(1)}% (limite ${limite}%)`);
  ensureSpace(8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (dentroLimite) {
    doc.setTextColor(5, 150, 105);
    doc.text("DENTRO DO LIMITE", margin, y);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text("ACIMA DO LIMITE", margin, y);
  }
  y += 8;

  // Agrupamento
  sectionTitle("Fator de agrupamento — NBR 5410 Tabela 42");
  keyValue("Forma de instalação", arranjoLabel);
  keyValue("Número de circuitos", circuitos);
  keyValue("Fator de correção", fator != null ? fator.toFixed(2).replace(".", ",") : "—");
  ensureSpace(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    doc.splitTextToSize(
      "A capacidade de condução de corrente de cada circuito deve ser multiplicada pelo fator acima. Fatores válidos para cabos em camada única; estimativa de circuitos deve ser conferida contra a composição real do projeto.",
      contentW
    ),
    margin,
    y
  );

  const nome = (projectName || "dimensionamento").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "dimensionamento";
  doc.save(`${nome}.pdf`);
}
