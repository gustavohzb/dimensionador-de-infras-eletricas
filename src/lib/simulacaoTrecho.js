// Ponte entre o Quadro de Cargas e o motor de infraestrutura: converte
// circuitos já dimensionados nos cabos físicos que o empacotamento acomoda, e
// monta a legenda que identifica os circuitos no desenho.
//
// O caminho antigo (aba Infraestrutura) passa por quadroToMemorial →
// parseMemorial, serializando os circuitos para texto tabulado só para
// reparsear em seguida. Aquele caminho continua, porque a importação da aba
// Infra é feita de texto colado. Aqui, com os circuitos em mãos, o desvio pelo
// texto não faz sentido: vai direto de designacaoCabos para parseSecao.
import { getDiameter } from "../data/corfioHEPR";
import { designacaoCabos } from "./cableSizingPro";
import { parseSecao } from "./importCables";

// `circuitos` e `resultados` são os arrays COMPLETOS do quadro; `selecionados`
// traz os índices marcados. Receber tudo e filtrar aqui dentro é o que permite
// numerar a legenda pela posição real na tabela. `semTrifolio` é um Set de
// índices no mesmo espaço.
//
// Um circuito que falhe em qualquer parte da sua designação sai inteiro da
// simulação (com aviso) em vez de entrar pela metade — meio circuito no
// desenho daria uma ocupação errada sem ninguém perceber.
export function circuitosParaCabos({ circuitos, resultados, selecionados, material = "cobre", semTrifolio }) {
  const cabos = [];
  const itens = [];
  const avisos = [];
  const sem = semTrifolio ?? new Set();

  for (const i of selecionados ?? []) {
    const c = circuitos[i];
    const r = resultados[i];
    const numero = String(i + 1).padStart(2, "0");

    if (!c || !r || r.error) {
      avisos.push(`${numero} ${c?.tag ?? "?"}: circuito com erro de cálculo — fora da simulação.`);
      continue;
    }

    const designacao = designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r });
    if (!designacao || designacao === "—") {
      avisos.push(`${numero} ${c.tag}: sem designação de cabos — fora da simulação.`);
      continue;
    }

    const doCircuito = [];
    let podeTrifolio = false;
    let falhou = false;

    parseSecao(designacao).forEach((spec, j) => {
      if (falhou) return;
      if (spec.error) {
        avisos.push(`${numero} ${c.tag}: ${spec.error}.`);
        falhou = true;
        return;
      }
      let d;
      try {
        d = getDiameter(spec.section, spec.cableType, spec.vias, material);
      } catch (e) {
        avisos.push(`${numero} ${c.tag}: ${e.message}`);
        falhou = true;
        return;
      }
      // Grupo de exatamente 3 unipolares iguais é o padrão de um trifólio real
      // (as três fases). É a mesma regra do canBeTrifolio do parseMemorial.
      const trifoliavel = spec.cableType === "unipolar" && spec.quantity === 3;
      if (trifoliavel) podeTrifolio = true;

      const groupId = `sim-${i}-${j}`;
      if (trifoliavel && !sem.has(i)) {
        // Uma entrada só: o feixe é manuseado e empacotado como uma peça.
        doCircuito.push({ section: spec.section, d, type: "unipolar", vias: 1, trifolio: true, material, groupId });
        return;
      }
      for (let k = 0; k < spec.quantity; k++) {
        doCircuito.push({
          section: spec.section,
          d,
          type: spec.cableType,
          vias: spec.cableType === "multipolar" ? spec.vias : 1,
          material,
          groupId,
          trifolio: undefined,
        });
      }
    });

    if (falhou) continue;
    cabos.push(...doCircuito);
    itens.push({ numero, tag: c.tag, descricao: c.descricao || "", designacao, podeTrifolio, indice: i });
  }

  return { cabos, itens, avisos };
}
