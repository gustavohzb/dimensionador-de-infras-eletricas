// Próximo número de uma sequência de rótulos ("L1", "AL-03", "Circuito 2"…).
//
// Nomear pelo TAMANHO da lista (`lista.length + 1`) quebra em dois casos
// reais: depois de remover um item do meio (a contagem volta a um número já
// usado) e em dois cliques no mesmo lote de render (ambos leem o mesmo
// tamanho). Aqui o próximo número vem do MAIOR já usado, então nunca colide
// com um rótulo existente — e a função é pura, para ser chamada de dentro do
// updater funcional do setState, que sempre enxerga o estado fresco.
export function proximoNumero(rotulos, padrao) {
  const usados = rotulos
    .map((r) => padrao.exec(String(r ?? ""))?.[1])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return (usados.length ? Math.max(...usados) : 0) + 1;
}
