import {
  CRITERIO_MT_LABEL,
  CRITERIO_MT_SIGLA,
  PILL_CRITERIO_MT,
  PROCEDENCIA_MT,
} from "./criteriosMT";

export function CriterioMTPill({ criterio }) {
  return (
    <span
      title={CRITERIO_MT_LABEL[criterio]}
      className={`inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-semibold ${PILL_CRITERIO_MT[criterio] ?? PILL_CRITERIO_MT.capacidade}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {CRITERIO_MT_SIGLA[criterio]}
    </span>
  );
}

const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d).replace(".", ","));

function Linha({ label, value, destaque = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-mono ${destaque ? "font-bold text-copper-700 dark:text-copper-300" : "text-slate-800 dark:text-slate-100"}`}>
        {value}
      </span>
    </div>
  );
}

export default function ResultadoMT({ result }) {
  if (result.error) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
        {result.error}
      </div>
    );
  }

  const b = result.blindagem;

  return (
    <div className="space-y-3 rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Cabo dimensionado
          </div>
          <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            critério determinante: {CRITERIO_MT_LABEL[result.criterio]}
          </div>
        </div>
        <div className="font-display text-xl font-bold tracking-tight text-copper-800 dark:text-copper-300">
          {result.designacao}
        </div>
      </div>

      {result.disponivelNoCatalogo === false && (
        <p className="rounded-xs bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          O cálculo pede {result.secaoFinal} mm², mas essa seção não é fabricada nesta classe de
          tensão. A menor disponível é {result.secaoComercial} mm².
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-xs bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
          <Linha label="Corrente de projeto Ib" value={`${fmt(result.corrente, 1)} A`} />
          <Linha label="Por capacidade de condução" value={`${result.secaoCapacidade} mm²`} />
          <Linha label="Por queda de tensão" value={result.secaoQuedaRegime ? `${result.secaoQuedaRegime} mm²` : "—"} />
          <Linha label="Por curto no condutor" value={`${result.secaoCurtoCondutor} mm² (mín. ${fmt(result.secaoMinimaCurtoCondutor, 1)})`} />
          <Linha label="Seção adotada" value={`${result.secaoFinal} mm²`} destaque />
        </div>

        <div className="space-y-1.5 rounded-xs bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
          <Linha label="Queda de tensão" value={`${fmt(result.quedaRegime)} %`} />
          <Linha label="Resistência a 90 °C" value={`${fmt(result.resistenciaUsada, 4)} Ω/km`} />
          <Linha label="Reatância" value={`${fmt(result.reatanciaUsada, 4)} Ω/km`} />
          <Linha label="Comprimento total" value={`${result.comprimentoTotal} m`} />
        </div>
      </div>

      {/* A blindagem é o critério que a aba de baixa tensão não tem, e o que
          mais surpreende: ela não acompanha a seção do condutor. */}
      <div className={`space-y-1.5 rounded-xs px-3 py-2.5 ${b.atende ? "bg-slate-50 dark:bg-slate-800" : "bg-red-50 dark:bg-red-500/10"}`}>
        <div className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Curto-circuito na blindagem
        </div>
        <Linha label="Corrente de falta fase-terra" value={`${fmt(b.correnteFalta, 0)} A`} />
        <Linha label="Blindagem exigida" value={`${fmt(b.secaoMinima, 1)} mm²`} />
        <Linha label="Blindagem especificada" value={`${b.secaoEspecificada} mm²`} destaque={!b.atende} />
        <p className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">{b.origemCorrente}</p>
      </div>

      <div>
        <div className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Procedência dos números
        </div>
        <ul className="space-y-1">
          {result.procedencias.map((p, i) => {
            const meta = PROCEDENCIA_MT[p.tipo] ?? PROCEDENCIA_MT.convencao;
            return (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <span className={`shrink-0 rounded-xs px-1.5 py-0.5 font-mono font-semibold ${meta.cls}`}>
                  {meta.rotulo}
                </span>
                <span>{p.texto}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="text-[12px]">
        <summary className="cursor-pointer font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Fatores por trecho
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1 pr-2 font-medium">Trecho</th>
                <th className="py-1 pr-2 font-medium">Método</th>
                <th className="py-1 pr-2 font-medium">Iz tab.</th>
                <th className="py-1 pr-2 font-medium">F. temp.</th>
                <th className="py-1 pr-2 font-medium">F. agrup.</th>
                <th className="py-1 pr-2 font-medium">F. solo</th>
                <th className="py-1 font-medium">Iz corrigida</th>
              </tr>
            </thead>
            <tbody className="font-mono text-slate-700 dark:text-slate-200">
              {result.trechos.map((t, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1 pr-2">{i + 1}</td>
                  <td className="py-1 pr-2">{t.metodo}</td>
                  <td className="py-1 pr-2">{t.capacidadeNominal ?? "—"} A</td>
                  <td className="py-1 pr-2">{fmt(t.fatorTemperatura)}</td>
                  <td className="py-1 pr-2">{fmt(t.fatorAgrupamento)}</td>
                  <td className="py-1 pr-2">
                    {t.correcaoSoloAplicavel ? `${fmt(t.fatorResistividade)} × ${fmt(t.fatorProfundidade)}` : "n/a"}
                  </td>
                  <td className="py-1">{fmt(t.capacidadeCorrigida, 1)} A</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
