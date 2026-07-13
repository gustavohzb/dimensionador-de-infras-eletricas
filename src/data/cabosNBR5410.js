// Dados para dimensionamento completo de cabos conforme NBR 5410, seguindo a
// estrutura da planilha "Dimensionamento de Cabos V1.0.1" (condutos, esquemas
// de condutores carregados, formas de partida, múltiplos trechos).
//
// Ampacidade: Tabela 37 (métodos B1, B2, C, D) e Tabela 39 (métodos E, F, G)
// da ABNT NBR 5410:2004 — cobre e alumínio, isolação EPR/XLPE 90°C.
// Valores conferidos contra a norma.

import { CAPACIDADE as CAPACIDADE_CU_37 } from "./nbr5410Ampacidade";

// ---------------------------------------------------------------------------
// Ampacidade (A). Formato por método:
//   B1/B2/C/D/E → { secao: [2 carregados, 3 carregados] }
//   F (unipolares em leito/perfilado, contíguos) →
//     { secao: [2 justapostos, 3 em trifólio, 3 no mesmo plano justapostos] }
//   G (unipolares espaçados ≥ 1 diâmetro) → { secao: [horizontal, vertical] }
// ---------------------------------------------------------------------------
const F_CU = {
  1.5: [27, 21, 22], 2.5: [37, 29, 30], 4: [50, 40, 42], 6: [65, 53, 55],
  10: [90, 74, 77], 16: [121, 101, 105], 25: [161, 135, 141], 35: [200, 169, 176],
  50: [242, 207, 216], 70: [310, 268, 279], 95: [377, 328, 342], 120: [437, 383, 400],
  150: [504, 444, 464], 185: [575, 510, 533], 240: [679, 607, 634], 300: [783, 703, 736],
};
const G_CU = {
  1.5: [30, 25], 2.5: [41, 35], 4: [56, 48], 6: [73, 63], 10: [101, 88],
  16: [137, 120], 25: [182, 161], 35: [226, 201], 50: [275, 246], 70: [353, 318],
  95: [430, 389], 120: [500, 454], 150: [577, 527], 185: [661, 605],
  240: [781, 719], 300: [902, 833],
};

// Alumínio — Tabelas 37 e 39 (seções a partir de 16mm²).
const AL_37 = {
  B1: {
    16: [79, 71], 25: [105, 93], 35: [130, 116], 50: [157, 140], 70: [200, 179],
    95: [242, 217], 120: [281, 251], 150: [323, 289], 185: [368, 330],
    240: [433, 389], 300: [499, 447],
  },
  B2: {
    16: [72, 64], 25: [94, 84], 35: [115, 103], 50: [138, 124], 70: [175, 156],
    95: [210, 188], 120: [242, 216], 150: [277, 248], 185: [314, 281],
    240: [368, 329], 300: [421, 377],
  },
  C: {
    16: [84, 76], 25: [101, 90], 35: [126, 112], 50: [154, 136], 70: [198, 174],
    95: [241, 211], 120: [280, 245], 150: [324, 283], 185: [371, 323],
    240: [439, 382], 300: [508, 440],
  },
  D: {
    16: [73, 61], 25: [93, 78], 35: [112, 94], 50: [132, 112], 70: [163, 138],
    95: [193, 164], 120: [220, 186], 150: [249, 210], 185: [279, 236],
    240: [322, 272], 300: [364, 308],
  },
  E: {
    16: [91, 77], 25: [108, 97], 35: [135, 120], 50: [164, 146], 70: [211, 187],
    95: [257, 227], 120: [300, 263], 150: [346, 304], 185: [397, 347],
    240: [470, 409], 300: [543, 471],
  },
};
const F_AL = {
  16: [90, 76, 79], 25: [121, 103, 107], 35: [150, 129, 135], 50: [184, 159, 165],
  70: [237, 206, 215], 95: [289, 253, 264], 120: [337, 296, 308],
  150: [389, 343, 358], 185: [447, 395, 413], 240: [530, 471, 492], 300: [613, 547, 571],
};
const G_AL = {
  16: [103, 90], 25: [138, 122], 35: [172, 153], 50: [210, 188], 70: [271, 244],
  95: [332, 300], 120: [387, 351], 150: [448, 408], 185: [515, 470],
  240: [611, 561], 300: [708, 652],
};

export const TABELAS = {
  cobre: { ...CAPACIDADE_CU_37, F: F_CU, G: G_CU },
  aluminio: { ...AL_37, F: F_AL, G: G_AL },
};

export const SECOES = Object.keys(CAPACIDADE_CU_37.B1)
  .map(Number)
  .sort((a, b) => a - b);

// ---------------------------------------------------------------------------
// Condutos (como na planilha) → método de referência da NBR 5410 por tipo de
// cabo, e contexto de agrupamento.
// ---------------------------------------------------------------------------
export const CONDUTOS = [
  { id: "leito", label: "Leito", uni: "F", multi: "E", agrupamento: "leito", subterraneo: false },
  { id: "eletrocalha", label: "Eletrocalha", uni: "B1", multi: "B2", agrupamento: "feixe", subterraneo: false },
  { id: "eletroduto", label: "Eletroduto", uni: "B1", multi: "B2", agrupamento: "feixe", subterraneo: false },
  { id: "perfilado", label: "Perfilado", uni: "F", multi: "E", agrupamento: "perfilado", subterraneo: false },
  { id: "canaletaEmb", label: "Canaleta embutida", uni: "B1", multi: "B2", agrupamento: "feixe", subterraneo: false },
  { id: "dutoSubt", label: "Duto subterrâneo", uni: "D", multi: "D", agrupamento: "dutos", subterraneo: true },
  { id: "canaletaSubt", label: "Canaleta subterrânea", uni: "D", multi: "D", agrupamento: "dutos", subterraneo: true },
];

// Distribuição dos condutores dentro do conduto (afeta a coluna de ampacidade
// nos métodos F/G e o fator de agrupamento nos dutos subterrâneos).
export const DISTRIBUICOES = {
  // leito/perfilado com cabos unipolares
  camadaUnica: [
    { id: "trifJust", label: "Trifólio justaposto" },
    { id: "contJust", label: "Contíguo justaposto" },
    { id: "trifEsp", label: "Trifólio espaçado ≥ 2×diâm." },
    { id: "contEsp", label: "Contíguo espaçado ≥ 2×diâm." },
  ],
  dutos: [
    { id: "variosPorDuto", label: "Vários circuitos por duto" },
    { id: "dutosProximos", label: "1 circ./duto — dutos próximos" },
    { id: "dutosEsp025", label: "1 circ./duto — espaçados 0,25m" },
    { id: "dutosEsp05", label: "1 circ./duto — espaçados 0,5m" },
  ],
};

// ---------------------------------------------------------------------------
// Fatores de agrupamento por contexto (índice = nº de circuitos − 1).
// feixe: NBR 5410 Tab. 42; leito/perfilado + camadas: Tab. 42 camada única e
// múltiplas camadas; dutos: Tab. 45.
// ---------------------------------------------------------------------------
export const AGRUPAMENTO = {
  feixe: [1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5, 0.5, 0.5, 0.45, 0.45, 0.45, 0.45, 0.41, 0.41, 0.41, 0.41, 0.38],
  leito1: [1, 0.87, 0.82, 0.8, 0.8, 0.79, 0.79, 0.78, 0.78, 0.78, 0.78, 0.78],
  perfilado1: [1, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72, 0.72, 0.72, 0.72],
  camadas2: [1, 0.68, 0.62, 0.6, 0.6, 0.58, 0.58, 0.58, 0.56, 0.56, 0.56, 0.56],
  camadas3: [1, 0.62, 0.57, 0.55, 0.55, 0.53, 0.53, 0.53, 0.51, 0.51, 0.51, 0.51],
  variosPorDuto: [1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5, 0.5, 0.5, 0.45, 0.45, 0.45, 0.45, 0.41, 0.41, 0.41, 0.41, 0.38],
  dutosProximos: [1, 0.85, 0.75, 0.7, 0.65, 0.6, 0.55, 0.55, 0.55, 0.55, 0.55],
  dutosEsp025: [1, 0.9, 0.85, 0.8, 0.8, 0.8, 0.75, 0.75, 0.75, 0.75, 0.75],
  dutosEsp05: [1, 0.95, 0.9, 0.85, 0.85, 0.8, 0.75, 0.75, 0.75, 0.75, 0.75],
};

export function fatorAgrupamento(contexto, circuitos) {
  const tabela = AGRUPAMENTO[contexto];
  if (!tabela) return 1;
  const n = Math.max(1, Math.round(circuitos || 1));
  return tabela[Math.min(n, tabela.length) - 1];
}

// ---------------------------------------------------------------------------
// Fator de temperatura — NBR 5410 Tabela 40, coluna EPR/XLPE.
// Referência: 30°C no ar, 20°C no solo (métodos subterrâneos).
// ---------------------------------------------------------------------------
export const FATOR_TEMP_AMBIENTE = {
  10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91,
  45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.5, 80: 0.41,
};
export const FATOR_TEMP_SOLO = {
  10: 1.07, 15: 1.04, 20: 1.0, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85,
  45: 0.8, 50: 0.76, 55: 0.71, 60: 0.65, 65: 0.6, 70: 0.53, 75: 0.46, 80: 0.38,
};

export function fatorTemperatura(tempC, subterraneo) {
  const tab = subterraneo ? FATOR_TEMP_SOLO : FATOR_TEMP_AMBIENTE;
  return tab[tempC] ?? null;
}

// ---------------------------------------------------------------------------
// Esquemas de condutores carregados (como na planilha).
// carregados: coluna da tabela de ampacidade (2 ou 3 condutores).
// kQueda: 2 no mono/bifásico (ida+volta), √3 no trifásico.
// harmonicas: neutro conta como carregado → fator 0,86 (Tab. 46) e neutro
// com a mesma seção da fase.
// ---------------------------------------------------------------------------
export const ESQUEMAS = [
  { id: "monofSt", label: "Monof. - s/ Terra", fases: 1, carregados: 2, kQueda: 2, neutro: true, terra: false, harmonicas: false },
  { id: "monofCt", label: "Monof. - c/ Terra", fases: 1, carregados: 2, kQueda: 2, neutro: true, terra: true, harmonicas: false },
  { id: "bifSnSt", label: "Bif. - s/ Neutro - s/ Terra", fases: 2, carregados: 2, kQueda: 2, neutro: false, terra: false, harmonicas: false },
  { id: "bifSnCt", label: "Bif. - s/ Neutro - c/ Terra", fases: 2, carregados: 2, kQueda: 2, neutro: false, terra: true, harmonicas: false },
  { id: "bifCnSt", label: "Bif. - c/ Neutro - s/ Terra", fases: 2, carregados: 3, kQueda: 2, neutro: true, terra: false, harmonicas: false },
  { id: "bifCnCt", label: "Bif. - c/ Neutro - c/ Terra", fases: 2, carregados: 3, kQueda: 2, neutro: true, terra: true, harmonicas: false },
  { id: "trifSnSt", label: "Trif. - s/ Neutro - s/ Terra", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: false, terra: false, harmonicas: false },
  { id: "trifSnCt", label: "Trif. - s/ Neutro - c/ Terra", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: false, terra: true, harmonicas: false },
  { id: "trifCnSt", label: "Trif. - c/ Neutro - s/ Terra", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: true, terra: false, harmonicas: false },
  { id: "trifCnCt", label: "Trif. - c/ Neutro - c/ Terra", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: true, terra: true, harmonicas: false },
  { id: "trifCnStH", label: "Trif. - c/ Neutro - s/ Terra (Harm. >15%)", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: true, terra: false, harmonicas: true },
  { id: "trifCnCtH", label: "Trif. - c/ Neutro - c/ Terra (Harm. >15%)", fases: 3, carregados: 3, kQueda: Math.sqrt(3), neutro: true, terra: true, harmonicas: true },
];

// ---------------------------------------------------------------------------
// Formas de partida de motor (fator × corrente nominal, como na planilha).
// ---------------------------------------------------------------------------
export const FORMAS_PARTIDA = [
  { id: "nenhuma", label: "Não é motor / alimentação direta", fator: 1 },
  { id: "PD1", label: "Direta com carga", fator: 6 },
  { id: "PD2", label: "Direta sem carga", fator: 3 },
  { id: "CP1", label: "Compensada 80% com carga", fator: 3.84 },
  { id: "CP2", label: "Compensada 80% sem carga", fator: 1.92 },
  { id: "SS1", label: "Soft-starter com carga", fator: 3 },
  { id: "SS2", label: "Soft-starter sem carga", fator: 1.5 },
];

// ---------------------------------------------------------------------------
// Neutro reduzido (Tab. 48) e condutor de proteção (Tab. 58).
// ---------------------------------------------------------------------------
export const NEUTRO_REDUZIDO = {
  35: 25, 50: 25, 70: 35, 95: 50, 120: 70, 150: 70, 185: 95, 240: 120, 300: 150,
};
export const PROTECAO = {
  25: 16, 35: 16, 50: 25, 70: 35, 95: 50, 120: 70, 150: 70, 185: 95, 240: 120, 300: 150,
};

export function secaoNeutro(secaoFase, harmonicas) {
  if (harmonicas) return secaoFase;
  return NEUTRO_REDUZIDO[secaoFase] ?? secaoFase;
}
export function secaoProtecao(secaoFase) {
  return PROTECAO[secaoFase] ?? secaoFase;
}

// Seção mínima do alumínio conforme NBR 5410 (16mm² em geral).
export const SECAO_MINIMA_MATERIAL = { cobre: 1.5, aluminio: 16 };
