import { CAPACIDADE, SECOES, FATOR_TEMPERATURA } from "../data/nbr5410Ampacidade";
import { getFator } from "./derating";

// Dimensionamento de condutores conforme NBR 5410: seção mínima que atende
// (1) a capacidade de condução de corrente corrigida pelos fatores de
// temperatura (Tab. 40) e agrupamento (Tab. 42) e (2) o limite de queda de
// tensão. A maior das duas (respeitando a seção mínima do tipo de circuito)
// é a recomendada.

// Resistividade do cobre (Ω·mm²/m) usada na queda de tensão — valor de
// projeto a 70°C (prática usual de memorial; a 20°C seria 0,0172).
const RHO_COBRE = 0.0206;

// Seções mínimas da NBR 5410 (Tabela 47) por tipo de circuito.
export const TIPOS_CIRCUITO = [
  { id: "iluminacao", label: "Iluminação", minSecao: 1.5 },
  { id: "forca", label: "Força / tomadas", minSecao: 2.5 },
];

export function sizeCable({
  corrente, // corrente de projeto Ib (A)
  sistema, // "mono" (2 condutores carregados) | "tri" (3)
  tensao, // V (FN no mono, FF no tri) — usada na queda
  metodo, // método de instalação: "B1" | "B2" | "C" | "D" | "E"
  tempAmbiente, // °C (chave da Tabela 40)
  arranjo, // arranjo da Tabela 42 (lib/derating)
  circuitos, // nº de circuitos agrupados
  comprimento, // m — 0/null pula a verificação de queda
  quedaMax, // % máxima admitida
  tipoCircuito, // "iluminacao" | "forca"
}) {
  const fct = FATOR_TEMPERATURA[tempAmbiente];
  const fca = getFator(arranjo, circuitos) ?? 1;
  if (!fct) return { error: `Temperatura ambiente ${tempAmbiente}°C fora da Tabela 40.` };
  if (!corrente || corrente <= 0) return { error: "Informe a corrente de projeto." };

  const carregados = sistema === "tri" ? 1 : 0; // índice na tabela [2cond, 3cond]
  const tabela = CAPACIDADE[metodo];
  if (!tabela) return { error: `Método de instalação ${metodo} não cadastrado.` };

  const correnteCorrigida = corrente / (fct * fca);

  // (1) seção mínima pela capacidade de condução
  const secaoCapacidade = SECOES.find((s) => tabela[s][carregados] >= correnteCorrigida);

  // (2) seção mínima pela queda de tensão: ΔV% = k·ρ·L·Ib / (S·V) × 100,
  // com k = 2 no monofásico (ida+volta) e √3 no trifásico.
  const k = sistema === "tri" ? Math.sqrt(3) : 2;
  const quedaPct = (s) => ((k * RHO_COBRE * comprimento * corrente) / (s * tensao)) * 100;
  const checaQueda = comprimento > 0 && tensao > 0;
  const secaoQueda = checaQueda ? SECOES.find((s) => quedaPct(s) <= quedaMax) : null;

  if (!secaoCapacidade || (checaQueda && !secaoQueda)) {
    return {
      error:
        "Nenhuma seção do catálogo (até 300mm²) atende — divida a carga em mais circuitos ou revise os parâmetros.",
      correnteCorrigida,
      fct,
      fca,
    };
  }

  const minSecao = TIPOS_CIRCUITO.find((t) => t.id === tipoCircuito)?.minSecao ?? 1.5;
  const secaoFinal = Math.max(secaoCapacidade, secaoQueda ?? 0, minSecao);

  // Qual critério mandou na escolha (pra mostrar no resultado)
  const criterio =
    secaoFinal === secaoCapacidade && secaoFinal > (secaoQueda ?? 0)
      ? "capacidade"
      : secaoQueda && secaoFinal === secaoQueda && secaoFinal > secaoCapacidade
        ? "queda"
        : secaoFinal > secaoCapacidade && secaoFinal > (secaoQueda ?? 0)
          ? "minima"
          : "capacidade"; // empate: os dois critérios pedem a mesma seção

  return {
    corrente,
    fct,
    fca,
    correnteCorrigida,
    secaoCapacidade,
    secaoQueda,
    secaoFinal,
    criterio,
    capacidadeNominal: tabela[secaoFinal][carregados],
    capacidadeCorrigida: tabela[secaoFinal][carregados] * fct * fca,
    quedaReal: checaQueda ? quedaPct(secaoFinal) : null,
  };
}
