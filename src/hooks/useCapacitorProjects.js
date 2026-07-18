import { useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

// O estado do banco de capacitores tem muitos campos (tensões, fatores,
// estágios e os parâmetros da placa), então guardamos tudo num único jsonb
// `dados` — mesma interface do useProjects/useCabosProjects, mas com o estado
// inteiro numa coluna só.
const toRow = (state) => ({ dados: state });

// CRUD dos projetos da aba "Capacitores" (tabela "projetos_capacitores").
export function useCapacitorProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("projetos_capacitores")
      .select("id, nome, updated_at")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setProjects(data);
    setLoading(false);
  }, []);

  const createProject = useCallback(async (nome, state) => {
    const { data, error: err } = await supabase
      .from("projetos_capacitores")
      .insert({ nome, ...toRow(state) })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await refresh();
    return data;
  }, [refresh]);

  const updateProject = useCallback(async (id, state) => {
    const { error: err } = await supabase
      .from("projetos_capacitores")
      .update({ ...toRow(state), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  const loadProject = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from("projetos_capacitores")
      .select("*")
      .eq("id", id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    const { error: err } = await supabase.from("projetos_capacitores").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  return { projects, loading, error, refresh, createProject, updateProject, loadProject, deleteProject };
}
