// Dados de mercado para o dimensionamento de banco de capacitores.

// Potências típicas de célula capacitiva trifásica (kvar, na tensão nominal
// da célula). Consolidado dos catálogos ABB CLMD, WEG UCW/UCWT e linhas
// equivalentes em 440V — 16,7 e 33,3 são as frações de 50/3 comuns na ABB;
// 33,7 vem da prática da planilha de origem (CAPAC-380 PARA 440.xlsx).
// A UI oferece "Outra..." para qualquer valor fora desta lista.
export const POTENCIAS_CELULA = [5, 7.5, 10, 12.5, 15, 16.7, 20, 25, 30, 33.3, 33.7, 35, 40, 50];

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
