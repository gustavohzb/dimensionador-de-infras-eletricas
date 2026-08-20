// Formato do circuito de média tensão e migração do que está salvo.
//
// Nasce junto com a aba, e não depois dela como na de baixa tensão: lá a
// normalização veio quando já havia projeto salvo em formato antigo, e até
// chegar reabrir um projeto podia produzir cabo subdimensionado.
//
// O que é dado do projeto e o que é dado do circuito está separado de
// propósito. O tempo de atuação da proteção e o Icc trifásico ficam no
// CIRCUITO porque cada alimentador tem seu cubículo, seu relé e seu ponto de
// falta. O aterramento do neutro fica no PRESET porque é propriedade da fonte,
// não do alimentador. Misturar as duas coisas foi o defeito de desenho da
// funcionalidade de proteção que abortamos.

import { comDefaults, ehObjeto } from "./comDefaults";

// Método de referência do trecho. F1 (eletrodutos enterrados) é o caso mais
// comum de ramal de entrada e, principalmente, é um método que a norma
// classifica como enterrado — abrir a aba em C ou D deixaria o cálculo travado
// esperando uma decisão que o usuário ainda não sabe que precisa tomar.
export const defaultTrechoMT = () => ({
  metodo: "F1",
  temperatura: 30, // ambiente ou do solo, conforme o método (Tabelas 30 e 31)
  // Só usado em C e D, onde a norma não diz se a referência é 20 °C ou 30 °C.
  // Nasce nulo: quem decide é o projetista, na tela, e a escolha vai ao
  // memorial. Ver METODOS_REFERENCIA_AMBIGUA em cabosNBR14039.js.
  referenciaTemp: null, // null | "aoAr" | "enterrado"
  distancia: 50, // m
  // Agrupamento. `agrupado: false` é circuito isolado — a norma só tabela
  // grupos, e um grupo sozinho não sofre influência térmica de vizinho.
  agrupado: false,
  arranjo: null, // A1
  espacamentoRelativo: null, // A1: e/Dₑ
  dutos: null, // F1, F2, G1, G2
  espacamento: null, // F1 e G1: mm entre centros, ou "encostados" (F1)
  condutoresIsolados: null, // H
  regime: null, // I: "doisDe" | "mm200"
  cabos: null, // I
  // Condições de referência das Tabelas 32 e 33 — fator 1,00.
  resistividadeSolo: 2.5, // K·m/W
  profundidade: 0.9, // m
});

// Campos que a tabela de agrupamento de cada método consome. É o que torna o
// formulário de trecho condicional ao método: mostrar só isto evita pedir dado
// que não será usado e evita montar combinação que não tem tabela.
// Os seis métodos ausentes (A2, B1, B2, C, D, E) não têm tabela de agrupamento
// em lugar nenhum da norma — estão em METODOS_SEM_AGRUPAMENTO.
export const CAMPOS_AGRUPAMENTO = {
  A1: ["arranjo", "espacamentoRelativo"],
  F1: ["dutos", "espacamento"],
  F2: ["dutos"],
  G1: ["dutos", "espacamento"],
  G2: ["dutos"],
  H: ["condutoresIsolados"],
  I: ["regime", "cabos"],
};

// Parâmetros do projeto, válidos para todos os circuitos.
export const defaultPresetMT = () => ({
  nomeProjeto: "", // vai ao cabeçalho e ao nome do arquivo do memorial
  material: "cobre", // "cobre" | "aluminio"
  isolacao: 90, // 90 → XLPE/TR XLPE/EPR/HEPR | 105 → EPR 105
  cobertura: "ST2", // material da cobertura — define a temperatura final da blindagem (Tab. 44)
  classeTensao: "8,7/15 kV", // só entra na designação do cabo, nunca no cálculo (6.2.5)
  fp: 0.92,
  // CONVENÇÃO DO PROJETISTA, não da norma: a NBR 14039 não fixa limite de
  // queda de tensão como a NBR 5410 fixa 4 %. Fica editável e sai no memorial
  // identificado como critério adotado.
  quedaMaxRegime: 3, // %
  // RESERVA, não é o caminho normal: quando o cabo está no catálogo, a
  // reatância é calculada da geometria dele pela IEC 60287-1-1 e este campo é
  // ignorado. Só vale para classe ou seção fora do catálogo transcrito, e aí o
  // motor marca o valor como premissa no memorial.
  reatancia: 0.12, // Ω/km
  // Fonte da corrente de falta fase-terra do critério de curto na blindagem.
  aterramentoNeutro: "resistor", // "solido" | "resistor" | "isolado"
  correnteFalta: 400, // A — limite do resistor, ou capacitiva no sistema isolado
});

export const defaultCircuitoMT = () => ({
  tag: "AL-MT-01",
  descricao: "",
  // Formação do cabo. Fica no circuito e não no trecho porque um circuito não
  // troca de cabo no meio do caminho: decide a tabela de agrupamento (34 para
  // unipolares em trifólio, 35 para tripolares) e entra na designação.
  formacao: "unipolar", // "unipolar" | "tripolar"
  modo: "potencia", // "potencia" (kVA do transformador) | "corrente"
  potenciaKVA: 1000,
  corrente: 100, // A, quando modo === "corrente"
  tensao: 13.8, // kV, tensão de linha
  tempoCurto: 0.5, // s — atuação da proteção deste circuito
  iccTrifasico: 10, // kA — no ponto deste circuito, dado da concessionária
  conexaoSoldada: false, // limita a temperatura final a 160 °C (Tab. 43, rodapé)
  // Não afeta a ampacidade: a norma declara em 6.2.5 que os valores tabelados
  // valem para um ponto, dois ou mais, ou cross-bonding. Fica aqui porque entra
  // no memorial e na especificação do cabo.
  aterramentoBlindagem: "umPonto", // "umPonto" | "doisPontos" | "crossBonding"
  // Seção da blindagem que o projeto especifica (mm²). O padrão do catálogo é
  // 6 mm² em qualquer seção de condutor; blindagem maior existe sob consulta.
  blindagemEspecificada: 6,
  // Distância entre eixos dos cabos (mm). Nulo = trifólio encostado, e aí a
  // distância é o próprio diâmetro externo do cabo.
  espacamentoCabos: null,
  trechos: [defaultTrechoMT()],
});

export function normalizarTrechoMT(salvo) {
  return comDefaults(defaultTrechoMT(), salvo);
}

export function normalizarCircuitoMT(salvo) {
  const circuito = comDefaults(defaultCircuitoMT(), salvo);
  const salvos = Array.isArray(salvo?.trechos) ? salvo.trechos : [];
  // Um circuito sem trecho nenhum não é representável na tela, que sempre
  // mostra ao menos um.
  const lista = salvos.length ? salvos : [null];
  circuito.trechos = lista.map(normalizarTrechoMT);
  return circuito;
}

// Entradas que não são objeto são descartadas em vez de virarem um circuito
// padrão: inventar um alimentador de 1000 kVA que ninguém lançou é pior que
// perder um registro já ilegível.
export function normalizarCircuitosMT(salvos) {
  if (!Array.isArray(salvos)) return [];
  return salvos.filter(ehObjeto).map(normalizarCircuitoMT);
}

export function normalizarProjetoMT(salvo) {
  return {
    preset: comDefaults(defaultPresetMT(), salvo?.preset),
    circuitos: normalizarCircuitosMT(salvo?.circuitos),
  };
}
