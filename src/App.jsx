import { useRef, useState } from "react";
import logo from "./assets/logo.png";
import { useCableTray } from "./hooks/useCableTray";
import { useDarkMode } from "./hooks/useDarkMode";
import { useProjects } from "./hooks/useProjects";
import { getDimensions, INFRA_TYPES, ELETRODUTO_NORMAS } from "./data/corfioHEPR";
import { ARRANJOS, defaultArranjo, estimateCircuits, getFator } from "./lib/derating";
import { exportReportPDF } from "./lib/reportPdf";
import InfraSelector from "./components/InfraSelector";
import TraySettings from "./components/TraySettings";
import CableForm from "./components/CableForm";
import CableList from "./components/CableList";
import TrayVisualization from "./components/TrayVisualization";
import OccupancyMeter from "./components/OccupancyMeter";
import ProjectsPanel from "./components/ProjectsPanel";
import ReverseMode from "./components/ReverseMode";
import DeratingPanel from "./components/DeratingPanel";
import ComandoTab from "./components/ComandoTab";

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {dark ? (
        // sol
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // lua
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
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

  const [dark, setDark] = useDarkMode();
  const svgRef = useRef(null);
  const dim = getDimensions(infraType, eletrodutoNorma);
  const projectsApi = useProjects();
  const [activeProject, setActiveProject] = useState(null); // { id, nome } | null
  const [activeTab, setActiveTab] = useState("dimensionador"); // "dimensionador" | "reverso"

  // Derating por agrupamento (NBR 5410 Tab. 42): overrides do usuário sobre
  // os valores automáticos — null = seguir o automático.
  const [arranjoOverride, setArranjoOverride] = useState(null);
  const [circuitosOverride, setCircuitosOverride] = useState(null);
  const arranjo = arranjoOverride ?? defaultArranjo(infraType);
  const circuitosAuto = estimateCircuits(cables);
  const circuitos = circuitosOverride ?? circuitosAuto;

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

  const exportPDF = async () => {
    const svg = svgRef.current;
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

  const exportPNG = () => {
    const svg = svgRef.current;
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
      ctx.fillStyle = dark ? "#0f172a" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.download = "eletrocalha.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
          <div />
          {/* O texto "Gustavo" e a linha divisória do logo são pretos/cinza-
              escuros (parte da arte original) e ficam ilegíveis no modo
              escuro — o painel claro por trás só aparece no dark mode. */}
          <div className="rounded-xl px-4 py-1.5 dark:bg-slate-100/90">
            <img src={logo} alt="Dimensionador do Gustavo" className="h-32 w-auto" />
          </div>
          <div className="flex justify-end">
            <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {[
            { id: "dimensionador", label: "Força" },
            { id: "comando", label: "Comando" },
            { id: "reverso", label: "Buscar Infraestrutura" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-slate-200 bg-slate-50 text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-3">
      <div
        className={`grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr] ${
          activeTab === "dimensionador" ? "" : "hidden"
        }`}
      >
        <section className="space-y-3">
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

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Infraestrutura</h2>
            <InfraSelector
              infraType={infraType}
              setInfraType={setInfraType}
              leitoFlange={leitoFlange}
              setLeitoFlange={setLeitoFlange}
              eletrodutoNorma={eletrodutoNorma}
              setEletrodutoNorma={setEletrodutoNorma}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Dimensões (mm)</h2>
            <TraySettings
              trayWidth={trayWidth}
              setTrayWidth={setTrayWidth}
              trayHeight={trayHeight}
              setTrayHeight={setTrayHeight}
              dim={dim}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Adicionar cabo</h2>
            <CableForm onAddCable={addCable} onAddTrifolio={addTrifolio} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Cabos no trecho {cables.length > 0 && <span className="text-slate-400 dark:text-slate-500">({cables.length})</span>}
            </h2>
            <CableList groupedCables={groupedCables} onRemoveGroup={removeGroup} onRemoveAll={handleRemoveAll} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Visualização</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={exportPNG}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Exportar PNG
                </button>
                <button
                  onClick={exportPDF}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Relatório PDF
                </button>
              </div>
            </div>
            <div className="flex justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <TrayVisualization
                ref={svgRef}
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

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <OccupancyMeter
              trayArea={trayArea}
              cableArea={cableArea}
              ocupacao={ocupacao}
              limite={limite}
              dentroLimite={dentroLimite}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <DeratingPanel
              arranjo={arranjo}
              onArranjoChange={setArranjoOverride}
              circuitos={circuitos}
              circuitosAuto={circuitosAuto}
              onCircuitosChange={setCircuitosOverride}
            />
          </div>
        </section>
      </div>

      <div className={activeTab === "comando" ? "" : "hidden"}>
        <ComandoTab dark={dark} />
      </div>

      <div className={activeTab === "reverso" ? "" : "hidden"}>
        <ReverseMode dark={dark} />
      </div>
      </main>
    </div>
  );
}
