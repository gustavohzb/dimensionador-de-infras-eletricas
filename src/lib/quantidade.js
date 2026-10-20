// Quantidade a adicionar de uma vez (ex.: 54 cabos iguais). O campo guarda o
// texto digitado para não brigar com o usuário enquanto ele apaga e redigita;
// `lerQuantidade` converte na hora de adicionar, entre 1 e QTD_MAX.
export const QTD_MAX = 500;

export function lerQuantidade(texto) {
  const n = Math.floor(Number(texto));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, QTD_MAX);
}
