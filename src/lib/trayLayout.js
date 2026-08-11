// Geometria do desenho do trecho: onde cada bloco fica e de que tamanho o
// canvas precisa ser para conter todos.
//
// Existe separado do TrayVisualization por um motivo específico. O desenho é
// montado em blocos empilhados (estrutura, cota de largura, resumo por bitola)
// mais uma coluna de legenda à direita, e a altura do SVG precisa conter todos
// eles. Enquanto a altura era calculada numa expressão e as posições dos
// blocos noutra, as duas viviam saindo de sincronia — e o sintoma é sempre o
// mesmo: conteúdo desenhado fora do viewBox, invisível na tela e ausente do
// PNG exportado. Aconteceu duas vezes (a descrição da legenda vazando para a
// direita, e o resumo cortado embaixo numa calha mais alta que larga).
//
// Aqui a posição de cada bloco é calculada UMA vez e o canvas é derivado
// dessas mesmas posições. O componente não recalcula coordenada nenhuma: lê
// daqui. Não dá mais para as duas contas discordarem, porque não há duas.

export const PADDING = 64;
export const WALL = 6; // espessura da chapa da eletrocalha (visual)

// ---- Lista de circuitos -----------------------------------------------------
// Fica abaixo do desenho, não numa coluna lateral: a coluna esticava a imagem
// para o lado e, num trecho com muitos circuitos, também para baixo. Aqui a
// lista quebra em colunas de no máximo 10 circuitos, então a altura para de
// crescer depois do décimo e o excedente vai para a coluna ao lado.
export const CIRCUITOS_POR_COLUNA = 10;
export const LEGENDA_W = 250;    // largura de UMA coluna
export const LEGENDA_LINHA = 26; // altura de cada circuito (duas linhas de texto)
export const LEGENDA_TOPO = 20;  // do título até o primeiro circuito

// ---- Resumo por bitola ------------------------------------------------------
export const RESUMO_TOPO = 16;  // do título até a primeira linha
export const RESUMO_LINHA = 12; // altura de cada linha

// Folga entre blocos empilhados (cota → circuitos → resumo).
export const RESUMO_GAP = 16;

// ---- Tamanho na tela --------------------------------------------------------
// O SVG é servido com uma largura em px e `height: auto`, então a altura
// renderizada é a largura vezes a proporção do viewBox. Com uma largura FIXA,
// um desenho estreito e alto (é o que a lista empilhada produz quando há
// poucos circuitos) era ampliado até virar uma parede de pixels. Aqui a
// largura é escolhida para a imagem caber numa caixa, preservando a proporção.
const CAIXA_W = 780;
const CAIXA_H = 700;
const larguraParaCaber = (largura, altura) => Math.min(CAIXA_W, (CAIXA_H * largura) / altura);

// ---- Cotas (largura embaixo, altura à direita) ------------------------------
// Mesmos afastamentos nos dois eixos, medidos a partir da face externa da
// chapa: a linha de cota primeiro, o texto depois.
const COTA_LINHA = 14;
const COTA_TEXTO = 30;
export const COTA_TICK = 4; // meia-altura dos tracinhos nas pontas da cota

// Onde a linha `i` de cada bloco é desenhada (base do texto), em coordenada
// local ao bloco. É daqui que o componente tira o y de cada linha.
export const yCircuito = (i) => LEGENDA_TOPO + i * LEGENDA_LINHA;
export const yLinhaResumo = (i) => RESUMO_TOPO + i * RESUMO_LINHA;

// O circuito `i` da lista: desce até o décimo, depois começa a coluna
// seguinte. Quem desenha não faz essa conta — pede a posição aqui.
export const posicaoCircuito = (i) => ({
  x: Math.floor(i / CIRCUITOS_POR_COLUNA) * LEGENDA_W,
  y: yCircuito(i % CIRCUITOS_POR_COLUNA),
});

export const colunasDeCircuitos = (circuitos) =>
  circuitos ? Math.ceil(circuitos / CIRCUITOS_POR_COLUNA) : 0;

// E a altura do bloco é, por construção, onde a linha seguinte começaria —
// derivada das mesmas funções acima, nunca de uma segunda fórmula. Mexer no
// espaçamento das linhas move a altura junto, sem chance de esquecer. Com a
// quebra em colunas, quem manda é a coluna mais cheia.
export const alturaLegenda = (circuitos) =>
  circuitos ? yCircuito(Math.min(circuitos, CIRCUITOS_POR_COLUNA)) : 0;
export const larguraLegenda = (circuitos) => colunasDeCircuitos(circuitos) * LEGENDA_W;
export const alturaResumo = (bitolas) => (bitolas ? yLinhaResumo(bitolas) + 8 : 0);

// ---- Truncagem de texto -----------------------------------------------------
// SVG não quebra texto sozinho, e sem DOM não dá para medir a fonte. A
// truncagem é por contagem de caracteres, usando larguras médias medidas a
// olho. A fonte não é monoespaçada, então isto erra por sobra — o lado seguro:
// texto cortado cedo demais é melhor do que texto vazando por cima do vizinho.
//
// Quem posiciona algo DEPOIS de um texto truncado tem que medir o texto
// EXIBIDO, nunca o original: foi exatamente essa confusão que fez a descrição
// da legenda sair voando para fora do canvas.
export const CHAR_W_BOLD = 5.6; // 9px, bold
export const CHAR_W_MONO = 5.1; // 8.5px, monoespaçada

export function truncar(texto, maxChars) {
  if (maxChars < 2) return "…";
  return texto.length <= maxChars ? texto : `${texto.slice(0, maxChars - 1)}…`;
}

// Quantos caracteres cabem numa largura, para uma das fontes acima.
export const cabemEm = (largura, charW) => Math.max(0, Math.floor(largura / charW));

// ---- Calha, perfilado, leito, aramado (seção retangular) --------------------
//
// Tudo é desenhado dentro de um grupo transladado para `desenho`, então as
// coordenadas de `cota`, `circuitos` e `resumo` são LOCAIS a ele — empilhadas
// de cima para baixo, cada bloco começando onde o anterior terminou.
export function layoutRetangular({ trayWidth, trayHeight, circuitos = 0, bitolas = 0 }) {
  const temLegenda = circuitos > 0;
  const temResumo = bitolas > 0;

  const desenho = { x: PADDING / 2, y: PADDING / 2 };

  const baseEstrutura = trayHeight + WALL;
  const cota = { linhaY: baseEstrutura + COTA_LINHA, textoY: baseEstrutura + COTA_TEXTO };
  // Cota de altura, na face direita da chapa.
  const faceDireita = trayWidth + WALL;
  const cotaAltura = { linhaX: faceDireita + COTA_LINHA, textoX: faceDireita + COTA_TEXTO };

  // Os blocos de texto ocupam a largura das colunas de circuitos quando há
  // lista; senão acompanham a calha, para o traço do resumo não sobrar.
  const larguraTexto = temLegenda ? larguraLegenda(circuitos) : trayWidth;

  // Pilha: cota de largura → circuitos → resumo.
  const listaCircuitos = temLegenda
    ? { y: cota.textoY + RESUMO_GAP, largura: larguraTexto }
    : null;
  const fimListaLocal = listaCircuitos
    ? listaCircuitos.y + alturaLegenda(circuitos)
    : cota.textoY;
  const resumo = temResumo ? { y: fimListaLocal + RESUMO_GAP, largura: larguraTexto } : null;
  const fimLocal = resumo ? resumo.y + alturaResumo(bitolas) : fimListaLocal;

  // Piso histórico do desenho sozinho: mantém a moldura folgada de sempre
  // quando o conteúdo terminaria antes disso.
  const alturaMinima = trayHeight + PADDING * 1.5;

  const largura = Math.max(trayWidth + PADDING * 2, desenho.x + larguraTexto + PADDING / 2);
  const altura = Math.max(alturaMinima, desenho.y + fimLocal);

  return {
    largura,
    altura,
    // Sem blocos de texto (é o caso da aba Infraestrutura) o desenho continua
    // com a largura de sempre — ali a proporção nunca foi um problema.
    larguraCss: temLegenda || temResumo ? larguraParaCaber(largura, altura) : 520,
    desenho,
    baseEstrutura, // onde a chapa termina — a sombra de apoio se pendura aqui
    cota,
    cotaAltura,
    circuitos: listaCircuitos,
    resumo,
  };
}

// ---- Eletroduto (seção circular) --------------------------------------------
//
// O tubo é desenhado a partir do CENTRO (`centro`), não do canto: as
// coordenadas locais do grupo vão de -outerR a +outerR nos dois eixos.
export function layoutCircular({ outerR, circuitos = 0, bitolas = 0 }) {
  const temLegenda = circuitos > 0;
  const temResumo = bitolas > 0;
  const temTexto = temLegenda || temResumo;

  const lado = (outerR + PADDING) * 2;
  const larguraTexto = temLegenda ? larguraLegenda(circuitos) : 2 * outerR;

  // Havendo bloco de texto embaixo, o tubo ancora no topo — senão o texto
  // teria que perseguir um centro que muda com a altura da lista. Sem texto,
  // o tubo continua centralizado no canvas, como sempre foi.
  const topoTubo = PADDING / 2;

  // Pilha abaixo do tubo, em coordenada local ao centro dele.
  const listaCircuitos = temLegenda
    ? { x: -outerR, y: outerR + RESUMO_GAP, largura: larguraTexto }
    : null;
  const fimListaLocal = listaCircuitos
    ? listaCircuitos.y + alturaLegenda(circuitos)
    : outerR;
  const resumo = temResumo
    ? { x: -outerR, y: fimListaLocal + RESUMO_GAP, largura: larguraTexto }
    : null;
  const fimLocal = resumo ? resumo.y + alturaResumo(bitolas) : fimListaLocal;

  const altura = temTexto ? topoTubo + outerR + fimLocal : lado;
  const largura = Math.max(lado, (lado - 2 * outerR) / 2 + larguraTexto + PADDING / 2);

  return {
    largura,
    altura,
    larguraCss: temTexto ? larguraParaCaber(largura, altura) : 420,
    centro: { x: lado / 2, y: temTexto ? topoTubo + outerR : altura / 2 },
    circuitos: listaCircuitos,
    resumo,
  };
}
