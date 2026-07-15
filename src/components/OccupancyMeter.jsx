export default function OccupancyMeter({ trayArea, cableArea, ocupacao, limite, dentroLimite }) {
  const barWidth = Math.min(ocupacao, 100);
  const limitPos = Math.min(limite, 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Taxa de ocupação
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-0.5 font-mono text-xs font-semibold ${
            dentroLimite
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {dentroLimite ? "Dentro do limite" : "Acima do limite"}
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-xs border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <div
          className={`h-full transition-all ${dentroLimite ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${barWidth}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-500 dark:bg-slate-400"
          style={{ left: `${limitPos}%` }}
          title={`Limite: ${limite}%`}
        />
      </div>

      <div className="flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          <span
            className={`font-mono text-lg font-bold tabular-nums ${dentroLimite ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {ocupacao.toFixed(1)}%
          </span>{" "}
          ocupado
        </span>
        <span className="font-mono tabular-nums">limite {limite}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="rounded-xs bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
          <div className="text-slate-400 dark:text-slate-500">Área útil</div>
          <div className="font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {trayArea.toFixed(0)} mm²
          </div>
        </div>
        <div className="rounded-xs bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
          <div className="text-slate-400 dark:text-slate-500">Área ocupada</div>
          <div className="font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {cableArea.toFixed(0)} mm²
          </div>
        </div>
      </div>
    </div>
  );
}
