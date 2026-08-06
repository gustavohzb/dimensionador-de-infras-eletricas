import { cientifica } from "./formato";

const FONTES = [
  { chave: "fc", rotulo: "F_C", origem: "Falha de sistema — descarga na estrutura" },
  { chave: "fm", rotulo: "F_M", origem: "Falha de sistema — descarga perto da estrutura" },
  { chave: "fw", rotulo: "F_W", origem: "Falha de sistema — descarga na linha" },
  { chave: "fz", rotulo: "F_Z", origem: "Falha de sistema — descarga perto da linha" },
  { chave: "fv", rotulo: "F_V", origem: "Danos físicos vindos da linha" },
  { chave: "fb", rotulo: "F_B", origem: "Danos físicos — descarga na estrutura (só em ZPR₀ᴬ)" },
];

export default function FrequenciaDanos({ frequencias }) {
  if (!frequencias.length) return null;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Frequência de danos por sistema interno
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 font-display text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
              <th className="px-2 py-1.5">Sistema</th>
              {FONTES.map((f) => (
                <th key={f.chave} className="px-2 py-1.5 text-right" title={f.origem}>
                  {f.rotulo}
                </th>
              ))}
              <th className="px-2 py-1.5 text-right">Maior</th>
              <th className="px-2 py-1.5 text-right">F_T</th>
              <th className="px-2 py-1.5">Veredito</th>
            </tr>
          </thead>
          <tbody>
            {frequencias.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-2 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {f.id.toUpperCase()}
                </td>
                {FONTES.map((fonte) => (
                  <td
                    key={fonte.chave}
                    className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400"
                  >
                    {cientifica(f[fonte.chave])}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {cientifica(f.maior)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {cientifica(f.ft)}
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`rounded-xs px-2 py-0.5 text-[11px] font-semibold ${
                      f.atende
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                    }`}
                  >
                    {f.atende ? "atende" : "reprova"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Seção 7 da NBR 5419-2:2026: F_X = N_X × P_X. É critério separado do risco — não pondera
        perda nem presença de pessoas, só conta quantas vezes o dano acontece por ano.
      </p>
    </div>
  );
}
