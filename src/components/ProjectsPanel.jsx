import { useEffect, useState } from "react";
import { supabaseConfigured } from "../lib/supabaseClient";

export default function ProjectsPanel({ projects, loading, error, refresh, onSave, onLoad, onDelete, currentState }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), currentState);
      setName("");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
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
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Nome do projeto"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
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
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
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
