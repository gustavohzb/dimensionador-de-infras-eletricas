// Layout da placa de montagem do banco de capacitores — vista superior.
//
// As células (cilindros de alumínio, catálogo WEG UCW/UCWT) são dispostas em
// grade na ordem dos estágios, células do mesmo estágio adjacentes, quebrando
// a fileira em `celulasPorFileira`. A placa mínima sai do próprio arranjo:
// cada eixo é margem + células + espaçamentos + margem. É um layout de
// referência para o projeto da placa, não um desenho de fabricação — Ø,
// espaçamento e margem são editáveis na UI justamente porque variam por
// fabricante e por prática de montagem.
export function layoutPlaca({ estagios, diametro, espacamento, margem, celulasPorFileira }) {
  const porFileira = Math.max(1, Math.round(celulasPorFileira));
  // Uma entrada por célula física, lembrando de qual estágio veio.
  const celulas = estagios.flatMap((e, i) =>
    e.celulas.map((kvar) => ({ estagio: i + 1, kvar }))
  );

  const n = celulas.length;
  const cols = Math.min(n, porFileira) || 1;
  const rows = Math.max(1, Math.ceil(n / porFileira));
  const passo = diametro + espacamento;

  const posicionadas = celulas.map((c, i) => {
    const col = i % porFileira;
    const row = Math.floor(i / porFileira);
    return {
      ...c,
      // centro do círculo, em mm a partir do canto superior esquerdo da placa
      cx: margem + diametro / 2 + col * passo,
      cy: margem + diametro / 2 + row * passo,
    };
  });

  return {
    celulas: posicionadas,
    diametro,
    cols,
    rows,
    largura: n === 0 ? 0 : 2 * margem + cols * diametro + (cols - 1) * espacamento,
    altura: n === 0 ? 0 : 2 * margem + rows * diametro + (rows - 1) * espacamento,
  };
}
