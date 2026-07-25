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

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDia(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
}

function Etiqueta({ tipo }) {
  const t = TIPOS[tipo] ?? TIPOS.melhoria;
  return (
    <span className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t.classe}`}>
      {t.label}
    </span>
  );
}

function Entrada({ release, atual }) {
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
            v{release.versao}
          </span>
          <Etiqueta tipo={release.tipo} />
          {atual && (
            <span className="rounded-xs border border-copper-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper-700 dark:border-copper-400 dark:text-copper-400">
              Versão atual
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{release.titulo}</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {release.itens.map((item, i) => (
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
  // As entradas internas (testes, limpeza) não interessam a quem só quer
  // saber o que mudou no app — ficam escondidas até alguém pedir. Filtrar
  // por "Interno" mostra assim mesmo: aí o pedido é explícito.
  const [mostrarInternos, setMostrarInternos] = useState(false);

  // Mais recente primeiro — é o que interessa ao abrir a aba.
  const recentesPrimeiro = useMemo(() => [...CHANGELOG].reverse(), []);

  const visiveis = useMemo(
    () =>
      recentesPrimeiro.filter((r) =>
        filtro === "todos" ? mostrarInternos || r.tipo !== "interno" : r.tipo === filtro
      ),
    [filtro, mostrarInternos, recentesPrimeiro]
  );

  // Um cabeçalho por dia, na ordem em que os releases aparecem.
  const porDia = useMemo(() => {
    const dias = [];
    for (const r of visiveis) {
      if (dias.at(-1)?.data !== r.data) dias.push({ data: r.data, releases: [] });
      dias.at(-1).releases.push(r);
    }
    return dias;
  }, [visiveis]);

  const contagem = useMemo(() => {
    const c = {};
    for (const r of CHANGELOG) c[r.tipo] = (c[r.tipo] ?? 0) + 1;
    return c;
  }, []);

  const internos = contagem.interno ?? 0;

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
          Tudo o que mudou no app desde a primeira versão, em {CHANGELOG.length} releases. A versão
          segue o formato <b className="font-mono font-semibold text-slate-600 dark:text-slate-300">maior.menor.correção</b>:
          a primeira casa muda quando muda a cara ou a estrutura do app, a segunda quando entra
          funcionalidade nova e a terceira em consertos e ajustes finos.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => {
            const n = f.id === "todos" ? visiveis.length : (contagem[f.id] ?? 0);
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

        {filtro === "todos" && internos > 0 && (
          <button
            type="button"
            onClick={() => setMostrarInternos((v) => !v)}
            className="mt-2 text-xs text-slate-500 underline decoration-dotted underline-offset-2 transition hover:text-copper-700 dark:text-slate-400 dark:hover:text-copper-400"
          >
            {internos === 1
              ? mostrarInternos
                ? "Ocultar a atualização interna"
                : "Mostrar também a atualização interna (testes e limpeza de código)"
              : mostrarInternos
                ? `Ocultar as ${internos} atualizações internas`
                : `Mostrar também as ${internos} atualizações internas (testes e limpeza de código)`}
          </button>
        )}
      </div>

      {/* Linha do tempo: um traço vertical atrás dos marcadores. */}
      <div className="relative space-y-4 border-l border-slate-200 pb-2 dark:border-slate-800">
        {porDia.map((dia) => (
          <section key={dia.data}>
            <h2 className="mb-2 pl-8 font-display text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {formatarDia(dia.data)}
            </h2>
            <ol className="space-y-2.5">
              {dia.releases.map((r) => (
                <Entrada key={r.versao} release={r} atual={r.versao === APP_VERSION} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
