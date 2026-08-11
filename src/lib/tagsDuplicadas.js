// Marca quais TAGs se repetem no quadro de cargas. Duas TAGs que só diferem
// em maiúscula/minúscula ou espaço nas pontas ("QDLF-01" e "qdlf-01 ") são a
// mesma identificação para quem lê o memorial ou monta o trecho na
// simulação — por isso a comparação normaliza antes de contar.
//
// Devolve um array paralelo a `tags`: true nas posições cuja TAG (normalizada,
// não vazia) aparece mais de uma vez.
export function marcarTagsDuplicadas(tags) {
  const chave = (t) => String(t ?? "").trim().toLowerCase();
  const contagem = new Map();
  for (const t of tags) {
    const k = chave(t);
    if (!k) continue;
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  return tags.map((t) => {
    const k = chave(t);
    return k !== "" && contagem.get(k) > 1;
  });
}
