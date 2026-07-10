import { useMemo, useRef, useState } from "react";
import { useCableTray } from "../hooks/useCableTray";
import { findBestFits } from "../lib/reverseSearch";
import { getDimensions } from "../data/corfioHEPR";
import { computeOccupancy } from "../lib/occupancy";
import CableForm from "./CableForm";
import ComandoCableForm from "./ComandoCableForm";
import ImportarPlanilha from "./ImportarPlanilha";
import CableList from "./CableList";
import TrayVisualization from "./TrayVisualization";
import OccupancyMeter from "./OccupancyMeter";

export default function ReverseMode({ dark }) {
  // Lista de cabos independente da aba "Força" — o modo reverso trabalha com
  // o próprio trecho de cabos até você escolher uma opção. Aceita tanto
  // cabos de Força (catálogo Corfio) quanto de Comando (catálogo Cablie); se
  // o trecho misturar os dois, a busca recomenda infraestruturas com septo
  // divisor entre os compartimentos.
  const { cables, groupedCables, addCable, addTrifolio, addCustomCable, removeGroup, removeAll } = useCableTray();

  const [results, setResults] = useState(null); // null = ainda não buscou
  const [searching, setSearching] = useState(false);
  // "" = sem limite. Relevante pra dissipação térmica: empilhar cabos demais
  // numa mesma calha/eletroduto piora o agrupamento (derating) da NBR 5410.
  const [maxLayers, setMaxLayers] = useState("");
  // Opção escolhida entre os resultados — a visualização abaixo é montada a
  // partir dela, sem sair desta aba (diferente da versão antiga, que
  // aplicava no Dimensionador e trocava de aba).
  const [applied, setApplied] = useState(null);
  const svgRef = useRef(null);

  const handleRemoveAll = () => {
    if (cables.length === 0) return;
    if (window.confirm("Remover todos os cabos?")) removeAll();
  };

  const handleSearch = () => {
    if (cables.length === 0) return;
    setSearching(true);
    setApplied(null);
    // Adia um tick pro botão re-renderizar em "Buscando…" antes do cálculo síncrono.
    setTimeout(() => {
      setResults(findBestFits(cables, { maxLayers: maxLayers ? Number(maxLayers) : undefined }));
      setSearching(false);
    }, 10);
  };

  const best = results && results.length > 0 ? results[0] : null;
  const rest = results && results.length > 1 ? results.slice(1, 8) : [];

  // A opção "applied" guarda a ocupação calculada no momento da busca — se o
  // trecho de cabos mudar depois (adicionar/remover), esses números ficam
  // desatualizados mesmo com a visualização já reagindo aos cabos atuais.
  // Recalcula aqui sempre a partir do trecho corrente.
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

  const isApplied = (r) => applied && applied.label === r.label && applied.trayWidth === r.trayWidth && applied.trayHeight === r.trayHeight;

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
      link.download = "infraestrutura-recomendada.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Importar do memorial de cálculo</h2>
          <ImportarPlanilha onImport={addCable} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Adicionar cabo de Força</h2>
          <CableForm onAddCable={addCable} onAddTrifolio={addTrifolio} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Adicionar cabo de Comando</h2>
          <ComandoCableForm onAddCable={addCustomCable} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Cabos do trecho {cables.length > 0 && <span className="text-slate-400 dark:text-slate-500">({cables.length})</span>}
          </h2>
          <CableList groupedCables={groupedCables} onRemoveGroup={removeGroup} onRemoveAll={handleRemoveAll} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Máximo de camadas</label>
          <select
            value={maxLayers}
            onChange={(e) => setMaxLayers(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Sem limite</option>
            <option value="1">1 (sem empilhar)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Limita quantos cabos podem ficar empilhados uns sobre os outros — infraestruturas onde algum cabo ficaria mais empilhado que isso não entram no resultado.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={cables.length === 0 || searching}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {searching ? "Buscando…" : "Buscar melhor infraestrutura"}
        </button>
      </section>

      <section className="space-y-3">
        {!results && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Monte a lista de cabos ao lado e clique em <b>"Buscar melhor infraestrutura"</b>.
            <br />
            <br />
            O app testa contra <b>todas</b> as infraestruturas e normas cadastradas (eletrocalha, perfilado, leito, aramado e eletrodutos), confirmando fisicamente — pelo mesmo motor de empacotamento por gravidade da visualização, não só pela conta de área % — e recomenda a menor opção que realmente comporta os cabos.
            <br />
            <br />
            Se o trecho misturar cabos de <b>Força</b> e de <b>Comando</b>, a busca já recomenda infraestruturas com <b>septo divisor</b> entre os dois circuitos, conforme exige a NBR 5410.
          </div>
        )}

        {results && results.length === 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
            Nenhuma infraestrutura cadastrada comporta esses cabos dentro do limite de ocupação da NBR 5410. Considere dividir em mais de um trecho.
          </div>
        )}

        {best && (
          <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-sm dark:border-emerald-700 dark:bg-emerald-500/10">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Melhor opção
            </div>
            <div className="mb-2 text-lg font-bold text-emerald-900 dark:text-emerald-200">
              {best.label}
              {best.hasSeptum && (
                <span className="ml-2 align-middle rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Septo divisor
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-800 dark:text-emerald-300">
              <span>
                Ocupação: <b>{best.ocupacao.toFixed(1)}%</b> (limite {best.limite}%)
              </span>
              <span>
                Área útil: <b>{best.trayArea.toFixed(0)} mm²</b>
              </span>
              {best.camadas != null && (
                <span>
                  Camadas: <b>{best.camadas}</b>
                </span>
              )}
              {best.hasSeptum && (
                <span>
                  Compartimentos: <b>{best.splitX}mm</b> Força · <b>{(best.trayWidth - best.septum - best.splitX).toFixed(0)}mm</b> Comando
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setApplied(best)}
              disabled={isApplied(best)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {isApplied(best) ? "Visualizando ✓" : "Ver visualização"}
            </button>
          </div>
        )}

        {rest.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Outras opções que também cabem</h2>
            <ul className="space-y-1.5">
              {rest.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="min-w-0">
                    <div className="truncate text-slate-700 dark:text-slate-200">
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
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApplied(r)}
                    disabled={isApplied(r)}
                    className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 disabled:text-slate-400 disabled:no-underline"
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
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Visualização — {applied.label}</h2>
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
                  trayWidth={applied.trayWidth}
                  trayHeight={applied.trayHeight}
                  dark={dark}
                  infraType={applied.infraType}
                  leitoFlange={applied.leitoFlange}
                  eletrodutoNorma={applied.eletrodutoNorma}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <OccupancyMeter
                trayArea={liveOccupancy.trayArea}
                cableArea={liveOccupancy.cableArea}
                ocupacao={liveOccupancy.ocupacao}
                limite={liveOccupancy.limite}
                dentroLimite={liveOccupancy.dentroLimite}
              />
              {!liveOccupancy.dentroLimite && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                  Os cabos atuais já não cabem dentro do limite de ocupação da NBR 5410 para esta infraestrutura — busque novamente ou remova cabos.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
