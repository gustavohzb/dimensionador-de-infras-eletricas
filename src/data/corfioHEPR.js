// Diâmetros externos (mm) — Catálogo oficial Corfio, Cabo Flexível HEPR 90°C 0,6/1 kV
// (Catalogo_de_Produtos-Corfio.pdf, "Dados construtivos", pág. 6-7).
export const corfioHEPR = {
  unipolar: {
    1.5: 4.95, 2.5: 5.35, 4: 5.85, 6: 6.45, 10: 7.6, 16: 8.6, 25: 10.4,
    35: 11.95, 50: 13.6, 70: 15.5, 95: 17.5, 120: 19.2, 150: 21.3, 185: 23.6, 240: 26.4,
  },
  multipolar: {
    // A Corfio só fabrica cada configuração até a seção máxima abaixo —
    // não existe, por exemplo, 5 vias de 50mm² no catálogo.
    2: { 1.5: 8.2, 2.5: 9.0, 4: 10.2, 6: 11.4, 10: 13.5, 16: 15.5 },
    3: { 1.5: 8.67, 2.5: 9.54, 4: 10.82, 6: 12.11, 10: 14.36, 16: 16.52, 25: 20.38, 35: 23.73, 50: 27.26 },
    4: { 1.5: 9.41, 2.5: 10.57, 4: 11.78, 6: 13.42, 10: 15.71, 16: 18.32, 25: 22.38, 35: 26.32, 50: 30.01, 70: 36.31, 95: 39.53 },
    5: { 1.5: 10.47, 2.5: 11.55, 4: 13.10, 6: 14.72, 10: 17.48, 16: 20.38, 25: 24.90, 35: 29.29 },
  },
};

export const TRAY_WIDTHS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
export const TRAY_HEIGHTS = [50, 100];

export const INFRA_TYPES = [
  { id: "eletrocalha", label: "Eletrocalha" },
  { id: "perfilado", label: "Perfilado" },
  { id: "leito", label: "Leito" },
  { id: "aramado", label: "Aramado" },
  { id: "eletroduto", label: "Eletroduto" },
];

// Normas disponíveis para o eletroduto (escolhidas como um sub-toggle,
// no mesmo padrão das abas internas/externas do Leito).
export const ELETRODUTO_NORMAS = [
  { id: "nbr5624", label: "NBR 5624" },
  { id: "nbr5597", label: "NBR 5597" },
  { id: "nbr5598", label: "NBR 5598" },
  { id: "nbr15715", label: "PEAD NBR 15715" },
];

// Eletroduto de aço galvanizado a fogo, rebarba interna removida, rosca NPT —
// ABNT NBR 5597. Fonte: catálogo Elecon (elecon.com.br/produto/rir-npt-nbr-5597),
// conferido também contra o catálogo Santa Marta (valores idênticos).
// Diâmetro interno = externo − 2×parede.
export const NBR5597_SIZES = [
  { bitola: '1/2"', dn: 15, od: 21.3, wall: 2.25 },
  { bitola: '3/4"', dn: 20, od: 26.9, wall: 2.25 },
  { bitola: '1"', dn: 25, od: 33.7, wall: 2.65 },
  { bitola: '1.1/4"', dn: 32, od: 42.4, wall: 3.0 },
  { bitola: '1.1/2"', dn: 40, od: 48.3, wall: 3.0 },
  { bitola: '2"', dn: 50, od: 60.3, wall: 3.35 },
  { bitola: '2.1/2"', dn: 65, od: 73.0, wall: 3.75 },
  { bitola: '3"', dn: 80, od: 88.9, wall: 3.75 },
  { bitola: '4"', dn: 100, od: 114.3, wall: 4.25 },
  { bitola: '5"', dn: 125, od: 141.3, wall: 5.0 },
  { bitola: '6"', dn: 150, od: 168.3, wall: 5.3 },
].map((s) => ({ ...s, id: +(s.od - 2 * s.wall).toFixed(1) }));

// Eletroduto de aço galvanizado a fogo, rebarba interna removida, rosca BSP —
// ABNT NBR 5598. Fonte: catálogo Elecon (elecon.com.br/produto/rir-bsp-nbr-5598),
// conferido também contra o catálogo Santa Marta (valores idênticos).
export const NBR5598_SIZES = [
  { bitola: '1/2"', dn: 15, od: 21.3, wall: 2.25 },
  { bitola: '3/4"', dn: 20, od: 26.9, wall: 2.25 },
  { bitola: '1"', dn: 25, od: 33.7, wall: 2.65 },
  { bitola: '1.1/4"', dn: 32, od: 42.4, wall: 2.65 },
  { bitola: '1.1/2"', dn: 40, od: 48.3, wall: 3.0 },
  { bitola: '2"', dn: 50, od: 60.3, wall: 3.0 },
  { bitola: '2.1/2"', dn: 65, od: 76.1, wall: 3.35 },
  { bitola: '3"', dn: 80, od: 88.9, wall: 3.35 },
  { bitola: '4"', dn: 100, od: 114.3, wall: 3.75 },
  { bitola: '5"', dn: 125, od: 139.7, wall: 4.75 },
  { bitola: '6"', dn: 150, od: 165.1, wall: 5.0 },
].map((s) => ({ ...s, id: +(s.od - 2 * s.wall).toFixed(1) }));

// Eletroduto de aço galvanizado a fogo, rosca — ABNT NBR 5624 ("pesado", série
// mais leve que a 5597). Fonte: catálogo Elecon (elecon.com.br/produto/fogo-nbr-5624),
// que traz diâmetro externo mínimo/máximo por bitola; usamos a média dos dois
// como diâmetro externo nominal. Só até 4" — não há dados de 5"/6" nesta série.
export const NBR5624_SIZES = [
  { bitola: '1/2"', dn: 15, odMin: 20.0, odMax: 20.4, wall: 1.5 },
  { bitola: '3/4"', dn: 20, odMin: 25.2, odMax: 25.6, wall: 1.5 },
  { bitola: '1"', dn: 25, odMin: 31.5, odMax: 31.9, wall: 1.5 },
  { bitola: '1.1/4"', dn: 32, odMin: 40.5, odMax: 41.0, wall: 2.0 },
  { bitola: '1.1/2"', dn: 40, odMin: 46.6, odMax: 47.1, wall: 2.25 },
  { bitola: '2"', dn: 50, odMin: 58.4, odMax: 59.0, wall: 2.25 },
  { bitola: '2.1/2"', dn: 65, odMin: 74.1, odMax: 74.9, wall: 2.65 },
  { bitola: '3"', dn: 80, odMin: 86.8, odMax: 87.6, wall: 2.65 },
  { bitola: '4"', dn: 100, odMin: 111.6, odMax: 112.7, wall: 2.65 },
].map((s) => {
  const od = (s.odMin + s.odMax) / 2;
  return { ...s, od: +od.toFixed(2), id: +(od - 2 * s.wall).toFixed(1) };
});

// Eletroduto corrugado flexível de polietileno de alta densidade (PEAD) —
// ABNT NBR 15715. Fonte: catálogo Elecon (elecon.com.br/produto/pead), que já
// traz o diâmetro interno diretamente (não é calculado por espessura de
// parede, pois a corrugação não tem parede uniforme). Bitolas de 1.1/4" a 8".
export const NBR15715_SIZES = [
  { bitola: '1.1/4"', dn: 30, od: 41.3, id: 31.5 },
  { bitola: '1.1/2"', dn: 40, od: 56.0, id: 43.0 },
  { bitola: '2"', dn: 50, od: 63.4, id: 50.8 },
  { bitola: '3"', dn: 75, od: 89.0, id: 75.0 },
  { bitola: '4"', dn: 100, od: 124.5, id: 103.0 },
  { bitola: '5"', dn: 125, od: 155.5, id: 128.8 },
  { bitola: '6"', dn: 150, od: 190.0, id: 155.6 },
  { bitola: '7"', dn: 175, od: 202.0, id: 176.0 },
  { bitola: '8"', dn: 200, od: 250.0, id: 206.0 },
];

// Tamanhos de eletroduto por norma (o tipo "eletroduto" é único; a norma é
// escolhida por um sub-toggle, assim como as abas do Leito).
export const DUCT_SIZES_BY_NORMA = {
  nbr5624: NBR5624_SIZES,
  nbr5597: NBR5597_SIZES,
  nbr5598: NBR5598_SIZES,
  nbr15715: NBR15715_SIZES,
};

// Dimensões disponíveis por infraestrutura.
// Perfilado é padronizado no mercado: 38 mm de largura, alturas 19/38/76 mm
// (perfilado 38x19, 38x38 e 38x76). As demais compartilham as medidas de calha.
// Eletroduto usa seleção por bitola (diâmetro interno circular), não largura x altura.
export const DIMENSIONS = {
  perfilado: { kind: "rect", widths: [38], heights: [19, 38, 76], default: { w: 38, h: 38 } },
  default: { kind: "rect", widths: TRAY_WIDTHS, heights: TRAY_HEIGHTS, default: { w: 100, h: 50 } },
};

export function getDimensions(infraType, eletrodutoNorma = "nbr5624") {
  if (infraType === "eletroduto") {
    const sizes = DUCT_SIZES_BY_NORMA[eletrodutoNorma] || DUCT_SIZES_BY_NORMA.nbr5624;
    return {
      kind: "duct",
      sizes: sizes.map((s) => ({ label: s.bitola, value: s.id })),
      default: { w: sizes[1].id, h: sizes[1].id },
    };
  }
  return DIMENSIONS[infraType] || DIMENSIONS.default;
}

export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
// 1 via não se aplica a multipolar (é o caso do cabo unipolar, já coberto
// pelo outro tipo de cabo do formulário).
export const VIAS_OPTIONS = [2, 3, 4, 5];

// Seções realmente fabricadas pela Corfio para cada número de vias
// (unipolar/1 via usa a tabela completa SECTIONS).
// Nota: Object.keys() reordena chaves "tipo índice" (4, 6, 10…) antes das
// não-inteiras (1.5, 2.5), por isso o sort numérico explícito abaixo.
const sortedSections = (obj) => Object.keys(obj).map(Number).sort((a, b) => a - b);

export const SECTIONS_BY_VIAS = {
  1: SECTIONS,
  2: sortedSections(corfioHEPR.multipolar[2]),
  3: sortedSections(corfioHEPR.multipolar[3]),
  4: sortedSections(corfioHEPR.multipolar[4]),
  5: sortedSections(corfioHEPR.multipolar[5]),
};

export const VIAS_COLORS = {
  1: "#2b2f36", // unipolar: isolação preta
  2: "#3b82f6",
  3: "#10b981",
  4: "#8b5cf6",
  5: "#dc2626", // 5 vias: isolação vermelha (diferenciar dos demais)
};

// Cabo de comando (controle): todos os condutores são pretos numerados na
// realidade — cor única, para diferenciar do catálogo de força em qualquer
// lista/visualização que misture os dois (ex.: modo reverso com septo).
export const COMANDO_COLOR = "#161616";

export function getDiameter(section, type, vias) {
  if (type === "unipolar") return corfioHEPR.unipolar[section] || 4;
  if (type === "multipolar") return corfioHEPR.multipolar[vias]?.[section] || 12;
  return 4;
}
