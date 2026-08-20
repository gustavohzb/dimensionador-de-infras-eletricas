// Motor de dimensionamento de cabos isolados de média tensão, ABNT NBR
// 14039:2021. Percorre as seções em ordem crescente e devolve a primeira que
// atende aos quatro critérios, junto com qual deles mandou.
//
// Regra que atravessa o arquivo inteiro: quando a norma não tem tabela para a
// combinação pedida, o motor RECUSA com o motivo declarado. Nunca assume 1,00,
// nunca cai num método vizinho, nunca interpola. A camada de dados marca essas
// ausências com null justamente para que elas cheguem aqui distinguíveis de
// "não passou no critério".
//
// Procedência dos números (a mesma separação que vai ao memorial):
//   - NORMA: ampacidade, todos os fatores de correção, constantes de curto.
//   - NORMA (outra): resistência do condutor a 20 °C, da NBR NM 280, corrigida
//     para a temperatura de operação; e a fórmula de reatância da
//     IEC 60287-1-1.
//   - CATÁLOGO: diâmetro do condutor e diâmetro externo, que alimentam a
//     fórmula da reatância, e a seção da blindagem que o cabo traz de fábrica.
//   - CONVENÇÃO do projetista: o limite de queda de tensão — a NBR 14039 não
//     fixa percentual como a NBR 5410 fixa 4 %.
//   - PREMISSA: só sobram duas, e ambas aparecem em procedencias[] quando são
//     usadas — a reatância informada, quando o cabo não está no catálogo, e a
//     corrente de falta igual ao Icc trifásico no neutro solidamente aterrado.

import {
  FATOR_PROFUNDIDADE,
  FATOR_RESISTIVIDADE_SOLO,
  FATOR_TEMP_AR,
  FATOR_TEMP_SOLO,
  METODOS_COM_CORRECAO_SOLO,
  METODOS_REFERENCIA_AMBIGUA,
  METODOS_SEM_AGRUPAMENTO,
  SECOES_MT,
  TEMPO_MAX_CURTO,
  TEMP_FINAL_BLINDAGEM,
  capacidadeMT,
  fatorAgrupamentoDutos,
  fatorAgrupamentoEncostados,
  fatorAgrupamentoEspacadoEnterrado,
  fatorAgrupamentoMT,
  fatorTemperaturaMT,
  metodoMT,
  secaoMinimaCurtoBlindagem,
  secaoMinimaCurtoCondutor,
} from "../data/cabosNBR14039";
import {
  BLINDAGEM_PADRAO_MM2,
  RESISTENCIA_CC_20,
  geometriaCabo,
  secoesDisponiveis,
} from "../data/cabosPrysmianMT";
import { CAMPOS_AGRUPAMENTO } from "./mtModelo";

// Nome de cada campo de agrupamento como ele aparece na tela, para a mensagem
// de erro citar o campo que o projetista está vendo.
const ROTULO_CAMPO = {
  arranjo: "o arranjo",
  espacamentoRelativo: "o espaçamento e/Dₑ",
  dutos: "o número de dutos",
  espacamento: "o espaçamento entre dutos",
  condutoresIsolados: "o número de condutores isolados",
  regime: "o espaçamento",
  cabos: "o número de cabos",
};

// Coeficiente de variação da resistência com a temperatura, a 20 °C (1/°C).
const ALFA = { cobre: 0.00393, aluminio: 0.00403 };

// Resistividade (Ω·mm²/m) — só usada quando a seção não está na tabela da
// NBR NM 280. Ignora o encordoamento e por isso subestima R em cerca de 12 %.
const RHO_MT = {
  90: { cobre: 0.022, aluminio: 0.0362 },
  105: { cobre: 0.023, aluminio: 0.0379 },
};

export const ATERRAMENTOS_NEUTRO = [
  { id: "solido", label: "Solidamente aterrado", pedeCorrente: false },
  { id: "resistor", label: "Aterrado por resistor de baixa impedância", pedeCorrente: true },
  { id: "isolado", label: "Isolado ou de alta impedância", pedeCorrente: true },
];

// Corrente de projeto. Em MT o caso normal é vir da potência do transformador;
// o modo corrente existe para quem já tem o valor do estudo de carga.
export function correnteDeProjetoMT({ modo, corrente, potenciaKVA, tensao }) {
  if (modo === "corrente") {
    const i = Number(corrente);
    return i > 0 ? { corrente: i } : { error: "Informe a corrente de projeto." };
  }
  const s = Number(potenciaKVA);
  const u = Number(tensao);
  if (!(s > 0) || !(u > 0)) return { error: "Informe a potência (kVA) e a tensão (kV)." };
  return { corrente: (s * 1000) / (Math.sqrt(3) * u * 1000) };
}

// Corrente de falta fase-terra que a blindagem tem de suportar. Sai do
// aterramento do neutro, e o motor devolve de onde ela veio para o memorial
// poder dizer — é o dado com maior chance de estar errado num projeto.
export function correnteDeFalta({ aterramentoNeutro, correnteFalta, iccTrifasico }) {
  if (aterramentoNeutro === "solido") {
    const icc = Number(iccTrifasico);
    if (!(icc > 0)) return { error: "Informe o Icc trifásico." };
    return {
      corrente: icc * 1000,
      origem: "premissa: falta fase-terra igual ao Icc trifásico (neutro solidamente aterrado)",
    };
  }
  const conhecido = ATERRAMENTOS_NEUTRO.some((a) => a.id === aterramentoNeutro);
  if (!conhecido) return { error: `Aterramento do neutro desconhecido: ${aterramentoNeutro}.` };
  const i = Number(correnteFalta);
  if (!(i > 0)) {
    return aterramentoNeutro === "resistor"
      ? { error: "Informe a corrente limitada pelo resistor de aterramento." }
      : { error: "Informe a corrente capacitiva de falta à terra do sistema isolado." };
  }
  const rotulo = aterramentoNeutro === "resistor"
    ? "corrente limitada pelo resistor de aterramento, informada no projeto"
    : "corrente capacitiva do sistema isolado, informada no projeto";
  return { corrente: i, origem: rotulo };
}

// Por que o fator de temperatura veio nulo. Sem isto o usuário recebe "não foi
// possível calcular" e não sabe se errou um campo, se a norma proíbe a
// combinação ou se falta ele decidir alguma coisa.
function motivoFatorTemperatura(t, isolacao) {
  const m = metodoMT(t.metodo);
  if (METODOS_REFERENCIA_AMBIGUA.includes(t.metodo) && !t.referenciaTemp) {
    return `Método ${t.metodo}: a norma não classifica a canaleta fechada no solo como enterrada nem como ao ar, e as duas tabelas dão fatores diferentes. Escolha a referência de temperatura (20 °C, Tabela 31, ou 30 °C, Tabela 30) antes de calcular.`;
  }
  const enterrado = m.enterrado === null ? t.referenciaTemp === "enterrado" : m.enterrado;
  const tabela = enterrado
    ? FATOR_TEMP_SOLO[isolacao]
    : FATOR_TEMP_AR[m.sol ? "exposto" : "abrigado"]?.[isolacao];
  if (!tabela) return `Isolação ${isolacao} °C não tabelada.`;
  if (tabela[t.temperatura] === undefined) {
    return `Temperatura de ${t.temperatura} °C fora da ${enterrado ? "Tabela 31" : "Tabela 30"}, que vai de 10 °C a 80 °C de 5 em 5.`;
  }
  const limite = isolacao === 90 ? 60 : 75;
  return `Método ${t.metodo} é exposto ao sol, e a norma não permite isolação de ${isolacao} °C acima de ${limite} °C de temperatura ambiente (célula "–" da Tabela 30).`;
}

// Fator de agrupamento do trecho para uma seção. Depende da seção em F1, F2,
// G1, G2 e I — por isso é consultado dentro do laço das seções, e não uma vez
// só como na aba de baixa tensão.
function fatorAgrupamentoTrecho(t, secao, formacao = "unipolar") {
  if (!t.agrupado) return 1; // circuito isolado: não há vizinho a corrigir
  const m = t.metodo;
  if (m === "A1") {
    return fatorAgrupamentoMT({
      metodo: "A1", arranjo: t.arranjo, espacamentoRelativo: t.espacamentoRelativo,
      cabo: formacao === "tripolar" ? "tripolar" : "unipolarTrifolio",
    });
  }
  if (m === "F1" || m === "F2" || m === "G1" || m === "G2") {
    return fatorAgrupamentoDutos({
      metodo: m, dutos: Number(t.dutos), secao, espacamento: t.espacamento,
    });
  }
  if (m === "H") return fatorAgrupamentoEncostados(Number(t.condutoresIsolados));
  if (m === "I") {
    return fatorAgrupamentoEspacadoEnterrado({
      regime: t.regime, cabos: Number(t.cabos), secao,
    });
  }
  return null;
}

// Número em português: o app inteiro usa vírgula decimal, e um "0.1326" no
// meio do memorial denuncia que aquele trecho foi escrito por fora.
const br = (n, casas = null) => (casas == null ? String(n) : Number(n).toFixed(casas)).replace(".", ",");

const ISOLACAO_LABEL = { 90: "EPR/XLPE 90 °C", 105: "EPR 105 °C" };

// Designação do cabo para a lista de material. É o único lugar onde a classe de
// tensão aparece: a norma declara em 6.2.5 que a ampacidade tabelada vale para
// todas as classes, então ela não entra em nenhuma conta.
//
// A blindagem entra na designação porque é o que se compra. Num cabo em que ela
// precisou subir de 6 mm² para 70, pedir só "3#1x50 mm² 8,7/15 kV" traz o cabo
// errado da fábrica.
export function designacaoCaboMT({ secao, formacao, classeTensao, isolacao, blindagem }) {
  const veias = formacao === "tripolar" ? `1#3x${secao}` : `3#1x${secao}`;
  const isol = ISOLACAO_LABEL[isolacao] ?? `${isolacao} °C`;
  return `${veias} mm² ${classeTensao} ${isol}, blindagem ${blindagem} mm²`;
}

// Reatância indutiva de cabos unipolares (Ω/km), pela IEC 60287-1-1:
//   X = 2ω·10⁻⁷·ln(2s/d)
// onde s é a distância entre eixos e d o diâmetro do condutor. Os dois números
// vêm da geometria do catálogo, não de um valor de bolso: em trifólio
// encostado a distância entre eixos é o próprio diâmetro externo do cabo.
//
// Devolve null quando o cabo não está no catálogo transcrito — aí quem chama
// usa o valor que o usuário informar, declarado como premissa.
export function reatanciaMT({ classe, secao, espacamento = null, frequencia = 60 }) {
  const g = geometriaCabo({ classe, secao });
  if (!g) return null;
  const s = espacamento != null ? Number(espacamento) : g.diametroExterno;
  const razao = (2 * s) / g.diametroCondutor;
  if (!(razao > 1)) return null;
  const x = 2 * (2 * Math.PI * frequencia) * 1e-7 * Math.log(razao) * 1000;
  return {
    reatancia: x,
    espacamento: s,
    geometria: g,
    origem: `IEC 60287-1-1, com d = ${br(g.diametroCondutor)} mm e s = ${br(s)} mm de ${g.documento}`,
  };
}

// Resistência do condutor na temperatura de operação (Ω/km).
// A NBR NM 280 tabela a resistência a 20 °C do condutor classe 2 já com o
// encordoamento; ρ/S não, e por isso subestima. Só cai em ρ/S quando a seção
// não está tabelada.
function resistenciaMT({ material, secao, isolacao }) {
  const r20 = RESISTENCIA_CC_20[material]?.[secao];
  const alfa = ALFA[material] ?? ALFA.cobre;
  if (r20 != null) {
    return { resistencia: r20 * (1 + alfa * (isolacao - 20)), origem: "norma" };
  }
  const rho = (RHO_MT[isolacao] ?? RHO_MT[90])[material];
  return { resistencia: (rho * 1000) / secao, origem: "resistividade" };
}

// Queda de tensão percentual em regime, circuito trifásico.
// ΔV = √3·I·L·(R·cosφ + X·senφ) / U. Em MT a parcela reativa costuma pesar
// mais que em BT, o que muda qual seção manda.
function quedaPctMT({ corrente, comprimento, tensaoV, resistencia, reatancia, fp }) {
  const cos = Math.min(1, Math.max(0, fp));
  const sen = Math.sqrt(1 - cos * cos);
  const dv = Math.sqrt(3) * corrente * (resistencia * cos + reatancia * sen) * (comprimento / 1000);
  return (dv / tensaoV) * 100;
}

const primeiraSecao = (minima) => SECOES_MT.find((s) => s >= minima) ?? null;

export function dimensionarCircuitoMT({ preset, circuito }) {
  const { material, isolacao, cobertura, fp, quedaMaxRegime, reatancia } = preset;
  const trechos = Array.isArray(circuito?.trechos) ? circuito.trechos : [];
  if (!trechos.length) return { error: "Adicione ao menos um trecho." };

  const ib = correnteDeProjetoMT(circuito);
  if (ib.error) return { error: ib.error };
  const corrente = ib.corrente;

  const tempo = Number(circuito.tempoCurto);
  if (!(tempo > 0)) return { error: "Informe o tempo de atuação da proteção." };
  if (tempo > TEMPO_MAX_CURTO) {
    return { error: `Tempo de curto de ${br(tempo)} s acima do limite de ${TEMPO_MAX_CURTO} s da norma (6.2.6.1.2).` };
  }
  if (TEMP_FINAL_BLINDAGEM[cobertura] === undefined) {
    return { error: `Cobertura "${cobertura}" não está na Tabela 44 — sem ela não há temperatura final da blindagem.` };
  }

  const falta = correnteDeFalta({ ...preset, iccTrifasico: circuito.iccTrifasico });
  if (falta.error) return { error: falta.error };

  const procedencias = [
    { tipo: "convencao", texto: `Queda de tensão máxima de ${br(quedaMaxRegime)} % adotada pelo projetista; a NBR 14039 não fixa limite.` },
  ];
  if (falta.origem.startsWith("premissa")) {
    procedencias.push({ tipo: "premissa", texto: `Corrente de falta fase-terra: ${falta.origem}.` });
  }

  // --- Fatores de cada trecho, o que não depende da seção ---
  const avaliados = [];
  for (const t of trechos) {
    const m = metodoMT(t.metodo);
    if (!m) return { error: `Método de instalação "${t.metodo}" não existe na NBR 14039.` };

    const fatorTemperatura = fatorTemperaturaMT({
      metodo: t.metodo, isolacao, temperatura: t.temperatura, referencia: t.referenciaTemp,
    });
    if (fatorTemperatura == null) return { error: motivoFatorTemperatura(t, isolacao) };

    if (METODOS_REFERENCIA_AMBIGUA.includes(t.metodo)) {
      const tabela = t.referenciaTemp === "enterrado" ? 31 : 30;
      procedencias.push({
        tipo: "decisao",
        texto: `Método ${t.metodo} (canaleta fechada no solo): adotada a Tabela ${tabela} (referência de ${t.referenciaTemp === "enterrado" ? 20 : 30} °C). A norma não classifica C e D como enterrados nem como ao ar.`,
      });
    }

    if (t.agrupado && METODOS_SEM_AGRUPAMENTO.includes(t.metodo)) {
      return { error: `O método ${t.metodo} não tem tabela de agrupamento na NBR 14039. Com mais de um circuito, o fator precisa ser calculado pela IEC 60287-2-2.` };
    }
    // Campo em branco e combinação inexistente são coisas diferentes, e a
    // mensagem tem de separar as duas: uma manda o projetista preencher, a
    // outra manda ele procurar outro arranjo porque a norma não tabela aquele.
    if (t.agrupado) {
      const faltando = (CAMPOS_AGRUPAMENTO[t.metodo] ?? []).filter(
        (campo) => t[campo] === null || t[campo] === undefined || t[campo] === ""
      );
      if (faltando.length) {
        return { error: `Agrupamento do método ${t.metodo}: preencha ${faltando.map((c) => ROTULO_CAMPO[c] ?? c).join(", ")}.` };
      }
      // Fator nulo em TODAS as seções é entrada inválida (contagem de dutos ou
      // arranjo que a tabela não tem), não seção fora de faixa.
      if (SECOES_MT.every((s) => fatorAgrupamentoTrecho(t, s, circuito.formacao) == null)) {
        return { error: `Agrupamento do método ${t.metodo}: a combinação informada não está na tabela da norma.` };
      }
    }

    const correcaoSoloAplicavel = METODOS_COM_CORRECAO_SOLO.includes(t.metodo);
    let fatorResistividade = 1;
    let fatorProfundidade = 1;
    if (correcaoSoloAplicavel) {
      fatorResistividade = FATOR_RESISTIVIDADE_SOLO[t.metodo][t.resistividadeSolo];
      fatorProfundidade = FATOR_PROFUNDIDADE[t.metodo][t.profundidade];
      if (fatorResistividade === undefined) {
        return { error: `Resistividade térmica de ${br(t.resistividadeSolo)} K·m/W fora da Tabela 32.` };
      }
      if (fatorProfundidade === undefined) {
        return { error: `Profundidade de ${br(t.profundidade)} m fora da Tabela 33.` };
      }
    }

    avaliados.push({
      ...t,
      metodoLabel: m.label,
      fatorTemperatura,
      fatorResistividade,
      fatorProfundidade,
      correcaoSoloAplicavel,
    });
  }

  // --- Critério 1: capacidade de condução, o pior trecho manda ---
  const capacidadeCorrigida = (t, secao) => {
    const nominal = capacidadeMT({ isolacao, material, secao, metodo: t.metodo });
    if (nominal == null) return null; // célula "–": combinação não tabelada
    const fa = fatorAgrupamentoTrecho(t, secao, circuito.formacao);
    if (fa == null) return null;
    return nominal * t.fatorTemperatura * fa * t.fatorResistividade * t.fatorProfundidade;
  };
  const secaoCapacidade = SECOES_MT.find((s) =>
    avaliados.every((t) => (capacidadeCorrigida(t, s) ?? 0) >= corrente)
  ) ?? null;

  // --- Critério 2: queda de tensão em regime ---
  // R e X mudam com a seção, então os dois são consultados dentro do laço.
  const comprimentoTotal = trechos.reduce((acc, t) => acc + (Number(t.distancia) || 0), 0);
  const tensaoV = Number(circuito.tensao) * 1000;
  const checaQueda = comprimentoTotal > 0 && tensaoV > 0;
  const eletricos = (secao) => {
    const x = reatanciaMT({
      classe: preset.classeTensao, secao, espacamento: circuito.espacamentoCabos ?? null,
    });
    const r = resistenciaMT({ material, secao, isolacao });
    return {
      resistencia: r.resistencia,
      origemResistencia: r.origem,
      reatancia: x ? x.reatancia : Number(reatancia),
      origemReatancia: x ? x.origem : null,
    };
  };
  const argsQueda = { corrente, comprimento: comprimentoTotal, tensaoV, fp: Number(fp) };
  const quedaEm = (secao) => {
    const e = eletricos(secao);
    return quedaPctMT({ ...argsQueda, resistencia: e.resistencia, reatancia: e.reatancia });
  };
  const secaoQuedaRegime = checaQueda
    ? SECOES_MT.find((s) => quedaEm(s) <= quedaMaxRegime) ?? null
    : null;

  // --- Critério 3: curto-circuito no condutor ---
  const minCurto = secaoMinimaCurtoCondutor({
    corrente: Number(circuito.iccTrifasico) * 1000,
    tempo, material, isolacao, conexaoSoldada: circuito.conexaoSoldada,
  });
  if (minCurto == null) return { error: "Não foi possível calcular o curto no condutor com os dados informados." };
  const secaoCurtoCondutor = primeiraSecao(minCurto);

  // --- Critério 4: curto-circuito na blindagem ---
  const minBlindagem = secaoMinimaCurtoBlindagem({
    corrente: falta.corrente, tempo, isolacao, cobertura,
    conexaoSoldada: circuito.conexaoSoldada,
  });
  if (minBlindagem == null) return { error: "Não foi possível calcular o curto na blindagem com os dados informados." };
  // A blindagem do Eprotenax é de 6 mm² em TODA a linha — não acompanha a
  // seção do condutor. Por isso este critério não escolhe seção de condutor
  // como os outros três: ele aprova ou reprova a blindagem especificada.
  // Engrossar o cabo não resolve; o que resolve é encomendar blindagem maior.
  const especificada = Number(circuito.blindagemEspecificada) > 0
    ? Number(circuito.blindagemEspecificada)
    : BLINDAGEM_PADRAO_MM2;
  const blindagem = {
    secaoMinima: minBlindagem,
    secaoEspecificada: especificada,
    atende: especificada >= minBlindagem,
    correnteFalta: falta.corrente,
    origemCorrente: falta.origem,
    padraoDoCatalogo: BLINDAGEM_PADRAO_MM2,
    designacao: `blindagem de ${especificada} mm²`,
  };

  if (!blindagem.atende) {
    return {
      error: `A blindagem de ${especificada} mm² não suporta a falta fase-terra de ${Math.round(falta.corrente)} A por ${br(tempo)} s: são necessários ${Math.ceil(minBlindagem)} mm². A blindagem padrão do catálogo é de ${BLINDAGEM_PADRAO_MM2} mm² e é a mesma em qualquer seção de condutor — aumentar o cabo não resolve, é preciso especificar blindagem maior (sob consulta).`,
      blindagem,
    };
  }
  if (!secaoCapacidade || (checaQueda && !secaoQuedaRegime) || !secaoCurtoCondutor) {
    const faltou = [
      !secaoCapacidade && "capacidade de condução",
      checaQueda && !secaoQuedaRegime && "queda de tensão",
      !secaoCurtoCondutor && "curto no condutor",
    ].filter(Boolean);
    return {
      error: `Nenhuma seção até ${SECOES_MT[SECOES_MT.length - 1]} mm² atende: ${faltou.join(", ")}.`,
      corrente, trechos: avaliados, blindagem,
    };
  }

  const candidatos = [
    { criterio: "capacidade", s: secaoCapacidade },
    { criterio: "quedaRegime", s: secaoQuedaRegime ?? 0 },
    { criterio: "curtoCondutor", s: secaoCurtoCondutor },
  ];
  const secaoFinal = Math.max(...candidatos.map((c) => c.s));
  const criterio = candidatos.find((c) => c.s === secaoFinal).criterio;

  // A norma tabela capacidade desde 10 mm², mas o catálogo não fabrica todas as
  // seções em todas as classes. Calcular e não avisar seria mandar especificar
  // cabo que não existe.
  const secoesDoCatalogo = secoesDisponiveis(preset.classeTensao);
  const catalogoConhecido = secoesDoCatalogo.length > 0;
  const finais = eletricos(secaoFinal);
  if (finais.origemReatancia) {
    procedencias.push({ tipo: "catalogo", texto: `Reatância de ${br(finais.reatancia, 4)} Ω/km calculada pela ${finais.origemReatancia}.` });
  } else {
    procedencias.push({ tipo: "premissa", texto: `Reatância de ${br(reatancia)} Ω/km informada; o cabo não está no catálogo transcrito e a NBR 14039 não tabela impedância.` });
  }

  return {
    corrente,
    secaoCapacidade,
    secaoQuedaRegime,
    secaoCurtoCondutor,
    secaoMinimaCurtoCondutor: minCurto,
    secaoFinal,
    criterio,
    secaoComercial: catalogoConhecido ? (secoesDoCatalogo.find((s) => s >= secaoFinal) ?? null) : null,
    disponivelNoCatalogo: catalogoConhecido ? secoesDoCatalogo.includes(secaoFinal) : null,
    designacao: designacaoCaboMT({
      secao: secaoFinal,
      formacao: circuito.formacao,
      classeTensao: preset.classeTensao,
      isolacao,
      blindagem: blindagem.secaoEspecificada,
    }),
    reatanciaUsada: finais.reatancia,
    resistenciaUsada: finais.resistencia,
    comprimentoTotal,
    quedaRegime: checaQueda ? quedaEm(secaoFinal) : null,
    blindagem,
    procedencias,
    trechos: avaliados.map((t) => ({
      ...t,
      fatorAgrupamento: fatorAgrupamentoTrecho(t, secaoFinal, circuito.formacao),
      capacidadeNominal: capacidadeMT({ isolacao, material, secao: secaoFinal, metodo: t.metodo }),
      capacidadeCorrigida: capacidadeCorrigida(t, secaoFinal),
    })),
  };
}
