import { useEffect, useRef, useState } from "react";
import {
  CircuitoForm, ResultadoCircuito, computeCircuito, defaultCircuito, defaultPreset, CRITERIO_LABEL,
} from "./cabos/CircuitoForm";
import PresetPanel from "./cabos/PresetPanel";
import ProjectsPanel from "./ProjectsPanel";
import { useCabosProjects } from "../hooks/useCabosProjects";
import { ESQUEMAS } from "../data/cabosNBR5410";
import { designacaoCabos } from "../lib/cableSizingPro";
import { exportCircuitoPDF, exportMemorialPDF } from "../lib/memorialPdf";

const STORAGE_KEY = "quadroCargas.v2";
const STORAGE_KEY_V1 = "quadroCargas.v1";
const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

function novoCircuito(n) {
  return { ...defaultCircuito(), tag: `AL-${String(n).padStart(2, "0")}` };
}

// Carrega o estado salvo: formato v2 ({ circuitos, preset }) ou migra do v1
// (só a lista de circuitos, antes do preset existir).
function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.circuitos) && parsed.circuitos.length) {
        return { circuitos: parsed.circuitos, preset: { ...defaultPreset(), ...parsed.preset } };
      }
    }
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const arr = JSON.parse(rawV1);
      if (Array.isArray(arr) && arr.length) return { circuitos: arr, preset: defaultPreset() };
    }
  } catch { /* estado inicial */ }
  return { circuitos: [novoCircuito(1)], preset: defaultPreset() };
}

// Quadro de cargas: uma linha por circuito, com o memorial resumido. O preset
// (material, temperatura, quedas, seções) vale para todos os circuitos; os
// projetos ficam no Supabase (tabela projetos_cabos).
export default function QuadroCargasTab() {
  const inicial = carregarEstado();
  const [circuitos, setCircuitos] = useState(inicial.circuitos);
  const [preset, setPreset] = useState(inicial.preset);
  const [selecionado, setSelecionado] = useState(0);
  const formRef = useRef(null);

  const projectsApi = useCabosProjects();
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuitos, preset }));
    } catch { /* quota */ }
  }, [circuitos, preset]);

  const resultados = circuitos.map((c) => computeCircuito(c, preset));
  const atual = circuitos[selecionado];
  const setAtual = (c) => {
    const next = circuitos.slice();
    next[selecionado] = c;
    setCircuitos(next);
  };

  const adicionar = () => {
    setCircuitos([...circuitos, novoCircuito(circuitos.length + 1)]);
    setSelecionado(circuitos.length);
  };
  const editar = (i) => {
    setSelecionado(i);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };
  const copiar = (i) => {
    const copia = JSON.parse(JSON.stringify(circuitos[i]));
    copia.tag = `${copia.tag}-C`;
    const next = circuitos.slice();
    next.splice(i + 1, 0, copia);
    setCircuitos(next);
    setSelecionado(i + 1);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };
  const remover = (i) => {
    if (circuitos.length === 1) return;
    const next = circuitos.filter((_, j) => j !== i);
    setCircuitos(next);
    setSelecionado(Math.min(selecionado, next.length - 1));
  };

  // ---- Projetos ----
  const currentState = { circuitos, preset };

  const handleCreateProject = async (nome, state) => {
    const created = await projectsApi.createProject(nome, state);
    setActiveProject({ id: created.id, nome: created.nome });
  };
  const handleSaveChanges = async (id, state) => {
    await projectsApi.updateProject(id, state);
  };
  const handleLoadProject = async (id) => {
    const saved = await projectsApi.loadProject(id);
    setCircuitos(saved.circuitos?.length ? saved.circuitos : [novoCircuito(1)]);
    setPreset({ ...defaultPreset(), ...saved.preset });
    setSelecionado(0);
    setActiveProject({ id: saved.id, nome: saved.nome });
  };
  const handleDeleteProject = async (id) => {
    await projectsApi.deleteProject(id);
    if (activeProject?.id === id) setActiveProject(null);
  };
  const handleUnlinkProject = () => {
    if (!window.confirm("Desvincular e zerar o quadro (circuitos e preset)?")) return;
    setActiveProject(null);
    setCircuitos([novoCircuito(1)]);
    setPreset(defaultPreset());
    setSelecionado(0);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Projetos</h2>
        <ProjectsPanel
          projects={projectsApi.projects}
          loading={projectsApi.loading}
          error={projectsApi.error}
          refresh={projectsApi.refresh}
          activeProject={activeProject}
          onCreate={handleCreateProject}
          onSaveChanges={handleSaveChanges}
          onLoad={handleLoadProject}
          onDelete={handleDeleteProject}
          onUnlink={handleUnlinkProject}
          currentState={currentState}
        />
      </div>

      <PresetPanel value={preset} onChange={setPreset} />

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Quadro de cargas — {circuitos.length} circuito{circuitos.length > 1 ? "s" : ""}
          </h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => exportMemorialPDF({ projectName: activeProject?.nome, circuitos, resultados, preset })}
              className="rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              Memorial PDF
            </button>
            <button
              type="button"
              onClick={adicionar}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + circuito
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="px-2 py-1.5">Nº</th>
                <th className="px-2 py-1.5">TAG</th>
                <th className="px-2 py-1.5">Descrição</th>
                <th className="px-2 py-1.5">Tensão</th>
                <th className="px-2 py-1.5">Ib (A)</th>
                <th className="px-2 py-1.5">Cabos</th>
                <th className="px-2 py-1.5">
                  %R
                  <span
                    title="Queda de tensão em regime normal de operação, do início do trecho até o circuito. Limite usual: 4% a partir da entrada da concessionária (NBR 5410)."
                    className="ml-1 inline-block cursor-help select-none rounded-full text-[10px] normal-case text-slate-400 dark:text-slate-500"
                    aria-label="Queda de tensão em regime"
                  >
                    ⓘ
                  </span>
                </th>
                <th className="px-2 py-1.5">
                  %P
                  <span
                    title="Queda de tensão durante a partida do motor (corrente de partida Ip). Só é verificada quando há forma de partida diferente de 'não é motor'. Limite usual: 10%."
                    className="ml-1 inline-block cursor-help select-none rounded-full text-[10px] normal-case text-slate-400 dark:text-slate-500"
                    aria-label="Queda de tensão na partida"
                  >
                    ⓘ
                  </span>
                </th>
                <th className="px-2 py-1.5">Critério</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {circuitos.map((c, i) => {
                const r = resultados[i];
                const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);
                const sel = i === selecionado;
                return (
                  <tr
                    key={i}
                    onClick={() => setSelecionado(i)}
                    className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 ${
                      sel
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <td className="px-2 py-1.5 text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{c.tag}</td>
                    <td className="max-w-[180px] truncate px-2 py-1.5 text-slate-500 dark:text-slate-400">
                      {c.descricao || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">
                      {c.tensao}V {esquema?.kQueda === 2 ? "1F" : "3F"}
                    </td>
                    {r.error ? (
                      <td colSpan={5} className="px-2 py-1.5 text-red-500 dark:text-red-400">{r.error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{fmt(r.corrente, 1)}</td>
                        <td className="px-2 py-1.5 font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}
                        </td>
                        <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{fmt(r.quedaRegime)}</td>
                        <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{fmt(r.quedaPartida)}</td>
                        <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">
                          {CRITERIO_LABEL[r.criterio]}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); editar(i); }}
                        className="mr-2 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copiar(i); }}
                        className="mr-2 text-[11px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400"
                      >
                        copiar
                      </button>
                      {circuitos.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); remover(i); }}
                          className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400"
                        >
                          excluir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {atual && (
        <div ref={formRef} className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_1fr]">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                Editando
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {atual.tag}{atual.descricao ? ` — ${atual.descricao}` : ""}
              </span>
            </div>
            <CircuitoForm value={atual} onChange={setAtual} />
          </section>
          <section>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Resultado — {atual.tag}
                </h2>
                {!resultados[selecionado].error && (
                  <button
                    type="button"
                    onClick={() => exportCircuitoPDF({ circuito: atual, result: resultados[selecionado], preset })}
                    className="rounded-lg border border-blue-600 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  >
                    PDF do circuito
                  </button>
                )}
              </div>
              <ResultadoCircuito
                result={resultados[selecionado]}
                esquemaId={atual.esquemaId}
                porFase={Number(atual.porFase)}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
