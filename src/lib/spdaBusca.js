import { EIXOS_FIXOS } from "../data/spdaEsforco";
import { PISO_RT, PROVIDENCIAS_RP, RISCO_TOLERAVEL } from "../data/spdaNBR5419";
import { avaliarRisco } from "./spdaRisco";

// Piso e providências contra incêndio já têm um valor informado no painel
// Estrutura, e trocar por um pior seria absurdo. O eixo é montado na hora, a
// partir do estado: degrau zero é "manter como está" e os degraus seguintes
// são só as opções da tabela com fator menor que o atual.
function eixoQueMelhora({ id, label, campo, tabela, esforcos }, entrada) {
  const atualId = entrada.estrutura[campo];
  const atual = tabela.find((t) => t.id === atualId)?.valor ?? Infinity;
  const melhores = tabela
    .filter((t) => t.valor < atual)
    .sort((a, b) => b.valor - a.valor);

  return {
    id,
    label,
    alvo: "estrutura",
    opcoes: [
      { id: "manter", label: "Manter como está", esforco: 0, patch: {} },
      ...melhores.map((t, i) => ({
        id: t.id,
        label: t.label,
        esforco: esforcos[Math.min(i, esforcos.length - 1)],
        patch: { [campo]: t.id },
      })),
    ],
  };
}

export function montarEixos(entrada) {
  return [
    ...EIXOS_FIXOS,
    eixoQueMelhora(
      { id: "piso", label: "Piso da zona", campo: "piso", tabela: PISO_RT, esforcos: [3, 4, 5] },
      entrada
    ),
    eixoQueMelhora(
      {
        id: "providencias",
        label: "Providências contra incêndio",
        campo: "providencias",
        tabela: PROVIDENCIAS_RP,
        esforcos: [3, 6],
      },
      entrada
    ),
  ];
}

// Monta a entrada que uma combinação representa. Nunca muta a original: a
// busca avalia milhares de candidatas em cima do mesmo estado de partida.
export function aplicarEscolhas(entrada, eixos, indices) {
  const nova = {
    estrutura: { ...entrada.estrutura },
    linhas: entrada.linhas,
    protecoes: { ...entrada.protecoes },
  };
  eixos.forEach((eixo, i) => {
    Object.assign(nova[eixo.alvo], eixo.opcoes[indices[i]].patch);
  });
  return nova;
}

// Atender é passar nos três critérios ao mesmo tempo. Ficar abaixo do risco
// tolerável e reprovar na frequência de danos não serve — são requisitos
// independentes da norma.
export function atendeNorma(resultado) {
  return (
    resultado.r1 <= RISCO_TOLERAVEL.R1 &&
    (resultado.r3 === null || resultado.r3 <= RISCO_TOLERAVEL.R3) &&
    !resultado.precisa.f
  );
}

function piorFrequencia(resultado) {
  if (!resultado.frequencias.length) return null;
  return resultado.frequencias.reduce((a, b) => (a.maior / a.ft >= b.maior / b.ft ? a : b));
}

function descreverEscolhas(eixos, indices) {
  return eixos
    .map((eixo, i) => ({ eixo: eixo.label, ...eixo.opcoes[indices[i]] }))
    .filter((o) => o.esforco > 0)
    .map((o) => ({ eixo: o.eixo, label: o.label, esforco: o.esforco }));
}

// Busca melhor-primeiro sobre a grade de degraus dos eixos.
//
// Por que não força bruta: o produto cartesiano dos eixos passa de um milhão
// de arranjos, e avaliar todos travaria a tela.
//
// Por que a primeira encontrada é a mais barata: a fila devolve sempre o nó de
// menor esforço acumulado, e subir um degrau só soma esforço (nunca subtrai),
// então nenhum arranjo mais barato pode aparecer depois.
//
// Por que não expandir quem já atende: pela monotonicidade, todo filho de uma
// combinação aprovada também é aprovado e custa mais. Expandir só produziria
// variações redundantes da mesma resposta, e as três recomendações sairiam
// praticamente iguais.
export function buscarMedidas(entrada, { maximo = 3, teto = 20000 } = {}) {
  const eixos = montarEixos(entrada);
  const zero = eixos.map(() => 0);

  // Fila de prioridade simples: a grade é pequena o bastante para a inserção
  // ordenada custar menos que manter um heap.
  const fila = [{ indices: zero, esforco: 0 }];
  const vistos = new Set([zero.join(",")]);

  const combinacoes = [];
  let avaliadas = 0;
  let melhorParcial = null;

  while (fila.length && combinacoes.length < maximo && avaliadas < teto) {
    const no = fila.shift();
    const candidata = aplicarEscolhas(entrada, eixos, no.indices);
    const resultado = avaliarRisco(candidata);
    avaliadas++;

    if (atendeNorma(resultado)) {
      combinacoes.push({
        indices: no.indices,
        esforco: no.esforco,
        escolhas: descreverEscolhas(eixos, no.indices),
        r1: resultado.r1,
        r3: resultado.r3,
        piorF: piorFrequencia(resultado),
        entrada: candidata,
      });
      continue; // não expande: os filhos seriam a mesma resposta, mais cara
    }

    if (!melhorParcial || resultado.r1 < melhorParcial.r1) {
      melhorParcial = {
        esforco: no.esforco,
        escolhas: descreverEscolhas(eixos, no.indices),
        r1: resultado.r1,
        r3: resultado.r3,
        piorF: piorFrequencia(resultado),
        entrada: candidata,
      };
    }

    for (let i = 0; i < eixos.length; i++) {
      const proximo = no.indices[i] + 1;
      if (proximo >= eixos[i].opcoes.length) continue;
      const indices = [...no.indices];
      indices[i] = proximo;
      const chave = indices.join(",");
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      const esforco = indices.reduce((acc, idx, j) => acc + eixos[j].opcoes[idx].esforco, 0);
      const filho = { indices, esforco };
      const pos = fila.findIndex((x) => x.esforco > esforco);
      if (pos === -1) fila.push(filho);
      else fila.splice(pos, 0, filho);
    }
  }

  return {
    combinacoes,
    avaliadas,
    // Verdadeiro quando a busca parou sem completar o pedido — ou porque a
    // grade acabou, ou porque bateu o teto de avaliações.
    esgotou: combinacoes.length < maximo,
    melhorParcial,
  };
}
