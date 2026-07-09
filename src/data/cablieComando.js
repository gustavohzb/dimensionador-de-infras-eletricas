// Cabo de Controle (comando) — Catálogo CABLIE, tabela "CABO DE CONTROLE"
// (não confundir com "CABO DE CONTROLE DE IRRIGAÇÃO", que é outro produto
// e foi deliberadamente ignorado). Fios de cobre nu, isolação PVC/ST1 70°C,
// vias pretas numeradas. Diâmetro = "Cobertura - Diâmetro (mm)" da tabela,
// ou seja, o diâmetro externo real do cabo. Limitado a seções ≤ 4,0 mm²
// (seções maiores do catálogo — 6, 10, 16, 25, 35 mm² — não incluídas).
export const comandoData = {
  0.5: {
    2: 6.29, 3: 6.63, 4: 7.15, 5: 7.76, 6: 8.39, 7: 8.39, 8: 9.34, 9: 10.27,
    10: 10.69, 12: 11.03, 13: 11.20, 14: 11.55, 15: 12.36, 16: 12.36,
    19: 12.99, 20: 13.69, 22: 14.40, 25: 15.29, 30: 16.76,
  },
  0.75: {
    2: 6.69, 3: 7.06, 4: 7.64, 5: 8.30, 6: 8.99, 7: 8.99, 8: 10.03, 9: 11.03,
    10: 11.49, 12: 11.86, 14: 12.44, 15: 13.30, 16: 13.30, 19: 13.99,
    20: 14.75, 22: 15.53, 25: 16.49, 30: 18.10,
  },
  1: {
    2: 7.03, 3: 7.43, 4: 8.04, 5: 8.76, 6: 9.50, 7: 9.50, 8: 10.81, 9: 11.68,
    10: 12.37, 12: 12.77, 14: 13.38, 15: 14.10, 16: 14.10, 19: 14.84,
    20: 15.86, 22: 16.70, 25: 17.51, 28: 18.43, 30: 19.10, 35: 20.60,
  },
  1.5: {
    2: 8.29, 3: 8.79, 4: 9.56, 5: 10.66, 6: 11.59, 7: 11.59, 8: 13.19,
    9: 14.27, 10: 14.89, 12: 15.39, 14: 16.36, 15: 17.26, 16: 17.26,
    19: 18.19, 20: 19.42, 22: 20.47, 24: 21.49, 25: 21.49, 30: 26.00, 31: 26.04,
  },
  2.5: {
    2: 9.23, 3: 10.00, 4: 10.90, 5: 11.93, 6: 13.20, 7: 13.20, 8: 14.81,
    9: 16.06, 10: 16.97, 12: 17.54, 14: 18.44, 15: 19.67, 16: 19.67,
    19: 20.74, 20: 21.92, 22: 23.13, 25: 24.51, 30: 27.01,
  },
  4: {
    2: 11.11, 3: 12.02, 4: 13.12, 5: 14.40, 6: 15.92, 7: 15.92, 8: 17.91,
    9: 19.65, 10: 20.53, 12: 21.44, 14: 22.54, 15: 23.82, 16: 23.82,
    19: 25.34, 20: 26.80, 22: 28.30, 25: 29.95,
  },
};

export const COMANDO_SECTIONS = [0.5, 0.75, 1, 1.5, 2.5, 4];

// Lista de "número de condutores" em ordem crescente, unindo todas as seções
// (nem toda seção tem todas as opções — a busca por seção filtra na hora).
export const COMANDO_CONDUTORES_OPTIONS = [...new Set(
  COMANDO_SECTIONS.flatMap((s) => Object.keys(comandoData[s]).map(Number))
)].sort((a, b) => a - b);

// Seções disponíveis para um dado número de condutores (o inverso —
// mesmo padrão de SECTIONS_BY_VIAS no catálogo de força).
export function getComandoSectionsFor(condutores) {
  return COMANDO_SECTIONS.filter((s) => comandoData[s]?.[condutores] !== undefined);
}

// Sem fallback silencioso: ver comentário equivalente em getDiameter()
// (corfioHEPR.js) — uma combinação sem diâmetro no catálogo é um bug do
// formulário, não algo a resolver inventando uma medida.
export function getComandoDiameter(section, condutores) {
  const d = comandoData[section]?.[condutores];
  if (d === undefined) throw new Error(`Diâmetro não encontrado no catálogo Cablie: comando ${condutores}x${section}mm²`);
  return d;
}
