// Formato de um circuito do quadro de cargas, e a migração do que está salvo
// para o formato de hoje.
//
// Os defaults moravam em CircuitoForm.jsx. Vieram para cá porque quem precisa
// deles não é só o formulário: o importador de planilha já os buscava lá
// dentro (uma lib importando de um componente, ao contrário do resto), e a
// normalização abaixo precisa deles sem arrastar React junto.
//
// A normalização existe porque o formato do circuito mudou desde a 0.10.0 — os
// trechos nasceram lá, e a temperatura ambiente saiu do preset global e voltou
// para dentro do trecho. Sem ela, um projeto salvo antes dessas mudanças
// entrava no estado como estava e derrubava a aba no primeiro render que
// tocasse `c.trechos`. É o mesmo trabalho que spdaEntrada.js faz no SPDA e o
// merge com defaults() faz nos Capacitores; o quadro era a única aba sem.

export const defaultTrecho = () => ({
  condutoId: "eletrocalha",
  distribuicao: null,
  camadas: 1,
  circuitos: 1,
  temperatura: 30, // temperatura ambiente/solo do trecho (Tab. 40)
  distancia: 30,
});

// Preset do projeto: parâmetros que valem para TODOS os circuitos do quadro
// (fonte única — não são mais editáveis por circuito). A temperatura de cada
// trecho (ambiente/solo) continua no próprio trecho. O tipo de cabo
// (unipolar/multipolar) é decidido automaticamente a partir de
// `secaoMaxMultipolar`: multipolar até essa seção, unipolar acima.
export const defaultPreset = () => ({
  quedaMaxRegime: 4,
  secaoMinima: 2.5,
  secaoMaxMultipolar: 16,
  material: "cobre", // "cobre" | "aluminio"
  condutorTemp: 90, // 90 → EPR/XLPE | 70 → PVC
  fp: 0.92, // fator de potência (cos φ) do projeto
});

export const defaultCircuito = () => ({
  tag: "AL-01",
  descricao: "",
  modo: "corrente", // "corrente" | "potencia"
  corrente: 40,
  potencia: 10,
  unidade: "CV",
  rendimento: 0.92,
  fatorServico: 1,
  esquemaId: "trifCnCt",
  tensao: 380,
  formaPartidaId: "nenhuma",
  quedaMaxPartida: 10, // só se aplica quando formaPartidaId !== "nenhuma" (carga motora)
  porFase: 1,
  trechos: [defaultTrecho()],
});

const ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Merge sobre o default que trata `undefined` como ausente.
//
// O spread comum não serve: `{...{a:1}, ...{a:undefined}}` dá `{a: undefined}`,
// ou seja, um campo gravado como undefined venceria o default e voltaria a
// deixar o input do React sem valor definido (o aviso de campo não controlado).
// Campos desconhecidos do salvo são mantidos — podem ser de uma versão mais
// nova, e descartar dado do usuário é pior que carregar um campo a mais.
function comDefaults(base, salvo) {
  const saida = { ...base };
  if (!ehObjeto(salvo)) return saida;
  for (const [chave, valor] of Object.entries(salvo)) {
    if (valor !== undefined) saida[chave] = valor;
  }
  return saida;
}

export function normalizarTrecho(salvo, temperaturaDoPreset = null) {
  const trecho = comDefaults(defaultTrecho(), salvo);
  // Trecho salvo antes de a temperatura voltar para cá herda a do preset
  // global da época. Sem isso o valor real (40 °C num forno, por exemplo)
  // virava silenciosamente o default de 30 °C e o cabo saía subdimensionado.
  if (!ehObjeto(salvo) || salvo.temperatura == null) {
    if (temperaturaDoPreset != null) trecho.temperatura = temperaturaDoPreset;
  }
  return trecho;
}

export function normalizarCircuito(salvo, temperaturaDoPreset = null) {
  const circuito = comDefaults(defaultCircuito(), salvo);
  const salvos = Array.isArray(salvo?.trechos) ? salvo.trechos : [];
  // Um circuito sem trecho nenhum não é representável na tela (o formulário
  // sempre mostra ao menos um), então vale mais dar um trecho padrão que
  // esconder o circuito.
  const lista = salvos.length ? salvos : [null];
  circuito.trechos = lista.map((t) => normalizarTrecho(t, temperaturaDoPreset));
  return circuito;
}

// Entradas que não são objeto (null, texto, número) são descartadas em vez de
// virarem um circuito padrão: num app de dimensionamento, inventar um circuito
// de 40 A que ninguém lançou é pior que perder um registro já ilegível.
export function normalizarCircuitos(salvos, temperaturaDoPreset = null) {
  if (!Array.isArray(salvos)) return [];
  return salvos.filter(ehObjeto).map((c) => normalizarCircuito(c, temperaturaDoPreset));
}

// Normaliza o par { circuitos, preset } venha ele do localStorage ou de um
// projeto do Supabase. Devolve `circuitos` possivelmente vazio — quem chama
// decide se isso vira um circuito em branco ou um aviso.
export function normalizarQuadro(salvo) {
  const preset = comDefaults(defaultPreset(), salvo?.preset);
  const antiga = Number(preset.temperatura);
  const temperaturaDoPreset = Number.isFinite(antiga) ? antiga : null;
  // O campo global não existe mais; fica só no trecho, que é onde a Tab. 40 o
  // usa. Mantê-lo daria duas fontes para o mesmo número.
  delete preset.temperatura;
  return { preset, circuitos: normalizarCircuitos(salvo?.circuitos, temperaturaDoPreset) };
}
