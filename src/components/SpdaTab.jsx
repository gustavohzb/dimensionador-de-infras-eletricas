import { useEffect, useMemo, useState } from "react";
import { defaultEntrada, avaliarRisco } from "../lib/spdaRisco";
import { normalizarEntrada } from "../lib/spdaEntrada";
import { exportSpdaPDF } from "../lib/spdaPdf";
import { useSpdaProjects } from "../hooks/useSpdaProjects";
import SpdaProjectsPanel from "./spda/SpdaProjectsPanel";
import VereditoRisco from "./spda/VereditoRisco";
import ResultadoRisco from "./spda/ResultadoRisco";
import FrequenciaDanos from "./spda/FrequenciaDanos";
import SugestaoMedidas from "./spda/SugestaoMedidas";
import EstruturaForm from "./spda/EstruturaForm";
import LinhasForm from "./spda/LinhasForm";
import ProtecoesForm from "./spda/ProtecoesForm";

const STORAGE_KEY = "spdaRisco.v1";

// Lazy: sem a função, o parse do localStorage rodaria a cada render.
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizarEntrada(JSON.parse(raw));
  } catch { /* estado inicial */ }
  return defaultEntrada();
}

export default function SpdaTab() {
  const [entrada, setEntrada] = useState(carregar);

  // Registro de projetos SPDA (Supabase): projeto = site/cliente, área =
  // uma análise de risco completa dentro dele. O rascunho local acima
  // continua funcionando independente de haver área carregada.
  const projectsApi = useSpdaProjects();
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState(null);
  const [activeArea, setActiveArea] = useState(null);

  useEffect(() => {
    projectsApi.refreshProjetos();
  }, [projectsApi.refreshProjetos]);

  useEffect(() => {
    projectsApi.refreshAreas(projetoSelecionadoId);
  }, [projetoSelecionadoId, projectsApi.refreshAreas]);

  const handleCriarProjeto = async (nome) => {
    const criado = await projectsApi.createProjeto(nome);
    setProjetoSelecionadoId(criado.id);
  };

  const handleApagarProjeto = async (id) => {
    await projectsApi.deleteProjeto(id);
    if (projetoSelecionadoId === id) setProjetoSelecionadoId(null);
    if (activeArea?.projetoId === id) setActiveArea(null);
  };

  const handleCriarArea = async (nome) => {
    const criado = await projectsApi.createArea(projetoSelecionadoId, nome, entrada);
    const projeto = projectsApi.projetos.find((p) => p.id === projetoSelecionadoId);
    setActiveArea({ id: criado.id, nome: criado.nome, projetoId: projetoSelecionadoId, projetoNome: projeto?.nome ?? "" });
  };

  const handleSalvarArea = async () => {
    await projectsApi.updateArea(activeArea.id, entrada, activeArea.projetoId);
  };

  const handleCarregarArea = async (id) => {
    const salvo = await projectsApi.loadArea(id);
    setEntrada(normalizarEntrada(salvo.dados));
    const projeto = projectsApi.projetos.find((p) => p.id === salvo.projeto_id);
    setActiveArea({ id: salvo.id, nome: salvo.nome, projetoId: salvo.projeto_id, projetoNome: projeto?.nome ?? "" });
    setProjetoSelecionadoId(salvo.projeto_id);
  };

  const handleApagarArea = async (id) => {
    await projectsApi.deleteArea(id, projetoSelecionadoId);
    if (activeArea?.id === id) setActiveArea(null);
  };

  const handleDesvincularArea = () => {
    if (!window.confirm("Desvincular e zerar a aba (estrutura, linhas e proteções)?")) return;
    setActiveArea(null);
    setEntrada(defaultEntrada());
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entrada));
    } catch { /* quota */ }
  }, [entrada]);

  const resultado = useMemo(() => avaliarRisco(entrada), [entrada]);

  const setParte = (parte) => (patch) =>
    setEntrada((e) => ({ ...e, [parte]: { ...e[parte], ...patch } }));

  const [gerandoPdf, setGerandoPdf] = useState(false);

  const exportarPdf = () => {
    setGerandoPdf(true);
    exportSpdaPDF({ entrada, resultado }).finally(() => setGerandoPdf(false));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-base font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
              Gerenciamento de risco — SPDA
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Análise de risco conforme a <b>ABNT NBR 5419-2:2026</b>, com a estrutura tratada como
              zona de estudo única. Calcula as oito componentes de risco, soma R1 e R3 e compara com os
              riscos toleráveis da Tabela 4.
            </p>
          </div>
          {entrada.estrutura.ng != null && (
            <button
              type="button"
              onClick={exportarPdf}
              disabled={gerandoPdf}
              className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700 disabled:opacity-50"
            >
              {gerandoPdf ? "Gerando…" : "Relatório PDF"}
            </button>
          )}
        </div>
      </div>

      <SpdaProjectsPanel
        projetos={projectsApi.projetos}
        loadingProjetos={projectsApi.loading}
        errorProjetos={projectsApi.error}
        projetoSelecionadoId={projetoSelecionadoId}
        onSelecionarProjeto={setProjetoSelecionadoId}
        onCriarProjeto={handleCriarProjeto}
        onApagarProjeto={handleApagarProjeto}
        areas={projectsApi.areas}
        loadingAreas={projectsApi.areasLoading}
        activeArea={activeArea}
        onCriarArea={handleCriarArea}
        onSalvarArea={handleSalvarArea}
        onCarregarArea={handleCarregarArea}
        onApagarArea={handleApagarArea}
        onDesvincular={handleDesvincularArea}
      />

      {/* Sem município escolhido não há N_G, e sem N_G todas as componentes dão
          zero — o que a aba exibiria como "proteção não é necessária". */}
      <VereditoRisco resultado={resultado} pendente={entrada.estrutura.ng == null} />

      {entrada.estrutura.ng != null && <ResultadoRisco resultado={resultado} />}
      {entrada.estrutura.ng != null && <FrequenciaDanos frequencias={resultado.frequencias} />}
      {entrada.estrutura.ng != null && (
        <SugestaoMedidas
          entrada={entrada}
          resultado={resultado}
          onAplicar={(nova) => setEntrada(nova)}
        />
      )}

      <EstruturaForm value={entrada.estrutura} onChange={setParte("estrutura")} />

      <LinhasForm
        linhas={entrada.linhas}
        onChange={(fn) => setEntrada((e) => ({ ...e, linhas: fn(e.linhas) }))}
      />

      <ProtecoesForm
        value={entrada.protecoes}
        linhas={entrada.linhas}
        onChange={setParte("protecoes")}
        onSistemas={(fn) =>
          setEntrada((e) => ({ ...e, protecoes: { ...e.protecoes, sistemas: fn(e.protecoes.sistemas) } }))
        }
      />
    </div>
  );
}
