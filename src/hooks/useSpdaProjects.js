import { useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

// CRUD dos dois níveis da aba SPDA: projeto (site/cliente) e área (uma
// análise de risco completa dentro dele). `areas` fica vazio sem projeto
// selecionado — refreshAreas(null) limpa a lista em vez de consultar.
export function useSpdaProjects() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState(null);

  const refreshProjetos = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("projetos_spda")
      .select("id, nome, updated_at")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setProjetos(data);
    setLoading(false);
  }, []);

  const createProjeto = useCallback(async (nome) => {
    const { data, error: err } = await supabase
      .from("projetos_spda")
      .insert({ nome })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await refreshProjetos();
    return data;
  }, [refreshProjetos]);

  const deleteProjeto = useCallback(async (id) => {
    const { error: err } = await supabase.from("projetos_spda").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refreshProjetos();
  }, [refreshProjetos]);

  const refreshAreas = useCallback(async (projetoId) => {
    if (!supabaseConfigured || !projetoId) {
      setAreas([]);
      return;
    }
    setAreasLoading(true);
    setAreasError(null);
    const { data, error: err } = await supabase
      .from("areas_spda")
      .select("id, nome, updated_at")
      .eq("projeto_id", projetoId)
      .order("updated_at", { ascending: false });
    if (err) {
      setAreasError(err.message);
      setAreas([]);
    } else {
      setAreas(data);
    }
    setAreasLoading(false);
  }, []);

  // Best-effort: não deixa uma falha aqui (ex.: RLS, rede) derrubar a
  // escrita da área, que já foi concluída com sucesso.
  const tocarProjeto = async (projetoId) => {
    try {
      await supabase.from("projetos_spda").update({ updated_at: new Date().toISOString() }).eq("id", projetoId);
    } catch (e) {
      console.error("Falha ao atualizar updated_at do projeto:", e);
    }
  };

  const createArea = useCallback(async (projetoId, nome, entrada) => {
    const { data, error: err } = await supabase
      .from("areas_spda")
      .insert({ projeto_id: projetoId, nome, dados: entrada })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await tocarProjeto(projetoId);
    await refreshAreas(projetoId);
    return data;
  }, [refreshAreas]);

  const updateArea = useCallback(async (id, entrada, projetoId) => {
    const { error: err } = await supabase
      .from("areas_spda")
      .update({ dados: entrada, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw new Error(err.message);
    if (projetoId) {
      await tocarProjeto(projetoId);
      await refreshAreas(projetoId);
    }
  }, [refreshAreas]);

  const loadArea = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from("areas_spda")
      .select("*")
      .eq("id", id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  const deleteArea = useCallback(async (id, projetoId) => {
    const { error: err } = await supabase.from("areas_spda").delete().eq("id", id);
    if (err) throw new Error(err.message);
    if (projetoId) await refreshAreas(projetoId);
  }, [refreshAreas]);

  return {
    projetos, loading, error, refreshProjetos, createProjeto, deleteProjeto,
    areas, areasLoading, areasError, refreshAreas, createArea, updateArea, loadArea, deleteArea,
  };
}
