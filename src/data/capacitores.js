// Dados de mercado para o dimensionamento de banco de capacitores.
// Fonte oficial: configurador Siemens (ver siemensCatalog.js) — prevalece
// sobre o PDF de catálogo quando os dois divergem.
import { CAPACITORES_TRI_SIEMENS } from "./siemensCatalog";

// Potências típicas de célula capacitiva trifásica (kvar, na tensão nominal
// da célula). Base: configurador Siemens em 440V/60Hz (1, 1,5, 1,8, 2,5, 3,
// 5, 6, 7,5, 9, 10, 12, 12,5, 15, 18, 20, 25, 30, 33,7 — ver
// CELULAS_SIEMENS_440V), mais os valores usuais ABB CLMD (16,7 e 33,3,
// frações de 50/3) e WEG (35/40/50). A UI oferece "Outra..." para qualquer
// valor fora desta lista.
export const POTENCIAS_CELULA = [1, 1.5, 1.8, 2.5, 3, 5, 6, 7.5, 9, 10, 12, 12.5, 15, 16.7, 18, 20, 25, 30, 33.3, 33.7, 35, 40, 50];

// Diâmetro típico da caneca cilíndrica por potência da célula (kvar como
// selecionado no app). Fonte: configurador Siemens, coluna 440V — Ø53 de 1 a
// 2,5kvar, Ø63,5 de 3 a 6, Ø75 de 7,5 a 12, Ø85 de 12,5 a 33,7. WEG UCWT
// fica próximo (Ø61/75/84). Faixas para desenho de placa, não fabricação.
export const DIAMETROS_CELULA = [
  { maxKvar: 2.5, d: 53 },
  { maxKvar: 6, d: 63.5 },
  { maxKvar: 12, d: 75 },
  { maxKvar: Infinity, d: 85 },
];

export function diametroCelula(kvar) {
  return DIAMETROS_CELULA.find((t) => kvar <= t.maxKvar).d;
}

// Células trifásicas Siemens em 440V/60Hz com o Ø×h de cada uma — referência
// para especificação; exibidas como tooltip quando o kvar escolhido bate com
// o catálogo. Derivado do configurador (dim no formato "Ø 63,5 x 129").
export const CELULAS_SIEMENS_440V = Object.fromEntries(
  CAPACITORES_TRI_SIEMENS.filter((c) => c.tensao === 440).map((c) => {
    const [d, h] = c.dim.replace("Ø", "").split("x").map((v) => Number(v.trim().replace(",", ".")));
    return [c.kvar, { codigo: c.codigo, d, h }];
  })
);

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
