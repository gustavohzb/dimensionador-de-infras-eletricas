// Tema compartilhado dos memoriais em PDF: cores, cabeçalho com emblema,
// tabela com bordas, ficha e numeração de página.
//
// Atenção WinAnsi (fonte padrão do jsPDF): sem "→", "≥", "Δ" ou "ρ" — usar
// "->", ">=" e "Queda". Acentos, "×", "²" e "…" existem e são ok.

// As cores que os geradores de PDF do app repetiam como literais RGB soltos.
// Congelado: são espalhadas por spread em dezenas de chamadas, e uma mutação
// acidental valeria pelo resto da sessão.
export const TEMA = Object.freeze({
  copper: [180, 98, 42],
  copperClaro: [243, 227, 214],
  tinta: [30, 41, 59],
  suave: [100, 116, 139],
  linha: [203, 213, 225],
  zebra: [248, 250, 252],
  ok: [5, 150, 105],
  erro: [220, 38, 38],
});

// Corta o texto pela largura real disponível (mm). Truncar por número fixo de
// caracteres deixa colunas estreitas vazarem por cima da coluna seguinte, que
// era o defeito do memorial antigo. `medir` é injetado porque medir texto de
// verdade exige um documento jsPDF, e isto precisa ser testável sem um.
export function ajustarLargura(texto, maxWidth, medir) {
  if (medir(texto) <= maxWidth) return texto;
  let cut = texto;
  while (cut.length > 1 && medir(`${cut}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// Posições x acumuladas de colunas de largura fixa. `sobra` negativa avisa que
// as colunas não cabem na largura útil da página — quem chama decide o que
// fazer, o helper só reporta.
export function distribuirColunas(larguras, x0, larguraUtil) {
  const xs = [];
  let x = x0;
  for (const w of larguras) {
    xs.push(x);
    x += w;
  }
  return { xs, total: x - x0, sobra: larguraUtil - (x - x0) };
}
