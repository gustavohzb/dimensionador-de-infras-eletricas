// Memorial de cálculo em PDF para o dimensionamento de cabos: relatório
// detalhado de um circuito (aba Dimensionar Cabo) e memorial tabular do
// quadro de cargas completo (uma linha por circuito, como na planilha).

import { ESQUEMAS, FORMAS_PARTIDA } from "../data/cabosNBR5410";
import { designacaoCabos } from "./cableSizingPro";
import { CRITERIO_LABEL } from "../components/cabos/CircuitoForm";

const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d).replace(".", ","));

// Corta o texto pela largura real (mm) disponível na coluna — sem isso, um
// truncamento por nº de caracteres fixo deixa colunas estreitas (ex.: "Carga")
// vazarem texto por cima da coluna seguinte no PDF.
function fitWidth(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function cargaLabel(c, preset) {
  if (c.modo === "corrente") return `${fmt(c.corrente, 1)} A`;
  const fp = preset?.fp ?? c.fp;
  return `${fmt(c.potencia, 1)} ${c.unidade} — FP ${fmt(fp)} · Rend. ${fmt(c.rendimento)}`;
}

function novoDoc(jsPDF, orientation) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const state = { doc, pageW, pageH, margin, contentW: pageW - margin * 2, y: margin };

  state.ensureSpace = (needed) => {
    if (state.y + needed > pageH - margin) {
      doc.addPage();
      state.y = margin;
    }
  };
  state.sectionTitle = (text) => {
    state.ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(text, margin, state.y);
    state.y += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, state.y, pageW - margin, state.y);
    state.y += 5;
  };
  state.keyValue = (label, value) => {
    state.ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, state.y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), margin + 62, state.y);
    state.y += 5.5;
  };
  state.header = (titulo) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text(titulo, margin, state.y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const now = new Date();
    doc.text(
      `Dimensionador do Gustavo — ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      pageW - margin,
      state.y + 2,
      { align: "right" }
    );
    state.y += 9;
  };
  state.rodape = (preset) => {
    state.ensureSpace(14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const pvc = preset?.condutorTemp === 70;
    const isol = pvc ? "PVC 70°C" : "EPR/XLPE 90°C";
    const tabs = pvc ? "36/38/40/42/45/46/48/58" : "37/39/40/42/45/46/48/58";
    doc.text(
      doc.splitTextToSize(
        `Cálculo conforme NBR 5410 (Tabelas ${tabs}), condutores com isolação ${isol}. Queda de tensão com resistência na temperatura de operação e reatância típica de projeto. Não substitui a coordenação com a proteção (Ib <= In <= Iz) nem a verificação de curto-circuito.`,
        state.contentW
      ),
      margin,
      state.y
    );
  };
  return state;
}

// Bloco de detalhamento de um circuito (compartilhado pelos dois relatórios).
// `preset` fornece material e temperatura (globais do quadro); o tipo de cabo
// vem do resultado (decidido automaticamente pela seção máxima multipolar).
function blocoCircuito(s, c, r, preset) {
  const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);
  const partida = FORMAS_PARTIDA.find((f) => f.id === c.formaPartidaId);
  const material = preset?.material === "aluminio" ? "Alumínio" : "Cobre";
  const isolacao = preset?.condutorTemp === 70 ? "PVC 70°C" : "EPR/XLPE 90°C";

  s.sectionTitle(`${c.tag}${c.descricao ? ` — ${c.descricao}` : ""}`);
  s.keyValue("Carga", cargaLabel(c, preset));
  s.keyValue("Condutores carregados", esquema?.label ?? "—");
  s.keyValue("Tensão", `${c.tensao} V`);
  if (partida && partida.fator > 1) s.keyValue("Forma de partida", `${partida.label} (Ip ~ ${partida.fator}×In)`);
  s.keyValue("Condutor", `${material} ${isolacao} ${r.tipoCabo ?? ""} — ${c.porFase}× por fase`.replace(/\s+/g, " ").trim());

  if (r.error) {
    s.ensureSpace(8);
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(10);
    s.doc.setTextColor(220, 38, 38);
    s.doc.text(r.error, s.margin, s.y);
    s.y += 8;
    return;
  }

  s.keyValue("Corrente de projeto Ib", `${fmt(r.corrente, 1)} A${r.porFase > 1 ? ` (${fmt(r.correntePorCabo, 1)} A por cabo)` : ""}`);
  if (r.correntePartida != null) s.keyValue("Corrente de partida Ip", `${fmt(r.correntePartida, 1)} A`);

  s.y += 1;
  r.detalhesTrechos.forEach((t, i) => {
    s.ensureSpace(5.5);
    s.doc.setFont("helvetica", "normal");
    s.doc.setFontSize(9);
    s.doc.setTextColor(30, 41, 59);
    s.doc.text(
      `Trecho ${String(i + 1).padStart(2, "0")}: ${t.condutoLabel} (método ${t.metodo}) — ${fmt(t.distancia, 0)}m · FCT ${fmt(t.fct)} · FCA ${fmt(t.fca)} · I' = ${fmt(t.iCorrigida, 1)} A`,
      s.margin + 2,
      s.y
    );
    s.y += 5;
  });
  s.y += 1;

  s.keyValue("Seção por capacidade", `${r.secaoCapacidade} mm²`);
  s.keyValue("Seção por queda em regime", r.secaoQuedaRegime ? `${r.secaoQuedaRegime} mm²` : "não verificada");
  s.keyValue("Seção por queda na partida", r.secaoQuedaPartida ? `${r.secaoQuedaPartida} mm²` : "não verificada");
  s.keyValue("Critério dominante", CRITERIO_LABEL[r.criterio]);
  s.keyValue("Capacidade corrigida", `${fmt(r.capacidadeCorrigida, 1)} A`);
  if (r.quedaRegime != null) s.keyValue(`Queda em regime (${fmt(r.comprimentoTotal, 0)}m)`, `${fmt(r.quedaRegime)}%`);
  if (r.quedaPartida != null) s.keyValue("Queda na partida", `${fmt(r.quedaPartida)}%`);

  s.ensureSpace(10);
  s.doc.setFont("helvetica", "bold");
  s.doc.setFontSize(11);
  s.doc.setTextColor(5, 150, 105);
  s.doc.text(
    `CABOS: ${designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}`,
    s.margin,
    s.y
  );
  s.y += 9;
}

// Relatório detalhado de um circuito (aba Dimensionar Cabo).
export async function exportCircuitoPDF({ circuito, result, preset }) {
  const { jsPDF } = await import("jspdf");
  const s = novoDoc(jsPDF, "portrait");
  s.header("Memorial de Dimensionamento de Cabo");
  blocoCircuito(s, circuito, result, preset);
  s.rodape(preset);
  const nome = (circuito.tag || "circuito").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "circuito";
  s.doc.save(`memorial-${nome}.pdf`);
}

// Memorial do quadro de cargas: tabela resumo + detalhamento por circuito.
export async function exportMemorialPDF({ projectName, circuitos, resultados, preset }) {
  const { jsPDF } = await import("jspdf");
  const s = novoDoc(jsPDF, "landscape");
  s.header("Memorial de Cálculo — Quadro de Cargas");
  if (projectName) s.keyValue("Projeto", projectName);
  if (preset) {
    const isol = preset.condutorTemp === 70 ? "PVC 70°C" : "EPR/XLPE 90°C";
    s.keyValue(
      "Preset",
      `${preset.material === "aluminio" ? "Alumínio" : "Cobre"} · ${isol} · seção mín. ${preset.secaoMinima}mm² · multipolar até ${preset.secaoMaxMultipolar}mm² · queda ${preset.quedaMaxRegime}%/${preset.quedaMaxPartida}%`
    );
  }
  s.y += 2;

  // Tabela resumo
  const cols = [
    { w: 9, label: "Nº", get: (c, r, i) => String(i + 1).padStart(2, "0") },
    { w: 20, label: "TAG", get: (c) => c.tag },
    { w: 44, label: "Descrição", get: (c) => c.descricao || "—" },
    { w: 16, label: "Tensão", get: (c) => `${c.tensao}V` },
    { w: 44, label: "Carga", get: (c) => cargaLabel(c, preset) },
    { w: 16, label: "Ib (A)", get: (c, r) => (r.error ? "—" : fmt(r.corrente, 1)) },
    {
      w: 50,
      label: "Cabos",
      get: (c, r) => (r.error ? "erro" : designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })),
    },
    { w: 14, label: "%R", get: (c, r) => (r.error ? "—" : fmt(r.quedaRegime)) },
    { w: 14, label: "%P", get: (c, r) => (r.error ? "—" : fmt(r.quedaPartida)) },
    { w: 32, label: "Critério", get: (c, r) => (r.error ? "—" : CRITERIO_LABEL[r.criterio]) },
  ];

  const drawHeader = () => {
    s.doc.setFillColor(241, 245, 249);
    s.doc.rect(s.margin, s.y - 4, s.contentW, 6, "F");
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(8);
    s.doc.setTextColor(71, 85, 105);
    let x = s.margin + 1;
    cols.forEach((col) => {
      s.doc.text(col.label, x, s.y);
      x += col.w;
    });
    s.y += 5;
  };

  drawHeader();
  circuitos.forEach((c, i) => {
    const r = resultados[i];
    if (s.y + 6 > s.pageH - s.margin) {
      s.doc.addPage();
      s.y = s.margin + 4;
      drawHeader();
    }
    if (i % 2 === 1) {
      s.doc.setFillColor(248, 250, 252);
      s.doc.rect(s.margin, s.y - 3.6, s.contentW, 5.2, "F");
    }
    s.doc.setFont("helvetica", "normal");
    s.doc.setFontSize(8);
    s.doc.setTextColor(30, 41, 59);
    let x = s.margin + 1;
    cols.forEach((col) => {
      const txt = String(col.get(c, r, i));
      s.doc.text(fitWidth(s.doc, txt, col.w - 2), x, s.y);
      x += col.w;
    });
    s.y += 5.2;
  });
  s.y += 3;
  s.ensureSpace(5);
  s.doc.setFont("helvetica", "normal");
  s.doc.setFontSize(7.5);
  s.doc.setTextColor(100, 116, 139);
  s.doc.text(
    "%R: queda de tensão em regime (limite usual 4%). %P: queda de tensão na partida do motor, quando aplicável (limite usual 10%).",
    s.margin,
    s.y
  );
  s.y += 6;

  // Detalhamento por circuito
  circuitos.forEach((c, i) => blocoCircuito(s, c, resultados[i], preset));
  s.rodape(preset);

  const nome = (projectName || "quadro-de-cargas").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "quadro-de-cargas";
  s.doc.save(`memorial-${nome}.pdf`);
}
