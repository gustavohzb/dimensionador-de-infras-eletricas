// Relatório PDF da iluminação: quadro de cargas com todos os circuitos e o
// detalhamento de trechos de cada um — pronto para anexar ao memorial.
//
// Atenção WinAnsi (fonte padrão do jsPDF): sem "→", "≥", "Δ" ou "ρ" — usar
// "->", ">=", "Queda" e "1/56" em ASCII. Acentos e "²" existem e são ok.

const num = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));
const fmtSecao = (s) => (s == null ? "—" : String(s).replace(".", ","));

const SISTEMA_LABEL = { "ca-fn": "CA F-N", "ca-ff": "CA F-F", cc: "CC" };

// Linha do quadro de cargas de um circuito (também usada pela tabela na aba).
export function resumoCircuito(circuito, resultado) {
  const p = circuito.params;
  const secoes = resultado
    ? [...new Set(resultado.ligacoes.map((l) => l.secao))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9))
    : [];
  return {
    nome: circuito.nome,
    sistema: SISTEMA_LABEL[p.sistema] ?? p.sistema,
    tensao: Number(p.tensao) || 0,
    luminarias: resultado?.numLuminarias ?? null,
    potenciaW: resultado ? resultado.numLuminarias * (Number(p.potencia) || 0) : null,
    corrente: resultado?.correnteTotal ?? null,
    secoes, // seções usadas nos trechos (null = trecho sem seção que atenda)
    piorQuedaPct: resultado?.piorCaminho?.quedaPct ?? null,
    quedaMaxPct: Number(p.quedaMaxPct) || 0,
    ok: resultado != null && resultado.dimensionado && resultado.dentroLimite && resultado.erros.length === 0,
    temErro: (resultado?.erros?.length ?? 0) > 0,
  };
}

export async function exportIluminacaoPDF({ circuitos, projectName }) {
  // circuitos: [{ circuito, resultado, rotulos: Map(id do nó -> label) }]
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

  const tableHeader = (cols, fontSize = 8) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(100, 116, 139);
    cols.forEach((c) => doc.text(c.t, c.a === "right" ? c.x + c.w : c.x, y, { align: c.a ?? "left" }));
    y += 1.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("Iluminação — Quadro de Cargas", margin, y + 2);
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
  if (projectName) keyValue("Projeto", projectName);
  y += 1;

  // ==================== Quadro de cargas (todos os circuitos) ====================
  sectionTitle(`Quadro de cargas (${circuitos.length} circuito${circuitos.length > 1 ? "s" : ""})`);
  const qCols = [
    { t: "Circuito", x: margin, w: 34 },
    { t: "Sistema", x: margin + 36, w: 16 },
    { t: "Tensão", x: margin + 54, w: 14, a: "right" },
    { t: "Lum.", x: margin + 72, w: 10, a: "right" },
    { t: "Potência", x: margin + 86, w: 18, a: "right" },
    { t: "Corrente", x: margin + 108, w: 18, a: "right" },
    { t: "Seções (mm²)", x: margin + 130, w: 26 },
    { t: "Queda", x: margin + 158, w: contentW - 158, a: "right" },
  ];
  tableHeader(qCols);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let totLum = 0;
  let totW = 0;
  const resumos = circuitos.map(({ circuito, resultado }) => resumoCircuito(circuito, resultado));
  for (const r of resumos) {
    ensureSpace(6);
    totLum += r.luminarias ?? 0;
    totW += r.potenciaW ?? 0;
    const vals = [
      r.nome,
      r.sistema,
      `${r.tensao} V`,
      r.luminarias == null ? "—" : String(r.luminarias),
      r.potenciaW == null ? "—" : `${num(r.potenciaW, 0)} W`,
      r.corrente == null ? "—" : `${num(r.corrente)} A`,
      r.secoes.length ? r.secoes.map(fmtSecao).join(" / ") : "—",
      r.piorQuedaPct == null ? "—" : `${num(r.piorQuedaPct)}%`,
    ];
    qCols.forEach((c, i) => {
      doc.setTextColor(30, 41, 59);
      if (i === 7 && r.piorQuedaPct != null) {
        const dentro = r.ok;
        doc.setTextColor(dentro ? 5 : 220, dentro ? 150 : 38, dentro ? 105 : 38);
      }
      if (i === 6 && r.secoes.includes(null)) doc.setTextColor(220, 38, 38);
      doc.text(vals[i], c.a === "right" ? c.x + c.w : c.x, y, { align: c.a ?? "left" });
    });
    y += 5.5;
  }
  // Totais do quadro
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y - 3, pageW - margin, y - 3);
  y += 0.5;
  ensureSpace(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Total", margin, y);
  doc.text(String(totLum), qCols[3].x + qCols[3].w, y, { align: "right" });
  doc.text(`${num(totW, 0)} W`, qCols[4].x + qCols[4].w, y, { align: "right" });
  y += 8;

  // ==================== Detalhamento por circuito ====================
  for (const { circuito, resultado, rotulos } of circuitos) {
    const p = circuito.params;
    const cc = p.sistema === "cc";
    sectionTitle(`${circuito.nome} — trechos`);
    keyValue("Sistema / tensão", `${SISTEMA_LABEL[p.sistema] ?? p.sistema}, ${p.tensao} V${cc ? "" : `, FP ${num(Number(p.fp), 2)}`}`);
    keyValue("Potência por luminária", `${num(Number(p.potencia), 0)} W`);
    keyValue("Queda máx. / método padrão", `${num(Number(p.quedaMaxPct), 1)}% / ${p.metodo}`);

    if (!resultado) {
      ensureSpace(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 120, 10);
      doc.text("Circuito sem diagrama válido — nada a dimensionar.", margin, y);
      y += 8;
      continue;
    }
    for (const erro of resultado.erros) {
      ensureSpace(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text(doc.splitTextToSize(erro, contentW), margin, y);
      y += 6;
    }
    for (const aviso of resultado.avisos) {
      ensureSpace(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 120, 10);
      doc.text(doc.splitTextToSize(aviso, contentW), margin, y);
      y += 6;
    }
    if (resultado.erros.length > 0) {
      y += 2;
      continue;
    }

    const rotulo = (id) => rotulos.get(id) ?? id;
    const tCols = [
      { t: "Trecho", x: margin, w: 38 },
      { t: "Dist.", x: margin + 40, w: 14, a: "right" },
      { t: "Método", x: margin + 58, w: 14 },
      { t: "Pontos", x: margin + 74, w: 12, a: "right" },
      { t: "Corrente", x: margin + 92, w: 16, a: "right" },
      { t: "Seção", x: margin + 114, w: 16, a: "right" },
      { t: "Queda (V)", x: margin + 136, w: 18, a: "right" },
      { t: "Acum. (%)", x: margin + 158, w: contentW - 158, a: "right" },
    ];
    ensureSpace(10 + 5.5 * Math.min(resultado.ligacoes.length, 4));
    tableHeader(tCols, 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const l of resultado.ligacoes) {
      ensureSpace(6);
      const vals = [
        `${rotulo(l.de)} -> ${rotulo(l.para)}`,
        `${num(l.distancia, 1)} m`,
        l.metodo,
        String(l.pontos),
        `${num(l.corrente)} A`,
        l.secao == null ? "não atende" : `${fmtSecao(l.secao)} mm²`,
        num(l.quedaVolts, 3),
        `${num(l.quedaAcumPct, 3)}%`,
      ];
      tCols.forEach((c, i) => {
        doc.setTextColor(30, 41, 59);
        if (i === 5) doc.setTextColor(l.secao == null ? 220 : 180, l.secao == null ? 38 : 83, l.secao == null ? 38 : 9);
        if (i === 7 && l.quedaAcumPct > Number(p.quedaMaxPct)) doc.setTextColor(220, 38, 38);
        doc.text(vals[i], c.a === "right" ? c.x + c.w : c.x, y, { align: c.a ?? "left" });
      });
      y += 5;
    }
    y += 1;
    if (resultado.piorCaminho) {
      ensureSpace(7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const dentro = resultado.dentroLimite;
      doc.setTextColor(dentro ? 5 : 220, dentro ? 150 : 38, dentro ? 105 : 38);
      doc.text(
        `Pior caminho: ${rotulo(resultado.piorCaminho.noId)} — queda ${num(resultado.piorCaminho.quedaPct)}% (${num(resultado.piorCaminho.quedaVolts, 3)} V), limite ${num(Number(p.quedaMaxPct), 1)}%`,
        margin,
        y
      );
      y += 8;
    }
  }

  // Rodapé metodológico
  ensureSpace(16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    doc.splitTextToSize(
      "Seção por trecho: menor seção comercial que mantém a queda acumulada dentro do limite em todo caminho quadro->luminária (NBR 5410 6.2.7), atende a capacidade de condução de corrente (Tabela 36, PVC 70°C, cobre, 2 condutores carregados, método do trecho) e a seção mínima de iluminação de 1,5 mm² (Tabela 47). Resistividade do cobre 1/56 ohm·mm²/m, 2 condutores, reatância desprezada (CA).",
      contentW
    ),
    margin,
    y
  );

  const nome = (projectName || "quadro-de-cargas-iluminacao").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "quadro-de-cargas-iluminacao";
  doc.save(`${nome}.pdf`);
}
