// Dimensionamento de cabos de ILUMINAÇÃO por queda de tensão (NBR 5410).
//
// O circuito é descrito por trechos: cada trecho tem a distância e quantos
// pontos (luminárias) ele ainda alimenta à jusante — o método clássico de
// carga distribuída. A corrente de cada trecho vem dos pontos acumulados, e
// a queda total é a soma das quedas dos trechos:
//
//   ΔV = Σ 2·ρ·Lj·Ij·cosφ / S      (2 condutores: F-N, F-F ou CC; em CC
//                                    cosφ = 1 e I = P/V)
//
// A reatância é desprezada — em iluminação (seções pequenas, correntes
// baixas) o termo X·senφ é irrelevante frente ao resistivo.
//
// A seção sugerida é a MAIOR entre três critérios da norma:
//  1. queda de tensão ≤ limite (6.2.7 — 4% usual; editável);
//  2. capacidade de condução de corrente (Tabela 36, PVC 70°C, cobre,
//     2 condutores carregados, método de instalação escolhido);
//  3. seção mínima de circuito de iluminação: 1,5 mm² (Tabela 47).
import { PVC_CU } from "../data/nbr5410AmpacidadePvc";

// ρ do cobre = 1/56 Ω·mm²/m — o valor consagrado nas planilhas de projeto
// (σ = 56 m/Ω·mm²). Para condutor operando a 70°C o real é ~15% maior; o
// limite de queda usual (4%) absorve essa margem.
export const RESISTIVIDADE_COBRE = 1 / 56;

// Seção mínima para circuitos de iluminação — NBR 5410, Tabela 47.
export const SECAO_MIN_ILUMINACAO = 1.5;

export function calcularIluminacao({
  sistema, // "ca" (F-N ou F-F) | "cc"
  tensao,
  fp = 1, // fator de potência das luminárias (só CA; drivers LED ~0,92)
  potencia, // W por luminária
  numLuminarias,
  quedaMaxPct,
  metodo = "B1",
  trechos, // [{ distancia (m), pontos (acumulados à jusante) }]
  resistividade = RESISTIVIDADE_COBRE,
}) {
  const validos = (trechos ?? []).filter((t) => t.distancia > 0 && t.pontos > 0);
  if (validos.length === 0) return null;

  const cosfi = sistema === "cc" ? 1 : fp;
  const corrente = (pontos) => (pontos * potencia) / (tensao * cosfi);
  const correnteTotal = corrente(numLuminarias);

  // Momento elétrico Σ L·I — a queda numa seção S é 2·ρ·cosφ·ΣLI/S.
  const somaLI = validos.reduce((a, t) => a + t.distancia * corrente(t.pontos), 0);
  const quedaVolts = (S) => (2 * resistividade * cosfi * somaLI) / S;
  const quedaPct = (S) => (quedaVolts(S) / tensao) * 100;

  const tabela = PVC_CU[metodo] ?? PVC_CU.B1;
  const secoes = Object.keys(tabela).map(Number).sort((a, b) => a - b);

  const secaoPorQueda = secoes.find((s) => quedaPct(s) <= quedaMaxPct) ?? null;
  // Índice 0 = 2 condutores carregados (F-N, F-F e CC são sempre 2).
  const secaoPorAmpacidade = secoes.find((s) => tabela[s][0] >= correnteTotal) ?? null;

  const secaoSugerida =
    secaoPorQueda == null || secaoPorAmpacidade == null
      ? null
      : Math.max(secaoPorQueda, secaoPorAmpacidade, SECAO_MIN_ILUMINACAO);

  // Detalhe por trecho, avaliado na seção sugerida (ou na menor que atende a
  // queda, para a tabela não ficar vazia quando só a ampacidade estourou).
  const secaoDetalhe = secaoSugerida ?? secaoPorQueda ?? secoes[0];
  const detalhe = validos.map((t, i) => {
    const I = corrente(t.pontos);
    const dv = (2 * resistividade * cosfi * t.distancia * I) / secaoDetalhe;
    return {
      numero: i + 1,
      distancia: t.distancia,
      pontos: t.pontos,
      corrente: I,
      quedaVolts: dv,
      quedaPct: (dv / tensao) * 100,
    };
  });

  const avisos = [];
  if (validos[0].pontos !== numLuminarias) {
    avisos.push(
      `O 1º trecho carrega ${validos[0].pontos} ponto(s), mas o circuito tem ${numLuminarias} luminária(s) — o trecho que sai do quadro normalmente alimenta todas.`
    );
  }
  for (let i = 1; i < validos.length; i++) {
    if (validos[i].pontos > validos[i - 1].pontos) {
      avisos.push(
        `Os pontos acumulados crescem do trecho ${i} para o ${i + 1} — à jusante eles só deveriam diminuir.`
      );
      break;
    }
  }

  return {
    correnteTotal,
    somaLI,
    secaoPorQueda,
    secaoPorAmpacidade,
    secaoMinNorma: SECAO_MIN_ILUMINACAO,
    secaoSugerida,
    quedaFinalPct: secaoSugerida != null ? quedaPct(secaoSugerida) : null,
    quedaFinalVolts: secaoSugerida != null ? quedaVolts(secaoSugerida) : null,
    trechos: detalhe,
    avisos,
  };
}
