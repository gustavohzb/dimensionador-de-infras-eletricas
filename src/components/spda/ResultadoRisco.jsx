import { cientifica } from "./formato";

const DESCRICAO = {
  RA: "Ferimentos por choque — descarga na estrutura",
  RB: "Danos físicos — descarga na estrutura",
  RC: "Falha de sistemas internos — descarga na estrutura",
  RM: "Falha de sistemas internos — descarga perto da estrutura",
  RU: "Ferimentos por choque — descarga na linha",
  RV: "Danos físicos — descarga na linha",
  RW: "Falha de sistemas internos — descarga na linha",
  RZ: "Falha de sistemas internos — descarga perto da linha",
};

export default function ResultadoRisco({ resultado }) {
  const { componentes, chavesR1, r1, dominante } = resultado;
  const chaves = Object.keys(componentes);
  const entraEmR1 = (k) => chavesR1.includes(k);

  return (
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Componentes de risco
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-display text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="px-2 py-1.5">Componente</th>
                <th className="px-2 py-1.5">Origem</th>
                <th className="px-2 py-1.5 text-right">Valor (1/ano)</th>
                <th className="px-2 py-1.5 text-right">% de R1</th>
              </tr>
            </thead>
            <tbody>
              {chaves.map((k) => (
                <tr
                  key={k}
                  className={`border-b border-slate-100 dark:border-slate-800 ${
                    k === dominante ? "bg-copper-50 dark:bg-copper-500/10" : ""
                  }`}
                >
                  <td
                    className={`whitespace-nowrap px-2 py-1.5 font-mono font-semibold ${
                      entraEmR1(k) ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {k.replace("R", "R_")}
                    {k === dominante && (
                      <span className="ml-1.5 rounded-xs bg-copper-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        dominante
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">
                    {DESCRICAO[k]}
                    {!entraEmR1(k) && (
                      <span className="ml-1.5 text-[10px] italic text-slate-400 dark:text-slate-500">
                        fora de R1
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono tabular-nums ${
                      entraEmR1(k) ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {cientifica(componentes[k])}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {entraEmR1(k) && r1 > 0
                      ? `${((componentes[k] / r1) * 100).toFixed(1).replace(".", ",")}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          R_C, R_M, R_W e R_Z só entram na soma de R1 quando a estrutura tem risco de explosão ou
          risco imediato à vida (nota "a" da Tabela 2 da NBR 5419-2:2026). As porcentagens são
          calculadas sobre o R1 somado.
        </p>
      </div>
  );
}
