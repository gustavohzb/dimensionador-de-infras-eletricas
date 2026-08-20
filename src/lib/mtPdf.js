// Memorial de cálculo de média tensão em PDF: resumo tabular em paisagem e uma
// ficha por circuito em retrato. A apresentação vem toda de pdfTema.js.
//
// O texto de média tensão é mais carregado de símbolo que o de baixa tensão —
// "Ω/km", "e/Dₑ", "θf" — e a fonte padrão do jsPDF é WinAnsi, que não tem
// nenhum dos três. Por isso TODO texto que entra no documento passa por
// textoSeguroPdf. O jsPDF não reclama de caractere sem glifo: ele desenha lixo
// e segue, então o defeito só apareceria no PDF pronto, na mão do cliente.

import { METODOS_MT } from "../data/cabosNBR14039";
import { CRITERIO_MT_LABEL, CRITERIO_MT_SIGLA, CRITERIO_MT_LEGENDA } from "../components/mt/criteriosMT";
import { TEMA, novoDocumento } from "./pdfTema";

const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d).replace(".", ","));

// Substituições de símbolo que a fonte não tem. Cada uma vira texto legível,
// não some: um memorial que diz "0,1326 /km" é pior que um que diz "ohm/km".
const TROCAS = [
  [/Ω/g, "ohm"],
  [/√\(([^)]*)\)/g, "raiz($1)"],
  [/√(\w+)/g, "raiz($1)"],
  [/√/g, "raiz"],
  [/≥/g, ">="],
  [/≤/g, "<="],
  [/→/g, "->"],
  [/Δ/g, "delta-"],
  [/ρ/g, "rho"],
  [/θ/g, "teta-"],
  [/ₑ/g, "e"],
  [/₀/g, "0"],
  [/₁/g, "1"],
  [/₂/g, "2"],
];

export function sanitizarWinAnsi(texto) {
  if (texto == null) return "";
  let t = String(texto);
  for (const [de, para] of TROCAS) t = t.replace(de, para);
  return t;
}

// Rede final: depois das trocas conhecidas, o que ainda estiver fora do WinAnsi
// vira "?" em vez de virar um glifo aleatório. Aparecer um "?" no memorial é um
// defeito visível, que alguém reporta; um caractere trocado passa despercebido.
const ESPECIAIS_CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function textoSeguroPdf(texto) {
  return [...sanitizarWinAnsi(texto)]
    .map((ch) => {
      const c = ch.codePointAt(0);
      const ok = (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || ESPECIAIS_CP1252.includes(ch);
      return ok ? ch : "?";
    })
    .join("");
}

export const RESSALVAS_MT =
  "Capacidade de condução das Tabelas 28 e 29 da NBR 14039, que valem para todas as classes de tensão (6.2.5) — a classe entra apenas na designação do cabo. Os fatores de correção das Tabelas 32 a 41 têm nota da própria norma indicando desvio de até 15% em relação ao cálculo pelas IEC 60287-1-1 e 60287-2-1. A blindagem padrão do cabo é de 6 mm² em qualquer seção de condutor; blindagem maior é encomenda. Este memorial não substitui a coordenação com a proteção nem o estudo de curto-circuito da instalação.";

export function rodapeMT(preset) {
  const isol = Number(preset?.isolacao) === 105 ? "EPR 105 °C" : "EPR/XLPE 90 °C";
  const material = preset?.material === "aluminio" ? "alumínio" : "cobre";
  return textoSeguroPdf(`NBR 14039:2021 (Tabelas 28 a 44) · condutor de ${material}, isolação ${isol}`);
}

const metodosDoCircuito = (c) =>
  [...new Set((c.trechos ?? []).map((t) => t.metodo))].join(", ") || "—";

const cargaLabel = (c) =>
  c.modo === "corrente" ? `${fmt(c.corrente, 1)} A` : `${fmt(c.potenciaKVA, 0)} kVA`;

// Uma linha do resumo. Circuito recusado continua aparecendo: sumir daria a
// entender que o quadro está inteiro dimensionado.
export function linhaResumoMT(circuito, resultado) {
  const base = [
    circuito.tag,
    circuito.descricao || "—",
    cargaLabel(circuito),
    `${fmt(circuito.tensao, 1)} kV`,
    metodosDoCircuito(circuito),
  ];
  if (resultado.error) {
    return [...base, "não calculado", "—", "—", "—"].map(textoSeguroPdf);
  }
  return [
    ...base,
    `${resultado.secaoFinal} mm²`,
    CRITERIO_MT_SIGLA[resultado.criterio] ?? "—",
    `${fmt(resultado.quedaRegime)} %`,
    `${resultado.blindagem.secaoEspecificada} mm²`,
  ].map(textoSeguroPdf);
}

const COLS_RESUMO = [
  { w: 24, label: "TAG" },
  { w: 52, label: "Descrição" },
  { w: 22, label: "Carga", align: "right" },
  { w: 20, label: "Tensão", align: "right" },
  { w: 26, label: "Método" },
  { w: 24, label: "Seção", align: "right" },
  { w: 16, label: "Crit." },
  { w: 20, label: "Queda", align: "right" },
  { w: 24, label: "Blindagem", align: "right" },
];

// Colunas da minitabela de trechos dentro da ficha (retrato, 186 mm úteis
// menos 6 mm de recuo).
const COLS_TRECHO = [
  { w: 10, label: "Nº" },
  { w: 18, label: "Método" },
  { w: 18, label: "Temp.", align: "right" },
  { w: 18, label: "Dist.", align: "right" },
  { w: 20, label: "Iz tab.", align: "right" },
  { w: 16, label: "F.temp", align: "right" },
  { w: 16, label: "F.agr", align: "right" },
  { w: 22, label: "F.solo", align: "right" },
  { w: 24, label: "Iz corr.", align: "right" },
];

function fichaCircuitoMT(s, c, r, preset) {
  const metodoLabel = (id) => METODOS_MT.find((m) => m.id === id)?.label ?? id;

  const entrada = [
    ["Carga", cargaLabel(c)],
    ["Tensão de operação", `${fmt(c.tensao, 1)} kV`],
    ["Formação", c.formacao === "tripolar" ? "Cabo tripolar" : "Unipolares em trifólio"],
    ["Classe de tensão", preset.classeTensao],
    ["Cobertura", preset.cobertura],
    ["Icc trifásico", `${fmt(c.iccTrifasico, 1)} kA`],
    ["Tempo de atuação", `${fmt(c.tempoCurto, 2)} s`],
  ];

  if (r.error) {
    s.ficha({
      titulo: textoSeguroPdf(c.tag),
      subtitulo: textoSeguroPdf(c.descricao || ""),
      colunas: [entrada.map(([a, b]) => [a, textoSeguroPdf(b)]), [["Situação", "não calculado"]]],
      destaque: { cor: TEMA.erro, texto: textoSeguroPdf(r.error) },
    });
    return;
  }

  const saida = [
    ["Por capacidade", `${r.secaoCapacidade} mm²`],
    ["Por queda de tensão", r.secaoQuedaRegime ? `${r.secaoQuedaRegime} mm²` : "—"],
    ["Por curto no condutor", `${r.secaoCurtoCondutor} mm²`],
    ["Critério determinante", CRITERIO_MT_LABEL[r.criterio]],
    ["Queda de tensão", `${fmt(r.quedaRegime)} % em ${r.comprimentoTotal} m`],
    ["Resistência / reatância", `${fmt(r.resistenciaUsada, 4)} / ${fmt(r.reatanciaUsada, 4)} ohm/km`],
    ["Blindagem exigida", `${fmt(r.blindagem.secaoMinima, 1)} mm² (falta ${fmt(r.blindagem.correnteFalta, 0)} A)`],
  ];

  s.ficha({
    titulo: textoSeguroPdf(c.tag),
    subtitulo: textoSeguroPdf(c.descricao || ""),
    colunas: [
      entrada.map(([a, b]) => [a, textoSeguroPdf(b)]),
      saida.map(([a, b]) => [a, textoSeguroPdf(b)]),
    ],
    trechos: {
      cols: COLS_TRECHO,
      linhas: r.trechos.map((t, i) => [
        String(i + 1),
        t.metodo,
        `${t.temperatura} °C`,
        `${t.distancia} m`,
        t.capacidadeNominal == null ? "—" : `${t.capacidadeNominal} A`,
        fmt(t.fatorTemperatura),
        fmt(t.fatorAgrupamento),
        t.correcaoSoloAplicavel ? `${fmt(t.fatorResistividade)}×${fmt(t.fatorProfundidade)}` : "n/a",
        `${fmt(t.capacidadeCorrigida, 1)} A`,
      ].map(textoSeguroPdf)),
    },
    destaque: { cor: TEMA.copper, texto: textoSeguroPdf(r.designacao) },
  });

  // A procedência é o que separa, no memorial, o que a norma manda do que o
  // projetista arbitrou. Sem isso o leitor não tem como auditar o cálculo.
  for (const p of r.procedencias) {
    s.nota(textoSeguroPdf(`[${p.tipo}] ${p.texto}`));
  }

  // Método por extenso depois da ficha: na minitabela só cabe a sigla, e "F1"
  // sozinho não diz a ninguém que o cabo está em eletroduto enterrado.
  for (const id of [...new Set(r.trechos.map((t) => t.metodo))]) {
    s.nota(textoSeguroPdf(`Método ${id}: ${metodoLabel(id)}.`));
  }
}

function agora() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}

const nomeArquivo = (base) =>
  `memorial-mt-${(base || "projeto").replace(/[^\w\dÀ-ÿ -]+/g, "").trim() || "projeto"}.pdf`;

// Montagem do documento, separada da criação dele. O corte existe para o teste
// poder passar um documento falso e varrer TODO texto que chega ao papel — que
// é a única forma de garantir que nenhum "Ω" escapou. Instanciar um jsPDF de
// verdade exigiria DOM e canvas por causa do emblema.
export function montarMemorialMT(s, { circuitos, resultados, preset }) {
  s.secao("Premissas do projeto");
  s.par("Norma", "ABNT NBR 14039:2021");
  s.par("Condutor", textoSeguroPdf(`${preset.material === "aluminio" ? "Alumínio" : "Cobre"} — isolação ${preset.isolacao} °C`));
  s.par("Classe de tensão do cabo", textoSeguroPdf(preset.classeTensao));
  s.par("Cobertura", textoSeguroPdf(`${preset.cobertura} (Tabela 44)`));
  s.par("Queda de tensão máxima", `${fmt(preset.quedaMaxRegime, 1)} % (critério do projetista)`);
  s.par("Fator de potência", fmt(preset.fp));
  s.par("Aterramento do neutro", textoSeguroPdf(preset.aterramentoNeutro === "solido"
    ? "Solidamente aterrado"
    : preset.aterramentoNeutro === "resistor"
      ? `Por resistor — ${fmt(preset.correnteFalta, 0)} A`
      : `Isolado — ${fmt(preset.correnteFalta, 0)} A capacitivos`));
  s.par("Emitido em", agora());

  s.secao("Resumo dos circuitos");
  s.tabela({
    cols: COLS_RESUMO,
    linhas: circuitos.map((c, i) => linhaResumoMT(c, resultados[i])),
  });
  s.nota(textoSeguroPdf(`${CRITERIO_MT_LEGENDA}.`));
  s.nota(RESSALVAS_MT);

  s.novaPagina({ orientation: "portrait" });
  s.secao("Detalhamento por circuito");
  circuitos.forEach((c, i) => fichaCircuitoMT(s, c, resultados[i], preset));
}

export async function exportMemorialMT({ projectName, circuitos, resultados, preset }) {
  const s = await novoDocumento({
    orientation: "landscape",
    titulo: "Memorial de cálculo — cabos de média tensão",
    subtitulo: textoSeguroPdf(projectName || ""),
  });
  montarMemorialMT(s, { projectName, circuitos, resultados, preset });
  s.finalizar({ rodape: rodapeMT(preset), arquivo: nomeArquivo(projectName) });
}
