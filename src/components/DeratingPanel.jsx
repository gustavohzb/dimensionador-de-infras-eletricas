import { ARRANJOS, getFator } from "../lib/derating";

// Painel do fator de correção por agrupamento (NBR 5410 Tabela 42).
// `circuitosAuto` é a estimativa do app; o usuário pode sobrescrever porque
// só ele sabe a composição real dos circuitos (F+N+PE, reservas etc.).
export default function DeratingPanel({
  arranjo,
  onArranjoChange,
  circuitos,
  circuitosAuto,
  onCircuitosChange,
}) {
  const fator = getFator(arranjo, circuitos);
  const isOverride = circuitos !== circuitosAuto;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Fator de agrupamento
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">NBR 5410 — Tabela 42</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Forma de instalação
          </label>
          <select
            value={arranjo}
            onChange={(e) => onArranjoChange(e.target.value)}
            className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {ARRANJOS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Nº de circuitos
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              value={circuitos}
              onChange={(e) => onCircuitosChange(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {isOverride && (
              <button
                type="button"
                onClick={() => onCircuitosChange(null)}
                title={`Voltar à estimativa automática (${circuitosAuto})`}
                className="rounded-xs px-1.5 py-1 text-[11px] font-medium text-copper-600 hover:bg-copper-50 dark:text-copper-400 dark:hover:bg-copper-500/10"
              >
                auto
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xs bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Fator de correção da capacidade de condução
        </span>
        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
          {fator != null ? fator.toFixed(2).replace(".", ",") : "—"}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        Multiplique a capacidade de condução de corrente de cada circuito por esse fator. A
        estimativa de circuitos agrupa unipolares soltos de 3 em 3 por seção — ajuste se a
        composição real for outra. Válido para cabos em <b>camada única</b>; com cabos empilhados
        em várias camadas, o fator real é menor que o tabelado.
      </p>
    </div>
  );
}
