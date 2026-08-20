// Geometria e resistência de cabos de média tensão, catálogo Prysmian Brasil.
//
// PROCEDÊNCIA — três origens diferentes neste arquivo, e elas não valem o mesmo:
//
//   CATÁLOGO (dado de produto, muda quando o fabricante muda a construção):
//     diâmetro nominal do condutor, diâmetro sobre a isolação, diâmetro nominal
//     externo e seção da blindagem. Fonte: Prysmian, cabo Eprotenax EPR 90 °C,
//     documento MV_002_02_PT_Eprotenax_EPR_90, tabelas "Cobre/Unipolar".
//     Cabo de 3,6/6 kV até 20/35 kV, EPR, cobertura PVC, conforme NBR 7286 e
//     NBR 14039.
//
//   NORMA (não é do fabricante; vale para qualquer cabo classe 2):
//     resistência elétrica em corrente contínua a 20 °C, da NBR NM 280
//     (IEC 60228). O catálogo publica os mesmos valores — duas fontes
//     independentes concordando.
//
//   NADA AQUI É PREMISSA. A reatância NÃO está neste arquivo: ela é calculada
//     em mtSizing.js pela fórmula da IEC 60287-1-1 a partir do diâmetro do
//     condutor e do espaçamento entre cabos. O que era premissa de 0,12 Ω/km
//     vira geometria de catálogo mais fórmula de norma.
//
// TRANSCRIÇÃO CONFERIDA, e a conferência achou defeito: o texto do PDF é
// desenhado por colunas, e duas tabelas vizinhas se misturam na leitura linear.
// A linha de 120 mm² do 15/25 kV veio com espessura 8,8 mm e diâmetro sobre
// isolação 31,7 mm, que são do cabo de 20/35 kV. Está registrada com
// `diametroSobreIsolacao: null` — o diâmetro externo (33,3 mm) foi confirmado
// pela progressão da espessura da cobertura, mas não se inventa aqui um valor
// que não foi lido.
//
// LIMITE DESTA TRANSCRIÇÃO: só cobre unipolar, e só as classes 8,7/15 kV e
// 15/25 kV. Faltam 3,6/6, 6/10, 12/20 e 20/35 kV, os cabos tripolares e os de
// alumínio. Quem consultar fora disso recebe null e o motor cai no valor
// informado pelo usuário — nunca num vizinho.

export const FABRICANTE = "Prysmian";
export const LINHA = "Eprotenax — EPR 90 °C";

// Fios de cobre nu, 6 mm², em TODAS as seções e classes do catálogo. Não
// acompanha a seção do condutor. O catálogo registra "outras seções de
// blindagem sob consulta" — ou seja, blindagem maior existe, mas é encomenda,
// não é o que chega por padrão. Nos cabos multipolares, 6 mm² por veia.
export const BLINDAGEM_PADRAO_MM2 = 6;

export const CLASSES_TENSAO_MT = [
  { id: "8,7/15 kV", label: "8,7/15 kV", espessuraIsolacao: 4.5 },
  { id: "15/25 kV", label: "15/25 kV", espessuraIsolacao: 6.8 },
];

// [diâmetro do condutor, diâmetro sobre a isolação, diâmetro externo] em mm.
// null no diâmetro sobre a isolação = não foi lido com segurança (ver acima).
export const EPROTENAX = {
  "8,7/15 kV": {
    documento: "Prysmian Eprotenax EPR 90 — MV_002_02_PT, tabela 8,7/15 kV (Cobre/Unipolar)",
    espessuraIsolacao: 4.5,
    cobre: {
      25: [5.9, 16.3, 21.1],
      35: [6.8, 17.2, 22.2],
      50: [8.1, 18.5, 23.5],
      70: [9.7, 20.1, 25.2],
      95: [11.3, 21.7, 26.8],
      120: [12.6, 23.0, 28.4],
      150: [14.1, 24.5, 29.9],
      185: [15.7, 26.1, 31.6],
      240: [18.0, 28.4, 34.1],
      300: [20.3, 30.7, 36.4],
      400: [22.7, 33.1, 39.0],
      500: [26.0, 36.4, 42.4],
      630: [29.8, 40.7, 47.0],
    },
  },
  "15/25 kV": {
    documento: "Prysmian Eprotenax EPR 90 — MV_002_02_PT, tabela 15/25 kV (Cobre/Unipolar)",
    espessuraIsolacao: 6.8,
    cobre: {
      50: [8.1, 23.2, 28.5],
      70: [9.7, 24.8, 30.1],
      95: [11.3, 26.4, 31.9],
      120: [12.6, null, 33.3], // linha contaminada na leitura — ver cabeçalho
      150: [14.1, 29.2, 34.9],
      185: [15.7, 30.8, 36.5],
      240: [18.0, 33.1, 39.0],
      300: [20.3, 35.4, 41.4],
      400: [22.7, 37.8, 44.0],
      500: [26.0, 41.1, 47.5],
      630: [29.8, 45.4, 52.0],
    },
  },
};

// Resistência em CC a 20 °C (Ω/km), condutor classe 2 — NBR NM 280 / IEC 60228.
// As seções de 25 a 630 mm² estão confirmadas pelo catálogo Prysmian, valor a
// valor. As demais vêm só da norma.
export const RESISTENCIA_CC_20 = {
  cobre: {
    10: 1.83, 16: 1.15, 25: 0.727, 35: 0.524, 50: 0.387, 70: 0.268, 95: 0.193,
    120: 0.153, 150: 0.124, 185: 0.0991, 240: 0.0754, 300: 0.0601, 400: 0.047,
    500: 0.0366, 630: 0.0283, 800: 0.0221, 1000: 0.0176,
  },
  aluminio: {
    10: 3.08, 16: 1.91, 25: 1.2, 35: 0.868, 50: 0.641, 70: 0.443, 95: 0.32,
    120: 0.253, 150: 0.206, 185: 0.164, 240: 0.125, 300: 0.1, 400: 0.0778,
    500: 0.0605, 630: 0.0469, 800: 0.0367, 1000: 0.0291,
  },
};

export function secoesDisponiveis(classe) {
  const bloco = EPROTENAX[classe]?.cobre;
  if (!bloco) return [];
  return Object.keys(bloco).map(Number).sort((a, b) => a - b);
}

// Geometria de um cabo do catálogo. Devolve null quando a combinação não foi
// transcrita — quem chama decide o que fazer, e o motor pede o dado ao usuário
// em vez de cair no cabo vizinho.
export function geometriaCabo({ classe, secao }) {
  const linha = EPROTENAX[classe]?.cobre?.[secao];
  if (!linha) return null;
  const [diametroCondutor, diametroSobreIsolacao, diametroExterno] = linha;
  return {
    classe,
    secao,
    diametroCondutor,
    diametroSobreIsolacao,
    diametroExterno,
    blindagem: BLINDAGEM_PADRAO_MM2,
    documento: EPROTENAX[classe].documento,
  };
}
