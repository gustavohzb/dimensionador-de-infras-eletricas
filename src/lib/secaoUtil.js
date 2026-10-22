// Seção útil da infraestrutura: a área em que os cabos realmente cabem, que
// no leito é menor que a medida nominal de catálogo (A × altura).
//
// Procedência:
// - Catálogo (norma de produto/fabricante): leito tipo 3 semi-pesado, ref.
//   RP 2503B — altura total 100 mm, útil 75 mm (a travessa 19×38 ocupa os
//   25 mm de baixo); aba das longarinas de 19 mm. A largura A é medida por
//   fora das longarinas.
// - Convenção (tabela usual de bitolas de chapa, não está no catálogo):
//   #14 = 1,90 mm, #16 = 1,50 mm, #18 = 1,20 mm.
// - Premissa de projeto: a chapa padrão é a #14, a mais grossa — dá a menor
//   largura útil, o lado seguro. A Busca usa sempre a padrão.
// - Norma (NBR 5410): nada aqui. Limite de ocupação e fator de agrupamento
//   continuam onde estavam, só que aplicados sobre a seção útil.
//
// Limitações: só o leito tem desconto. Eletrocalha, perfilado e aramado usam
// a medida nominal (a chapa delas fica por fora da cavidade no desenho). A
// aba interna invade o topo da cavidade, mas não é descontada: o catálogo
// mede os 75 mm úteis até a borda de cima, com a aba incluída.

export const LEITO_TRAVESSA = 25; // 100 total − 75 útil
export const LEITO_ABA = 19;

export const CHAPAS_LEITO = [
  { id: "14", label: "#14", mm: 1.9 },
  { id: "16", label: "#16", mm: 1.5 },
  { id: "18", label: "#18", mm: 1.2 },
];
export const CHAPA_PADRAO = "14";

export const espessuraChapa = (chapa = CHAPA_PADRAO) =>
  (CHAPAS_LEITO.find((c) => c.id === chapa) ?? CHAPAS_LEITO.find((c) => c.id === CHAPA_PADRAO)).mm;

// `w`, `h`: medidas nominais (as que o usuário escolhe e o catálogo mostra).
export function secaoUtil(infraType, w, h, chapa = CHAPA_PADRAO) {
  if (infraType !== "leito") return { w, h };
  const t = espessuraChapa(chapa);
  // Arredonda em décimo de mm: 300 − 2×1,9 dá 296,19999… em ponto flutuante.
  return { w: Math.round((w - 2 * t) * 10) / 10, h: h - LEITO_TRAVESSA };
}

// "296,2" — vírgula decimal, sem casas sobrando em número inteiro.
export const fmtMm = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

// Rótulo de dimensão do relatório: nominal sempre; a útil só quando difere.
export function rotuloDimensao(infraType, w, h, wUtil = w, hUtil = h) {
  const nominal = `${w} × ${h} mm`;
  if (infraType !== "leito" || (wUtil === w && hUtil === h)) return nominal;
  return `${nominal} (útil ${fmtMm(wUtil)} × ${fmtMm(hUtil)} mm)`;
}
