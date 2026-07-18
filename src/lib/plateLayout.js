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

// Concilia o arranjo salvo com a lista de estágios atual. A chave de uma
// célula que não existe mais vira BURACO (null) em vez de sumir da lista —
// assim quem está depois dela não se desloca, e o arranjo do usuário fica de
// pé. Células novas ocupam os buracos primeiro e só então vão para o fim.
// `ordem` nula (ou ausente) significa "automático" — a ordem canônica, sem
// buracos.
export function reconciliarOrdem(estagios, ordem) {
  const chaves = celulasDosEstagios(estagios).map((c) => c.key);
  if (!ordem) return chaves;
  const existe = new Set(chaves);
  const slots = ordem.map((k) => (k && existe.has(k) ? k : null));
  const jaTem = new Set(slots.filter(Boolean));
  for (const k of chaves.filter((c) => !jaTem.has(c))) {
    const buraco = slots.indexOf(null);
    if (buraco === -1) slots.push(k);
    else slots[buraco] = k;
  }
  while (slots.length && slots[slots.length - 1] === null) slots.pop();
  return slots;
}

// Troca duas células de slot. É o que o arrasto commita — e também o que a
// pré-visualização usa pra saber que tamanho a placa teria se a célula fosse
// solta ali, sem mexer no estado.
export function trocarNaOrdem(ordem, a, b) {
  const nova = ordem.slice();
  [nova[a], nova[b]] = [nova[b], nova[a]];
  return nova;
}

const VAZIA = { celulas: [], slots: [], ordem: [], diametro: 0, cols: 0, rows: 0, largura: 0, altura: 0, gradeLargura: 0, gradeAltura: 0 };

export function layoutPlaca({ estagios, ordem, diametro, espacamento, margem, celulasPorFileira }) {
  const porFileira = Math.max(1, Math.round(celulasPorFileira));
  const auto = diametro === "auto";
  const base = celulasDosEstagios(estagios).map((c) => ({
    ...c,
    d: auto ? diametroCelula(c.kvar) : diametro,
  }));
  const porChave = new Map(base.map((c) => [c.key, c]));
  const ordemFinal = reconciliarOrdem(estagios, ordem);
  const ocupados = ordemFinal.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
  if (ocupados.length === 0) return VAZIA;

  const maxD = Math.max(...base.map((c) => c.d));
  const passo = maxD + espacamento;
  // centro do slot, em mm a partir do canto superior esquerdo da placa
  // (célula menor fica centrada no slot da grade)
  const posicao = (i) => {
    const col = i % porFileira;
    const row = Math.floor(i / porFileira);
    return { col, row, cx: margem + maxD / 2 + col * passo, cy: margem + maxD / 2 + row * passo };
  };

  // A placa mede até a última coluna/fileira REALMENTE ocupada — é o que faz
  // ela encolher quando o usuário junta as células arrastando (7 células em
  // 6+1 dão 6 colunas; rearranjadas em 4+3, dão 4).
  const cols = Math.max(...ocupados.map((i) => i % porFileira)) + 1;
  const rows = Math.max(...ocupados.map((i) => Math.floor(i / porFileira))) + 1;
  const medida = (n) => 2 * margem + n * maxD + (n - 1) * espacamento;

  // A grade é completada até fechar as fileiras ocupadas, mais UMA fileira-vaga
  // de pouso embaixo: é ela que deixa o usuário puxar uma célula para uma nova
  // fileira mesmo antes de a grade transbordar sozinha (com 6 por fileira, sem
  // a fileira de pouso só dava pra criar a 2ª fileira tendo 7+ células). Quem
  // manda na LARGURA continua sendo o campo "células por fileira".
  const fileirasGrade = rows + 1;
  const ordemCompleta = Array.from(
    { length: porFileira * fileirasGrade },
    (_, i) => ordemFinal[i] ?? null
  );
  const slots = ordemCompleta.map((k, i) => ({ idx: i, key: k, ...posicao(i) }));

  return {
    celulas: slots.filter((s) => s.key).map((s) => ({ ...porChave.get(s.key), ...s })),
    slots,
    ordem: ordemCompleta,
    diametro: maxD,
    cols,
    rows,
    largura: medida(cols),
    altura: medida(rows),
    // Extensão da grade inteira, para a vista durante o arrasto não cortar os
    // slots livres. A placa pode ser mais estreita/baixa que isso: gradeLargura
    // cobre todas as colunas (à direita); gradeAltura cobre a fileira de pouso
    // (embaixo), pra ela aparecer assim que o usuário pega uma célula.
    gradeLargura: medida(porFileira),
    gradeAltura: medida(fileirasGrade),
  };
}
