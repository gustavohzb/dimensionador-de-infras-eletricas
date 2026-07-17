// Layout da placa de montagem do banco de capacitores — vista superior.
//
// As células (cilindros de alumínio) são dispostas em grade na ordem dos
// estágios, células do mesmo estágio adjacentes, quebrando a fileira em
// `celulasPorFileira`. A placa mínima sai do próprio arranjo: cada eixo é
// margem + células + espaçamentos + margem.
//
// O diâmetro pode ser um número (todas as células iguais) ou "auto" — aí cada
// célula usa o Ø típico do catálogo para o kvar dela (ver DIAMETROS_CELULA) e
// o passo da grade é governado pela MAIOR célula presente: grade uniforme,
// células menores ficam com folga extra ao redor, como numa montagem real.
// É um layout de referência para o projeto da placa, não um desenho de
// fabricação.
import { diametroCelula } from "../data/capacitores";

export function layoutPlaca({ estagios, diametro, espacamento, margem, celulasPorFileira }) {
  const porFileira = Math.max(1, Math.round(celulasPorFileira));
  const auto = diametro === "auto";
  // Uma entrada por célula física, cada uma já com o próprio Ø.
  const celulas = estagios.flatMap((e, i) =>
    e.celulas.map((kvar) => ({
      estagio: i + 1,
      kvar,
      d: auto ? diametroCelula(kvar) : diametro,
    }))
  );

  const n = celulas.length;
  const maxD = n === 0 ? 0 : Math.max(...celulas.map((c) => c.d));
  const cols = Math.min(n, porFileira) || 1;
  const rows = Math.max(1, Math.ceil(n / porFileira));
  const passo = maxD + espacamento;

  const posicionadas = celulas.map((c, i) => {
    const col = i % porFileira;
    const row = Math.floor(i / porFileira);
    return {
      ...c,
      // centro do círculo, em mm a partir do canto superior esquerdo da placa
      // (célula menor fica centrada no slot da grade)
      cx: margem + maxD / 2 + col * passo,
      cy: margem + maxD / 2 + row * passo,
    };
  });

  return {
    celulas: posicionadas,
    diametro: maxD,
    cols,
    rows,
    largura: n === 0 ? 0 : 2 * margem + cols * maxD + (cols - 1) * espacamento,
    altura: n === 0 ? 0 : 2 * margem + rows * maxD + (rows - 1) * espacamento,
  };
}
