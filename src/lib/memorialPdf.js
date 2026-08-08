// Memorial de cálculo em PDF para o dimensionamento de cabos: relatório
// detalhado de um circuito (aba Dimensionar Cabo) e memorial do quadro de
// cargas completo — resumo tabular em paisagem e uma ficha por circuito em
// retrato. A apresentação toda vem de pdfTema.js.

import { ESQUEMAS, FORMAS_PARTIDA } from "../data/cabosNBR5410";
import { designacaoCabos } from "./cableSizingPro";
import { CRITERIO_LABEL, CRITERIO_SIGLA, CRITERIO_LEGENDA } from "../components/cabos/CircuitoForm";
import { TEMA, novoDocumento } from "./pdfTema";

const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d).replace(".", ","));

function cargaLabel(c, preset) {
  if (c.modo === "corrente") return `${fmt(c.corrente, 1)} A`;
  const fp = preset?.fp ?? c.fp;
  return `${fmt(c.potencia, 1)} ${c.unidade} — FP ${fmt(fp)} · Rend. ${fmt(c.rendimento)}`;
}

const isolacaoLabel = (preset) => (preset?.condutorTemp === 70 ? "PVC 70°C" : "EPR/XLPE 90°C");

// Cabe numa linha de rodapé, então é mais curto que o parágrafo que saía uma
// vez só na última página do memorial antigo.
function rodapeNorma(preset) {
  const tabs = preset?.condutorTemp === 70
    ? "36/38/40/42/45/46/48/58"
    : "37/39/40/42/45/46/48/58";
  return `NBR 5410 (Tabelas ${tabs}) · isolação ${isolacaoLabel(preset)} · não substitui a coordenação com a proteção (Ib <= In <= Iz) nem a verificação de curto-circuito`;
}

function agora() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}

const nomeArquivo = (base, alternativa) =>
  `memorial-${(base || alternativa).replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || alternativa}.pdf`;

// Bloco de detalhamento de um circuito (compartilhado pelos dois relatórios).
// `preset` fornece material e temperatura (globais do quadro); o tipo de cabo
// vem do resultado (decidido automaticamente pela seção máxima multipolar).
function blocoCircuito(s, c, r, preset) {
  const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);
  const partida = FORMAS_PARTIDA.find((f) => f.id === c.formaPartidaId);
  const material = preset?.material === "aluminio" ? "Alumínio" : "Cobre";
  const isolacao = preset?.condutorTemp === 70 ? "PVC 70°C" : "EPR/XLPE 90°C";

  s.secao(`${c.tag}${c.descricao ? ` — ${c.descricao}` : ""}`);
  s.par("Carga", cargaLabel(c, preset));
  s.par("Condutores carregados", esquema?.label ?? "—");
  s.par("Tensão", `${c.tensao} V`);
  if (partida && partida.fator > 1) s.par("Forma de partida", `${partida.label} (Ip ~ ${partida.fator}×In)`);
  s.par("Condutor", `${material} ${isolacao} ${r.tipoCabo ?? ""} — ${c.porFase}× por fase`.replace(/\s+/g, " ").trim());

  if (r.error) {
    s.ensureSpace(8);
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(10);
    s.doc.setTextColor(...TEMA.erro);
    s.doc.text(r.error, s.margin, s.y);
    s.y += 8;
    return;
  }

  s.par("Corrente de projeto Ib", `${fmt(r.corrente, 1)} A${r.porFase > 1 ? ` (${fmt(r.correntePorCabo, 1)} A por cabo)` : ""}`);
  if (r.correntePartida != null) s.par("Corrente de partida Ip", `${fmt(r.correntePartida, 1)} A`);

  s.y += 1;
  r.detalhesTrechos.forEach((t, i) => {
    s.ensureSpace(5.5);
    s.doc.setFont("helvetica", "normal");
    s.doc.setFontSize(9);
    s.doc.setTextColor(...TEMA.tinta);
    s.doc.text(
      `Trecho ${String(i + 1).padStart(2, "0")}: ${t.condutoLabel} (método ${t.metodo}) — ${fmt(t.distancia, 0)}m · FCT ${fmt(t.fct)} · FCA ${fmt(t.fca)} · I' = ${fmt(t.iCorrigida, 1)} A`,
      s.margin + 2,
      s.y
    );
    s.y += 5;
  });
  s.y += 1;

  s.par("Seção por capacidade", `${r.secaoCapacidade} mm²`);
  s.par("Seção por queda em regime", r.secaoQuedaRegime ? `${r.secaoQuedaRegime} mm²` : "não verificada");
  s.par("Seção por queda na partida", r.secaoQuedaPartida ? `${r.secaoQuedaPartida} mm²` : "não verificada");
  s.par("Critério dominante", CRITERIO_LABEL[r.criterio]);
  s.par("Capacidade corrigida", `${fmt(r.capacidadeCorrigida, 1)} A`);
  if (r.quedaRegime != null) s.par(`Queda em regime (${fmt(r.comprimentoTotal, 0)}m)`, `${fmt(r.quedaRegime)}%`);
  if (r.quedaPartida != null) s.par(`Queda na partida (lim. ${fmt(c.quedaMaxPartida ?? 10, 1)}%)`, `${fmt(r.quedaPartida)}%`);

  s.ensureSpace(10);
  s.doc.setFont("helvetica", "bold");
  s.doc.setFontSize(11);
  s.doc.setTextColor(...TEMA.ok);
  s.doc.text(
    `CABOS: ${designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}`,
    s.margin,
    s.y
  );
  s.y += 9;
}

// Memorial do quadro de cargas: resumo tabular em paisagem + uma ficha por
// circuito em retrato.
export async function exportMemorialPDF({ projectName, circuitos, resultados, preset }) {
  const s = await novoDocumento({
    orientation: "landscape",
    titulo: "Memorial de cálculo — quadro de cargas",
    subtitulo: [projectName, agora()].filter(Boolean).join(" · "),
  });

  s.par("Projeto", projectName || "—");
  if (preset) {
    s.par(
      "Preset",
      `${preset.material === "aluminio" ? "Alumínio" : "Cobre"} · ${isolacaoLabel(preset)} · seção mín. ${preset.secaoMinima}mm² · multipolar até ${preset.secaoMaxMultipolar}mm² · queda regime ${preset.quedaMaxRegime}%`
    );
  }
  s.par("Circuitos", String(circuitos.length));
  s.y += 3;

  // Somam 259 mm; a largura útil em paisagem é 273 mm (297 - 2×12).
  const cols = [
    { w: 9, label: "Nº" },
    { w: 20, label: "TAG" },
    { w: 58, label: "Descrição" },
    { w: 16, label: "Tensão" },
    { w: 44, label: "Carga" },
    { w: 16, label: "Ib (A)", align: "right" },
    { w: 50, label: "Cabos" },
    { w: 14, label: "%R", align: "right" },
    { w: 14, label: "%P", align: "right" },
    { w: 18, label: "Critério" },
  ];

  s.tabela({
    cols,
    linhas: circuitos.map((c, i) => {
      const r = resultados[i];
      return [
        String(i + 1).padStart(2, "0"),
        c.tag,
        c.descricao || "—",
        `${c.tensao}V`,
        cargaLabel(c, preset),
        r.error ? "—" : fmt(r.corrente, 1),
        r.error ? "erro" : designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r }),
        r.error ? "—" : fmt(r.quedaRegime),
        r.error ? "—" : fmt(r.quedaPartida),
        r.error ? "—" : CRITERIO_SIGLA[r.criterio],
      ];
    }),
  });

  s.y += 3;
  s.nota("%R: queda de tensão em regime (limite usual 4%). %P: queda de tensão na partida do motor, quando aplicável (limite usual 10%).");
  s.nota(`${CRITERIO_LEGENDA}.`);

  s.novaPagina({ orientation: "portrait" });
  s.secao("Detalhamento por circuito");
  circuitos.forEach((c, i) => blocoCircuito(s, c, resultados[i], preset));

  s.finalizar({
    rodape: rodapeNorma(preset),
    arquivo: nomeArquivo(projectName, "quadro-de-cargas"),
  });
}

// Relatório de um circuito só (aba Dimensionar Cabo).
export async function exportCircuitoPDF({ circuito, result, preset }) {
  const s = await novoDocumento({
    orientation: "portrait",
    titulo: "Memorial de dimensionamento de cabo",
    subtitulo: agora(),
  });
  blocoCircuito(s, circuito, result, preset);
  s.finalizar({
    rodape: rodapeNorma(preset),
    arquivo: nomeArquivo(circuito.tag, "circuito"),
  });
}
