import { useMemo, useState } from "react";
import { CHANGELOG, TIPOS, APP_VERSION } from "../data/changelog";

const FILTROS = [
  { id: "todos", label: "Tudo" },
  { id: "novo", label: "Novidades" },
  { id: "melhoria", label: "Melhorias" },
  { id: "correcao", label: "Correções" },
  { id: "dados", label: "Catálogo/Norma" },
  { id: "interno", label: "Interno" },
];

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function Etiqueta({ tipo }) {
  const t = TIPOS[tipo] ?? TIPOS.melhoria;
  return (
    <span className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t.classe}`}>
      {t.label}
    </span>
  );
}

function Entrada({ update, atual }) {
  return (
    <li className="relative pl-8">
      {/* Marcador na linha do tempo — o da versão atual vem preenchido. */}
      <span
        className={`absolute left-[9px] top-2 h-2.5 w-2.5 rounded-full border-2 ${
          atual
            ? "border-copper-600 bg-copper-600 dark:border-copper-400 dark:bg-copper-400"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
        }`}
      />
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-copper-700 dark:text-copper-400">
            v{update.versao}
          </span>
          <Etiqueta tipo={update.tipo} />
          {atual && (
            <span className="rounded-xs border border-copper-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper-700 dark:border-copper-400 dark:text-copper-400">
              Versão atual
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-slate-400 dark:text-slate-500">
            {formatarData(update.data)}
          </span>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{update.titulo}</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {update.itens.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-copper-600 dark:text-copper-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function AtualizacoesTab() {
  const [filtro, setFiltro] = useState("todos");

  // Mais recente primeiro — é o que interessa ao abrir a aba.
  const recentesPrimeiro = useMemo(() => [...CHANGELOG].reverse(), []);
  const visiveis = useMemo(
    () => (filtro === "todos" ? recentesPrimeiro : recentesPrimeiro.filter((u) => u.tipo === filtro)),
    [filtro, recentesPrimeiro]
  );

  const contagem = useMemo(() => {
    const c = {};
    for (const u of CHANGELOG) c[u.tipo] = (c[u.tipo] ?? 0) + 1;
    return c;
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-base font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
            Atualizações
          </h1>
          <span className="rounded-full bg-copper-50 px-2.5 py-0.5 font-mono text-xs font-medium text-copper-700 dark:bg-copper-500/15 dark:text-copper-300">
            Versão atual {APP_VERSION}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tudo o que mudou no app desde a primeira versão. A contagem começa na{" "}
          <b className="font-mono font-semibold text-slate-600 dark:text-slate-300">0.00</b> e cada
          atualização soma 0,01 — são {CHANGELOG.length} até agora.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => {
            const n = f.id === "todos" ? CHANGELOG.length : (contagem[f.id] ?? 0);
            const ativo = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`rounded-xs border px-2 py-1 text-xs font-medium transition ${
                  ativo
                    ? "border-copper-600 bg-copper-50 text-copper-700 dark:border-copper-400 dark:bg-copper-500/15 dark:text-copper-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {f.label} <span className="font-mono text-[11px] opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha do tempo: um traço vertical atrás dos marcadores. */}
      <ol className="relative space-y-2.5 border-l border-slate-200 pb-2 dark:border-slate-800">
        {visiveis.map((u) => (
          <Entrada key={u.versao} update={u} atual={u.versao === APP_VERSION} />
        ))}
      </ol>
    </div>
  );
}
