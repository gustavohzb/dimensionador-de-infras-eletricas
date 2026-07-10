import { useState } from "react";
import { parseMemorial } from "../lib/importCables";

function specLabel(spec) {
  const via = spec.cableType === "multipolar" ? `${spec.vias}x` : "";
  return `${spec.quantity}× ${via}${spec.section}mm² (Ø ${spec.d.toFixed(1)}mm)`;
}

export default function ImportarPlanilha({ onImport, onImportTrifolio }) {
  const [text, setText] = useState("");
  // null = ainda colando texto; array = já analisado, aguardando revisão/confirmação.
  const [preview, setPreview] = useState(null);
  // chaves "lineIdx-specIdx" marcadas pra virar trifólio (pré-marcadas nos
  // grupos de 3 condutores iguais — o usuário desmarca ramal por ramal).
  const [trifolioChoices, setTrifolioChoices] = useState(new Set());
  const [result, setResult] = useState(null); // { added, warnings } | null

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const parsed = parseMemorial(text);
    const initialChoices = new Set();
    parsed.forEach((line, i) => {
      line.specs.forEach((spec, j) => {
        if (spec.canBeTrifolio) initialChoices.add(`${i}-${j}`);
      });
    });
    setPreview(parsed);
    setTrifolioChoices(initialChoices);
    setResult(null);
  };

  const toggleTrifolio = (key) => {
    setTrifolioChoices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    let added = 0;
    const warnings = [];
    preview.forEach((line, i) => {
      if (line.error) {
        warnings.push(`Linha ${line.lineNumber}: ${line.error}.`);
        return;
      }
      line.specs.forEach((spec, j) => {
        if (spec.error) {
          warnings.push(`Linha ${line.lineNumber} ("${spec.source}"): ${spec.error}.`);
          return;
        }
        if (spec.canBeTrifolio && trifolioChoices.has(`${i}-${j}`)) {
          onImportTrifolio({ section: spec.section });
          added += 3;
          return;
        }
        for (let k = 0; k < spec.quantity; k++) {
          onImport({ section: spec.section, cableType: spec.cableType, vias: spec.vias });
          added++;
        }
      });
    });
    setResult({ added, warnings });
    setPreview(null);
    setText("");
  };

  return (
    <div className="space-y-2.5">
      {!preview && (
        <>
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
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            Analisar linhas
          </button>
        </>
      )}

      {preview && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Confira os ramais abaixo. Grupos de 3 condutores iguais já vêm marcados como <b>trifólio</b> — desmarque os que devem ficar soltos.
          </p>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {preview.map((line, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="truncate font-medium text-slate-700 dark:text-slate-200">{line.label}</div>
                {line.error && (
                  <div className="text-amber-600 dark:text-amber-400">⚠ {line.error}</div>
                )}
                {line.specs.map((spec, j) =>
                  spec.error ? (
                    <div key={j} className="text-amber-600 dark:text-amber-400">
                      ⚠ {spec.error} ("{spec.source}")
                    </div>
                  ) : (
                    <div key={j} className="mt-0.5 flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                      <span>{specLabel(spec)}</span>
                      {spec.canBeTrifolio && (
                        <label className="flex shrink-0 items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <input
                            type="checkbox"
                            checked={trifolioChoices.has(`${i}-${j}`)}
                            onChange={() => toggleTrifolio(`${i}-${j}`)}
                            className="h-3.5 w-3.5 accent-amber-600"
                          />
                          Trifólio
                        </label>
                      )}
                    </div>
                  )
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Confirmar importação
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

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
