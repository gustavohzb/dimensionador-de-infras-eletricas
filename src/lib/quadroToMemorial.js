// Converte circuitos já dimensionados no Quadro de Cargas em "linhas de
// memorial" que a aba Infraestrutura importa pelo mesmo caminho do texto colado
// (parseMemorial). Cada linha reproduz o formato do memorial real
//   Nº \t TAG — descrição \t DESIGNAÇÃO
// para guessLabel pegar a TAG como rótulo e parseMemorial achar a designação
// pela célula que casa /^\d+#/. A designação (ex.: "3#10mm²+1#10mm²+1#6mm²")
// vem de designacaoCabos — a mesma string mostrada na tabela do quadro.
//
// O material NÃO cabe na designação em texto; ele viaja à parte no payload
// (ver App/QuadroCargasTab), porque o diâmetro externo do cabo depende do
// material e a ocupação, do diâmetro.
import { designacaoCabos } from "./cableSizingPro";

// circuitos e resultados são arrays paralelos (mesmos índices). Circuitos com
// erro de cálculo são ignorados (não têm designação). Devolve a string pronta
// para parseMemorial (linhas separadas por \n); string vazia se nada aproveitável.
export function circuitosParaLinhas(circuitos, resultados) {
  const linhas = [];
  circuitos.forEach((c, i) => {
    const r = resultados[i];
    if (!r || r.error) return;
    const designacao = designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r });
    if (!designacao || designacao === "—") return;
    const numero = String(linhas.length + 1).padStart(2, "0");
    const rotulo = c.descricao ? `${c.tag} — ${c.descricao}` : c.tag;
    linhas.push(`${numero}\t${rotulo}\t${designacao}`);
  });
  return linhas.join("\n");
}
