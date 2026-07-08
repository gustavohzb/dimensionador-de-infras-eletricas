import { VIAS_COLORS } from "../data/corfioHEPR";

export default function CableList({ groupedCables, onRemoveGroup, onRemoveAll }) {
  if (groupedCables.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
        Nenhum cabo adicionado ainda
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {groupedCables.map((c) => (
          <li
            key={c.key}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                style={{ backgroundColor: VIAS_COLORS[c.vias] }}
              />
              <span className="truncate text-slate-700 dark:text-slate-200">
                {c.quantity}× {c.vias > 1 ? `${c.vias}x` : ""}
                {c.section}mm²{" "}
                <span className="text-slate-400 dark:text-slate-500">(Ø {c.d.toFixed(1)}mm)</span>
                {c.trifolio && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    TRIFÓLIO
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => onRemoveGroup(c.key)}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={onRemoveAll}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Remover todos
      </button>
    </div>
  );
}
