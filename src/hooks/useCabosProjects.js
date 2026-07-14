import { useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

// Estado do quadro de cargas gravado como duas colunas jsonb.
const toRow = (state) => ({
  circuitos: state.circuitos,
  preset: state.preset,
});

// CRUD dos projetos da aba "Cabos Elétricos" (tabela "projetos_cabos" no
// Supabase). Mesma interface do useProjects da Infraestrutura, mas com o
// formato de estado próprio (lista de circuitos + preset).
export function useCabosProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("projetos_cabos")
      .select("id, nome, updated_at")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setProjects(data);
    setLoading(false);
  }, []);

  const createProject = useCallback(async (nome, state) => {
    const { data, error: err } = await supabase
      .from("projetos_cabos")
      .insert({ nome, ...toRow(state) })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await refresh();
    return data;
  }, [refresh]);

  const updateProject = useCallback(async (id, state) => {
    const { error: err } = await supabase
      .from("projetos_cabos")
      .update({ ...toRow(state), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  const loadProject = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from("projetos_cabos")
      .select("*")
      .eq("id", id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    const { error: err } = await supabase.from("projetos_cabos").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  return { projects, loading, error, refresh, createProject, updateProject, loadProject, deleteProject };
}
