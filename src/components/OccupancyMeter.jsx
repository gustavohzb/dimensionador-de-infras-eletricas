export default function OccupancyMeter({ trayArea, cableArea, ocupacao, limite, dentroLimite }) {
  const barWidth = Math.min(ocupacao, 100);
  const limitPos = Math.min(limite, 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Taxa de ocupação</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            dentroLimite
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
          }`}
        >
          {dentroLimite ? "Dentro do limite" : "Acima do limite"}
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${dentroLimite ? "bg-emerald-500" : "bg-red-500"}`}
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
          <span className={`text-lg font-bold ${dentroLimite ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {ocupacao.toFixed(1)}%
          </span>{" "}
          ocupado
        </span>
        <span>limite {limite}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
          <div className="text-slate-400 dark:text-slate-500">Área útil</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{trayArea.toFixed(0)} mm²</div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
          <div className="text-slate-400 dark:text-slate-500">Área ocupada</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cableArea.toFixed(0)} mm²</div>
        </div>
      </div>
    </div>
  );
}
