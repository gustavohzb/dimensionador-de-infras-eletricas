// As abas do app e o estado que cada uma persiste no localStorage.
//
// Existe aqui, fora do App.jsx, por dois motivos: a lista de abas era
// duplicada (uma para validar a aba salva, outra para desenhar os botões, e
// as duas tinham que concordar), e a tela de recuperação do ErrorBoundary
// precisa saber quais chaves apagar sem importar o componente da aba.

export const ABAS = [
  { id: "infra", label: "Infraestrutura" },
  { id: "quadroCargas", label: "Cabos Elétricos" },
  { id: "iluminacao", label: "Iluminação" },
  { id: "capacitores", label: "Capacitores" },
  { id: "spda", label: "SPDA" },
  { id: "atualizacoes", label: "Atualizações" },
  { id: "sobre", label: "Sobre" },
];

// Chaves do localStorage de cada aba, da mais nova para a mais antiga — as
// versões velhas entram porque as abas migram a partir delas ao montar, então
// limpar só a atual deixaria o estado quebrado voltar pela migração.
//
// Infra, Atualizações e Sobre não persistem nada: Infra guarda o trecho em
// memória (useCableTray) e as outras duas só leem dado estático.
export const CHAVES_POR_ABA = {
  infra: [],
  quadroCargas: ["quadroCargas.v2", "quadroCargas.v1"],
  iluminacao: ["iluminacao.v3", "iluminacao.v2", "iluminacao.v1"],
  capacitores: ["capacitores.v1"],
  spda: ["spdaRisco.v1"],
  atualizacoes: [],
  sobre: [],
};

const SUFIXO_BACKUP = ".backup";

export function rotuloDaAba(aba) {
  return ABAS.find((a) => a.id === aba)?.label ?? String(aba ?? "");
}

// Limpa o estado salvo de UMA aba, guardando uma cópia em "<chave>.backup"
// antes de apagar.
//
// O backup existe porque a causa mais provável de a aba quebrar é um bug meu
// lendo um estado válido, não o estado estar corrompido — apagar direto
// destruiria um projeto real por causa de um bug que eu ainda vou consertar.
// A cópia não é lida por ninguém, só fica disponível para recuperação.
//
// Retorna as chaves efetivamente apagadas.
export function limparEstadoDaAba(aba, storage) {
  const chaves = CHAVES_POR_ABA[aba] ?? [];
  const limpas = [];

  for (const chave of chaves) {
    // Chave ausente é pulada para o backup de uma limpeza anterior não ser
    // sobrescrito por um valor vazio se o usuário clicar duas vezes.
    const valor = storage.getItem(chave);
    if (valor === null || valor === undefined) continue;

    try {
      storage.setItem(chave + SUFIXO_BACKUP, valor);
    } catch {
      // Sem espaço para o backup: apagar assim mesmo. Perder a cópia é ruim,
      // mas deixar o usuário preso na tela de erro é pior.
    }
    storage.removeItem(chave);
    limpas.push(chave);
  }

  return limpas;
}
