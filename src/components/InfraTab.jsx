import { useEffect, useMemo, useRef, useState } from "react";
import { useCableTray } from "../hooks/useCableTray";
import { useProjects } from "../hooks/useProjects";
import { getDimensions, INFRA_TYPES, ELETRODUTO_NORMAS } from "../data/corfioHEPR";
import { findBestFits, selectDiverseResults } from "../lib/reverseSearch";
import { computeOccupancy } from "../lib/occupancy";
import { exportReportPDF } from "../lib/reportPdf";
import { ARRANJOS, defaultArranjo, estimateCircuits, getFator } from "../lib/derating";
import DeratingPanel from "./DeratingPanel";
import InfraSelector from "./InfraSelector";
import TraySettings from "./TraySettings";
import CableForm from "./CableForm";
import ComandoCableForm from "./ComandoCableForm";
import ImportarPlanilha from "./ImportarPlanilha";
import CableList from "./CableList";
import TrayVisualization from "./TrayVisualization";
import OccupancyMeter from "./OccupancyMeter";
import ProjectsPanel from "./ProjectsPanel";

// Aba unificada de infraestrutura: um único trecho de cabos (Força + Comando)
// com dois modos de saída — "Verificar" (você escolhe a infra e confere a
// ocupação, o antigo Força/Comando) e "Buscar" (o app ranqueia as
// infraestruturas que comportam os cabos, o antigo Buscar Infraestrutura).
// A lista de cabos é compartilhada: alternar de modo não perde nada.
export default function InfraTab({ dark, pendingImport, onConsumeImport }) {
  const {
    infraType,
    setInfraType,
    leitoFlange,
    setLeitoFlange,
    eletrodutoNorma,
    setEletrodutoNorma,
    trayWidth,
    setTrayWidth,
    trayHeight,
    setTrayHeight,
    cables,
    groupedCables,
    addCable,
    addTrifolio,
    addCustomCable,
    removeGroup,
    removeAll,
    resetAll,
    loadState,
    trayArea,
    cableArea,
    ocupacao,
    limite,
    dentroLimite,
  } = useCableTray();

  const [mode, setMode] = useState("verificar"); // "verificar" | "buscar"
  const [catalogo, setCatalogo] = useState("forca"); // "forca" | "comando"

  // Ao receber cabos enviados do Quadro de Cargas, entra em modo Auto para que
  // o painel de importação (só visível em "buscar") apareça e os consuma.
  useEffect(() => {
    if (pendingImport) setMode("buscar");
  }, [pendingImport]);

  const svgRefVerificar = useRef(null);
  const svgRefBuscar = useRef(null);
  const dim = getDimensions(infraType, eletrodutoNorma);
  const projectsApi = useProjects();
  const [activeProject, setActiveProject] = useState(null);

  const temMisto =
    cables.some((c) => c.type === "comando") && cables.some((c) => c.type !== "comando");

  // ---- Derating (NBR 5410 Tab. 42) — overrides por modo ----
  const [arranjoOverride, setArranjoOverride] = useState(null);
  const [circuitosOverride, setCircuitosOverride] = useState(null);
  const circuitosAuto = estimateCircuits(cables);
  const circuitos = circuitosOverride ?? circuitosAuto;

  // ---- Modo Buscar ----
  const [results, setResults] = useState(null); // null = ainda não buscou
  const [layerHint, setLayerHint] = useState(null);
  const [searching, setSearching] = useState(false);
  const [maxLayers, setMaxLayers] = useState(""); // "" = sem limite
  const [applied, setApplied] = useState(null);

  const arranjo =
    arranjoOverride ?? defaultArranjo(mode === "buscar" ? applied?.infraType : infraType);

  const applyResult = (r) => {
    setApplied(r);
    setArranjoOverride(null);
    setCircuitosOverride(null);
  };

  const handleSearch = () => {
    if (cables.length === 0) return;
    setSearching(true);
    setApplied(null);
    // Adia um tick pro botão re-renderizar em "Buscando…" antes do cálculo síncrono.
    setTimeout(() => {
      const numLayers = maxLayers ? Number(maxLayers) : undefined;
      const found = findBestFits(cables, { maxLayers: numLayers });
      let hint = null;
      if (found.length === 0 && numLayers) {
        const unrestricted = findBestFits(cables, {});
        if (unrestricted.length > 0) hint = Math.min(...unrestricted.map((r) => r.camadas));
      }
      setResults(found);
      setLayerHint(hint);
      setSearching(false);
    }, 10);
  };

  const displayResults = useMemo(() => (results ? selectDiverseResults(results, 2) : null), [results]);

  // Ocupação sempre recalculada a partir do trecho corrente (a opção "applied"
  // congela os números do momento da busca — cabos podem ter mudado depois).
  const liveOccupancy = useMemo(() => {
    if (!applied) return null;
    if (applied.hasSeptum) {
      const forca = cables.filter((c) => c.type !== "comando");
      const comando = cables.filter((c) => c.type === "comando");
      const w1 = applied.splitX;
      const w2 = applied.trayWidth - applied.septum - applied.splitX;
      const forcaOcc = computeOccupancy(forca, w1 * applied.trayHeight, false);
      const comandoOcc = computeOccupancy(comando, w2 * applied.trayHeight, false);
      return {
        trayArea: applied.trayArea,
        cableArea: forcaOcc.cableArea + comandoOcc.cableArea,
        ocupacao: Math.max(forcaOcc.ocupacao, comandoOcc.ocupacao),
        limite: Math.min(forcaOcc.limite, comandoOcc.limite),
        dentroLimite: forcaOcc.dentroLimite && comandoOcc.dentroLimite,
      };
    }
    const isDuct = getDimensions(applied.infraType, applied.eletrodutoNorma).kind === "duct";
    return { trayArea: applied.trayArea, ...computeOccupancy(cables, applied.trayArea, isDuct) };
  }, [cables, applied]);

  const isApplied = (r) =>
    applied && applied.label === r.label && applied.trayWidth === r.trayWidth && applied.trayHeight === r.trayHeight;

  // ---- Projetos ----
  const currentState = { infraType, eletrodutoNorma, leitoFlange, trayWidth, trayHeight, cables };

  const handleCreateProject = async (nome, state) => {
    const created = await projectsApi.createProject(nome, state);
    setActiveProject({ id: created.id, nome: created.nome });
  };

  const handleSaveChanges = async (id, state) => {
    await projectsApi.updateProject(id, state);
  };

  const handleLoadProject = async (id) => {
    const saved = await projectsApi.loadProject(id);
    loadState(saved);
    setActiveProject({ id: saved.id, nome: saved.nome });
  };

  const handleDeleteProject = async (id) => {
    await projectsApi.deleteProject(id);
    if (activeProject?.id === id) setActiveProject(null);
  };

  const handleUnlinkProject = () => {
    if (!window.confirm("Desvincular e zerar tudo (infraestrutura, dimensões e cabos)?")) return;
    setActiveProject(null);
    resetAll();
  };

  const handleRemoveAll = () => {
    if (cables.length === 0) return;
    if (window.confirm("Remover todos os cabos?")) removeAll();
  };

  // ---- Exportações ----
  const exportPNG = (svg, filename) => {
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(source)));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = dark ? "#14181c" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  const exportPDFVerificar = async () => {
    const svg = svgRefVerificar.current;
    if (!svg) return;
    const isDuct = dim.kind === "duct";
    const infraLabel = isDuct
      ? `${INFRA_TYPES.find((t) => t.id === infraType)?.label} — ${ELETRODUTO_NORMAS.find((n) => n.id === eletrodutoNorma)?.label}`
      : INFRA_TYPES.find((t) => t.id === infraType)?.label;
    await exportReportPDF({
      svgEl: svg,
      projectName: activeProject?.nome,
      infraLabel,
      dimensionLabel: isDuct ? `Ø ${trayWidth} mm (interno)` : `${trayWidth} × ${trayHeight} mm`,
      groupedCables,
      occupancy: { trayArea, cableArea, ocupacao, limite, dentroLimite },
      derating: {
        arranjoLabel: ARRANJOS.find((a) => a.id === arranjo)?.label,
        circuitos,
        fator: getFator(arranjo, circuitos),
      },
    });
  };

  const exportPDFBuscar = async () => {
    const svg = svgRefBuscar.current;
    if (!svg || !applied || !liveOccupancy) return;
    const isDuct = getDimensions(applied.infraType, applied.eletrodutoNorma).kind === "duct";
    await exportReportPDF({
      svgEl: svg,
      infraLabel: applied.label + (applied.hasSeptum ? " (com septo divisor)" : ""),
      dimensionLabel: isDuct
        ? `Ø ${applied.trayWidth} mm (interno)`
        : `${applied.trayWidth} × ${applied.trayHeight} mm`,
      groupedCables,
      occupancy: liveOccupancy,
      derating: {
        arranjoLabel: ARRANJOS.find((a) => a.id === arranjo)?.label,
        circuitos,
        fator: getFator(arranjo, circuitos),
      },
    });
  };

  const cardCls =
    "rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900";
  const h2Cls = "mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-3">
      {/* Toggle de modo: mesma lista de cabos, duas perguntas diferentes */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-xs border border-slate-300 dark:border-slate-700">
          {[
            { id: "verificar", label: "Manual" },
            { id: "buscar", label: "Auto" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setArranjoOverride(null);
                setCircuitosOverride(null);
              }}
              className={`px-4 py-2 text-sm font-medium transition ${
                mode === m.id
                  ? "bg-copper-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {mode === "verificar"
            ? "você escolhe a infraestrutura e confere a ocupação"
            : "o app ranqueia as infraestruturas que comportam os cabos"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
        <section className="space-y-3">
          <div className={cardCls}>
            <h2 className={h2Cls}>Projetos</h2>
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

          {mode === "verificar" && (
            <>
              <div className={cardCls}>
                <h2 className={h2Cls}>Infraestrutura</h2>
                <InfraSelector
                  infraType={infraType}
                  setInfraType={setInfraType}
                  leitoFlange={leitoFlange}
                  setLeitoFlange={setLeitoFlange}
                  eletrodutoNorma={eletrodutoNorma}
                  setEletrodutoNorma={setEletrodutoNorma}
                />
              </div>

              <div className={cardCls}>
                <h2 className={h2Cls}>Dimensões (mm)</h2>
                <TraySettings
                  trayWidth={trayWidth}
                  setTrayWidth={setTrayWidth}
                  trayHeight={trayHeight}
                  setTrayHeight={setTrayHeight}
                  dim={dim}
                />
              </div>
            </>
          )}

          {mode === "buscar" && (
            <div className={cardCls}>
              <h2 className={h2Cls}>Importar do memorial de cálculo</h2>
              <ImportarPlanilha
                onImport={addCable}
                onImportTrifolio={addTrifolio}
                incoming={pendingImport}
                onConsumed={onConsumeImport}
                existingCount={cables.length}
                onReplaceAll={removeAll}
              />
            </div>
          )}

          <div className={cardCls}>
            <h2 className={h2Cls}>Adicionar cabo</h2>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              {[
                { id: "forca", label: "Potência" },
                { id: "comando", label: "Comando" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatalogo(cat.id)}
                  className={`rounded-xs border px-2.5 py-1.5 text-xs font-medium transition ${
                    catalogo === cat.id
                      ? "border-copper-600 bg-copper-50 text-copper-700 dark:border-copper-500 dark:bg-copper-500/15 dark:text-copper-300"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {catalogo === "forca" ? (
              <CableForm onAddCable={addCable} onAddTrifolio={addTrifolio} />
            ) : (
              <ComandoCableForm onAddCable={addCustomCable} />
            )}
          </div>

          <div className={cardCls}>
            <h2 className={h2Cls}>
              Cabos no trecho{" "}
              {cables.length > 0 && (
                <span className="text-slate-400 dark:text-slate-500">({cables.length})</span>
              )}
            </h2>
            <CableList groupedCables={groupedCables} onRemoveGroup={removeGroup} onRemoveAll={handleRemoveAll} />
            {temMisto && mode === "verificar" && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                Trecho mistura Força e Comando — a NBR 5410 pede septo divisor entre os circuitos.
                Use o modo <b>Auto</b> para opções já com septo.
              </p>
            )}
          </div>

          {mode === "buscar" && (
            <>
              <div className={cardCls}>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Máximo de camadas
                </label>
                <select
                  value={maxLayers}
                  onChange={(e) => setMaxLayers(e.target.value)}
                  className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Sem limite</option>
                  <option value="1">1 (sem empilhar)</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Limita quantos cabos podem ficar empilhados uns sobre os outros — infraestruturas
                  onde algum cabo ficaria mais empilhado que isso não entram no resultado.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={cables.length === 0 || searching}
                className="w-full rounded-xs bg-copper-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
              >
                {searching ? "Buscando…" : "Buscar melhor infraestrutura"}
              </button>
            </>
          )}
        </section>

        {mode === "verificar" ? (
          <section className="space-y-3">
            <div className={cardCls}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Visualização</h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => exportPNG(svgRefVerificar.current, "eletrocalha.png")}
                    className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Exportar PNG
                  </button>
                  <button
                    onClick={exportPDFVerificar}
                    className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Relatório PDF
                  </button>
                </div>
              </div>
              <div className="flex justify-center rounded-sm bg-slate-50 p-3 dark:bg-slate-800/60">
                <TrayVisualization
                  ref={svgRefVerificar}
                  cables={cables}
                  trayWidth={trayWidth}
                  trayHeight={trayHeight}
                  dark={dark}
                  infraType={infraType}
                  leitoFlange={leitoFlange}
                  eletrodutoNorma={eletrodutoNorma}
                />
              </div>
            </div>

            <div className={cardCls}>
              <OccupancyMeter
                trayArea={trayArea}
                cableArea={cableArea}
                ocupacao={ocupacao}
                limite={limite}
                dentroLimite={dentroLimite}
              />
            </div>

            <div className={cardCls}>
              <DeratingPanel
                arranjo={arranjo}
                onArranjoChange={setArranjoOverride}
                circuitos={circuitos}
                circuitosAuto={circuitosAuto}
                onCircuitosChange={setCircuitosOverride}
              />
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            {!results && (
              <div className="rounded-sm border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Monte a lista de cabos ao lado e clique em <b>"Buscar melhor infraestrutura"</b>.
                <br />
                <br />
                O app testa contra <b>todas</b> as infraestruturas e normas cadastradas (eletrocalha,
                perfilado, leito, aramado e eletrodutos), confirmando fisicamente — pelo mesmo motor
                de empacotamento por gravidade da visualização, não só pela conta de área % — e mostra
                até 2 opções de cada tipo (alturas diferentes) que realmente comportam os cabos.
                <br />
                <br />
                Se o trecho misturar cabos de <b>Força</b> e de <b>Comando</b>, a busca já recomenda
                infraestruturas com <b>septo divisor</b> entre os dois circuitos, conforme exige a NBR 5410.
              </div>
            )}

            {results && results.length === 0 && layerHint && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                Nenhuma opção cabe com o limite de <b>{maxLayers} camada{Number(maxLayers) > 1 ? "s" : ""}</b>.
                Com esses cabos, a pilha mais baixa possível precisa de pelo menos{" "}
                <b>{layerHint} camada{layerHint > 1 ? "s" : ""}</b>
                {cables.some((c) => c.trifolio) &&
                  " — cabos em trifólio, por exemplo, sempre ocupam pelo menos 2 (2 embaixo + 1 em cima)"}
                . Aumente o limite de camadas ou remova/desmarque cabos.
              </div>
            )}

            {results && results.length === 0 && !layerHint && (
              <div className="rounded-sm border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
                Nenhuma infraestrutura cadastrada comporta esses cabos dentro do limite de ocupação da
                NBR 5410. Considere dividir em mais de um trecho.
              </div>
            )}

            {displayResults && displayResults.length > 0 && (
              <div className={cardCls}>
                <h2 className={h2Cls}>
                  Opções encontradas{" "}
                  <span className="text-slate-400 dark:text-slate-500">(até 2 por tipo, alturas diferentes)</span>
                </h2>
                <ul className="space-y-1.5">
                  {displayResults.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xs border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {r.label}
                          {r.hasSeptum && (
                            <span className="ml-1.5 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Septo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {r.ocupacao.toFixed(1)}% ocupado · {r.trayArea.toFixed(0)} mm²
                          {r.camadas != null && ` · ${r.camadas} camada${r.camadas > 1 ? "s" : ""}`}
                          {r.hasSeptum &&
                            ` · ${r.splitX}mm Força · ${(r.trayWidth - r.septum - r.splitX).toFixed(0)}mm Comando`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyResult(r)}
                        disabled={isApplied(r)}
                        className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-60"
                      >
                        {isApplied(r) ? "Visualizando ✓" : "Ver"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {applied && (
              <>
                <div className={cardCls}>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      Visualização — {applied.label}
                    </h2>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => exportPNG(svgRefBuscar.current, "infraestrutura-recomendada.png")}
                        className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Exportar PNG
                      </button>
                      <button
                        onClick={exportPDFBuscar}
                        className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Relatório PDF
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center rounded-sm bg-slate-50 p-3 dark:bg-slate-800/60">
                    <TrayVisualization
                      ref={svgRefBuscar}
                      cables={cables}
                      trayWidth={applied.trayWidth}
                      trayHeight={applied.trayHeight}
                      dark={dark}
                      infraType={applied.infraType}
                      leitoFlange={applied.leitoFlange}
                      eletrodutoNorma={applied.eletrodutoNorma}
                    />
                  </div>
                </div>

                <div className={cardCls}>
                  <OccupancyMeter
                    trayArea={liveOccupancy.trayArea}
                    cableArea={liveOccupancy.cableArea}
                    ocupacao={liveOccupancy.ocupacao}
                    limite={liveOccupancy.limite}
                    dentroLimite={liveOccupancy.dentroLimite}
                  />
                  {!liveOccupancy.dentroLimite && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      Os cabos atuais já não cabem dentro do limite de ocupação da NBR 5410 para esta
                      infraestrutura — busque novamente ou remova cabos.
                    </p>
                  )}
                </div>

                <div className={cardCls}>
                  <DeratingPanel
                    arranjo={arranjo}
                    onArranjoChange={setArranjoOverride}
                    circuitos={circuitos}
                    circuitosAuto={circuitosAuto}
                    onCircuitosChange={setCircuitosOverride}
                  />
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
