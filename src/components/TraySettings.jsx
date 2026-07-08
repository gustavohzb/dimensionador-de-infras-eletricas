export default function TraySettings({ trayWidth, setTrayWidth, trayHeight, setTrayHeight, dim }) {
  if (dim.kind === "duct") {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Bitola</label>
        <select
          value={trayWidth}
          onChange={(e) => {
            const v = +e.target.value;
            setTrayWidth(v);
            setTrayHeight(v);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {dim.sizes.map((s) => (
            <option key={s.value} value={s.value}>{s.label} (Ø int. {s.value}mm)</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Largura (mm)</label>
        <select
          value={trayWidth}
          onChange={(e) => setTrayWidth(+e.target.value)}
          disabled={dim.widths.length <= 1}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {dim.widths.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Altura (mm)</label>
        <select
          value={trayHeight}
          onChange={(e) => setTrayHeight(+e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {dim.heights.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
