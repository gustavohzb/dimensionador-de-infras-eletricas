// Importa cabos de força colados direto de um memorial de cálculo (Excel) —
// mesma notação de "SEÇÃO" usada nos memoriais da Eletromindy e interpretada
// pela skill resumo-cabos: N#ESPEC[+N#ESPEC...], onde N#SxTmm² é um
// multicondutor (S vias de T mm² cada) e N#Tmm² são N condutores unipolares
// de T mm².
import { getDiameter } from "../data/corfioHEPR";

function toNumber(str) {
  return parseFloat(str.replace(",", "."));
}

// Entre as células de uma linha colada (separadas por tab), acha a que tem
// notação de seção — não depende de qual coluna é, funciona tanto colando a
// linha inteira do Excel quanto só a coluna de seção.
export function findSecaoCell(row) {
  const cells = row.split("\t").map((c) => c.trim());
  return cells.find((c) => /^\d+\s*#/.test(c));
}

// Interpreta uma string de seção em uma lista de specs de cabo (ou de erros,
// pra quando um trecho do "N#ESPEC+N#ESPEC" não bate com o formato esperado).
export function parseSecao(secaoStr) {
  return secaoStr
    .split("+")
    .map((p) => p.trim())
    .map((part) => {
      const multi = part.match(/^(\d+)\s*#\s*([\d.,]+)\s*x\s*([\d.,]+)\s*mm/i);
      if (multi) {
        return {
          cableType: "multipolar",
          quantity: parseInt(multi[1], 10),
          vias: Math.round(toNumber(multi[2])),
          section: toNumber(multi[3]),
        };
      }
      const uni = part.match(/^(\d+)\s*#\s*([\d.,]+)\s*mm/i);
      if (uni) {
        return {
          cableType: "unipolar",
          quantity: parseInt(uni[1], 10),
          vias: 1,
          section: toNumber(uni[2]),
        };
      }
      return { error: `não reconheci "${part}"` };
    });
}

// A partir do texto colado (uma ou várias linhas), devolve as specs válidas
// (prontas pra virar cabos via addCable) e os avisos — linha sem seção
// reconhecível, notação não entendida, ou seção/vias sem dado no catálogo
// Corfio (getDiameter falha alto em vez de inventar uma medida, então cada
// spec é validada aqui antes de entrar na lista, sem travar o import inteiro).
export function importCablesFromPaste(text) {
  const specs = [];
  const warnings = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, i) => {
    const secaoStr = findSecaoCell(line);
    if (!secaoStr) {
      warnings.push(`Linha ${i + 1}: nenhuma seção reconhecida.`);
      return;
    }
    for (const spec of parseSecao(secaoStr)) {
      if (spec.error) {
        warnings.push(`Linha ${i + 1} ("${secaoStr}"): ${spec.error}.`);
        continue;
      }
      try {
        getDiameter(spec.section, spec.cableType, spec.vias);
        specs.push({ ...spec, source: secaoStr });
      } catch (e) {
        warnings.push(`Linha ${i + 1} ("${secaoStr}"): ${e.message}.`);
      }
    }
  });

  return { specs, warnings };
}
