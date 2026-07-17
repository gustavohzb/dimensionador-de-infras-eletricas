// Layout da placa de montagem do banco de capacitores — vista superior.
//
// As células (cilindros de alumínio) são dispostas em grade, quebrando a
// fileira em `celulasPorFileira`. A placa mínima sai do próprio arranjo: cada
// eixo é margem + células + espaçamentos + margem.
//
// A POSIÇÃO continua derivada (slot da grade → cx/cy) — o que o usuário pode
// mudar arrastando é a ORDEM em que as células ocupam os slots, guardada em
// `ordem` como uma lista de chaves. Assim a cota da placa continua sendo uma
// conta da grade, e não a medida de onde alguém largou os capacitores.
//
// O diâmetro pode ser um número (todas as células iguais) ou "auto" — aí cada
// célula usa o Ø típico do catálogo para o kvar dela (ver DIAMETROS_CELULA) e
// o passo da grade é governado pela MAIOR célula presente: grade uniforme,
// células menores ficam com folga extra ao redor, como numa montagem real.
// É um layout de referência para o projeto da placa, não um desenho de
// fabricação.
import { diametroCelula } from "../data/capacitores";

// Chave estável de uma célula: id do estágio + índice da célula dentro dele.
// O id do estágio não se desloca quando outro estágio é removido — é o que
// permite preservar o arranjo do usuário ao mexer na lista. Sem id (testes),
// cai no índice do estágio, que é único dentro de uma mesma chamada.
function chave(estagio, i, j) {
  return `${estagio.id ?? i}:${j}`;
}

// Células na ordem canônica (a dos estágios), cada uma com sua chave.
export function celulasDosEstagios(estagios) {
  return estagios.flatMap((e, i) =>
    e.celulas.map((kvar, j) => ({ key: chave(e, i, j), estagio: i + 1, kvar }))
  );
}

// Concilia o arranjo salvo com a lista de estágios atual: descarta chaves de
// células que não existem mais e acrescenta ao fim as que surgiram. `ordem`
// nula (ou ausente) significa "automático" — a ordem canônica.
export function reconciliarOrdem(estagios, ordem) {
  const chaves = celulasDosEstagios(estagios).map((c) => c.key);
  if (!ordem) return chaves;
  const existe = new Set(chaves);
  const mantidas = ordem.filter((k) => existe.has(k));
  const jaTem = new Set(mantidas);
  return [...mantidas, ...chaves.filter((k) => !jaTem.has(k))];
}

export function layoutPlaca({ estagios, ordem, diametro, espacamento, margem, celulasPorFileira }) {
  const porFileira = Math.max(1, Math.round(celulasPorFileira));
  const auto = diametro === "auto";
  const base = celulasDosEstagios(estagios).map((c) => ({
    ...c,
    d: auto ? diametroCelula(c.kvar) : diametro,
  }));
  const porChave = new Map(base.map((c) => [c.key, c]));
  const ordemFinal = reconciliarOrdem(estagios, ordem);

  const n = base.length;
  const maxD = n === 0 ? 0 : Math.max(...base.map((c) => c.d));
  const cols = Math.min(n, porFileira) || 1;
  const rows = Math.max(1, Math.ceil(n / porFileira));
  const passo = maxD + espacamento;

  const celulas = ordemFinal.map((k, i) => {
    const c = porChave.get(k);
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
    celulas,
    ordem: ordemFinal,
    diametro: maxD,
    cols,
    rows,
    largura: n === 0 ? 0 : 2 * margem + cols * maxD + (cols - 1) * espacamento,
    altura: n === 0 ? 0 : 2 * margem + rows * maxD + (rows - 1) * espacamento,
  };
}
