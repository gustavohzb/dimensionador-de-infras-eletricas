import { useRef, useState } from "react";
import { useCableTray } from "../hooks/useCableTray";
import { useProjects } from "../hooks/useProjects";
import { getDimensions } from "../data/corfioHEPR";
import InfraSelector from "./InfraSelector";
import TraySettings from "./TraySettings";
import ComandoCableForm from "./ComandoCableForm";
import CableList from "./CableList";
import TrayVisualization from "./TrayVisualization";
import OccupancyMeter from "./OccupancyMeter";
import ProjectsPanel from "./ProjectsPanel";

export default function ComandoTab({ dark }) {
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

  const svgRef = useRef(null);
  const dim = getDimensions(infraType, eletrodutoNorma);
  const projectsApi = useProjects();
  const [activeProject, setActiveProject] = useState(null);

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
      link.download = "comando.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
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
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Adicionar cabo de comando</h2>
          <ComandoCableForm onAddCable={addCustomCable} />
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
    </div>
  );
}
