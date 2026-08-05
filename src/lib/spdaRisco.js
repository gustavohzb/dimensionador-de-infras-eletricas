// Gerenciamento de risco da ABNT NBR 5419-2:2026 — motor de cálculo.
//
// Só funções puras: recebe o objeto de entrada da aba e devolve números.
// As tabelas normativas ficam em data/spdaNBR5419.js; as fórmulas, aqui.
// Referências entre parênteses são as equações e tabelas da norma.

import {
  LOCALIZACAO_CD, INSTALACAO_CI, TIPO_LINHA_CT, AMBIENTE_CE,
} from "../data/spdaNBR5419";

// Busca o valor de uma tabela pelo id. Id desconhecido devolve 0 em vez de
// NaN: um fator ausente zera a componente, o que é visível no resultado, ao
// passo que NaN se espalharia silenciosamente por todas as somas.
export function fator(tabela, id) {
  return tabela.find((t) => t.id === id)?.valor ?? 0;
}

// A.1 — área de exposição equivalente da estrutura. Com saliência na cobertura
// (A.2), vale o maior entre a área da estrutura e a da saliência.
export function areaExposicaoEstrutura({ L, W, H, Hp = null }) {
  const ad = L * W + 2 * (3 * H) * (L + W) + Math.PI * (3 * H) ** 2;
  if (!Hp) return ad;
  return Math.max(ad, Math.PI * (3 * Hp) ** 2);
}

// A.6 — área de exposição de descargas próximas da estrutura (até 500 m).
export function areaExposicaoProxima({ L, W }) {
  return 2 * 500 * (L + W) + Math.PI * 500 ** 2;
}

// A.8 e A.10 — áreas de exposição da linha elétrica e das descargas próximas.
export function areasLinha(ll) {
  return { al: 40 * ll, ai: 4000 * ll };
}

// A.3 a A.9 — números médios anuais de eventos perigosos.
export function numeroEventos({ estrutura, linhas = [] }) {
  const ng = Number(estrutura.ng) || 0;
  const ad = areaExposicaoEstrutura(estrutura);
  const am = areaExposicaoProxima(estrutura);
  const nd = ng * ad * fator(LOCALIZACAO_CD, estrutura.cd) * 1e-6; // (A.3)
  const nm = ng * am * 1e-6; // (A.5)

  const porLinha = linhas.map((linha) => {
    const { al, ai } = areasLinha(Number(linha.ll) || 0);
    const ci = fator(INSTALACAO_CI, linha.ci);
    const ce = fator(AMBIENTE_CE, linha.ce);
    const ct = fator(TIPO_LINHA_CT, linha.ct);
    // (A.4) — só quando há estrutura adjacente na outra ponta da linha.
    const ndj = linha.adjacente
      ? ng * areaExposicaoEstrutura(linha.adjacente) * fator(LOCALIZACAO_CD, linha.adjacente.cd) * ct * 1e-6
      : 0;
    return {
      id: linha.id,
      al,
      ai,
      nl: ng * al * ci * ce * ct * 1e-6, // (A.7)
      ni: ng * ai * ci * ce * ct * 1e-6, // (A.9)
      ndj,
    };
  });

  return { nd, nm, ad, am, porLinha };
}
