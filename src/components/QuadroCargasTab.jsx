import { useEffect, useRef, useState } from "react";
import {
  CircuitoForm, ResultadoCircuito, computeCircuito, defaultCircuito, defaultPreset, CRITERIO_LABEL, CRITERIO_SIGLA, CRITERIO_LEGENDA,
} from "./cabos/CircuitoForm";
import PresetPanel from "./cabos/PresetPanel";
import ProjectsPanel from "./ProjectsPanel";
import { useCabosProjects } from "../hooks/useCabosProjects";
import { ESQUEMAS } from "../data/cabosNBR5410";
import { designacaoCabos } from "../lib/cableSizingPro";
import { circuitosParaLinhas } from "../lib/quadroToMemorial";
import { exportCircuitoPDF, exportMemorialPDF } from "../lib/memorialPdf";
import { proximoNumero } from "../lib/sequencialRotulos";

const STORAGE_KEY = "quadroCargas.v2";
const STORAGE_KEY_V1 = "quadroCargas.v1";
const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

// Pill de critério dominante: cor semântica separada do acento cobre —
// capacidade em verde (dimensionou pela tabela), quedas em âmbar (o circuito
// está limitado por tensão), seção mínima em neutro (piso normativo).
const PILL_CRITERIO = {
  capacidade: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  quedaRegime: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  quedaPartida: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  minima: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function CriterioPill({ criterio }) {
  return (
    <span
      title={CRITERIO_LABEL[criterio]}
      className={`inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-semibold ${PILL_CRITERIO[criterio] ?? PILL_CRITERIO.minima}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {CRITERIO_SIGLA[criterio]}
    </span>
  );
}

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
export default function QuadroCargasTab({ onEnviarParaInfra }) {
  // Lazy: sem a função, carregarEstado() rodava (lendo e parseando o
  // localStorage inteiro) a cada render — inclusive a cada tecla digitada.
  const [circuitos, setCircuitos] = useState(() => carregarEstado().circuitos);
  const [preset, setPreset] = useState(() => carregarEstado().preset);
  const [selecionado, setSelecionado] = useState(0);
  // Índices marcados para envio à aba Infraestrutura (checkbox por linha).
  const [selecionadosEnvio, setSelecionadosEnvio] = useState(() => new Set());
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
    // Updater funcional: espalhar o `circuitos` do closure fazia dois cliques
    // no mesmo lote de render perderem um dos circuitos (o 2º sobrescrevia o
    // 1º) e repetirem a tag. A tag vem do maior AL-NN já usado, não da
    // contagem — senão remover um do meio repete uma tag existente.
    setCircuitos((cs) => [...cs, novoCircuito(proximoNumero(cs.map((c) => c.tag), /^AL-(\d+)/))]);
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
    setSelecionadosEnvio(new Set()); // índices deslocam ao remover — zera a seleção
  };

  // ---- Envio para a aba Infraestrutura (Auto) ----
  // Só circuitos calculados com sucesso podem ser enviados (os com erro não
  // têm designação de cabo).
  const enviaveis = circuitos.map((_, i) => !resultados[i]?.error);
  const idxEnviaveis = enviaveis.reduce((acc, ok, i) => (ok ? [...acc, i] : acc), []);
  const selEnvio = [...selecionadosEnvio].filter((i) => enviaveis[i]);
  const todosMarcados = idxEnviaveis.length > 0 && selEnvio.length === idxEnviaveis.length;

  const toggleEnvio = (i) => {
    setSelecionadosEnvio((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  const toggleTodosEnvio = () => {
    setSelecionadosEnvio(todosMarcados ? new Set() : new Set(idxEnviaveis));
  };
  const enviarSelecionados = () => {
    if (selEnvio.length === 0) return;
    const ordenados = selEnvio.sort((a, b) => a - b);
    const circuitosSel = ordenados.map((i) => circuitos[i]);
    const resultadosSel = ordenados.map((i) => resultados[i]);
    const linhas = circuitosParaLinhas(circuitosSel, resultadosSel);
    if (!linhas) return;
    onEnviarParaInfra?.({ linhas, material: preset.material });
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
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Projetos</h2>
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

      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Quadro de cargas — {circuitos.length} circuito{circuitos.length > 1 ? "s" : ""}
          </h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={enviarSelecionados}
              disabled={selEnvio.length === 0}
              title="Envia os circuitos marcados para a aba Infraestrutura (modo Auto) e busca a melhor infraestrutura para esses cabos."
              className="rounded-xs border border-copper-600 px-3 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              {selEnvio.length > 0 ? `Enviar ${selEnvio.length} p/ Infra (Auto)` : "Enviar p/ Infra (Auto)"}
            </button>
            <button
              type="button"
              onClick={() => exportMemorialPDF({ projectName: activeProject?.nome, circuitos, resultados, preset })}
              className="rounded-xs border border-copper-600 px-3 py-1.5 text-xs font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
            >
              Memorial PDF
            </button>
            <button
              type="button"
              onClick={adicionar}
              className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700"
            >
              + circuito
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-display text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={todosMarcados}
                    onChange={toggleTodosEnvio}
                    disabled={idxEnviaveis.length === 0}
                    title="Selecionar todos para envio"
                    aria-label="Selecionar todos os circuitos para envio"
                    className="h-3.5 w-3.5 accent-copper-600 align-middle"
                  />
                </th>
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
                <th className="px-2 py-1.5">
                  Critério
                  <span
                    title={CRITERIO_LEGENDA}
                    className="ml-1 inline-block cursor-help select-none rounded-full text-[10px] normal-case text-slate-400 dark:text-slate-500"
                    aria-label="Legenda dos critérios"
                  >
                    ⓘ
                  </span>
                </th>
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
                        ? "bg-copper-50 shadow-[inset_3px_0_0_var(--color-copper-600)] dark:bg-copper-500/10 dark:shadow-[inset_3px_0_0_var(--color-copper-400)]"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selecionadosEnvio.has(i) && !r.error}
                        onChange={() => toggleEnvio(i)}
                        disabled={!!r.error}
                        title={r.error ? "Circuito com erro — não pode ser enviado" : "Marcar para envio à Infraestrutura"}
                        aria-label={`Marcar ${c.tag} para envio`}
                        className="h-3.5 w-3.5 accent-copper-600 align-middle disabled:opacity-40"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono tabular-nums text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-2 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-200">{c.tag}</td>
                    <td className="max-w-[180px] truncate px-2 py-1.5 text-slate-500 dark:text-slate-400">
                      {c.descricao || "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {c.tensao}V {esquema?.kQueda === 2 ? "1F" : "3F"}
                    </td>
                    {r.error ? (
                      <td colSpan={5} className="px-2 py-1.5 text-red-500 dark:text-red-400">{r.error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">{fmt(r.corrente, 1)}</td>
                        <td className="px-2 py-1.5 font-mono font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {designacaoCabos({ esquemaId: c.esquemaId, tipoCabo: r.tipoCabo, result: r })}
                        </td>
                        <td className="px-2 py-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">{fmt(r.quedaRegime)}</td>
                        <td className="px-2 py-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">{fmt(r.quedaPartida)}</td>
                        <td className="px-2 py-1.5">
                          <CriterioPill criterio={r.criterio} />
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
                        className="mr-2 text-[11px] font-medium text-copper-500 hover:text-copper-600 dark:text-copper-400"
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
        <p className="mt-1.5 font-mono text-[10.5px] text-slate-400 dark:text-slate-500">{CRITERIO_LEGENDA}</p>
      </div>

      {atual && (
        <div ref={formRef} className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_1fr]">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-xs bg-copper-600 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                Editando
              </span>
              <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                {atual.tag}{atual.descricao ? ` — ${atual.descricao}` : ""}
              </span>
            </div>
            <CircuitoForm value={atual} onChange={setAtual} condutorTemp={preset.condutorTemp} />
          </section>
          <section>
            <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Resultado — {atual.tag}
                </h2>
                {!resultados[selecionado].error && (
                  <button
                    type="button"
                    onClick={() => exportCircuitoPDF({ circuito: atual, result: resultados[selecionado], preset })}
                    className="rounded-xs border border-copper-600 px-2.5 py-1 text-[11px] font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
                  >
                    PDF do circuito
                  </button>
                )}
              </div>
              <ResultadoCircuito
                result={resultados[selecionado]}
                esquemaId={atual.esquemaId}
                porFase={Number(atual.porFase)}
                condutorTemp={preset.condutorTemp}
                limites={{
                  regime: Number(preset.quedaMaxRegime) || 4,
                  partida: Number(atual.quedaMaxPartida) || 10,
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
