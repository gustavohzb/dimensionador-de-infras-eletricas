import { useState } from "react";
import { supabaseConfigured } from "../../lib/supabaseClient";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function SpdaProjectsPanel({
  projetos, loadingProjetos, errorProjetos,
  projetoSelecionadoId, onSelecionarProjeto,
  onCriarProjeto, onApagarProjeto,
  areas, loadingAreas,
  activeArea,
  onCriarArea, onSalvarArea, onCarregarArea, onApagarArea, onDesvincular,
}) {
  const [criandoProjeto, setCriandoProjeto] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [nomeArea, setNomeArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!supabaseConfigured) {
    return (
      <p className="rounded-xs border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        Salvar projetos requer configurar o Supabase (arquivo <code>.env.local</code>).
      </p>
    );
  }

  const projetoAtual = projetos.find((p) => p.id === projetoSelecionadoId) ?? null;

  const handleCriarProjeto = async () => {
    if (!nomeProjeto.trim()) return;
    setBusy(true);
    try {
      await onCriarProjeto(nomeProjeto.trim());
      setNomeProjeto("");
      setCriandoProjeto(false);
    } catch (e) {
      alert("Erro ao criar projeto: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleApagarProjeto = async () => {
    if (!projetoAtual) return;
    const aviso = areas.length
      ? `Apagar "${projetoAtual.nome}" e ${areas.length === 1 ? "a área" : `as ${areas.length} áreas`} dentro dele?`
      : `Apagar "${projetoAtual.nome}"?`;
    if (!window.confirm(aviso)) return;
    setBusy(true);
    try {
      await onApagarProjeto(projetoAtual.id);
    } catch (e) {
      alert("Erro ao apagar projeto: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCriarArea = async () => {
    if (!nomeArea.trim()) return;
    setBusy(true);
    try {
      await onCriarArea(nomeArea.trim());
      setNomeArea("");
    } catch (e) {
      alert("Erro ao criar área: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSalvarArea = async () => {
    setBusy(true);
    try {
      await onSalvarArea();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCarregarArea = async (id) => {
    setBusyId(id);
    try {
      await onCarregarArea(id);
    } catch (e) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleApagarArea = async (id, nome) => {
    if (!window.confirm(`Apagar a área "${nome}"?`)) return;
    setBusyId(id);
    try {
      await onApagarArea(id);
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Projeto
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        {!criandoProjeto ? (
          <>
            <select
              value={projetoSelecionadoId ?? ""}
              onChange={(e) => onSelecionarProjeto(e.target.value || null)}
              className={`max-w-xs ${inputCls}`}
            >
              <option value="">Escolha um projeto…</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCriandoProjeto(true)}
              className="rounded-xs border border-copper-600 px-2.5 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              + novo projeto
            </button>
            {projetoAtual && (
              <button
                type="button"
                onClick={handleApagarProjeto}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Apagar projeto
              </button>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarProjeto()}
              placeholder="Nome do projeto (ex.: Unidade Cvale Corbélia)"
              autoFocus
              className={`max-w-xs ${inputCls}`}
            />
            <button
              type="button"
              onClick={handleCriarProjeto}
              disabled={busy || !nomeProjeto.trim()}
              className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-copper-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => { setCriandoProjeto(false); setNomeProjeto(""); }}
              className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
            >
              cancelar
            </button>
          </>
        )}
      </div>

      {loadingProjetos && <p className="mt-2 text-xs text-slate-400">Carregando projetos…</p>}
      {errorProjetos && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorProjetos}</p>}

      {projetoAtual && (
        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {activeArea && activeArea.projetoId === projetoAtual.id && (
            <div className="flex items-center justify-between gap-2 rounded-xs border border-copper-200 bg-copper-50 px-3 py-2 dark:border-copper-800 dark:bg-copper-500/10">
              <span className="truncate text-sm text-copper-800 dark:text-copper-300">
                Editando: <b>{activeArea.projetoNome}</b> / <b>{activeArea.nome}</b>
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSalvarArea}
                  disabled={busy}
                  className="rounded-xs bg-copper-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
                >
                  Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={onDesvincular}
                  disabled={busy}
                  className="rounded-xs border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Desvincular
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={nomeArea}
              onChange={(e) => setNomeArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarArea()}
              placeholder="Nome da área (ex.: Administrativo)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleCriarArea}
              disabled={busy || !nomeArea.trim()}
              className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              + área
            </button>
          </div>

          {loadingAreas && <p className="text-xs text-slate-400">Carregando áreas…</p>}

          {!loadingAreas && areas.length === 0 && (
            <p className="rounded-xs border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
              Nenhuma área salva ainda neste projeto
            </p>
          )}

          {areas.length > 0 && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {areas.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-2 rounded-xs border px-3 py-1.5 text-sm ${
                    activeArea?.id === a.id
                      ? "border-copper-300 bg-copper-50 dark:border-copper-700 dark:bg-copper-500/10"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">{a.nome}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => handleCarregarArea(a.id)}
                      className="text-xs font-medium text-copper-600 hover:underline disabled:opacity-50 dark:text-copper-400"
                    >
                      Carregar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => handleApagarArea(a.id, a.nome)}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
