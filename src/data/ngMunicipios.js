// Densidade de descargas atmosféricas N_G (raios/km²/ano) por município,
// conforme a Tabela F.1 do Anexo F da ABNT NBR 5419-2:2026.
//
// É a única fonte de N_G que a norma admite: o item A.1.3 proíbe expressamente
// o uso de valores de outras fontes nas análises de risco.
//
// Formato: sigla da UF → lista de [município, N_G], em ordem alfabética.
//
//   AC: [["Acrelândia", 14], ["Assis Brasil", 12]],
//
// A lista é longa (são todos os municípios do país) e por isso fica isolada
// aqui: nenhum código de cálculo mora neste arquivo.
export const NG_MUNICIPIOS = {
  // Preenchido a partir da Tabela F.1.
};

// Siglas com municípios cadastrados, em ordem alfabética.
export function estadosNG() {
  return Object.keys(NG_MUNICIPIOS).sort();
}

// Nomes dos municípios de um estado. A tabela já vem ordenada; a ordenação
// aqui é defensiva e respeita acentos — sem localeCompare, "Órgãos" cairia
// depois de "Zumbi".
export function cidadesNG(uf) {
  return (NG_MUNICIPIOS[uf] ?? [])
    .map(([nome]) => nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// N_G de um município, ou null quando não estiver na tabela.
export function buscarNG(uf, municipio) {
  return NG_MUNICIPIOS[uf]?.find(([nome]) => nome === municipio)?.[1] ?? null;
}

// Quantos municípios a tabela tem, para a aba avisar quando ela estiver vazia.
export function totalMunicipios() {
  return Object.values(NG_MUNICIPIOS).reduce((acc, lista) => acc + lista.length, 0);
}
