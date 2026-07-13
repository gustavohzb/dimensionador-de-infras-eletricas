// Motor de dimensionamento de circuitos conforme NBR 5410, no modelo da
// planilha "Dimensionamento de Cabos": corrente de projeto (direta ou por
// potência), esquema de condutores carregados, forma de partida de motor,
// condutores em paralelo por fase e até 4 trechos de instalação — o pior
// trecho define a seção por capacidade; a soma das distâncias define a queda.

import {
  TABELAS, SECOES, CONDUTOS, ESQUEMAS, FORMAS_PARTIDA,
  fatorAgrupamento, fatorTemperatura, secaoNeutro, secaoProtecao,
  SECAO_MINIMA_MATERIAL,
} from "../data/cabosNBR5410";

// Resistividade a 90°C (Ω·mm²/m): ρ20 × (1 + α·70).
const RHO = { cobre: 0.022, aluminio: 0.0362 };
// Reatância indutiva típica (Ω/km): unipolares em trifólio/feixe ≈ 0,08;
// cabos multipolares ≈ 0,09. Valor de projeto usual em memoriais.
const REATANCIA = { unipolar: 0.08, multipolar: 0.09 };

export const UNIDADES_POTENCIA = [
  { id: "CV", label: "CV" },
  { id: "kW", label: "kW" },
  { id: "W", label: "W" },
  { id: "kVA", label: "kVA" },
];

// Corrente de projeto a partir da potência informada.
export function correnteDeProjeto({ modo, corrente, potencia, unidade, tensao, fp, rendimento, fatorServico, esquemaId }) {
  const esquema = ESQUEMAS.find((e) => e.id === esquemaId);
  if (!esquema) return { error: "Esquema de condutores inválido." };
  if (modo === "corrente") {
    const i = Number(corrente) * (Number(fatorServico) || 1);
    return i > 0 ? { corrente: i } : { error: "Informe a corrente de projeto." };
  }
  const p = Number(potencia);
  const v = Number(tensao);
  const cosf = Number(fp) || 1;
  const rend = Number(rendimento) || 1;
  if (!(p > 0) || !(v > 0)) return { error: "Informe potência e tensão." };
  const kV = esquema.kQueda === 2 ? v : Math.sqrt(3) * v;
  let watts;
  if (unidade === "CV") watts = p * 736;
  else if (unidade === "kW") watts = p * 1000;
  else if (unidade === "kVA") watts = p * 1000 * cosf; // S → P aparente já com fp na divisão
  else watts = p;
  // kVA: I = S/ (k·V); demais: I = P / (k·V·fp·η)
  const i =
    unidade === "kVA"
      ? (p * 1000) / kV
      : watts / (kV * cosf * rend);
  return { corrente: i * (Number(fatorServico) || 1) };
}

// Designação do circuito no padrão de projeto:
//   unipolar: 3#25mm²+1#25mm²+1#16mm² (fases + neutro + terra)
//   multipolar: 1#4x16mm²+1#16mm² (1 cabo de 4 vias + terra unipolar)
export function designacaoCabos({ esquemaId, tipoCabo, result }) {
  if (!result || result.error) return "—";
  const esquema = ESQUEMAS.find((e) => e.id === esquemaId);
  if (!esquema) return "—";
  const n = result.porFase ?? 1;
  const s = result.secaoFinal;
  const partes = [];
  if (tipoCabo === "multipolar") {
    const vias = esquema.fases + (esquema.neutro ? 1 : 0);
    partes.push(`${n}#${vias}x${s}mm²`);
  } else {
    partes.push(`${esquema.fases * n}#${s}mm²`);
    if (esquema.neutro && result.neutro != null) partes.push(`${n}#${result.neutro}mm²`);
  }
  if (esquema.terra && result.protecao != null) partes.push(`1#${result.protecao}mm²`);
  return partes.join("+");
}

// Coluna de ampacidade para um trecho: devolve função (seção) → A admissível.
function colunaAmpacidade({ material, conduto, tipoCabo, distribuicao, carregados }) {
  const metodo = tipoCabo === "unipolar" ? conduto.uni : conduto.multi;
  const tab = TABELAS[material];
  if (metodo === "F") {
    // Tab. 39 unipolares: espaçados → método G (horizontal); contíguos →
    // trifólio ou mesmo plano justapostos; 2 carregados → coluna própria.
    if (distribuicao === "trifEsp" || distribuicao === "contEsp") {
      return { metodo: "G", get: (s) => tab.G[s]?.[0] };
    }
    if (carregados === 2) return { metodo: "F", get: (s) => tab.F[s]?.[0] };
    if (distribuicao === "contJust") return { metodo: "F", get: (s) => tab.F[s]?.[2] };
    return { metodo: "F", get: (s) => tab.F[s]?.[1] }; // trifólio justaposto
  }
  const col = carregados === 3 ? 1 : 0;
  return { metodo, get: (s) => tab[metodo]?.[s]?.[col] };
}

// Contexto do fator de agrupamento de um trecho.
function contextoAgrupamento(conduto, distribuicao, camadas) {
  if (conduto.agrupamento === "feixe") return "feixe";
  if (conduto.agrupamento === "dutos") return distribuicao || "variosPorDuto";
  const base = conduto.agrupamento; // leito | perfilado
  if (camadas >= 3) return "camadas3";
  if (camadas === 2) return "camadas2";
  return base === "leito" ? "leito1" : "perfilado1";
}

// Queda de tensão percentual para uma seção (por fase, corrente total).
function quedaPct({ secao, corrente, comprimento, tensao, material, tipoCabo, kQueda, fp, porFase }) {
  const r = (RHO[material] * 1000) / (secao * porFase); // Ω/km do conjunto
  const x = REATANCIA[tipoCabo] / porFase;
  const cosf = Math.min(1, Math.max(0, fp));
  const senf = Math.sqrt(1 - cosf * cosf);
  const coef = kQueda * (r * cosf + x * senf); // V/(A·km)
  const dv = (coef * corrente * comprimento) / 1000;
  return (dv / tensao) * 100;
}

export function dimensionarCircuitoPro({
  corrente, // A (já com fator de serviço)
  esquemaId,
  tensao, // tensão de linha (V)
  fp = 0.92,
  material = "cobre", // "cobre" | "aluminio"
  tipoCabo = "unipolar", // "unipolar" | "multipolar"
  porFase = 1, // condutores em paralelo por fase
  formaPartidaId = "nenhuma",
  quedaMaxRegime = 4,
  quedaMaxPartida = 10,
  secaoMinima = null, // mm² (opcional; além do mínimo do material)
  trechos, // [{ condutoId, distribuicao, camadas, circuitos, temperatura, distancia }]
}) {
  const esquema = ESQUEMAS.find((e) => e.id === esquemaId);
  if (!esquema) return { error: "Esquema de condutores inválido." };
  if (!(corrente > 0)) return { error: "Informe a corrente de projeto." };
  if (!trechos?.length) return { error: "Adicione ao menos um trecho." };

  const nPar = Math.max(1, Math.round(porFase));
  const correntePorCabo = corrente / nPar;
  const partida = FORMAS_PARTIDA.find((f) => f.id === formaPartidaId) ?? FORMAS_PARTIDA[0];
  const correntePartida = corrente * partida.fator;

  // --- Capacidade: avalia cada trecho, o pior manda ---
  const detalhesTrechos = [];
  for (const t of trechos) {
    const conduto = CONDUTOS.find((c) => c.id === t.condutoId);
    if (!conduto) return { error: `Conduto inválido no trecho.` };
    const fct = fatorTemperatura(Number(t.temperatura), conduto.subterraneo);
    if (fct == null) return { error: `Temperatura ${t.temperatura}°C fora da Tabela 40.` };
    const ctx = contextoAgrupamento(conduto, t.distribuicao, Number(t.camadas) || 1);
    let fca = fatorAgrupamento(ctx, Number(t.circuitos) || 1);
    if (esquema.harmonicas) fca *= 0.86; // neutro carregado — NBR 5410 Tab. 46
    const col = colunaAmpacidade({
      material, conduto, tipoCabo, distribuicao: t.distribuicao,
      carregados: esquema.carregados,
    });
    const iCorrigida = correntePorCabo / (fct * fca);
    detalhesTrechos.push({
      ...t, conduto, metodo: col.metodo, fct, fca, iCorrigida, getCap: col.get,
    });
  }

  const minMaterial = SECAO_MINIMA_MATERIAL[material] ?? 1.5;
  const minimoAplicado = Math.max(minMaterial, Number(secaoMinima) || 0);

  const secaoCapacidade = SECOES.find((s) =>
    detalhesTrechos.every((t) => (t.getCap(s) ?? 0) >= t.iCorrigida)
  );

  // --- Queda de tensão: comprimento total, corrente de linha ---
  const comprimentoTotal = trechos.reduce((acc, t) => acc + (Number(t.distancia) || 0), 0);
  const checaQueda = comprimentoTotal > 0 && Number(tensao) > 0;
  const argsQueda = {
    corrente, comprimento: comprimentoTotal, tensao: Number(tensao),
    material, tipoCabo, kQueda: esquema.kQueda, fp: Number(fp) || 0.92, porFase: nPar,
  };
  const secaoQuedaRegime = checaQueda
    ? SECOES.find((s) => quedaPct({ ...argsQueda, secao: s }) <= quedaMaxRegime)
    : null;
  const verificaPartida = partida.fator > 1 && checaQueda;
  const secaoQuedaPartida = verificaPartida
    ? SECOES.find((s) => quedaPct({ ...argsQueda, secao: s, corrente: correntePartida }) <= quedaMaxPartida)
    : null;

  if (!secaoCapacidade || (checaQueda && !secaoQuedaRegime) || (verificaPartida && !secaoQuedaPartida)) {
    return {
      error: "Nenhuma seção até 300mm² atende — aumente os condutores por fase ou revise os parâmetros.",
      correntePorCabo, correntePartida, detalhesTrechos,
    };
  }

  const secaoFinal = Math.max(
    secaoCapacidade, secaoQuedaRegime ?? 0, secaoQuedaPartida ?? 0, minimoAplicado
  );

  const candidatos = [
    { criterio: "capacidade", s: secaoCapacidade },
    { criterio: "quedaRegime", s: secaoQuedaRegime ?? 0 },
    { criterio: "quedaPartida", s: secaoQuedaPartida ?? 0 },
    { criterio: "minima", s: minimoAplicado },
  ];
  const criterio = candidatos.filter((c) => c.s === secaoFinal).map((c) => c.criterio)[0];

  // Capacidade corrigida do cabo escolhido no pior trecho
  const piorTrecho = detalhesTrechos.reduce((a, b) =>
    (a.getCap(secaoFinal) ?? 0) * a.fct * a.fca <= (b.getCap(secaoFinal) ?? 0) * b.fct * b.fca ? a : b
  );
  const capacidadeCorrigida = (piorTrecho.getCap(secaoFinal) ?? 0) * piorTrecho.fct * piorTrecho.fca * nPar;

  return {
    corrente,
    correntePorCabo,
    correntePartida: partida.fator > 1 ? correntePartida : null,
    secaoCapacidade,
    secaoQuedaRegime,
    secaoQuedaPartida,
    secaoFinal,
    criterio,
    porFase: nPar,
    capacidadeCorrigida,
    quedaRegime: checaQueda ? quedaPct({ ...argsQueda, secao: secaoFinal }) : null,
    quedaPartida: verificaPartida
      ? quedaPct({ ...argsQueda, secao: secaoFinal, corrente: correntePartida })
      : null,
    neutro: esquema.neutro ? secaoNeutro(secaoFinal, esquema.harmonicas) : null,
    protecao: esquema.terra ? secaoProtecao(secaoFinal) : null,
    comprimentoTotal,
    detalhesTrechos: detalhesTrechos.map(({ getCap, conduto, ...t }) => ({
      ...t,
      condutoLabel: conduto.label,
      capacidadeNominal: getCap(secaoFinal) ?? null,
    })),
  };
}
