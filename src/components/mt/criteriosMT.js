// Rótulos dos critérios de dimensionamento de média tensão.
//
// Ficam fora do componente para o arquivo de tela exportar só componentes — a
// aba de baixa tensão mistura as duas coisas em CircuitoForm.jsx e paga isso em
// aviso de lint e em recarga de módulo mais grosseira no desenvolvimento.
//
// São três, e não quatro: o curto na blindagem não escolhe seção de condutor.
// Ele aprova ou reprova a blindagem especificada, porque ela é a mesma em
// qualquer seção de cabo.

export const CRITERIO_MT_LABEL = {
  capacidade: "capacidade de condução",
  quedaRegime: "queda de tensão em regime",
  curtoCondutor: "curto-circuito no condutor",
};

export const CRITERIO_MT_SIGLA = {
  capacidade: "CC",
  quedaRegime: "QR",
  curtoCondutor: "CT",
};

export const CRITERIO_MT_LEGENDA =
  "CC: capacidade de condução · QR: queda de tensão em regime · CT: curto-circuito no condutor";

// Cor por critério, no mesmo código da aba de baixa tensão: verde quando a
// tabela de ampacidade mandou, âmbar quando o limite foi tensão, vermelho
// quando foi o curto — que é o critério que a aba de BT não tem.
export const PILL_CRITERIO_MT = {
  capacidade: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  quedaRegime: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  curtoCondutor: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

// Rótulo e cor de cada origem de número, para o leitor separar no resultado o
// que a norma manda do que o projetista arbitrou.
export const PROCEDENCIA_MT = {
  catalogo: { rotulo: "catálogo", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  convencao: { rotulo: "convenção", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  premissa: { rotulo: "premissa", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  decisao: { rotulo: "decisão do projetista", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
};
