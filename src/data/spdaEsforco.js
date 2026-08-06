// Catálogo das medidas de proteção que a busca pode recomendar, com o esforço
// de obra de cada degrau.
//
// ATENÇÃO: os pesos NÃO são valor normativo. São julgamento de engenharia
// sobre ordem de grandeza de intervenção — o quanto cada medida mexe na obra,
// não quanto custa em reais. Mudá-los muda apenas a ORDEM em que as
// recomendações aparecem; nunca muda se uma combinação atende ou não à norma,
// que é decidido por R1, R3 e F. Discorde à vontade e ajuste os números.
//
// A escala:
//     0  nada a fazer
//   1–2  ajuste de projeto, sem material novo (roteamento, avisos)
//   3–6  material e mão de obra pontuais (DPS, piso, alarme)
//  7–12  intervenção estrutural (SPDA, malha de blindagem)
//    20  reforma pesada (blindagem metálica contínua)
//
// `alvo` diz em que parte do estado o `patch` é mesclado. Piso e providências
// contra incêndio ficam na estrutura, não nas proteções, e por isso a tela
// avisa que aplicar uma sugestão mexe nos dois painéis.
//
// As listas dentro dos patches são congeladas de propósito. Quem aplica um
// patch tem de COPIAR o array antes de guardá-lo no estado; se algum dia
// alguém guardar a referência e der um push, o congelamento faz isso estourar
// na hora em vez de corromper este catálogo em silêncio pela sessão inteira.

export const EIXOS_FIXOS = [
  {
    id: "spdaNp",
    label: "SPDA",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem SPDA", esforco: 0, patch: { spdaNp: "nenhum" } },
      { id: "npIV", label: "SPDA NP IV", esforco: 7, patch: { spdaNp: "npIV" } },
      { id: "npIII", label: "SPDA NP III", esforco: 8, patch: { spdaNp: "npIII" } },
      { id: "npII", label: "SPDA NP II", esforco: 10, patch: { spdaNp: "npII" } },
      { id: "npI", label: "SPDA NP I", esforco: 12, patch: { spdaNp: "npI" } },
    ],
  },
  {
    id: "dpsNp",
    label: "Sistema coordenado de DPS",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem DPS coordenado", esforco: 0, patch: { dpsNp: "nenhum" } },
      { id: "npIIIIV", label: "DPS para NP III-IV", esforco: 3, patch: { dpsNp: "npIIIIV" } },
      { id: "npII", label: "DPS para NP II", esforco: 4, patch: { dpsNp: "npII" } },
      { id: "npI", label: "DPS para NP I", esforco: 5, patch: { dpsNp: "npI" } },
      { id: "melhorQueNpI", label: "DPS melhores que NP I", esforco: 6, patch: { dpsNp: "melhorQueNpI" } },
    ],
  },
  {
    id: "dpsClasseI",
    label: "DPS classe I na entrada",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhum", label: "Sem DPS classe I", esforco: 0, patch: { dpsClasseI: "nenhum" } },
      { id: "npIIIIV", label: "DPS classe I para NP III-IV", esforco: 3, patch: { dpsClasseI: "npIIIIV" } },
      { id: "npII", label: "DPS classe I para NP II", esforco: 4, patch: { dpsClasseI: "npII" } },
      { id: "npI", label: "DPS classe I para NP I", esforco: 5, patch: { dpsClasseI: "npI" } },
      { id: "melhorQueNpI", label: "DPS classe I melhores que NP I", esforco: 6, patch: { dpsClasseI: "melhorQueNpI" } },
    ],
  },
  {
    id: "fiacao",
    label: "Roteamento da fiação interna",
    alvo: "protecoes",
    opcoes: [
      { id: "semCuidado", label: "Sem cuidado de roteamento", esforco: 0, patch: { fiacao: "semCuidado" } },
      { id: "grandesLacos", label: "Evitando grandes laços", esforco: 1, patch: { fiacao: "grandesLacos" } },
      { id: "lacosMedios", label: "Evitando laços médios", esforco: 2, patch: { fiacao: "lacosMedios" } },
      { id: "pequenosLacos", label: "Evitando pequenos laços", esforco: 4, patch: { fiacao: "pequenosLacos" } },
      { id: "blindado", label: "Cabos blindados ou em condutos metálicos", esforco: 8, patch: { fiacao: "blindado" } },
    ],
  },
  {
    // Conjuntos cumulativos em vez das 32 combinações da Tabela B.1: fora
    // desta ordem as combinações ou não fazem sentido em obra ou repetem o
    // efeito de uma mais barata.
    id: "medidasPta",
    label: "Contra tensões de toque e passo na estrutura",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Nenhuma", esforco: 0, patch: { medidasPta: Object.freeze([]) } },
      { id: "avisos", label: "Avisos de alerta", esforco: 1, patch: { medidasPta: Object.freeze(["avisos"]) } },
      {
        id: "avisosIsolacao",
        label: "Avisos + isolação das descidas",
        esforco: 5,
        patch: { medidasPta: Object.freeze(["avisos", "isolacaoDescidas"]) },
      },
      {
        id: "restricoes",
        label: "Restrições físicas fixas",
        esforco: 9,
        patch: { medidasPta: Object.freeze(["restricoesFisicas"]) },
      },
    ],
  },
  {
    id: "medidasPtu",
    label: "Contra tensões de toque vindas da linha",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Nenhuma", esforco: 0, patch: { medidasPtu: Object.freeze([]) } },
      { id: "avisos", label: "Avisos visíveis", esforco: 1, patch: { medidasPtu: Object.freeze(["avisos"]) } },
      {
        id: "isolacao",
        label: "Avisos + isolação elétrica",
        esforco: 5,
        patch: { medidasPtu: Object.freeze(["avisos", "isolacao"]) },
      },
      {
        id: "restricoes",
        label: "Restrições físicas",
        esforco: 9,
        patch: { medidasPtu: Object.freeze(["restricoesFisicas"]) },
      },
    ],
  },
  {
    // Cinco degraus em vez de um número contínuo: são as larguras que
    // aparecem em projeto, e uma malha intermediária não mudaria a ordem.
    id: "blindagem",
    label: "Blindagem espacial",
    alvo: "protecoes",
    opcoes: [
      { id: "nenhuma", label: "Sem blindagem espacial", esforco: 0, patch: { larguraMalha: null, blindagemContinua: false } },
      { id: "malha5", label: "Malha de 5 m", esforco: 10, patch: { larguraMalha: 5, blindagemContinua: false } },
      { id: "malha2", label: "Malha de 2 m", esforco: 12, patch: { larguraMalha: 2, blindagemContinua: false } },
      { id: "malha05", label: "Malha de 0,5 m", esforco: 15, patch: { larguraMalha: 0.5, blindagemContinua: false } },
      { id: "continua", label: "Blindagem metálica contínua", esforco: 20, patch: { larguraMalha: null, blindagemContinua: true } },
    ],
  },
];

// Teto do esforço somado, usado para dimensionar barras na tela e como
// referência nos testes da busca.
export const ESFORCO_MAXIMO = EIXOS_FIXOS.reduce(
  (acc, e) => acc + Math.max(...e.opcoes.map((o) => o.esforco)),
  0
);
