import { QTD_MAX, lerQuantidade } from "../lib/quantidade";

export default function QuantidadeInput({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Qtd.</label>
      <input
        type="number"
        min={1}
        max={QTD_MAX}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onChange(String(lerQuantidade(value)))}
        className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </div>
  );
}
