import { useEffect, useState } from "react";
import { supabaseConfigured } from "../lib/supabaseClient";

export default function ProjectsPanel({
  projects,
  loading,
  error,
  refresh,
  activeProject,
  onCreate,
  onSaveChanges,
  onLoad,
  onDelete,
  onUnlink,
  currentState,
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (supabaseConfigured) refresh();
  }, [refresh]);

  if (!supabaseConfigured) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        Salvar projetos requer configurar o Supabase (arquivo <code>.env.local</code>).
      </p>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), currentState);
      setName("");
    } catch (e) {
      alert("Erro ao criar: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveChanges = async () => {
    setBusy(true);
    try {
      await onSaveChanges(activeProject.id, currentState);
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (id) => {
    setBusyId(id);
    try {
      await onLoad(id);
    } catch (e) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id, projectName) => {
    if (!window.confirm(`Apagar o projeto "${projectName}"?`)) return;
    setBusyId(id);
    try {
      await onDelete(id);
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {activeProject && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-500/10">
          <span className="truncate text-sm text-blue-800 dark:text-blue-300">
            Editando: <b>{activeProject.nome}</b>
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={busy}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              Salvar alterações
            </button>
            <button
              type="button"
              onClick={onUnlink}
              disabled={busy}
              title="Sai da edição deste projeto e zera a tela (infraestrutura, dimensões e cabos)"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Desvincular
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nome do projeto"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {activeProject ? "Salvar como novo" : "Criar projeto"}
        </button>
      </div>

      {loading && <p className="text-xs text-slate-400">Carregando…</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {!loading && projects.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
          Nenhum projeto salvo ainda
        </p>
      )}

      {projects.length > 0 && (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {projects.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                activeProject?.id === p.id
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <span className="truncate text-slate-700 dark:text-slate-200">{p.nome}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleLoad(p.id)}
                  className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                >
                  Carregar
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleDelete(p.id, p.nome)}
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
  );
}
