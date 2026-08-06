// Leitura da Tabela F.1 da ABNT NBR 5419-2:2026 (densidade de descargas
// atmosféricas N_G por município), colada pelo próprio usuário.
//
// A tabela NÃO acompanha o app: ela é conteúdo da norma, e o Dimensionador é
// público. Quem tem acesso à norma cola a própria cópia, que fica guardada só
// no navegador de quem colou. Sem tabela importada, a aba pede o N_G no campo
// numérico de sempre.

// "12,5" → 12.5; "14" → 14; texto → null.
function numero(texto) {
  const t = String(texto ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const RE_UF = /^[A-Z]{2}$/;

// Lê o texto colado em linhas { municipio, uf, ng }. Aceita TAB (copiar do PDF
// ou do Excel) ou ponto e vírgula, com ou sem cabeçalho.
//
// Município repetido: vence a última ocorrência. A norma lista cada município
// uma vez, então repetição costuma ser colagem duplicada — e sobrescrever é
// mais previsível do que manter a primeira e ignorar o resto silenciosamente.
export function parseTabelaNG(raw) {
  const cruas = String(raw ?? "")
    .split(/\r?\n/)
    .map((l, i) => ({ texto: l, numero: i + 1 }))
    .filter((l) => l.texto.trim() !== "");

  const porChave = new Map();
  const avisos = [];

  for (const { texto, numero: nLinha } of cruas) {
    const sep = texto.includes("\t") ? "\t" : ";";
    const partes = texto.split(sep).map((c) => c.trim());
    if (partes.length < 3) {
      avisos.push(`Linha ${nLinha}: esperava município, UF e N_G — pulada.`);
      continue;
    }
    const [municipio, ufBruta, ngBruto] = partes;
    const uf = ufBruta.toUpperCase();
    const ng = numero(ngBruto);

    // Cabeçalho: a UF não é sigla de duas letras nem o N_G é número.
    if (!RE_UF.test(uf) || ng == null) {
      const pareceCabecalho = /munic|uf|ng|n_g/i.test(municipio) && ng == null;
      if (!pareceCabecalho) {
        avisos.push(`Linha ${nLinha} ("${texto.trim().slice(0, 40)}"): UF ou N_G inválido — pulada.`);
      }
      continue;
    }
    if (!municipio) {
      avisos.push(`Linha ${nLinha}: sem nome de município — pulada.`);
      continue;
    }
    porChave.set(`${uf}|${municipio}`, { municipio, uf, ng });
  }

  return { linhas: [...porChave.values()], avisos };
}

// Siglas presentes na tabela, em ordem alfabética.
export function estadosDaTabela(linhas) {
  return [...new Set(linhas.map((l) => l.uf))].sort();
}

// Municípios de um estado, em ordem alfabética respeitando acentos — sem
// localeCompare, "Órgãos" cairia depois de "Zumbi".
export function cidadesDoEstado(linhas, uf) {
  return linhas
    .filter((l) => l.uf === uf)
    .map((l) => l.municipio)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function buscarNG(linhas, uf, municipio) {
  return linhas.find((l) => l.uf === uf && l.municipio === municipio)?.ng ?? null;
}
