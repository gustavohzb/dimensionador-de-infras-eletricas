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

// ---- Legenda de circuitos (coluna à direita) --------------------------------
export const LEGENDA_W = 250;    // largura reservada
export const LEGENDA_LINHA = 26; // altura de cada circuito (duas linhas de texto)
export const LEGENDA_TOPO = 20;  // do título até o primeiro circuito
export const LEGENDA_GAP = 50;   // do desenho até a legenda (passa a cota de altura)

// ---- Resumo por bitola (bloco abaixo do desenho) ----------------------------
export const RESUMO_TOPO = 16;  // do título até a primeira linha
export const RESUMO_LINHA = 12; // altura de cada linha
export const RESUMO_GAP = 16;   // folga antes do bloco, seja abaixo da cota
                                // (calha) ou abaixo do tubo (eletroduto)

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

// E a altura do bloco é, por construção, onde a linha seguinte começaria —
// derivada das mesmas funções acima, nunca de uma segunda fórmula. Mexer no
// espaçamento das linhas move a altura junto, sem chance de esquecer.
export const alturaLegenda = (circuitos) => yCircuito(circuitos);
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
// Coordenadas do desenho são LOCAIS ao grupo transladado para `desenho`; as da
// legenda são absolutas no canvas. `resumo.y` é local, como o resto do desenho.
export function layoutRetangular({ trayWidth, trayHeight, circuitos = 0, bitolas = 0 }) {
  const temLegenda = circuitos > 0;
  const temResumo = bitolas > 0;

  const desenho = { x: PADDING / 2, y: PADDING / 2 };

  // Pilha vertical no espaço local, de cima para baixo.
  const baseEstrutura = trayHeight + WALL;
  const cota = { linhaY: baseEstrutura + COTA_LINHA, textoY: baseEstrutura + COTA_TEXTO };
  // Cota de altura, na face direita da chapa.
  const faceDireita = trayWidth + WALL;
  const cotaAltura = { linhaX: faceDireita + COTA_LINHA, textoX: faceDireita + COTA_TEXTO };
  const resumo = temResumo
    ? { y: cota.textoY + RESUMO_GAP, largura: trayWidth }
    : null;

  // Onde o desenho termina, em coordenada absoluta.
  const fimDesenho = desenho.y + (resumo ? resumo.y + alturaResumo(bitolas) : cota.textoY);

  const legenda = temLegenda
    ? { x: desenho.x + trayWidth + LEGENDA_GAP, y: PADDING / 2 }
    : null;
  // A legenda pede a mesma folga embaixo que tem em cima.
  const fimLegenda = legenda ? legenda.y + alturaLegenda(circuitos) + PADDING / 2 : 0;

  // Piso histórico do desenho sem resumo: mantém a moldura folgada de sempre
  // quando o conteúdo terminaria antes disso.
  const alturaMinima = trayHeight + PADDING * 1.5;

  return {
    largura: temLegenda ? legenda.x + LEGENDA_W : trayWidth + PADDING * 2,
    altura: Math.max(alturaMinima, fimDesenho, fimLegenda),
    larguraCss: temLegenda ? 780 : 520,
    desenho,
    baseEstrutura, // onde a chapa termina — a sombra de apoio se pendura aqui
    cota,
    cotaAltura,
    resumo,
    legenda,
  };
}

// ---- Eletroduto (seção circular) --------------------------------------------
//
// O tubo é desenhado a partir do CENTRO (`centro`), não do canto: as
// coordenadas locais do grupo vão de -outerR a +outerR nos dois eixos.
export function layoutCircular({ outerR, circuitos = 0, bitolas = 0 }) {
  const temLegenda = circuitos > 0;
  const temResumo = bitolas > 0;

  const lado = (outerR + PADDING) * 2;
  const legenda = temLegenda ? { x: lado + 6, y: PADDING / 2 } : null;
  const largura = temLegenda ? legenda.x + LEGENDA_W : lado;

  // Com resumo, o tubo ancora no topo — senão o resumo, que fica abaixo dele,
  // teria que perseguir um centro que muda com a altura da legenda. Sem
  // resumo, o tubo continua centralizado no canvas, como sempre foi.
  const resumo = temResumo ? { x: -outerR, y: outerR + RESUMO_GAP, largura: 2 * outerR } : null;
  const topoTubo = PADDING / 2;
  const fimDesenho = temResumo
    ? topoTubo + 2 * outerR + RESUMO_GAP + alturaResumo(bitolas)
    : lado;
  const fimLegenda = legenda ? legenda.y + alturaLegenda(circuitos) + PADDING / 2 : 0;

  const altura = Math.max(fimDesenho, fimLegenda);

  return {
    largura,
    altura,
    larguraCss: temLegenda ? 760 : 420,
    centro: { x: lado / 2, y: temResumo ? topoTubo + outerR : altura / 2 },
    resumo,
    legenda,
  };
}
