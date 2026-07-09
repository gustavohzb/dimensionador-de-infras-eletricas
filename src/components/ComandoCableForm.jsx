import { useState, useEffect } from "react";
import { COMANDO_CONDUTORES_OPTIONS, getComandoSectionsFor, getComandoDiameter } from "../data/cablieComando";

export default function ComandoCableForm({ onAddCable }) {
  const [condutores, setCondutores] = useState(4);
  const [section, setSection] = useState(0.75);

  const validSections = getComandoSectionsFor(condutores);

  // Nem toda seção existe para todo número de condutores (ex.: 13 vias só
  // existe em 0,5mm² no catálogo) — cai para a maior seção disponível.
  useEffect(() => {
    if (!validSections.includes(section)) {
      setSection(validSections[validSections.length - 1]);
    }
  }, [validSections, section]);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Nº de condutores</label>
          <select
            value={condutores}
            onChange={(e) => setCondutores(+e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {COMANDO_CONDUTORES_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Seção (mm²)</label>
          <select
            value={section}
            onChange={(e) => setSection(+e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {validSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const d = getComandoDiameter(section, condutores);
          onAddCable({ section, d, type: "comando", vias: condutores });
        }}
        className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
      >
        + Adicionar cabo
      </button>
    </div>
  );
}
