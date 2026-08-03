// Importador de lista de cargas da aba Cabos Elétricos: transforma colunas
// coladas do Excel (ou texto com ";") em circuitos do Quadro de Cargas.
//
// O formato das listas varia de projeto para projeto, então o fluxo é
// detectar o papel de cada coluna e deixar o usuário corrigir na prévia.
// Precedência de valores: coluna > padrão do lote > default do formulário.

import { defaultCircuito } from "../components/cabos/CircuitoForm";
import { proximoNumero } from "./sequencialRotulos";

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

// Papéis que uma coluna colada pode assumir (ordem do seletor da prévia).
export const PAPEIS = [
  { id: "descricao", label: "Descrição" },
  { id: "tag", label: "TAG" },
  { id: "potencia", label: "Potência" },
  { id: "tensao", label: "Tensão (V)" },
  { id: "distancia", label: "Distância (m)" },
  { id: "corrente", label: "Corrente (A)" },
  { id: "ignorar", label: "Ignorar" },
];

const TENSOES_USUAIS = [127, 220, 380, 440, 660];
const RE_TAG = /^[a-z]{1,5}-?\d{1,4}$/i;

// A primeira linha é cabeçalho quando nenhuma célula dela é numérica e há
// pelo menos uma linha de dados abaixo.
export function detectarCabecalho(grade) {
  if (grade.length < 2) return false;
  return grade[0].every(
    (cel) => cel === "" || (parsePotencia(cel) == null && parseTensao(cel) == null)
  );
}

const DICAS_CABECALHO = [
  [/\btag\b/, "tag"],
  [/desc|nome/, "descricao"],
  [/pot|^cv$|^kw$|^kva$|^w$/, "potencia"],
  [/tens|^v$/, "tensao"],
  [/dist|compr|^m$/, "distancia"],
  [/corrente|^a$/, "corrente"],
];

const semAcento = (t) =>
  String(t).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

function papelPorDica(celula) {
  const t = semAcento(celula);
  if (!t) return null;
  for (const [re, papel] of DICAS_CABECALHO) if (re.test(t)) return papel;
  return null;
}

// Classifica uma coluna pelo conteúdo. `usados` impede papel repetido:
// a segunda coluna numérica genérica vira distância, a terceira, ignorar.
// Corrente nunca sai daqui — só mapeável à mão, para não confundir com
// potência.
function papelPorConteudo(celulas, usados, unicaColuna) {
  if (!celulas.length) return "ignorar";
  const livre = (p) => !usados.has(p);
  const numerica = celulas.every(
    (c) => parsePotencia(c) != null || parseTensao(c) != null
  );
  if (numerica) {
    if (unicaColuna && livre("potencia")) return "potencia";
    const soTensoesUsuais =
      celulas.every((c) => TENSOES_USUAIS.includes(parseTensao(c))) &&
      celulas.every((c) => parsePotencia(c)?.unidade == null);
    if (livre("tensao") && soTensoesUsuais) return "tensao";
    if (livre("potencia")) return "potencia";
    if (livre("distancia")) return "distancia";
    return "ignorar";
  }
  if (livre("tag") && celulas.every((c) => RE_TAG.test(c))) return "tag";
  if (livre("descricao")) return "descricao";
  return "ignorar";
}

// Um papel por coluna: dica do cabeçalho primeiro (quando há), conteúdo
// depois. A prévia mostra um seletor por coluna para corrigir o que errar.
export function detectarColunas(grade) {
  const temCabecalho = detectarCabecalho(grade);
  const dados = temCabecalho ? grade.slice(1) : grade;
  const nCols = grade[0]?.length ?? 0;
  const usados = new Set();
  const papeis = [];
  for (let c = 0; c < nCols; c++) {
    const celulas = dados.map((l) => l[c]).filter((x) => x !== "");
    let papel = temCabecalho ? papelPorDica(grade[0][c]) : null;
    if (papel && usados.has(papel)) papel = null;
    if (!papel) papel = papelPorConteudo(celulas, usados, nCols === 1);
    if (papel !== "ignorar") usados.add(papel);
    papeis.push(papel);
  }
  return { papeis, temCabecalho };
}

// Constrói os circuitos: uma linha de dados → um circuito completo no
// formato de defaultCircuito(). `porLinha` fica alinhado às linhas de dados
// para a prévia pintar linha boa/linha pulada; `circuitos` e `avisos` são a
// versão achatada para importar e avisar.
export function montarCircuitos({ grade, papeis, temCabecalho, padroes, tagsExistentes = [] }) {
  const dados = temCabecalho ? grade.slice(1) : grade;
  const tags = [...tagsExistentes];
  const porLinha = dados.map((linha, i) => {
    const numLinha = i + (temCabecalho ? 2 : 1);
    const col = (papel) => {
      const idx = papeis.indexOf(papel);
      return idx === -1 ? "" : (linha[idx] ?? "");
    };
    // defaultCircuito() cria trechos novos a cada chamada — mexer em
    // c.trechos[0] não vaza para outros circuitos.
    const c = { ...defaultCircuito() };
    c.esquemaId = padroes.esquemaId;
    c.tensao = Number(padroes.tensao);
    c.unidade = padroes.unidade;
    c.formaPartidaId = padroes.formaPartidaId;
    c.trechos[0].distancia = Number(padroes.distancia);
    c.descricao = col("descricao");

    const corrente = papeis.includes("corrente") ? parseNumero(col("corrente")) : null;
    const pot = parsePotencia(col("potencia"));
    if (corrente != null) {
      c.modo = "corrente";
      c.corrente = corrente;
    } else if (pot) {
      c.modo = "potencia";
      c.potencia = pot.valor;
      if (pot.unidade) c.unidade = pot.unidade;
    } else {
      return { aviso: `Linha ${numLinha}: sem potência ou corrente aproveitável — pulada.` };
    }

    const v = parseTensao(col("tensao"));
    if (v != null) c.tensao = v;
    const d = parseNumero(col("distancia"));
    if (d != null) c.trechos[0].distancia = d;

    c.tag = col("tag") || `AL-${String(proximoNumero(tags, /^AL-(\d+)/)).padStart(2, "0")}`;
    tags.push(c.tag);
    return { circuito: c };
  });
  return {
    porLinha,
    circuitos: porLinha.filter((l) => l.circuito).map((l) => l.circuito),
    avisos: porLinha.filter((l) => l.aviso).map((l) => l.aviso),
  };
}
