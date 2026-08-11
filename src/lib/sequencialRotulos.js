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

const escapaRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Próxima tag ao copiar um circuito: acrescenta "-NN" em vez de "-C" (que não
// distingue a 2ª cópia da 3ª, nem deixa claro quantas já existem).
//
// A "família" da cópia é a tag SEM um sufixo numérico já existente — copiar
// "QDLF-01" não empilha para "QDLF-01-01"; o "-01" já é tratado como a
// numeração da família "QDLF", e a cópia pega o próximo número livre dali
// ("QDLF-02", por exemplo). Assim copiar uma cópia continua a mesma
// contagem em vez de aninhar sufixos sem fim.
export function proximaCopia(tags, tagOriginal) {
  const base = String(tagOriginal ?? "").replace(/-\d+$/, "");
  const padrao = new RegExp(`^${escapaRegex(base)}-(\\d+)$`);
  const n = proximoNumero(tags, padrao);
  return `${base}-${String(n).padStart(2, "0")}`;
}
