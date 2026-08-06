import { useMemo, useState } from "react";
import { parseTabelaNG, estadosDaTabela } from "../../lib/importNG";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function ImportarNG({ onImportar, onCancelar }) {
  const [texto, setTexto] = useState("");
  const [analise, setAnalise] = useState(null);

  const previa = useMemo(() => {
    if (!analise) return null;
    return { ...analise, estados: estadosDaTabela(analise.linhas) };
  }, [analise]);

  return (
    <div className="space-y-2.5 rounded-xs border border-copper-300 bg-copper-50/60 p-3 dark:border-copper-800 dark:bg-copper-500/10">
      <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-copper-700 dark:text-copper-400">
        Importar tabela de N_G
      </h4>

      {!previa && (
        <>
          <p className="text-[11.5px] leading-snug text-slate-600 dark:text-slate-300">
            Cole aqui as linhas da <b>Tabela F.1 — Densidade de descargas atmosféricas N_G por
            município</b>, do Anexo F da NBR 5419-2:2026. Uma linha por município, com nome, UF e
            valor separados por tabulação ou ponto e vírgula. A tabela fica salva apenas neste
            navegador — não é enviada a lugar nenhum nem faz parte do aplicativo.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder={"Abadia de Goiás\tGO\t14\nAbadia dos Dourados\tMG\t12\nAbadiânia\tGO\t16"}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAnalise(parseTabelaNG(texto))}
              disabled={!texto.trim()}
              className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              Analisar tabela
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {previa && (
        <>
          <div className="rounded-xs border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {previa.linhas.length.toLocaleString("pt-BR")} municípios em {previa.estados.length}{" "}
              {previa.estados.length === 1 ? "estado" : "estados"}.
            </p>
            {previa.estados.length > 0 && (
              <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {previa.estados.join(" · ")}
              </p>
            )}
            {previa.linhas.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Primeira: <b>{previa.linhas[0].municipio}/{previa.linhas[0].uf}</b> ={" "}
                {String(previa.linhas[0].ng).replace(".", ",")} · Última:{" "}
                <b>
                  {previa.linhas.at(-1).municipio}/{previa.linhas.at(-1).uf}
                </b>{" "}
                = {String(previa.linhas.at(-1).ng).replace(".", ",")}
              </p>
            )}
          </div>

          {previa.avisos.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-xs border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                {previa.avisos.length} linha{previa.avisos.length > 1 ? "s" : ""} não aproveitada
                {previa.avisos.length > 1 ? "s" : ""}:
              </p>
              <ul className="mt-0.5 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                {previa.avisos.slice(0, 20).map((a, i) => (
                  <li key={i}>⚠ {a}</li>
                ))}
                {previa.avisos.length > 20 && <li>… e mais {previa.avisos.length - 20}.</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onImportar(previa.linhas)}
              disabled={previa.linhas.length === 0}
              className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              {previa.linhas.length > 0
                ? `Usar ${previa.linhas.length.toLocaleString("pt-BR")} municípios`
                : "Nada para importar"}
            </button>
            <button
              type="button"
              onClick={() => setAnalise(null)}
              className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Voltar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
