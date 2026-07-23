// Dimensionamento de cabos de ILUMINAÇÃO por queda de tensão (NBR 5410),
// com o circuito descrito como uma ÁRVORE (diagrama): do quadro saem trechos
// que podem derivar em caixas de passagem ou nas próprias luminárias.
//
// Cada ligação (trecho) carrega a corrente das luminárias à jusante dela:
//
//   I_e = pontos_jusante × P / (V·cosφ)        (CC: cosφ = 1)
//   ΔV_e = 2·ρ·L_e·I_e·cosφ / S_e              (2 condutores: F-N, F-F ou CC;
//                                               reatância desprezada)
//
// A seção é POR TRECHO: cada ligação recebe a menor seção comercial que
// atende (1) a queda acumulada ≤ limite em TODO caminho quadro→luminária,
// (2) a ampacidade (Tab. 36, PVC, 2 carregados) e (3) o mínimo de iluminação
// de 1,5 mm² (Tab. 47).
//
// O rateio inicial da queda usa gradiente constante: o trecho e recebe do
// limite a fração L_e / (maior caminho que passa por e), o que garante que a
// soma ao longo de qualquer caminho não estoura o limite. Como o
// arredondamento comercial gera folga, uma passada de relaxação (das pontas
// para o quadro) tenta reduzir cada trecho enquanto todos os caminhos
// continuarem dentro do limite — é isso que faz tronco grosso e ramal fino.
import { PVC_CU } from "../data/nbr5410AmpacidadePvc";
import { RESISTIVIDADE_COBRE, SECAO_MIN_ILUMINACAO } from "./lightingDrop";

export { RESISTIVIDADE_COBRE, SECAO_MIN_ILUMINACAO };

export function calcularIluminacaoArvore({
  sistema, // "ca" (F-N ou F-F) | "cc"
  tensao,
  fp = 1,
  potencia, // W por luminária
  quedaMaxPct,
  metodo = "B1", // método de instalação padrão; cada ligação pode sobrepor
  nos, // [{ id, tipo: "quadro"|"luminaria"|"caixa", qtd? }]
  ligacoes, // [{ id, de, para, distancia (m), metodo? }]
  resistividade = RESISTIVIDADE_COBRE,
}) {
  const quadro = (nos ?? []).find((n) => n.tipo === "quadro");
  const arestas = (ligacoes ?? []).filter((l) => l.distancia > 0);
  if (!quadro || arestas.length === 0) return null;

  const erros = [];
  const avisos = [];
  const porId = new Map(nos.map((n) => [n.id, n]));

  // ---- Estrutura: cada nó tem no máximo um pai; sem ciclos. ----
  const filhos = new Map(); // id do nó → [ligações que saem dele]
  const pai = new Map(); // id do nó → ligação que chega nele
  for (const l of arestas) {
    if (!porId.has(l.de) || !porId.has(l.para)) continue;
    if (pai.has(l.para) || l.para === quadro.id) {
      erros.push("Há um nó recebendo mais de uma ligação (ou uma ligação chegando no quadro) — cada ponto deve ser alimentado por um único trecho.");
      continue;
    }
    pai.set(l.para, l);
    if (!filhos.has(l.de)) filhos.set(l.de, []);
    filhos.get(l.de).push(l);
  }

  // BFS a partir do quadro — o que não for alcançado fica fora do cálculo.
  const alcancados = new Set([quadro.id]);
  const ordem = []; // ligações em ordem de profundidade crescente
  const profundidade = new Map(); // id da ligação → profundidade
  const fila = [quadro.id];
  while (fila.length) {
    const id = fila.shift();
    for (const l of filhos.get(id) ?? []) {
      if (alcancados.has(l.para)) {
        erros.push("O diagrama tem um ciclo — o circuito deve ser uma árvore saindo do quadro.");
        continue;
      }
      alcancados.add(l.para);
      profundidade.set(l.id, (profundidade.get(pai.get(id)?.id) ?? 0) + 1);
      ordem.push(l);
      fila.push(l.para);
    }
  }
  const desconectados = nos.filter((n) => !alcancados.has(n.id));
  if (desconectados.length > 0) {
    avisos.push(
      `${desconectados.length} nó(s) fora do circuito (sem caminho até o quadro) — ligue-os ou remova-os; eles não entram no cálculo.`
    );
  }
  if (erros.length > 0) return { erros, avisos, ligacoes: [], nos: [], numLuminarias: 0 };
  if (ordem.length === 0) return null;

  // ---- Grandezas elétricas por trecho. ----
  const cosfi = sistema === "cc" ? 1 : fp;
  const dvMax = (quedaMaxPct / 100) * tensao;

  // Pontos (luminárias) na subárvore de cada nó, folhas mais fundas primeiro.
  const pontosDe = new Map();
  const distQuadro = new Map([[quadro.id, 0]]);
  for (const l of ordem) distQuadro.set(l.para, distQuadro.get(l.de) + l.distancia);
  for (let i = ordem.length - 1; i >= 0; i--) {
    const l = ordem[i];
    const no = porId.get(l.para);
    const proprios = no.tipo === "luminaria" ? (no.qtd ?? 1) : 0;
    const dosFilhos = (filhos.get(l.para) ?? []).reduce((a, f) => a + (pontosDe.get(f.para) ?? 0), 0);
    pontosDe.set(l.para, proprios + dosFilhos);
  }
  const numLuminarias = (filhos.get(quadro.id) ?? []).reduce((a, l) => a + pontosDe.get(l.para), 0);
  const correnteTotal = (numLuminarias * potencia) / (tensao * cosfi);

  // Maior caminho quadro→luminária que passa por cada trecho (para o rateio).
  const maiorCaminho = new Map();
  for (let i = ordem.length - 1; i >= 0; i--) {
    const l = ordem[i];
    const no = porId.get(l.para);
    const dosFilhos = (filhos.get(l.para) ?? [])
      .map((f) => maiorCaminho.get(f.id) ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);
    // Só caminhos que terminam em luminária contam como "desfavoráveis".
    const proprio = no.tipo === "luminaria" ? distQuadro.get(l.para) : 0;
    maiorCaminho.set(l.id, Math.max(proprio, dosFilhos));
  }

  // Seções comerciais (iguais em todas as tabelas de método) e ampacidade
  // por trecho — cada ligação pode ter seu próprio método de instalação.
  const secoes = Object.keys(PVC_CU[metodo] ?? PVC_CU.B1).map(Number).sort((a, b) => a - b);
  const comercial = (minimo) => secoes.find((s) => s >= minimo) ?? null;

  const info = new Map(); // id da ligação → resultado mutável
  let semCarga = false;
  for (const l of ordem) {
    const pontos = pontosDe.get(l.para);
    const corrente = (pontos * potencia) / (tensao * cosfi);
    if (pontos === 0) semCarga = true;
    const metodoTrecho = l.metodo && PVC_CU[l.metodo] ? l.metodo : metodo;
    const tabela = PVC_CU[metodoTrecho] ?? PVC_CU.B1;
    // Gradiente constante: S ≥ 2·ρ·cosφ·I·(maior caminho por e)/ΔVmax.
    // (O L do trecho cancela: queda alocada = ΔVmax·L/maiorCaminho.)
    const sQueda = pontos > 0 ? (2 * resistividade * cosfi * corrente * maiorCaminho.get(l.id)) / dvMax : 0;
    const secaoPorAmpacidade = secoes.find((s) => tabela[s][0] >= corrente) ?? null;
    const secao =
      secaoPorAmpacidade == null ? null : comercial(Math.max(sQueda, secaoPorAmpacidade, SECAO_MIN_ILUMINACAO));
    info.set(l.id, { ligacao: l, pontos, corrente, metodo: metodoTrecho, secaoPorAmpacidade, secao });
  }

  if (semCarga) {
    avisos.push("Há trecho(s) sem nenhuma luminária à jusante — receberam a seção mínima (1,5 mm²), mas confira o diagrama.");
  }

  const dimensionado = [...info.values()].every((e) => e.secao != null);

  // Queda acumulada em cada nó com as seções atuais.
  const quedaVoltsTrecho = (e) =>
    e.secao == null || e.pontos === 0 ? 0 : (2 * resistividade * cosfi * e.ligacao.distancia * e.corrente) / e.secao;
  const quedaAcumulada = () => {
    const acc = new Map([[quadro.id, 0]]);
    for (const l of ordem) acc.set(l.para, acc.get(l.de) + quedaVoltsTrecho(info.get(l.id)));
    return acc;
  };
  const todasDentro = (acc) =>
    nos.every((n) => n.tipo !== "luminaria" || !alcancados.has(n.id) || acc.get(n.id) <= dvMax + 1e-9);

  // ---- Relaxação: das pontas para o quadro, tenta reduzir cada seção. ----
  if (dimensionado) {
    const porProfundidade = [...ordem].sort((a, b) => profundidade.get(b.id) - profundidade.get(a.id));
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const l of porProfundidade) {
        const e = info.get(l.id);
        const piso = Math.max(e.secaoPorAmpacidade, SECAO_MIN_ILUMINACAO);
        let idx = secoes.indexOf(e.secao);
        while (idx > 0 && secoes[idx - 1] >= piso) {
          const anterior = e.secao;
          e.secao = secoes[idx - 1];
          if (todasDentro(quedaAcumulada())) {
            idx--;
            mudou = true;
          } else {
            e.secao = anterior;
            break;
          }
        }
      }
    }
  }

  // ---- Resultado. ----
  const acc = quedaAcumulada();
  const detalheLigacoes = ordem.map((l) => {
    const e = info.get(l.id);
    const dv = quedaVoltsTrecho(e);
    return {
      id: l.id,
      de: l.de,
      para: l.para,
      distancia: l.distancia,
      pontos: e.pontos,
      corrente: e.corrente,
      metodo: e.metodo,
      secao: e.pontos === 0 ? SECAO_MIN_ILUMINACAO : e.secao,
      secaoPorAmpacidade: e.secaoPorAmpacidade,
      quedaVolts: dv,
      quedaPct: (dv / tensao) * 100,
      quedaAcumPct: (acc.get(l.para) / tensao) * 100,
    };
  });

  // Luminária mais desfavorável (pior caminho).
  let pior = null;
  for (const n of nos) {
    if (n.tipo !== "luminaria" || !alcancados.has(n.id)) continue;
    const pct = (acc.get(n.id) / tensao) * 100;
    if (!pior || pct > pior.quedaPct) pior = { noId: n.id, quedaPct: pct, quedaVolts: acc.get(n.id) };
  }

  const detalheNos = [...alcancados].map((id) => ({
    id,
    quedaAcumVolts: acc.get(id),
    quedaAcumPct: (acc.get(id) / tensao) * 100,
  }));

  return {
    erros,
    avisos,
    numLuminarias,
    correnteTotal,
    dimensionado,
    dentroLimite: dimensionado && pior != null && pior.quedaPct <= quedaMaxPct + 1e-9,
    ligacoes: detalheLigacoes,
    nos: detalheNos,
    piorCaminho: pior,
  };
}
