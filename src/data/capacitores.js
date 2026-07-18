// Dados de mercado para o dimensionamento de banco de capacitores.

// Potências típicas de célula capacitiva trifásica (kvar, na tensão nominal
// da célula). Base: catálogo Siemens BR B32 em 440V/60Hz (1, 1,2, 1,5, 1,8,
// 2,5, 3, 5, 6, 7,5, 9, 10, 12, 12,5, 15, 18, 20, 25, 30, 33,7 — ver
// CELULAS_SIEMENS_440V), mais os valores usuais ABB CLMD (16,7 e 33,3,
// frações de 50/3) e WEG (35/40/50). A UI oferece "Outra..." para qualquer
// valor fora desta lista.
export const POTENCIAS_CELULA = [1, 1.2, 1.5, 1.8, 2.5, 3, 5, 6, 7.5, 9, 10, 12, 12.5, 15, 16.7, 18, 20, 25, 30, 33.3, 33.7, 35, 40, 50];

// Diâmetro típico da caneca cilíndrica por potência da célula (kvar como
// selecionado no app). Fonte: catálogo Siemens Brasil "Capacitores - Células
// trifásicas e monofásicas B32" (60Hz, coluna 440V) — Ø53×113 de 1 a 2,5kvar,
// Ø63×128–152 de 3 a 6, Ø79,5×138–198 de 7,5 a 15, Ø89,5×273–348 de 18 a
// 33,7 (B32344-E4282-Z040 = 33,7kvar = Ø89,5×348). WEG UCWT fica próximo
// (Ø61/75/84). Faixas para desenho de placa, não para fabricação.
export const DIAMETROS_CELULA = [
  { maxKvar: 2.5, d: 53 },
  { maxKvar: 6, d: 63 },
  { maxKvar: 15, d: 79.5 },
  { maxKvar: Infinity, d: 89.5 },
];

export function diametroCelula(kvar) {
  return DIAMETROS_CELULA.find((t) => kvar <= t.maxKvar).d;
}

// Códigos de catálogo Siemens (células trifásicas B32, 440V/60Hz), com o Ø×h
// de cada uma — referência para especificação; exibidos como tooltip quando o
// kvar escolhido bate com uma célula do catálogo.
export const CELULAS_SIEMENS_440V = {
  1: { codigo: "B32343-C4011-Z040", d: 53, h: 113 },
  1.2: { codigo: "B32343-C4012-Z040", d: 53, h: 113 },
  1.5: { codigo: "B32343-C4011-Z540", d: 53, h: 113 },
  1.8: { codigo: "B32343-C4012-Z540", d: 53, h: 113 },
  2.5: { codigo: "B32343-C4021-Z540", d: 53, h: 113 },
  3: { codigo: "B32343-C4022-Z540", d: 63, h: 128 },
  5: { codigo: "B32343-C4051-Z040", d: 63, h: 138 },
  6: { codigo: "B32343-C4052-Z040", d: 63, h: 152 },
  7.5: { codigo: "B32344-E4071-Z540", d: 79.5, h: 160 },
  9: { codigo: "B32344-E4072-Z540", d: 79.5, h: 138 },
  10: { codigo: "B32344-E4101-Z040", d: 79.5, h: 198 },
  12: { codigo: "B32344-E4102-Z040", d: 79.5, h: 198 },
  12.5: { codigo: "B32344-E4121-Z540", d: 79.5, h: 198 },
  15: { codigo: "B32344-E4151-Z040", d: 79.5, h: 198 },
  18: { codigo: "B32344-E4152-Z040", d: 89.5, h: 273 },
  20: { codigo: "B32344-E4201-Z040", d: 89.5, h: 273 },
  25: { codigo: "B32344-E4251-Z040", d: 89.5, h: 273 },
  30: { codigo: "B32344-E4252-Z040", d: 89.5, h: 273 },
  33.7: { codigo: "B32344-E4282-Z040", d: 89.5, h: 348 },
};

// Escala comercial de disjuntores (A) — correntes nominais usuais de caixa
// moldada até 1250A. Acima disso o cálculo mostra a corrente e avisa, sem
// inventar um degrau.
export const DISJUNTORES = [
  10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225,
  250, 300, 320, 350, 400, 500, 630, 800, 1000, 1250,
];

// Próximo disjuntor comercial que comporta a corrente calculada; null se a
// corrente estourar a escala.
export function disjuntorComercial(corrente) {
  return DISJUNTORES.find((d) => d >= corrente) ?? null;
}
