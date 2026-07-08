import { useRef } from "react";
import { useCableTray } from "./hooks/useCableTray";
import { useDarkMode } from "./hooks/useDarkMode";
import { useProjects } from "./hooks/useProjects";
import { getDimensions } from "./data/corfioHEPR";
import InfraSelector from "./components/InfraSelector";
import TraySettings from "./components/TraySettings";
import CableForm from "./components/CableForm";
import CableList from "./components/CableList";
import TrayVisualization from "./components/TrayVisualization";
import OccupancyMeter from "./components/OccupancyMeter";
import ProjectsPanel from "./components/ProjectsPanel";

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

  const currentState = { infraType, eletrodutoNorma, leitoFlange, trayWidth, trayHeight, cables };
  const handleLoadProject = async (id) => {
    const saved = await projectsApi.loadProject(id);
    loadState(saved);
  };

  const handleRemoveAll = () => {
    if (cables.length === 0) return;
    if (window.confirm("Remover todos os cabos?")) removeAll();
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">DIMENSIONADOR DO GUSTAVO</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de ocupação de cabos HEPR — tabela Corfio</p>
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl grid grid-cols-1 gap-3 p-3 lg:grid-cols-[340px_1fr]">
        <section className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Projetos</h2>
            <ProjectsPanel
              projects={projectsApi.projects}
              loading={projectsApi.loading}
              error={projectsApi.error}
              refresh={projectsApi.refresh}
              onSave={projectsApi.saveProject}
              onLoad={handleLoadProject}
              onDelete={projectsApi.deleteProject}
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
              <button
                onClick={exportPNG}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Exportar PNG
              </button>
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
        </section>
      </main>
    </div>
  );
}
