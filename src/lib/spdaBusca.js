import { EIXOS_FIXOS } from "../data/spdaEsforco";
import { PISO_RT, PROVIDENCIAS_RP, RISCO_TOLERAVEL } from "../data/spdaNBR5419";
import { avaliarRisco } from "./spdaRisco";

// Piso e providências contra incêndio já têm um valor informado no painel
// Estrutura, e trocar por um pior seria absurdo. O eixo é montado na hora, a
// partir do estado: degrau zero é "manter como está" e os degraus seguintes
// são só as opções da tabela com fator menor que o atual.
function eixoQueMelhora({ id, label, campo, tabela, esforcos }, entrada) {
  const atual = tabela.find((t) => t.id === entrada.estrutura[campo]);
  // Id fora da tabela (projeto salvo antes de o catálogo mudar, por exemplo):
  // não dá para saber o que é melhoria. Tratar o desconhecido como o pior
  // valor possível faria o eixo oferecer a tabela inteira como "melhora", e a
  // busca chegaria a recomendar uma troca que PIORA o risco. Sem referência,
  // o eixo só oferece "manter como está".
  const melhores = atual
    ? tabela.filter((t) => t.valor < atual.valor).sort((a, b) => b.valor - a.valor)
    : [];

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

// Partes do estado que `aplicarEscolhas` copia antes de escrever. Um eixo com
// outro `alvo` escreveria direto no objeto do chamador, quebrando a promessa
// de não mutar a entrada original — melhor falhar alto do que corromper.
const ALVOS_COPIADOS = ["estrutura", "protecoes"];

// Escreve um patch do catálogo no estado novo. Valores de array são COPIADOS:
// o `entrada` devolvido por uma combinação vai para a tela, e o primeiro
// `push` em cima de `medidasPta` corromperia o array de EIXOS_FIXOS para o
// resto da sessão — toda busca seguinte aplicaria um conjunto de medidas
// diferente do que ela mesma anuncia.
function aplicarPatch(destino, patch) {
  for (const chave of Object.keys(patch)) {
    const valor = patch[chave];
    destino[chave] = Array.isArray(valor) ? [...valor] : valor;
  }
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
    if (!ALVOS_COPIADOS.includes(eixo.alvo)) {
      throw new Error(`aplicarEscolhas: eixo "${eixo.id}" tem alvo desconhecido "${eixo.alvo}"`);
    }
    aplicarPatch(nova[eixo.alvo], eixo.opcoes[indices[i]].patch);
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

// O quanto a candidata ainda estoura, na pior das três frentes. Cada critério
// é dividido pelo próprio limite — R1 por R1 tolerável, R3 por R3 tolerável e
// o F de cada sistema pelo seu F_T —, o que põe grandezas de unidades
// diferentes na mesma escala: 1 é exatamente o limite, 2 é o dobro dele.
function excessoNormalizado(resultado) {
  let pior = resultado.r1 / RISCO_TOLERAVEL.R1;
  if (resultado.r3 !== null) pior = Math.max(pior, resultado.r3 / RISCO_TOLERAVEL.R3);
  for (const f of resultado.frequencias) pior = Math.max(pior, f.maior / f.ft);
  return pior;
}

function descreverEscolhas(eixos, indices) {
  return eixos
    .map((eixo, i) => ({ eixo: eixo.label, ...eixo.opcoes[indices[i]] }))
    .filter((o) => o.esforco > 0)
    .map((o) => ({ eixo: o.eixo, label: o.label, esforco: o.esforco }));
}

// Fila de prioridade por baldes de custo.
//
// Todo esforço do catálogo é inteiro e não negativo, e o total tem umas poucas
// dezenas de níveis distintos, então dá para indexar um array pelo esforço
// acumulado e varrer um ponteiro para o menor balde não vazio. Inserir e
// remover ficam O(1).
//
// A versão anterior era uma lista mantida ordenada com findIndex + splice, dois
// O(n) por inserção e nove inserções por remoção: no pior caso (20 000
// avaliações) ela respondia por ~96 % do tempo da busca.
//
// A ordem de saída é a mesma de antes — esforço crescente e, dentro do mesmo
// esforço, ordem de inserção. É dela que depende a garantia de que a primeira
// combinação encontrada é a mais barata.
function criarFilaPorCusto(custoMaximo) {
  const baldes = new Array(custoMaximo + 1);
  const lidos = new Array(custoMaximo + 1).fill(0);
  let menor = 0;
  let pendentes = 0;

  return {
    vazia: () => pendentes === 0,
    inserir(no) {
      if (baldes[no.esforco] === undefined) baldes[no.esforco] = [];
      baldes[no.esforco].push(no);
      if (no.esforco < menor) menor = no.esforco;
      pendentes++;
    },
    remover() {
      if (pendentes === 0) return null;
      while (baldes[menor] === undefined || lidos[menor] >= baldes[menor].length) menor++;
      pendentes--;
      return baldes[menor][lidos[menor]++];
    },
  };
}

// Busca melhor-primeiro sobre a grade de degraus dos eixos.
//
// Por que não força bruta: o produto cartesiano dos eixos chega a 600 000
// arranjos. Varrer tudo leva ~2 s; a busca acha as três respostas do galpão
// comum em 3 200 avaliações, uns 17 ms.
//
// Por que a primeira encontrada é a mais barata: a fila devolve sempre o nó de
// menor esforço acumulado, e subir um degrau só soma esforço (nunca subtrai),
// então nenhum arranjo mais barato pode aparecer depois. Conferido por força
// bruta sobre as 600 000 combinações do galpão padrão: das 329 900 que
// atendem, a mais barata tem esforço 13, e é a que a busca devolve primeiro.
//
// Por que não expandir quem já atende: pela monotonicidade, todo filho de uma
// combinação aprovada também é aprovado e custa mais. Expandir só produziria
// variações redundantes da mesma resposta, e as três recomendações sairiam
// praticamente iguais.

// Por padrão a busca varre a grade inteira, e `teto` existe só para quem quiser
// truncá-la de propósito.
//
// Houve uma versão com teto baixo (6 000 avaliações) para caber num orçamento
// de ~100 ms, porque o painel rodava a busca a cada tecla digitada. Medindo
// estruturas reais, esse teto mentia: um galpão com N_G 32 precisa de ~30 000
// avaliações para reunir as três recomendações, e um hospital com risco de
// pânico só tem duas soluções em toda a grade — os dois voltavam com zero
// recomendações, e o painel dizia "nenhuma combinação resolve" quando havia.
//
// Truncar é pior do que demorar: "não existe solução" é uma afirmação forte,
// e só pode ser feita depois de olhar tudo. O painel passou a rodar a busca
// sob demanda, num botão, e com isso o orçamento deixou de ser o quadro de
// render. Varrer as 600 000 combinações leva ~2 s no pior caso.
export function buscarMedidas(entrada, { maximo = 3, teto = null } = {}) {
  const ng = Number(entrada.estrutura?.ng);
  // Sem N_G (município ainda não escolhido) todo número de eventos é zero, e
  // com ele todas as componentes de risco e todas as frequências. O degrau
  // zero "atenderia" à norma e a busca responderia que não falta proteção
  // nenhuma — a coisa mais perigosa que este módulo poderia dizer. Enquanto
  // não houver N_G não há recomendação, e o resultado diz por quê.
  if (!Number.isFinite(ng) || ng <= 0) {
    return { combinacoes: [], avaliadas: 0, esgotou: false, melhorParcial: null, semNg: true };
  }

  const eixos = montarEixos(entrada);
  const zero = eixos.map(() => 0);
  const custoMaximo = eixos.reduce((acc, e) => acc + Math.max(...e.opcoes.map((o) => o.esforco)), 0);

  // Chave do nó em base mista sobre os tamanhos dos eixos: injetora como o
  // antigo join dos índices, mas um inteiro em vez de string. A grade tem no
  // máximo 600 000 arranjos, então cabe com folga num inteiro exato — e um Set
  // de números poupa as centenas de milhares de strings que a busca criava.
  const pesos = new Array(eixos.length);
  let base = 1;
  for (let i = 0; i < eixos.length; i++) {
    pesos[i] = base;
    base *= eixos[i].opcoes.length;
  }
  // Sem teto explícito, o limite fica um passo ACIMA do tamanho da grade. Com
  // isso uma varredura completa nunca marca `esgotou`, e o painel só diz que
  // nada resolve depois de ter olhado cada arranjo — que é a única situação em
  // que essa frase é verdadeira.
  const limite = teto ?? base + 1;
  const chaveDe = (indices) => {
    let k = 0;
    for (let i = 0; i < indices.length; i++) k += indices[i] * pesos[i];
    return k;
  };

  const fila = criarFilaPorCusto(custoMaximo);
  fila.inserir({ indices: zero, esforco: 0 });
  const vistos = new Set([chaveDe(zero)]);

  const combinacoes = [];
  let avaliadas = 0;
  let melhorParcial = null;

  while (!fila.vazia() && combinacoes.length < maximo && avaliadas < limite) {
    const no = fila.remover();
    const candidata = aplicarEscolhas(entrada, eixos, no.indices);
    const resultado = avaliarRisco(candidata);
    avaliadas++;

    if (atendeNorma(resultado)) {
      // Candidata que está em degrau igual ou maior que uma solução já
      // registrada em TODOS os eixos é aquela mesma resposta com medida
      // sobrando. Não expandir quem atende fecha só o caminho direto até ela;
      // pela volta, por outro pai, o supersete ainda chega aqui — e foi assim
      // que a terceira recomendação virava a primeira mais uma medida inútil.
      const redundante = combinacoes.some((c) => no.indices.every((v, k) => v >= c.indices[k]));
      if (!redundante) {
        combinacoes.push({
          indices: no.indices,
          esforco: no.esforco,
          escolhas: descreverEscolhas(eixos, no.indices),
          r1: resultado.r1,
          r3: resultado.r3,
          piorF: piorFrequencia(resultado),
          entrada: candidata,
        });
      }
      continue; // não expande: os filhos seriam a mesma resposta, mais cara
    }

    // O parcial mostrado é o que chegou mais perto de passar nas TRÊS frentes,
    // e não o de menor R1: o critério da busca é R1, R3 e F juntos, e uma
    // candidata ótima em R1 podia estar reprovando feio na frequência de danos.
    const excesso = excessoNormalizado(resultado);
    if (!melhorParcial || excesso < melhorParcial.excesso) {
      melhorParcial = {
        excesso,
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
      const chave = chaveDe(indices);
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      // O esforço sai do vetor de índices inteiro, e não de um acréscimo sobre
      // o do pai: é o que garante que o custo é função pura do nó, e é disso
      // que dependem tanto a otimalidade quanto a segurança de deduplicar por
      // chave — dois caminhos até o mesmo arranjo custam o mesmo.
      let esforco = 0;
      for (let j = 0; j < indices.length; j++) esforco += eixos[j].opcoes[indices[j]].esforco;
      fila.inserir({ indices, esforco });
    }
  }

  return {
    combinacoes,
    avaliadas,
    // Verdadeiro só quando a busca foi truncada pelo teto de avaliações, ou
    // seja, quando pode existir resposta que ela nem chegou a ver. Uma busca
    // que varreu a grade inteira, ou que já entregou o número pedido de
    // recomendações, devolve falso — inclusive a estrutura que atende de
    // saída e por isso tem uma resposta só.
    esgotou: avaliadas >= limite,
    melhorParcial,
    semNg: false,
  };
}
