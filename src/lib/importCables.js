// Importa cabos de força colados direto de um memorial de cálculo (Excel) —
// mesma notação de "SEÇÃO" usada nos memoriais da Eletromindy e interpretada
// pela skill resumo-cabos: N#ESPEC[+N#ESPEC...], onde N#SxTmm² é um
// multicondutor (S vias de T mm² cada) e N#Tmm² são N condutores unipolares
// de T mm².
import { getDiameter } from "../data/corfioHEPR";

function toNumber(str) {
  return parseFloat(str.replace(",", "."));
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

// Uma célula da linha pra usar como "nome do ramal" na pré-visualização — no
// formato do memorial (Nº | DESCRIÇÃO | TAG | ...) a segunda célula é a
// descrição do circuito; sem tabs (coluna única colada), usa a linha toda.
function guessLabel(cells, raw) {
  return cells.length > 1 ? cells[1] : raw;
}

// Analisa o texto colado linha por linha (um ramal por linha), pra revisão
// antes de importar — cada componente unipolar de exatamente 3 condutores
// (o padrão de um trifólio real, ex.: o "3#35mm²" de "3#35mm²+1#16mm²") vem
// marcado com `canBeTrifolio: true`, pra a UI oferecer o toggle por ramal.
// Cada spec já vem validado contra o catálogo Corfio (getDiameter falha alto
// em vez de inventar uma medida — o erro fica no próprio spec, sem travar a
// análise das outras linhas).
export function parseMemorial(text, material = "cobre") {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((raw, idx) => {
    const lineNumber = idx + 1;
    const cells = raw.split("\t").map((c) => c.trim());
    const secaoStr = cells.find((c) => /^\d+\s*#/.test(c));
    if (!secaoStr) {
      return { lineNumber, raw, label: raw, specs: [], error: "nenhuma seção reconhecida" };
    }
    const label = guessLabel(cells, raw);
    const specs = parseSecao(secaoStr).map((spec) => {
      if (spec.error) return { ...spec, source: secaoStr };
      try {
        const d = getDiameter(spec.section, spec.cableType, spec.vias, material);
        return { ...spec, material, source: secaoStr, d, canBeTrifolio: spec.cableType === "unipolar" && spec.quantity === 3 };
      } catch (e) {
        return { error: e.message, source: secaoStr };
      }
    });
    return { lineNumber, raw, label, secaoStr, specs };
  });
}
