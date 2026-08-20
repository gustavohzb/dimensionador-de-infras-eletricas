// Merge sobre um default que trata `undefined` como ausente.
//
// Morava em circuitoModelo.js. Saiu de lá quando a normalização do circuito de
// média tensão passou a precisar do mesmo comportamento: importar de
// circuitoModelo.js traria junto o modelo de baixa tensão inteiro, e os dois
// modelos não compartilham nenhum campo.
//
// O spread comum não serve: `{...{a:1}, ...{a:undefined}}` dá `{a: undefined}`,
// ou seja, um campo gravado como undefined venceria o default e voltaria a
// deixar o input do React sem valor definido (o aviso de campo não controlado).
// Campos desconhecidos do salvo são mantidos — podem ser de uma versão mais
// nova, e descartar dado do usuário é pior que carregar um campo a mais.

export const ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function comDefaults(base, salvo) {
  const saida = { ...base };
  if (!ehObjeto(salvo)) return saida;
  for (const [chave, valor] of Object.entries(salvo)) {
    if (valor !== undefined) saida[chave] = valor;
  }
  return saida;
}
