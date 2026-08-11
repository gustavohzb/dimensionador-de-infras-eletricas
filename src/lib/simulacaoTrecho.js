// Ponte entre o Quadro de Cargas e o motor de infraestrutura: converte
// circuitos já dimensionados nos cabos físicos que o empacotamento acomoda, e
// monta a legenda que identifica os circuitos no desenho.
//
// O caminho antigo (aba Infraestrutura) passa por quadroToMemorial →
// parseMemorial, serializando os circuitos para texto tabulado só para
// reparsear em seguida. Aquele caminho continua, porque a importação da aba
// Infra é feita de texto colado. Aqui, com os circuitos em mãos, o desvio pelo
// texto não faz sentido: vai direto de designacaoCabos para parseSecao.
import { INFRA_TYPES, getDimensions, getDiameter } from "../data/corfioHEPR";
import { designacaoCabos } from "./cableSizingPro";
import { parseSecao } from "./importCables";
import { computeOccupancy } from "./occupancy";

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

  for (const i of [...(selecionados ?? [])].sort((a, b) => a - b)) {
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
        });
      }
    });

    if (falhou) continue;
    cabos.push(...doCircuito);
    itens.push({ numero, tag: c.tag, descricao: c.descricao || "", designacao, podeTrifolio, indice: i });
  }

  return { cabos, itens, avisos };
}

// Ids que a simulação sabe desenhar. CONDUTOS (cabosNBR5410) e INFRA_TYPES
// (corfioHEPR) coincidem em eletrocalha, perfilado, leito e eletroduto; os
// demais condutos (canaleta embutida, duto e canaleta subterrâneos) não têm
// equivalente aqui, e o aramado existe só do lado da infraestrutura.
const IDS_INFRA = new Set(INFRA_TYPES.map((t) => t.id));

// O conduto que os circuitos declaram, quando declaram um só. É o que definiu
// o método de referência (B1/B2/E/F) e o fator de agrupamento que
// dimensionaram aqueles cabos — simular outro tipo contradiz a própria conta
// que gerou a bitola, então ele é o padrão do filtro do painel.
//
// Basta um trecho divergente, ou um conduto sem equivalente, para devolver
// null: aí o painel abre em "todos os tipos" e avisa.
export function condutoPredominante(circuitos) {
  let unico = null;
  for (const c of circuitos ?? []) {
    for (const t of c?.trechos ?? []) {
      if (!IDS_INFRA.has(t.condutoId)) return null;
      if (unico === null) unico = t.condutoId;
      else if (unico !== t.condutoId) return null;
    }
  }
  return unico;
}

// Ocupação recalculada a partir dos cabos ATUAIS contra a infraestrutura
// aplicada. O objeto `applied` congela os números do momento da busca, e os
// cabos podem ter mudado desde então — é essa diferença que faz aparecer o
// aviso de "já não cabem".
export function ocupacaoAplicada(cables, applied) {
  if (!applied) return null;

  if (applied.hasSeptum) {
    // Dois compartimentos independentes: o trecho só está dentro do limite se
    // os dois estiverem, então vale a pior ocupação contra o menor limite.
    const forca = cables.filter((c) => c.type !== "comando");
    const comando = cables.filter((c) => c.type === "comando");
    const w1 = applied.splitX;
    const w2 = applied.trayWidth - applied.septum - applied.splitX;
    const forcaOcc = computeOccupancy(forca, w1 * applied.trayHeight, false);
    const comandoOcc = computeOccupancy(comando, w2 * applied.trayHeight, false);
    return {
      trayArea: applied.trayArea,
      cableArea: forcaOcc.cableArea + comandoOcc.cableArea,
      ocupacao: Math.max(forcaOcc.ocupacao, comandoOcc.ocupacao),
      limite: Math.min(forcaOcc.limite, comandoOcc.limite),
      dentroLimite: forcaOcc.dentroLimite && comandoOcc.dentroLimite,
    };
  }

  const isDuct = getDimensions(applied.infraType, applied.eletrodutoNorma).kind === "duct";
  return { trayArea: applied.trayArea, ...computeOccupancy(cables, applied.trayArea, isDuct) };
}
