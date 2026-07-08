import { useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

// CRUD de projetos salvos (tabela "projetos" no Supabase).
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("projetos")
      .select("id, nome, updated_at")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setProjects(data);
    setLoading(false);
  }, []);

  const saveProject = useCallback(async (nome, state) => {
    const { error: err } = await supabase.from("projetos").insert({
      nome,
      infra_type: state.infraType,
      eletroduto_norma: state.eletrodutoNorma,
      leito_flange: state.leitoFlange,
      tray_width: state.trayWidth,
      tray_height: state.trayHeight,
      cables: state.cables,
    });
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  const loadProject = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from("projetos")
      .select("*")
      .eq("id", id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    const { error: err } = await supabase.from("projetos").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  return { projects, loading, error, refresh, saveProject, loadProject, deleteProject };
}
