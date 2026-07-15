import { useState, useEffect } from "react";
import { SECTIONS, VIAS_OPTIONS, SECTIONS_BY_VIAS } from "../data/corfioHEPR";

export default function CableForm({ onAddCable, onAddTrifolio }) {
  const [cableType, setCableType] = useState("unipolar");
  const [vias, setVias] = useState(3);
  const [section, setSection] = useState(6);

  const validSections = cableType === "multipolar" ? SECTIONS_BY_VIAS[vias] : SECTIONS;

  // Se a seção atual não existe para o número de vias escolhido
  // (a Corfio não fabrica todas as seções em todas as configurações),
  // cai para a maior seção disponível nessa configuração.
  useEffect(() => {
    if (!validSections.includes(section)) {
      setSection(validSections[validSections.length - 1]);
    }
  }, [validSections, section]);

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Tipo de cabo</label>
        <div className="grid grid-cols-2 gap-2">
          {["unipolar", "multipolar"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCableType(type)}
              className={`rounded-xs border px-3 py-1.5 text-sm font-medium transition ${
                cableType === type
                  ? "border-copper-600 bg-copper-50 text-copper-700 dark:border-copper-500 dark:bg-copper-500/15 dark:text-copper-300"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {type === "unipolar" ? "Unipolar" : "Multipolar"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cableType === "multipolar" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Nº de vias</label>
            <select
              value={vias}
              onChange={(e) => setVias(+e.target.value)}
              className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {VIAS_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
        <div className={cableType === "multipolar" ? "" : "col-span-2"}>
          <label className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Seção (mm²)</label>
          <select
            value={section}
            onChange={(e) => setSection(+e.target.value)}
            className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {validSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onAddCable({ section, cableType, vias })}
          className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 active:scale-[0.98]"
        >
          + Adicionar cabo
        </button>
        {cableType === "unipolar" && (
          <button
            type="button"
            onClick={() => onAddTrifolio({ section })}
            className="rounded-xs bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98]"
            title="Adiciona um trifólio (3 condutores unipolares agrupados)"
          >
            Trifólio
          </button>
        )}
      </div>
    </div>
  );
}
