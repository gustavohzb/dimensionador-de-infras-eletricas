// Dados de dimensionamento de cabos de média tensão — ABNT NBR 14039:2021
// (terceira edição, 03.12.2021), "Instalações elétricas de média tensão de
// 1,0 kV a 36,2 kV".
//
// PROCEDÊNCIA (o que é o quê):
//   - Norma: todos os valores deste arquivo são transcritos da NBR 14039:2021,
//     com a tabela e a página indicadas em cada bloco.
//   - Norma de origem: a própria 14039 declara (6.2.5) que os valores tabelados
//     foram calculados conforme IEC 60287-1-1, 60287-2-1 e 60287-2-2.
//   - Convenção: nenhuma. Não há valor de projeto arbitrado neste arquivo.
//   - Premissa embutida na norma: fator de carga de 100 %. Para fator menor, a
//     própria norma remete à IEC 60853-1 — caso que este arquivo não cobre.
//
// LIMITAÇÕES DECLARADAS PELA NORMA (6.2.5):
//   - Não há tabela para cabo isolado em PVC ou polietileno termoplástico nas
//     classes 1,8/3 kV e 3,6/6 kV, nem para cabo nu de linha aérea. Para esses
//     a norma remete à IEC 60287 / ABNT NBR 11301, ou à IEEE Std 738 (cabo nu).
//   - Um único valor foi tabelado para TODAS as classes de tensão, adotando-se
//     o menor. Por isso não existe eixo de classe de tensão aqui: a classe entra
//     na designação do cabo, não no cálculo.
//   - O mesmo vale para o aterramento da blindagem: os valores valem para
//     blindagem aterrada em um ponto, em dois ou mais, ou em cross-bonding.
//     O aterramento importa para o curto na blindagem, não para a ampacidade.
//   - Os valores são mínimos; a norma recomenda o cálculo pela IEC 60287 quando
//     se quer precisão, e avisa que o tabelado pode ser até 26 % menor que o
//     calculado para a instalação específica (6.2.5.1.1).

// Métodos de referência (6.2.5.1). A ordem desta lista é a ordem das colunas
// nas tabelas de ampacidade abaixo — não reordenar sem reordenar os dados.
// `enterrado` decide a temperatura ambiente de referência (6.2.5.3.2: 20 °C
// para linhas enterradas, 30 °C "para as demais maneiras de instalar") e, com
// isso, qual tabela de correção de temperatura se aplica.
//
// C e D (canaleta fechada no solo) ficam com `enterrado: null` — AMBÍGUO, de
// propósito. A norma não resolve, e foi conferido:
//   - a Tabela 25 (6.2.2) só mapeia tipo de instalação → método de referência,
//     sem classificar nada como enterrado;
//   - 6.2.5.3.2 diz apenas "linhas enterradas" contra "as demais maneiras de
//     instalar", sem enumerar métodos;
//   - a favor de NÃO enterrado: 6.2.5.1.2 descreve a canaleta como exposta ao
//     sol, condição que só a Tabela 30 tem coluna para expressar;
//   - a favor de ENTERRADO: o título da Tabela 31 é "para linhas subterrâneas",
//     e canaleta fechada no solo é, em leitura direta, subterrânea.
//
// A exclusão de C e D das Tabelas 32 e 33 NÃO é argumento para nenhum dos dois
// lados: aquelas correções tratam de resistividade do solo e profundidade de
// enterramento, que não se aplicam a cabo dentro de canaleta com ar, qualquer
// que seja a tabela de temperatura.
//
// Por que não escolher um default: a diferença troca de sinal. A 30 °C a
// Tabela 30 (exposto) dá 1,00 contra 0,93 da Tabela 31 — 7 % a mais de
// ampacidade, ou seja, cabo menor; acima de cerca de 38 °C o sinal se inverte.
// Na faixa usual de projeto no Brasil, adotar a Tabela 30 subdimensiona. Num
// app de dimensionamento, escolher calado o lado que subdimensiona é pior que
// exigir do usuário uma decisão que a norma deixou em aberto.
export const METODOS_MT = [
  { id: "A1", label: "Unipolares justapostos ou tripolar, ao ar livre, abrigado do sol", enterrado: false, sol: false },
  { id: "A2", label: "Unipolares justapostos ou tripolar, ao ar livre, exposto ao sol", enterrado: false, sol: true },
  { id: "B1", label: "Unipolares espaçados ao ar livre, abrigados do sol", enterrado: false, sol: false },
  { id: "B2", label: "Unipolares espaçados ao ar livre, expostos ao sol", enterrado: false, sol: true },
  { id: "C", label: "Unipolares justapostos ou tripolar, em canaleta fechada no solo", enterrado: null, sol: true },
  { id: "D", label: "Unipolares espaçados em canaleta fechada no solo", enterrado: null, sol: true },
  { id: "E", label: "Unipolares justapostos ou tripolar, em eletroduto ao ar livre, abrigado do sol", enterrado: false, sol: false },
  { id: "F1", label: "Unipolares justapostos ou tripolar, em eletrodutos enterrados", enterrado: true, sol: false },
  { id: "F2", label: "Unipolares justapostos ou tripolar, em banco de dutos enterrados", enterrado: true, sol: false },
  { id: "G1", label: "Unipolares espaçados em eletrodutos enterrados, um cabo por duto", enterrado: true, sol: false },
  { id: "G2", label: "Unipolares espaçados em banco de dutos enterrados, um cabo por duto", enterrado: true, sol: false },
  { id: "H", label: "Unipolares justapostos ou tripolar, diretamente enterrados", enterrado: true, sol: false },
  { id: "I", label: "Unipolares espaçados, diretamente enterrados", enterrado: true, sol: false },
];

// Temperatura ambiente de referência das Tabelas 28 e 29 (6.2.5.3.2).
export const TEMP_REFERENCIA = { enterrado: 20, aoAr: 30 };

export const SECOES_MT = [10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000];

// Isolações cobertas pelas tabelas de ampacidade, com a temperatura máxima do
// condutor em regime permanente (Tabela 27, pág. 50).
export const ISOLACOES_MT = [
  { id: 90, label: "90 °C — XLPE, TR XLPE, EPR ou HEPR" },
  { id: 105, label: "105 °C — EPR 105" },
];

// ---------------------------------------------------------------------------
// Capacidade de condução de corrente (A).
//   Tabela 28 (pág. 54-55) — XLPE, TR XLPE, EPR ou HEPR, condutor a 90 °C.
//   Tabela 29 (pág. 55-56) — EPR 105, condutor a 105 °C.
//
// Colunas na ordem de METODOS_MT: A1 A2 B1 B2 C D E F1 F2 G1 G2 H I.
// `null` = célula "–" na norma (combinação não tabelada). Quem consome DEVE
// tratar null como "sem tabela" e recusar o dimensionamento — nunca como zero,
// nunca caindo num método vizinho.
// ---------------------------------------------------------------------------
export const AMPACIDADE_MT = {
  90: {
    cobre: {
      10: [86, 70, 104, 94, 78, 93, 69, 59, 63, 66, 73, 64, 68],
      16: [113, 92, 136, 123, 101, 123, 90, 75, 81, 84, 93, 82, 87],
      25: [148, 120, 179, 162, 131, 164, 117, 97, 104, 107, 119, 105, 110],
      35: [180, 147, 219, 197, 159, 202, 142, 116, 124, 127, 142, 125, 131],
      50: [218, 177, 264, 238, 190, 246, 170, 137, 147, 149, 167, 147, 154],
      70: [272, 220, 329, 296, 236, 309, 211, 167, 179, 180, 202, 178, 187],
      95: [332, 269, 400, 360, 286, 379, 255, 200, 214, 213, 239, 211, 221],
      120: [384, 311, 461, 413, 328, 439, 294, 227, 243, 239, 269, 238, 249],
      150: [437, 352, 514, 460, 369, 492, 330, 251, 269, 256, 292, 262, 270],
      185: [498, 403, 583, 522, 419, 561, 375, 282, 301, 283, 324, 293, 300],
      240: [588, 474, 678, 605, 488, 656, 438, 324, 345, 319, 366, 334, 340],
      300: [670, 540, 767, 683, 551, 745, 494, 361, 383, 349, 403, 370, 375],
      400: [760, 618, 844, 750, 602, 823, 550, 394, 417, 360, 424, 401, 395],
      500: [856, 694, 943, 837, 669, 922, 615, 434, 458, 389, 461, 440, 429],
      630: [958, 776, 1048, 929, 736, 1028, 683, 475, 500, 416, 497, 478, 464],
      800: [1064, 858, 1152, 1018, 804, 1134, 755, 517, 541, 444, 532, 516, 497],
      1000: [1161, 934, 1250, 1102, 862, null, 817, 551, 575, 467, 560, 547, 525],
    },
    aluminio: {
      10: [66, 54, 80, 72, 60, 72, 53, 45, 49, 51, 56, 50, 52],
      16: [87, 71, 106, 96, 78, 96, 70, 58, 63, 65, 72, 64, 67],
      25: [115, 94, 139, 126, 102, 127, 91, 75, 81, 83, 93, 82, 86],
      35: [140, 114, 170, 154, 124, 157, 110, 90, 96, 99, 110, 97, 102],
      50: [169, 137, 206, 186, 148, 192, 132, 106, 114, 117, 130, 114, 120],
      70: [212, 171, 257, 231, 184, 241, 164, 130, 139, 142, 158, 139, 146],
      95: [258, 209, 313, 281, 222, 296, 198, 156, 166, 168, 188, 165, 173],
      120: [300, 242, 362, 325, 255, 345, 229, 178, 189, 190, 213, 186, 196],
      150: [340, 275, 407, 364, 288, 389, 259, 198, 211, 207, 233, 206, 215],
      185: [391, 316, 465, 416, 328, 447, 296, 223, 238, 231, 261, 232, 241],
      240: [463, 374, 545, 486, 385, 527, 349, 259, 275, 263, 298, 267, 275],
      300: [532, 428, 621, 553, 438, 603, 397, 290, 308, 291, 331, 298, 306],
      400: [621, 500, 703, 625, 496, 685, 453, 325, 344, 311, 359, 331, 333],
      500: [716, 577, 799, 709, 574, 781, 517, 366, 386, 341, 396, 370, 368],
      630: [822, 665, 905, 802, 633, 888, 587, 409, 431, 372, 436, 412, 405],
      800: [931, 751, 1012, 894, 706, 996, 663, 455, 476, 404, 474, 454, 443],
      1000: [1038, 835, 1120, 987, 773, null, 733, 496, 517, 431, 509, 492, 476],
    },
  },
  105: {
    cobre: {
      10: [96, 83, 115, 107, 86, 106, 77, 64, 68, 71, 79, 69, 73],
      16: [126, 109, 151, 141, 112, 140, 100, 82, 88, 90, 101, 89, 93],
      25: [165, 142, 199, 184, 146, 186, 130, 105, 112, 115, 129, 113, 119],
      35: [201, 173, 243, 225, 177, 229, 157, 126, 135, 137, 153, 134, 142],
      50: [243, 210, 294, 272, 212, 278, 189, 149, 159, 161, 181, 158, 166],
      70: [303, 261, 366, 339, 262, 349, 234, 181, 194, 195, 219, 192, 201],
      95: [370, 319, 446, 412, 317, 428, 284, 217, 232, 231, 259, 228, 239],
      120: [428, 369, 514, 474, 364, 495, 327, 247, 264, 260, 292, 257, 269],
      150: [487, 419, 575, 530, 410, 555, 369, 273, 292, 279, 318, 283, 293],
      185: [556, 480, 653, 601, 465, 633, 419, 307, 328, 309, 353, 317, 326],
      240: [656, 565, 760, 699, 542, 741, 490, 353, 376, 349, 400, 362, 370],
      300: [748, 646, 862, 791, 612, 842, 554, 394, 418, 383, 441, 402, 408],
      400: [857, 738, 953, 874, 674, 934, 619, 431, 457, 397, 466, 437, 432],
      500: [967, 832, 1067, 978, 749, 1049, 694, 477, 503, 430, 508, 480, 471],
      630: [1086, 933, 1191, 1089, 828, 1173, 773, 523, 550, 462, 550, 523, 510],
      800: [1207, 1035, 1311, 1197, 905, null, 856, 570, 597, 494, 589, 566, 549],
      1000: [1320, 1130, 1426, 1301, 971, null, 928, 609, 635, 520, 623, 601, 580],
    },
    aluminio: {
      10: [74, 64, 89, 82, 66, 81, 59, 49, 53, 55, 61, 53, 56],
      16: [97, 84, 117, 109, 87, 109, 77, 63, 68, 70, 78, 69, 72],
      25: [128, 110, 155, 143, 113, 144, 101, 81, 87, 90, 100, 88, 93],
      35: [156, 134, 189, 175, 137, 178, 122, 97, 104, 107, 119, 104, 110],
      50: [189, 163, 229, 212, 164, 217, 147, 115, 123, 126, 141, 123, 130],
      70: [235, 203, 286, 264, 204, 272, 182, 141, 151, 153, 171, 149, 157],
      95: [287, 248, 348, 322, 246, 334, 220, 169, 180, 182, 203, 177, 187],
      120: [333, 287, 403, 372, 283, 388, 254, 192, 205, 206, 230, 201, 212],
      150: [379, 326, 454, 418, 319, 438, 288, 215, 230, 225, 253, 223, 233],
      185: [435, 376, 519, 478, 364, 504, 330, 242, 259, 251, 283, 250, 261],
      240: [516, 445, 609, 560, 427, 593, 389, 281, 299, 287, 324, 288, 298],
      300: [593, 511, 695, 638, 484, 679, 444, 316, 336, 318, 360, 322, 332],
      400: [692, 597, 789, 724, 559, 773, 508, 355, 375, 341, 392, 359, 362],
      500: [800, 691, 899, 823, 638, 883, 580, 399, 422, 375, 435, 402, 402],
      630: [923, 795, 1021, 934, 726, 1006, 661, 448, 471, 410, 479, 448, 444],
      800: [1050, 900, 1144, 1045, 790, 1130, 747, 499, 522, 446, 523, 495, 486],
      1000: [1174, 1005, 1270, 1158, 866, null, 828, 545, 568, 478, 562, 538, 524],
    },
  },
};

// Capacidade de condução tabelada, sem fatores de correção.
// Devolve null quando a combinação não é tabelada — quem chama precisa
// distinguir "não existe tabela" de "não passa no critério".
export function capacidadeMT({ isolacao, material, secao, metodo }) {
  const porMaterial = AMPACIDADE_MT[isolacao];
  if (!porMaterial) return null;
  const linha = porMaterial[material]?.[secao];
  if (!linha) return null;
  const col = METODOS_MT.findIndex((m) => m.id === metodo);
  if (col < 0) return null;
  return linha[col] ?? null;
}

// ---------------------------------------------------------------------------
// Fatores de correção de temperatura ambiente (6.2.5.3.3): multiplicam a
// capacidade das Tabelas 28 e 29.
//
// INSERIDO (não transcrito): o fator 1,00 nas condições de referência — 30 °C
// e 20 °C aqui, 2,5 K·m/W na Tabela 32, 0,9 m na Tabela 33. A norma omite essas
// linhas porque são a definição da referência. Estão aqui para o motor poder
// consultar sempre a tabela, sem um caso especial "se for a referência, pule".
//
// Tabela 30 (pág. 57) — linhas NÃO enterradas, referência 30 °C. Tem colunas
// separadas para abrigada e exposta ao sol.
// `null` = célula "–": a norma proíbe o cabo naquela condição, e não é o mesmo
// que fator zero. As notas de rodapé dizem por quê:
//   - exposta ao sol, isolação de 90 °C: não pode acima de 60 °C ambiente;
//   - exposta ao sol, EPR 105: não pode acima de 75 °C ambiente.
// ---------------------------------------------------------------------------
export const FATOR_TEMP_AR = {
  abrigado: {
    90: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.5, 80: 0.41 },
    105: { 10: 1.13, 15: 1.1, 20: 1.06, 25: 1.03, 30: 1, 35: 0.97, 40: 0.93, 45: 0.89, 50: 0.86, 55: 0.82, 60: 0.77, 65: 0.73, 70: 0.68, 75: 0.63, 80: 0.58 },
  },
  exposto: {
    90: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1, 35: 0.92, 40: 0.83, 45: 0.73, 50: 0.62, 55: 0.49, 60: 0.31, 65: null, 70: null, 75: null, 80: null },
    105: { 10: 1.13, 15: 1.1, 20: 1.06, 25: 1.03, 30: 1, 35: 0.94, 40: 0.88, 45: 0.82, 50: 0.75, 55: 0.68, 60: 0.6, 65: 0.51, 70: 0.4, 75: 0.25, 80: null },
  },
};

// Tabela 31 (pág. 58) — linhas enterradas, referência 20 °C.
export const FATOR_TEMP_SOLO = {
  90: { 10: 1.07, 15: 1.04, 20: 1, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85, 45: 0.8, 50: 0.76, 55: 0.71, 60: 0.65, 65: 0.6, 70: 0.53, 75: 0.46, 80: 0.38 },
  105: { 10: 1.06, 15: 1.03, 20: 1, 25: 0.97, 30: 0.94, 35: 0.91, 40: 0.87, 45: 0.84, 50: 0.8, 55: 0.77, 60: 0.73, 65: 0.69, 70: 0.64, 75: 0.59, 80: 0.54 },
};

// Métodos aos quais as correções de solo (Tabelas 32 e 33) se aplicam. C e D
// não estão na lista — é o que as próprias tabelas declaram no título.
export const METODOS_COM_CORRECAO_SOLO = ["F1", "F2", "G1", "G2", "H", "I"];

// Tabela 32 (pág. 59) — resistividade térmica do solo diferente de 2,5 K·m/W.
// NOTA da norma: são valores médios para as seções das Tabelas 28 e 29, e o uso
// pode resultar em capacidade até cerca de 11 % menor que a calculada pelas
// IEC 60287-1-1 e 60287-2-1.
export const RESISTIVIDADES_SOLO = [1, 1.5, 2, 2.5, 3, 4];
export const FATOR_RESISTIVIDADE_SOLO = {
  F1: { 1: 1.24, 1.5: 1.14, 2: 1.06, 2.5: 1, 3: 0.93, 4: 0.83 },
  F2: { 1: 1.14, 1.5: 1.09, 2: 1.04, 2.5: 1, 3: 0.94, 4: 0.85 },
  G1: { 1: 1.31, 1.5: 1.18, 2: 1.08, 2.5: 1, 3: 0.93, 4: 0.82 },
  G2: { 1: 1.15, 1.5: 1.09, 2: 1.04, 2.5: 1, 3: 0.94, 4: 0.85 },
  H: { 1: 1.45, 1.5: 1.23, 2: 1.09, 2.5: 1, 3: 0.91, 4: 0.8 },
  I: { 1: 1.44, 1.5: 1.23, 2: 1.09, 2.5: 1, 3: 0.91, 4: 0.8 },
};

// Tabela 33 (pág. 59) — profundidade diferente de 0,9 m.
// NOTA da norma: o uso pode resultar em capacidade até cerca de 4 % menor que a
// calculada pelas IEC 60287-1-1 e 60287-2-1.
export const PROFUNDIDADES = [0.7, 0.9, 1.2, 1.5, 2];
export const FATOR_PROFUNDIDADE = {
  F1: { 0.7: 1.02, 0.9: 1, 1.2: 0.97, 1.5: 0.94, 2: 0.91 },
  F2: { 0.7: 1.02, 0.9: 1, 1.2: 0.96, 1.5: 0.94, 2: 0.91 },
  G1: { 0.7: 1.02, 0.9: 1, 1.2: 0.96, 1.5: 0.93, 2: 0.9 },
  G2: { 0.7: 1.03, 0.9: 1, 1.2: 0.95, 1.5: 0.92, 2: 0.88 },
  H: { 0.7: 1.01, 0.9: 1, 1.2: 0.97, 1.5: 0.94, 2: 0.92 },
  I: { 0.7: 1.02, 0.9: 1, 1.2: 0.96, 1.5: 0.93, 2: 0.9 },
};

export function metodoMT(id) {
  return METODOS_MT.find((m) => m.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Agrupamento (Tabelas 34 a 41).
//
// Aqui o modelo muda em relação à baixa tensão: não existe "fator por número de
// circuitos". A norma dá o fator pelo ARRANJO geométrico do grupo cruzado com o
// ESPAÇAMENTO `e` entre os grupos, medido em múltiplos do diâmetro externo Dₑ
// do cabo (o do unipolar que forma o trifólio, na Tabela 34; o do tripolar, na
// Tabela 35). O afastamento mínimo de qualquer superfície é 0,5·Dₑ.
//
// NOTA da norma: são os agrupamentos normalizados da IEC 60287-2-2. Outras
// formas de agrupamento exigem cálculo, não têm fator tabelado.
//
// Cada tabela vale para UM método de referência:
//   34 → A1 (unipolares em trifólio)   35 → A1 (tripolares)
//   36 → F1   37 → F2   38 → G1   39 → G2   40 → H   41 → I
// B1, B2, C, D e E não têm tabela de agrupamento em lugar nenhum da norma.
// ---------------------------------------------------------------------------

// Faixas de espaçamento, em múltiplos de Dₑ. `min` inclusivo, `max` exclusivo;
// `max: null` = sem limite superior. Ordenadas do maior espaçamento ao menor.
const FAIXAS_7 = (v) => [
  { min: 3.5, max: null, fator: v[0] },
  { min: 2.5, max: 3.5, fator: v[1] },
  { min: 2, max: 2.5, fator: v[2] },
  { min: 1.5, max: 2, fator: v[3] },
  { min: 1, max: 1.5, fator: v[4] },
  { min: 0.5, max: 1, fator: v[5] },
  { min: 0, max: 0.5, fator: v[6] },
];
const FAIXAS_8 = (v) => [
  { min: 3.5, max: null, fator: v[0] },
  { min: 3, max: 3.5, fator: v[1] },
  { min: 2.5, max: 3, fator: v[2] },
  { min: 2, max: 2.5, fator: v[3] },
  { min: 1.5, max: 2, fator: v[4] },
  { min: 1, max: 1.5, fator: v[5] },
  { min: 0.5, max: 1, fator: v[6] },
  { min: 0, max: 0.5, fator: v[7] },
];
const FAIXAS_5 = (v) => [
  { min: 2, max: null, fator: v[0] },
  { min: 1.5, max: 2, fator: v[1] },
  { min: 1, max: 1.5, fator: v[2] },
  { min: 0.5, max: 1, fator: v[3] },
  { min: 0, max: 0.5, fator: v[4] },
];

// Tabela 34 (pág. 60) — grupos de cabos UNIPOLARES em trifólio ao ar livre.
// Método A1. Os três arranjos verticais compartilham a mesma escala.
export const AGRUPAMENTO_T34 = {
  tabela: 34,
  metodo: "A1",
  cabo: "unipolarTrifolio",
  diametroRef: "do cabo unipolar que forma o trifólio",
  arranjos: [
    {
      id: "dois2HorizTrifolio",
      label: "Dois grupos formados por cabos unipolares em trifólio, na horizontal",
      faixas: [{ min: 1, max: null, fator: 1 }, { min: 0, max: 1, fator: 0.93 }],
    },
    {
      id: "tres3HorizTrifolio",
      label: "Três grupos formados por cabos unipolares em trifólio, na horizontal",
      faixas: [{ min: 1.5, max: null, fator: 1 }, { min: 0, max: 1.5, fator: 0.92 }],
    },
    {
      id: "doisVertTrifolio",
      label: "Dois grupos formados por cabos unipolares em trifólio, na vertical",
      faixas: FAIXAS_7([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.88]),
    },
    {
      id: "doisConjuntosDoisTrifoliosVert",
      label: "Dois conjuntos de grupos com dois trifólios na vertical",
      faixas: FAIXAS_7([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.88]),
    },
    {
      id: "tresConjuntosDoisTrifoliosVert",
      label: "Três conjuntos de grupos com dois trifólios na vertical",
      faixas: FAIXAS_7([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.88]),
    },
  ],
};

// Tabela 35 (pág. 61-62) — grupos de cabos TRIPOLARES ao ar livre. Método A1.
export const AGRUPAMENTO_T35 = {
  tabela: 35,
  metodo: "A1",
  cabo: "tripolar",
  diametroRef: "do cabo tripolar",
  arranjos: [
    {
      id: "doisHoriz",
      label: "Dois cabos tripolares na horizontal",
      faixas: [{ min: 0.5, max: null, fator: 1 }, { min: 0, max: 0.5, fator: 0.89 }],
    },
    {
      id: "tresHoriz",
      label: "Três cabos tripolares na horizontal",
      faixas: [{ min: 0.75, max: null, fator: 1 }, { min: 0, max: 0.75, fator: 0.84 }],
    },
    {
      id: "doisVert",
      label: "Dois cabos tripolares na vertical",
      faixas: FAIXAS_5([1, 0.99, 0.97, 0.94, 0.9]),
    },
    {
      id: "tresVert",
      label: "Três cabos tripolares na vertical",
      faixas: FAIXAS_8([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.91, 0.85]),
    },
    {
      id: "doisConjuntosDoisVert",
      label: "Dois conjuntos de grupos com dois cabos tripolares na vertical",
      faixas: FAIXAS_5([1, 0.99, 0.97, 0.94, 0.9]),
    },
    {
      id: "doisConjuntosTresVert",
      label: "Dois conjuntos de grupos com três cabos tripolares na vertical",
      faixas: FAIXAS_8([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.91, 0.85]),
    },
    {
      id: "tresConjuntosTresVert",
      label: "Três conjuntos de grupos com três cabos tripolares na vertical",
      faixas: FAIXAS_8([1, 0.99, 0.98, 0.97, 0.96, 0.94, 0.91, 0.85]),
    },
  ],
};

// Métodos sem qualquer tabela de agrupamento na norma. Não é omissão desta
// transcrição — a norma não tabela. Quem dimensionar num desses métodos com
// mais de um circuito precisa calcular pela IEC 60287-2-2.
//
// A2 entra aqui: as Tabelas 34 e 35 dizem "método de referência A1", e não há
// equivalente para o mesmo arranjo exposto ao sol.
export const METODOS_SEM_AGRUPAMENTO = ["A2", "B1", "B2", "C", "D", "E"];

// Tabela 36 (pág. 62) — agrupamento de ELETRODUTOS diretamente enterrados,
// cada eletroduto com três cabos unipolares ou um cabo tripolar. Método F1.
// Indexada por número de dutos × faixa de seção × espaçamento entre os CENTROS
// dos eletrodutos, em MILÍMETROS (não em múltiplos de Dₑ como as Tabelas 34/35).
//
// A coluna "Encostados" é célula mesclada na norma: um único valor para as duas
// faixas de seção. Faz sentido — com os dutos encostados a seção deixa de
// alterar o resultado. Está repetida nas duas faixas abaixo para o mapa ficar
// retangular, mas na norma é um valor só.
// NOTA da norma: pode resultar em capacidade até 7,5 % menor que a calculada
// pelas IEC 60287-1-1 e 60287-2-1.
export const ESPACAMENTOS_T36 = ["encostados", 200, 400, 600, 800];
export const AGRUPAMENTO_T36 = {
  tabela: 36,
  metodo: "F1",
  faixasSecao: [
    { min: 10, max: 150, id: "10a150" },
    { min: 185, max: 1000, id: "185a1000" },
  ],
  porDutos: {
    2: { "10a150": { encostados: 0.8, 200: 0.84, 400: 0.88, 600: 0.91, 800: 0.93 },
         "185a1000": { encostados: 0.8, 200: 0.8, 400: 0.85, 600: 0.88, 800: 0.9 } },
    3: { "10a150": { encostados: 0.68, 200: 0.74, 400: 0.8, 600: 0.84, 800: 0.87 },
         "185a1000": { encostados: 0.68, 200: 0.69, 400: 0.75, 600: 0.8, 800: 0.83 } },
    4: { "10a150": { encostados: 0.62, 200: 0.69, 400: 0.76, 600: 0.81, 800: 0.84 },
         "185a1000": { encostados: 0.62, 200: 0.64, 400: 0.71, 600: 0.76, 800: 0.8 } },
  },
};

// Tabela 37 (pág. 63) — cabos unipolares e tripolares em BANCO DE DUTOS.
// Método F2. As colunas da norma são desenhos, não texto: todas mostram o mesmo
// banco de 480 × 480 mm, topo a 760 mm de profundidade e dutos a 200 mm entre
// centros, variando quantos dos quatro dutos estão OCUPADOS (2, 3 e 4).
// NOTA 2 da norma: dimensões diferentes do banco ou da distância entre dutos
// afetam fortemente o fator — fora dessas dimensões, calcular pela IEC 60287.
export const BANCO_DUTOS_T37 = { largura: 480, altura: 480, profundidade: 760, espacamento: 200 };
export const AGRUPAMENTO_T37 = {
  tabela: 37,
  metodo: "F2",
  faixasSecao: [
    { min: 10, max: 150, id: "10a150" },
    { min: 185, max: 1000, id: "185a1000" },
  ],
  porDutosOcupados: {
    2: { "10a150": 0.84, "185a1000": 0.81 },
    3: { "10a150": 0.73, "185a1000": 0.69 },
    4: { "10a150": 0.65, "185a1000": 0.61 },
  },
};

// Tabela 38 (pág. 63-64) — eletrodutos diretamente enterrados e ESPAÇADOS,
// cada eletroduto com UM cabo unipolar. Método G1.
// DOIS COMPORTAMENTOS CONTRAINTUITIVOS, ambos conferidos na norma — não mexer
// achando que é erro de digitação:
//   1. Há fatores MAIORES que 1,00 (seções pequenas bem espaçadas ficam acima
//      da condição de referência). Nada no motor pode limitar os fatores a 1.
//   2. Mais espaçamento NEM SEMPRE ajuda. Nas seções grandes o fator cai com o
//      afastamento — em 3 dutos de 185 a 400 mm² vai de 0,97 a 200 mm para 0,92
//      a 800 mm. Só nas seções pequenas o espaçamento é favorável.
// NOTA da norma: pode resultar em capacidade até 15 % menor que a calculada.
export const ESPACAMENTOS_MM = [200, 400, 600, 800];
export const AGRUPAMENTO_T38 = {
  tabela: 38,
  metodo: "G1",
  faixasSecao: [
    { min: 10, max: 50, id: "10a50" },
    { min: 70, max: 150, id: "70a150" },
    { min: 185, max: 400, id: "185a400" },
    { min: 500, max: 1000, id: "500a1000" },
  ],
  porDutos: {
    3: { "10a50": { 200: 1.06, 400: 1.1, 600: 1.12, 800: 1.14 },
         "70a150": { 200: 1, 400: 1.01, 600: 1.02, 800: 1.02 },
         "185a400": { 200: 0.97, 400: 0.93, 600: 0.92, 800: 0.92 },
         "500a1000": { 200: 0.97, 400: 0.92, 600: 0.89, 800: 0.88 } },
    6: { "10a50": { 200: 0.92, 400: 1, 600: 1.05, 800: 1.09 },
         "70a150": { 200: 0.86, 400: 0.91, 600: 0.95, 800: 0.97 },
         "185a400": { 200: 0.82, 400: 0.83, 600: 0.85, 800: 0.86 },
         "500a1000": { 200: 0.82, 400: 0.81, 600: 0.81, 800: 0.82 } },
    9: { "10a50": { 200: 0.85, 400: 0.95, 600: 1.02, 800: 1.07 },
         "70a150": { 200: 0.79, 400: 0.87, 600: 0.91, 800: 0.95 },
         "185a400": { 200: 0.75, 400: 0.79, 600: 0.82, 800: 0.84 },
         "500a1000": { 200: 0.74, 400: 0.76, 600: 0.78, 800: 0.8 } },
    12: { "10a50": { 200: 0.81, 400: 0.93, 600: 1, 800: 1.05 },
          "70a150": { 200: 0.75, 400: 0.84, 600: 0.9, 800: 0.93 },
          "185a400": { 200: 0.71, 400: 0.77, 600: 0.8, 800: 0.83 },
          "500a1000": { 200: 0.7, 400: 0.74, 600: 0.77, 800: 0.78 } },
  },
};

// Tabela 39 (pág. 64) — cabos UNIPOLARES em banco de dutos. Método G2.
// As colunas são desenhos: bancos com topo a 760 mm e dutos a 200 mm entre
// centros, variando o tamanho do banco e a quantidade de dutos — 480 × 480 com
// 4 dutos, 680 × 480 com 6 e 680 × 680 com 9.
// NOTA da norma: pode resultar em capacidade até cerca de 10 % menor.
export const BANCOS_T39 = {
  4: { largura: 480, altura: 480 },
  6: { largura: 680, altura: 480 },
  9: { largura: 680, altura: 680 },
};
export const AGRUPAMENTO_T39 = {
  tabela: 39,
  metodo: "G2",
  profundidade: 760,
  espacamento: 200,
  faixasSecao: [
    { min: 10, max: 120, id: "10a120" },
    { min: 150, max: 300, id: "150a300" },
    { min: 400, max: 1000, id: "400a1000" },
  ],
  porDutos: {
    4: { "10a120": 0.99, "150a300": 0.95, "400a1000": 0.94 },
    6: { "10a120": 0.78, "150a300": 0.71, "400a1000": 0.67 },
    9: { "10a120": 0.67, "150a300": 0.61, "400a1000": 0.57 },
  },
};

// Tabela 40 (pág. 65) — cabos diretamente enterrados e ENCOSTADOS. Método H.
// Indexada só pelo número de condutores isolados; não depende de seção nem de
// espaçamento, porque os cabos estão encostados.
// NOTA da norma: pode resultar em capacidade até 3 % menor.
export const AGRUPAMENTO_T40 = {
  tabela: 40,
  metodo: "H",
  porCondutoresIsolados: { 6: 0.76, 9: 0.65, 12: 0.58 },
};

// Tabela 41 (pág. 65) — cabos unipolares ESPAÇADOS diretamente enterrados.
// Método I. Dois regimes de espaçamento entre centros: 2·Dₑ (onde Dₑ é o
// diâmetro externo do cabo, e o fator vale para todas as seções) e 200 mm
// (onde passa a depender da seção).
// NOTA da norma: pode resultar em capacidade até 10 % menor.
export const AGRUPAMENTO_T41 = {
  tabela: 41,
  metodo: "I",
  faixasSecao: [
    { min: 10, max: 120, id: "10a120" },
    { min: 150, max: 300, id: "150a300" },
    { min: 400, max: 1000, id: "400a1000" },
  ],
  numerosDeCabos: [3, 6, 9, 12],
  // espaçamento 2·Dₑ: um único conjunto, válido para qualquer seção
  doisDe: { 3: 1, 6: 0.78, 9: 0.68, 12: 0.61 },
  // espaçamento de 200 mm entre centros
  mm200: {
    "10a120": { 3: 1.06, 6: 0.9, 9: 0.82, 12: 0.78 },
    "150a300": { 3: 0.97, 6: 0.81, 9: 0.74, 12: 0.7 },
    "400a1000": { 3: 0.92, 6: 0.76, 9: 0.68, 12: 0.64 },
  },
};

export const AGRUPAMENTOS_MT = { A1: [AGRUPAMENTO_T34, AGRUPAMENTO_T35] };

// Fator de agrupamento das tabelas indexadas por número de dutos (36 e 37).
// `secao` em mm²; devolve null se a seção ou a contagem estiver fora do
// tabelado, em vez de extrapolar.
export function fatorAgrupamentoDutos({ metodo, dutos, secao, espacamento }) {
  const faixa = (t) => t.faixasSecao.find((f) => secao >= f.min && secao <= f.max)?.id ?? null;
  if (metodo === "F1") {
    const bloco = AGRUPAMENTO_T36.porDutos[dutos];
    const id = faixa(AGRUPAMENTO_T36);
    if (!bloco || !id) return null;
    const v = bloco[id][espacamento];
    return v === undefined ? null : v;
  }
  if (metodo === "F2") {
    const bloco = AGRUPAMENTO_T37.porDutosOcupados[dutos];
    const id = faixa(AGRUPAMENTO_T37);
    if (!bloco || !id) return null;
    return bloco[id] ?? null;
  }
  if (metodo === "G1") {
    const bloco = AGRUPAMENTO_T38.porDutos[dutos];
    const id = faixa(AGRUPAMENTO_T38);
    if (!bloco || !id) return null;
    const v = bloco[id][espacamento];
    return v === undefined ? null : v;
  }
  if (metodo === "G2") {
    const bloco = AGRUPAMENTO_T39.porDutos[dutos];
    const id = faixa(AGRUPAMENTO_T39);
    if (!bloco || !id) return null;
    return bloco[id] ?? null;
  }
  return null;
}

// Método H (Tabela 40): cabos encostados, indexado só pelo número de
// condutores isolados.
export function fatorAgrupamentoEncostados(condutoresIsolados) {
  return AGRUPAMENTO_T40.porCondutoresIsolados[condutoresIsolados] ?? null;
}

// Método I (Tabela 41): cabos unipolares espaçados diretamente enterrados.
// `regime` é "doisDe" (espaçamento de 2·Dₑ, vale para qualquer seção) ou
// "mm200" (200 mm entre centros, aí a seção importa).
export function fatorAgrupamentoEspacadoEnterrado({ regime, cabos, secao }) {
  if (regime === "doisDe") return AGRUPAMENTO_T41.doisDe[cabos] ?? null;
  if (regime !== "mm200") return null;
  const id = AGRUPAMENTO_T41.faixasSecao.find((f) => secao >= f.min && secao <= f.max)?.id;
  if (!id) return null;
  return AGRUPAMENTO_T41.mm200[id][cabos] ?? null;
}

// Fator de agrupamento pelo arranjo e pelo espaçamento relativo (e / Dₑ).
// Devolve null quando não há tabela para o método, quando o arranjo não é um
// dos normalizados, ou quando o espaçamento é negativo.
export function fatorAgrupamentoMT({ metodo, arranjo, espacamentoRelativo }) {
  const tabelas = AGRUPAMENTOS_MT[metodo];
  if (!tabelas) return null;
  const r = Number(espacamentoRelativo);
  if (!Number.isFinite(r) || r < 0) return null;
  for (const t of tabelas) {
    const a = t.arranjos.find((x) => x.id === arranjo);
    if (!a) continue;
    const faixa = a.faixas.find((f) => r >= f.min && (f.max === null || r < f.max));
    return faixa ? faixa.fator : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Curto-circuito (6.2.6).
//
// A norma dá a corrente suportada, não a seção:
//   I = K · S · √( (1/t) · ln( (θf + β) / (θi + β) ) )
// de onde sai a seção mínima invertendo em S.
//
// Repare que não é a adiabática simplificada S ≥ I·√t / k da NBR 5410: aqui o
// k equivalente não é constante tabelada, é K·√(ln((θf+β)/(θi+β))), calculado a
// partir das temperaturas. As duas formas concordam — cobre EPR 90→250 dá
// 226·√(ln(484,5/324,5)) = 143,1, e a Tabela 43 da NBR 5410 tabela 143; para o
// alumínio dá 94,5 contra 94. Ou seja, a 5410 tabela o resultado desta conta.
//
// Limite normativo: a duração máxima do curto-circuito é de 5 s (6.2.6.1.2 e
// 6.2.6.2.2).
// ---------------------------------------------------------------------------
export const TEMPO_MAX_CURTO = 5;

// Tabela 42 (pág. 66) — constantes do metal. K em A·s^(1/2)·mm^(-2);
// β em °C (inverso do coeficiente de temperatura da resistência a 0 °C).
export const CONSTANTES_CURTO = {
  cobre: { K: 226, beta: 234.5 },
  aluminio: { K: 148, beta: 228 },
};

// Tabela 43 (pág. 66) — temperaturas do CONDUTOR no curto, por isolação.
// Rodapé: conexões soldadas limitam a temperatura final a 160 °C.
export const TEMP_CURTO_CONDUTOR = {
  90: { inicial: 90, final: 250 }, // EPR, HEPR, XLPE e TR XLPE
  105: { inicial: 105, final: 250 }, // EPR 105
};
export const TEMP_FINAL_CONEXAO_SOLDADA = 160;

// Temperatura inicial da BLINDAGEM (6.2.6.2.4): 5 °C abaixo da do condutor.
export const TEMP_INICIAL_BLINDAGEM = { 90: 85, 105: 100 };

// Tabela 44 (pág. 67) — temperatura final da blindagem, pelo material da
// COBERTURA do cabo (não pelo material da blindagem).
export const TEMP_FINAL_BLINDAGEM = {
  "SE1/A": 220,
  SHF2: 220,
  "SE1/B": 220,
  ST3: 150,
  SHF1: 180,
  ST7: 180,
  ST1: 200,
  ST2: 200,
};

// k equivalente da equação: K·√(ln((θf+β)/(θi+β))). É o número que, dividido na
// forma S ≥ I·√t / k, reproduz a adiabática conhecida da NBR 5410.
export function kEquivalente({ material, inicial, final }) {
  const c = CONSTANTES_CURTO[material];
  if (!c) return null;
  if (!(final > inicial)) return null;
  return c.K * Math.sqrt(Math.log((final + c.beta) / (inicial + c.beta)));
}

// Seção mínima do condutor pelo curto (6.2.6.1). Devolve a seção em mm²
// (contínua, não comercial) — quem chama arredonda para cima na lista.
// `tempo` acima de TEMPO_MAX_CURTO é recusado: a norma não cobre.
export function secaoMinimaCurtoCondutor({ corrente, tempo, material, isolacao, conexaoSoldada = false }) {
  const t = Number(tempo);
  if (!(t > 0) || t > TEMPO_MAX_CURTO) return null;
  const temps = TEMP_CURTO_CONDUTOR[isolacao];
  if (!temps) return null;
  const final = conexaoSoldada ? Math.min(temps.final, TEMP_FINAL_CONEXAO_SOLDADA) : temps.final;
  const k = kEquivalente({ material, inicial: temps.inicial, final });
  if (!k) return null;
  return (Number(corrente) * Math.sqrt(t)) / k;
}

// Seção mínima da blindagem (6.2.6.2). A blindagem é de cobre no caso geral,
// e é ela que conduz a corrente de falta fase-terra.
export function secaoMinimaCurtoBlindagem({ corrente, tempo, isolacao, cobertura, material = "cobre", conexaoSoldada = false }) {
  const t = Number(tempo);
  if (!(t > 0) || t > TEMPO_MAX_CURTO) return null;
  const inicial = TEMP_INICIAL_BLINDAGEM[isolacao];
  const tabelada = TEMP_FINAL_BLINDAGEM[cobertura];
  if (inicial === undefined || tabelada === undefined) return null;
  const final = conexaoSoldada ? Math.min(tabelada, TEMP_FINAL_CONEXAO_SOLDADA) : tabelada;
  const k = kEquivalente({ material, inicial, final });
  if (!k) return null;
  return (Number(corrente) * Math.sqrt(t)) / k;
}

// Métodos cuja classificação enterrado/não enterrado a norma não resolve, e
// para os quais `fatorTemperaturaMT` exige `referencia` explícita.
export const METODOS_REFERENCIA_AMBIGUA = METODOS_MT
  .filter((m) => m.enterrado === null)
  .map((m) => m.id);

// Fator de temperatura ambiente do método, já escolhendo a tabela certa.
//
// Devolve null quando a norma proíbe a combinação (célula "–"), quando a
// temperatura não está tabelada, e — nos métodos C e D — quando quem chama não
// disse qual referência adotar. Nesse último caso o null não é "não existe":
// é "a norma não decide, decida você". Passe `referencia: "aoAr"` ou
// `referencia: "enterrado"`. Ver o bloco sobre C e D em METODOS_MT.
export function fatorTemperaturaMT({ metodo, isolacao, temperatura, referencia = null }) {
  const m = metodoMT(metodo);
  if (!m) return null;
  let enterrado = m.enterrado;
  if (enterrado === null) {
    if (referencia === "enterrado") enterrado = true;
    else if (referencia === "aoAr") enterrado = false;
    else return null;
  }
  const tabela = enterrado
    ? FATOR_TEMP_SOLO[isolacao]
    : FATOR_TEMP_AR[m.sol ? "exposto" : "abrigado"]?.[isolacao];
  if (!tabela) return null;
  const v = tabela[temperatura];
  return v === undefined ? null : v;
}

