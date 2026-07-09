// Cálculo de ocupação e limite conforme NBR 5410 — extraído do useCableTray
// para ser reutilizável também pelo modo reverso (que precisa avaliar o
// mesmo cálculo contra muitas infraestruturas candidatas).
export function computeOccupancy(cables, trayArea, isDuct) {
  const cableArea = cables.reduce(
    (acc, c) => acc + Math.PI * Math.pow(c.d / 2, 2) * (c.trifolio ? 3 : 1),
    0
  );
  const ocupacao = trayArea > 0 ? (cableArea / trayArea) * 100 : 0;

  // Conta condutores, não "linhas" da lista — um trifólio é fisicamente 3
  // condutores, não 1.
  // Eletroduto (seção circular): 1 condutor → 53%, 2 → 31%, 3 ou mais → 40%.
  // Demais infraestruturas: 1 → 53%, 2+ → 40%.
  const conductorCount = cables.reduce((acc, c) => acc + (c.trifolio ? 3 : 1), 0);
  const limite = isDuct
    ? conductorCount === 1
      ? 53
      : conductorCount === 2
        ? 31
        : 40
    : conductorCount > 1
      ? 40
      : 53;

  return { cableArea, ocupacao, limite, dentroLimite: ocupacao <= limite };
}
