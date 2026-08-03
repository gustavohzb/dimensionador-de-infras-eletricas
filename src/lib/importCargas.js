// Importador de lista de cargas da aba Cabos Elétricos: transforma colunas
// coladas do Excel (ou texto com ";") em circuitos do Quadro de Cargas.
//
// O formato das listas varia de projeto para projeto, então o fluxo é
// detectar o papel de cada coluna e deixar o usuário corrigir na prévia.
// Precedência de valores: coluna > padrão do lote > default do formulário.

const UNIDADE_CANONICA = { cv: "CV", kw: "kW", w: "W", kva: "kVA" };
const RE_POTENCIA = /^([\d.,]+)\s*(cv|kw|kva|w)?$/i;
const RE_TENSAO = /^([\d.,]+)\s*v?$/i;

// "3,7" → 3.7; "1.234,5" → 1234.5 (vírgula presente = decimal BR, pontos são
// milhar); "7.5" → 7.5. Fora disso, null.
export function parseNumero(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  const limpo = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

// "15 CV" → { valor: 15, unidade: "CV" }; "3,7" → { valor: 3.7, unidade: null };
// texto → null. A unidade escrita na célula vence a unidade padrão do lote.
export function parsePotencia(texto) {
  const m = RE_POTENCIA.exec(String(texto ?? "").trim());
  if (!m) return null;
  const valor = parseNumero(m[1]);
  if (valor == null) return null;
  return { valor, unidade: m[2] ? UNIDADE_CANONICA[m[2].toLowerCase()] : null };
}

// "380" e "380 V" → 380. Não aceita unidades de potência.
export function parseTensao(texto) {
  const m = RE_TENSAO.exec(String(texto ?? "").trim());
  return m ? parseNumero(m[1]) : null;
}

// Divide o texto colado em matriz de células: TAB (colar do Excel) tem
// prioridade, depois ";", senão coluna única. Linhas vazias caem fora e as
// curtas são completadas com "" para a grade ficar retangular.
export function parseLista(raw) {
  const linhas = String(raw ?? "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (!linhas.length) return [];
  const sep = linhas.some((l) => l.includes("\t"))
    ? "\t"
    : linhas.some((l) => l.includes(";"))
      ? ";"
      : null;
  const grade = linhas.map((l) => (sep ? l.split(sep) : [l]).map((c) => c.trim()));
  const nCols = Math.max(...grade.map((g) => g.length));
  return grade.map((g) => [...g, ...Array(nCols - g.length).fill("")]);
}
