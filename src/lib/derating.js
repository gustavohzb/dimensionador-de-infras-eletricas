// Fator de correção por agrupamento de circuitos — NBR 5410 Tabela 42
// (equivalente à IEC 60364-5-52, tabela B.52.17). O fator multiplica a
// capacidade de condução de corrente de cada circuito quando vários
// circuitos compartilham o mesmo trecho de infraestrutura.

export const ARRANJOS = [
  { id: "feixe", label: "Em feixe (eletroduto, canaleta fechada)" },
  { id: "naoPerfurada", label: "Camada única — bandeja não perfurada / superfície" },
  { id: "perfurada", label: "Camada única — bandeja perfurada" },
  { id: "leito", label: "Camada única — leito / suporte" },
  { id: "teto", label: "Camada única — fixado no teto" },
];

// Fatores por número de circuitos: índices 0..7 = 1..8 circuitos,
// depois as faixas 9–11, 12–15, 16–19 e ≥20 da tabela. Para os arranjos
// em camada única a norma não reduz além de 9 circuitos.
const FATORES = {
  feixe: [1.0, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5, 0.45, 0.41, 0.38],
  naoPerfurada: [1.0, 0.85, 0.79, 0.75, 0.73, 0.72, 0.72, 0.71, 0.7, 0.7, 0.7, 0.7],
  teto: [0.95, 0.81, 0.72, 0.68, 0.66, 0.64, 0.63, 0.62, 0.61, 0.61, 0.61, 0.61],
  perfurada: [1.0, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72, 0.72, 0.72, 0.72],
  leito: [1.0, 0.87, 0.82, 0.8, 0.8, 0.79, 0.79, 0.78, 0.78, 0.78, 0.78, 0.78],
};

export function getFator(arranjoId, circuitos) {
  const tabela = FATORES[arranjoId];
  if (!tabela || circuitos < 1) return null;
  if (circuitos <= 8) return tabela[circuitos - 1];
  if (circuitos <= 11) return tabela[8];
  if (circuitos <= 15) return tabela[9];
  if (circuitos <= 19) return tabela[10];
  return tabela[11];
}

// Arranjo típico de cada infraestrutura — só um ponto de partida; o
// usuário ajusta se a bandeja for perfurada, o trecho for no teto etc.
export function defaultArranjo(infraType) {
  switch (infraType) {
    case "eletroduto":
      return "feixe";
    case "leito":
      return "leito";
    case "perfilado":
    case "aramado":
      return "perfurada";
    default:
      return "naoPerfurada"; // eletrocalha lisa
  }
}

// Estimativa do número de circuitos a partir da lista de cabos: cada cabo
// multipolar (ou de comando) é 1 circuito; cada trifólio é 1 circuito; e
// unipolares soltos são agrupados de 3 em 3 por seção (F+F+F ou F+N+PE —
// aproximação, já que o app não sabe a composição real dos circuitos).
export function estimateCircuits(cables) {
  let circuitos = 0;
  const soltos = new Map();
  cables.forEach((c) => {
    if (c.trifolio) circuitos += 1;
    else if (c.type === "unipolar") soltos.set(c.section, (soltos.get(c.section) ?? 0) + 1);
    else circuitos += 1;
  });
  soltos.forEach((n) => {
    circuitos += Math.ceil(n / 3);
  });
  return circuitos;
}
