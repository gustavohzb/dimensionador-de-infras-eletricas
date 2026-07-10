import { useState } from "react";
import { importCablesFromPaste } from "../lib/importCables";

export default function ImportarPlanilha({ onImport }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null); // { added, warnings } | null

  const handleImport = () => {
    if (!text.trim()) return;
    const { specs, warnings } = importCablesFromPaste(text);
    let added = 0;
    specs.forEach((spec) => {
      for (let i = 0; i < spec.quantity; i++) {
        onImport({ section: spec.section, cableType: spec.cableType, vias: spec.vias });
        added++;
      }
    });
    setResult({ added, warnings });
    if (added > 0) setText("");
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Cole as linhas do memorial de cálculo (direto do Excel) que compartilham esse trecho — o app acha a coluna de <b>SEÇÃO</b> sozinho, não importa a posição. Formatos entendidos: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">1#4x10mm²</code> (multicondutor) e <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">3#35mm²+1#16mm²</code> (unipolares).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"Cole aqui as linhas copiadas do Excel..."}
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={handleImport}
        disabled={!text.trim()}
        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        Importar cabos da planilha
      </button>
      {result && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
          {result.added > 0 && (
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              {result.added} cabo{result.added > 1 ? "s" : ""} importado{result.added > 1 ? "s" : ""}.
            </p>
          )}
          {result.warnings.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
