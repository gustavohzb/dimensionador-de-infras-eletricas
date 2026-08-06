// Guarda a Tabela F.1 colada pelo usuário no navegador dele.
//
// Fica fora do estado da aba (que vai para projetos e memoriais) de propósito:
// a tabela é um dado da norma, pertence à máquina de quem tem a licença, e não
// deve viajar junto com o projeto.

const CHAVE = "spdaNG.v1";

export function carregarTabelaNG() {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return null;
    const salvo = JSON.parse(raw);
    return Array.isArray(salvo?.linhas) && salvo.linhas.length ? salvo : null;
  } catch {
    return null;
  }
}

export function salvarTabelaNG(linhas) {
  const dados = { linhas, importadaEm: new Date().toISOString() };
  localStorage.setItem(CHAVE, JSON.stringify(dados));
  return dados;
}

export function removerTabelaNG() {
  localStorage.removeItem(CHAVE);
}
