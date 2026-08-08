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

// O rodapé repete em toda página, então carrega só a base de cálculo. As
// ressalvas de projeto ficam numa nota no corpo, onde há largura para elas.
function rodapeNorma(preset) {
  const tabs = preset?.condutorTemp === 70
    ? "36/38/40/42/45/46/48/58"
    : "37/39/40/42/45/46/48/58";
  return `NBR 5410 (Tabelas ${tabs}) · isolação ${isolacaoLabel(preset)}`;
}

const RESSALVAS =
  "Queda de tensão calculada com a resistência do condutor na temperatura de operação e reatância típica de projeto. Não substitui a coordenação com a proteção (Ib <= In <= Iz) nem a verificação de curto-circuito.";

function agora() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}

const nomeArquivo = (base, alternativa) =>
  `memorial-${(base || alternativa).replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || alternativa}.pdf`;

// Colunas da minitabela de trechos: somam 132 mm, e a largura útil em retrato
// é 186 mm (210 - 2×12), com 6 mm de recuo dentro da ficha.
const COLS_TRECHO = [
  { w: 10, label: "Nº" },
  { w: 34, label: "Conduto" },
  { w: 16, label: "Método" },
  { w: 18, label: "Dist.", align: "right" },
  { w: 16, label: "FCT", align: "right" },
  { w: 16, label: "FCA", align: "right" },
  { w: 22, label: "I' (A)", align: "right" },
];

// Uma ficha de circuito. `preset` fornece material e temperatura (globais do
// quadro); o tipo de cabo vem do resultado, decidido pela seção máxima
// multipolar.
function fichaCircuito(s, c, r, preset) {
  const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);
  const partida = FORMAS_PARTIDA.find((f) => f.id === c.formaPartidaId);
  const material = preset?.material === "aluminio" ? "Alumínio" : "Cobre";

  // O rótulo de esquema com "(Harm. >15%)" passa de 40 caracteres e não cabe
  // no valor de uma coluna da ficha — o qualificador saía truncado, e ele
  // muda o número de condutores carregados. Vai numa linha própria.
  const rotuloEsquema = esquema?.label ?? "—";
  const marcaHarm = " (Harm. >15%)";
  const temHarm = rotuloEsquema.endsWith(marcaHarm);
  const entrada = [
    ["Carga", cargaLabel(c, preset)],
    ["Condutores", temHarm ? rotuloEsquema.slice(0, -marcaHarm.length) : rotuloEsquema],
  ];
  if (temHarm) entrada.push(["Harmônicas", "> 15% — neutro carregado"]);
  entrada.push(["Tensão", `${c.tensao} V`]);
  if (partida && partida.fator > 1) {
    entrada.push(["Partida", `${partida.label} (Ip ~ ${partida.fator}×In)`]);
  }
  // A string combinada (material + isolação + tipo de cabo + condutores por
  // fase) não cabe no orçamento de ~49mm de uma coluna de valor da ficha e
  // era truncada por ajustarLargura, perdendo o número de condutores por
  // fase — informação essencial num memorial de cabos. Por isso vai em duas
  // linhas.
  entrada.push(["Condutor", `${material} ${isolacaoLabel(preset)}`]);
  entrada.push([
    "Cabo",
    r.tipoCabo ? `${r.tipoCabo} — ${c.porFase}× por fase` : `${c.porFase}× por fase`,
  ]);

  // No caminho de erro, cableSizingPro devolve `detalhesTrechos` cru — sem o
  // `condutoLabel`, que só é montado no retorno de sucesso. Por isso a ficha
  // com erro não desenha a minitabela: não há o que desenhar.
  if (r.error) {
    s.ficha({
      titulo: c.tag,
      subtitulo: c.descricao || "",
      colunas: [entrada, []],
      destaque: { texto: r.error, cor: TEMA.erro },
    });
    return;
  }

  const resultado = [
    ["Ib", `${fmt(r.corrente, 1)} A${r.porFase > 1 ? ` (${fmt(r.correntePorCabo, 1)} A/cabo)` : ""}`],
  ];
  if (r.correntePartida != null) resultado.push(["Ip", `${fmt(r.correntePartida, 1)} A`]);
  resultado.push(
    ["Capacidade corrigida", `${fmt(r.capacidadeCorrigida, 1)} A`],
    ["Seção por capacidade", `${r.secaoCapacidade} mm²`],
    ["Por queda em regime", r.secaoQuedaRegime ? `${r.secaoQuedaRegime} mm²` : "não verificada"],
    ["Por queda na partida", r.secaoQuedaPartida ? `${r.secaoQuedaPartida} mm²` : "não verificada"],
    ["Critério dominante", CRITERIO_LABEL[r.criterio]]
  );
  if (r.quedaRegime != null) {
    resultado.push([`Queda regime (${fmt(r.comprimentoTotal, 0)}m)`, `${fmt(r.quedaRegime)}%`]);
  }
  if (r.quedaPartida != null) {
    resultado.push([`Queda partida (lim. ${fmt(c.quedaMaxPartida ?? 10, 1)}%)`, `${fmt(r.quedaPartida)}%`]);
  }

  s.ficha({
    titulo: c.tag,
    subtitulo: c.descricao || "",
    colunas: [entrada, resultado],
    trechos: {
      cols: COLS_TRECHO,
      linhas: r.detalhesTrechos.map((t, i) => [
        String(i + 1).padStart(2, "0"),
        t.condutoLabel,
        t.metodo,
        `${fmt(t.distancia, 0)} m`,
        fmt(t.fct),
        fmt(t.fca),
        fmt(t.iCorrigida, 1),
      ]),
    },
    destaque: {
      texto: `CABOS: ${designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}`,
      cor: TEMA.ok,
    },
  });
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
  s.nota(RESSALVAS);

  s.novaPagina({ orientation: "portrait" });
  s.secao("Detalhamento por circuito");
  circuitos.forEach((c, i) => fichaCircuito(s, c, resultados[i], preset));

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
  fichaCircuito(s, circuito, result, preset);
  s.nota(RESSALVAS);
  s.finalizar({
    rodape: rodapeNorma(preset),
    arquivo: nomeArquivo(circuito.tag, "circuito"),
  });
}
