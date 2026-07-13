// Capacidade de condução de corrente (A) — NBR 5410 Tabela 37: condutores
// de COBRE, isolação EPR/XLPE 90°C (caso dos HEPR Corfio), temperatura
// ambiente 30°C. Valores por método de instalação e nº de condutores
// carregados (2 = circuito monofásico F+N; 3 = trifásico).
//
// ATENÇÃO: valores transcritos da tabela da norma (equivalente à IEC
// 60364-5-52, tabela B.52.4/B.52.5) — confira contra a NBR 5410 impressa
// antes de usar em projeto executivo.

export const METODOS_INSTALACAO = [
  { id: "B1", label: "B1 — condutores isolados em eletroduto na parede" },
  { id: "B2", label: "B2 — cabo multipolar em eletroduto na parede" },
  { id: "C", label: "C — cabos diretamente sobre parede ou teto" },
  { id: "D", label: "D — eletroduto enterrado no solo" },
  { id: "E", label: "E — cabos ao ar livre (bandeja, leito, suporte)" },
];

// { secao: [capacidade com 2 carregados, capacidade com 3 carregados] }
export const CAPACIDADE = {
  B1: {
    1.5: [23, 20],
    2.5: [31, 28],
    4: [42, 37],
    6: [54, 48],
    10: [75, 66],
    16: [100, 88],
    25: [133, 117],
    35: [164, 144],
    50: [198, 175],
    70: [253, 222],
    95: [306, 269],
    120: [354, 312],
    150: [407, 358],
    185: [464, 408],
    240: [546, 481],
    300: [628, 553],
  },
  B2: {
    1.5: [22, 19.5],
    2.5: [30, 26],
    4: [40, 35],
    6: [51, 44],
    10: [69, 60],
    16: [91, 80],
    25: [119, 105],
    35: [146, 128],
    50: [175, 154],
    70: [221, 194],
    95: [265, 233],
    120: [305, 268],
    150: [349, 300],
    185: [395, 340],
    240: [462, 398],
    300: [529, 455],
  },
  C: {
    1.5: [24, 22],
    2.5: [33, 30],
    4: [45, 40],
    6: [58, 52],
    10: [80, 71],
    16: [107, 96],
    25: [138, 119],
    35: [171, 147],
    50: [209, 179],
    70: [269, 229],
    95: [328, 278],
    120: [382, 322],
    150: [441, 371],
    185: [506, 424],
    240: [599, 500],
    300: [693, 576],
  },
  D: {
    1.5: [26, 22],
    2.5: [34, 29],
    4: [44, 37],
    6: [56, 46],
    10: [73, 61],
    16: [95, 79],
    25: [121, 101],
    35: [146, 122],
    50: [173, 144],
    70: [213, 178],
    95: [252, 211],
    120: [287, 240],
    150: [324, 271],
    185: [363, 304],
    240: [419, 351],
    300: [474, 396],
  },
  E: {
    1.5: [26, 23],
    2.5: [36, 32],
    4: [49, 42],
    6: [63, 54],
    10: [86, 75],
    16: [115, 100],
    25: [149, 127],
    35: [185, 158],
    50: [225, 192],
    70: [289, 246],
    95: [352, 298],
    120: [410, 346],
    150: [473, 399],
    185: [542, 456],
    240: [641, 538],
    300: [741, 621],
  },
};

export const SECOES = Object.keys(CAPACIDADE.B1)
  .map(Number)
  .sort((a, b) => a - b);

// Fator de correção de temperatura ambiente — NBR 5410 Tabela 40, coluna
// EPR/XLPE (referência 30°C).
export const FATOR_TEMPERATURA = {
  10: 1.15,
  15: 1.12,
  20: 1.08,
  25: 1.04,
  30: 1.0,
  35: 0.96,
  40: 0.91,
  45: 0.87,
  50: 0.82,
  55: 0.76,
  60: 0.71,
};

export const TEMPERATURAS = Object.keys(FATOR_TEMPERATURA).map(Number);
