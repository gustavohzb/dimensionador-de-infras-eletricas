import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Field } from "./cabos/CircuitoForm";
import { calcularIluminacaoArvore, SECAO_MIN_ILUMINACAO } from "../lib/lightingTree";
import { METODOS_INSTALACAO } from "../data/nbr5410Ampacidade";

const STORAGE_KEY = "iluminacao.v2";
const STORAGE_KEY_V1 = "iluminacao.v1"; // só parâmetros são migrados
const QUADRO_ID = "quadro";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));
const fmtSecao = (s) => (s == null ? "—" : `${String(s).replace(".", ",")} mm²`);

// Métodos com tabela PVC de 2 carregados (F/G são de cabos espaçados).
const METODOS = METODOS_INSTALACAO.filter((m) => ["B1", "B2", "C", "D", "E"].includes(m.id));

/* ==================== Nós e ligações do diagrama ==================== */

const nodeCard =
  "rounded-sm border-2 bg-white px-2.5 py-1.5 text-center shadow-sm dark:bg-slate-900";
const nodeTitle = "font-display text-[10px] font-bold uppercase tracking-[0.08em]";
const handleCls = "!h-2.5 !w-2.5 !border-2 !border-white !bg-copper-600 dark:!border-slate-900";

function QuadroNode({ selected }) {
  return (
    <div className={`${nodeCard} ${selected ? "border-copper-600" : "border-slate-700 dark:border-slate-300"}`}>
      <div className={`${nodeTitle} text-slate-700 dark:text-slate-200`}>Quadro</div>
      <div className="text-[10px] text-slate-400 dark:text-slate-500">início do circuito</div>
      <Handle type="source" position={Position.Right} className={handleCls} />
    </div>
  );
}

function LuminariaNode({ id, data, selected }) {
  return (
    <div className={`${nodeCard} ${selected ? "border-copper-600" : "border-amber-400 dark:border-amber-500/70"}`}>
      <div className={`${nodeTitle} text-amber-600 dark:text-amber-400`}>💡 {data.label}</div>
      <label className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
        qtd
        <input
          type="number" min="1" step="1" value={data.qtd}
          onChange={(e) => data.onQtd(id, e.target.value)}
          className="nodrag w-10 rounded-xs border border-slate-300 bg-white px-1 py-0.5 text-center font-mono text-[11px] text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      {data.quedaAcumPct != null && (
        <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
          ΔV {fmt(data.quedaAcumPct, 2)}%
        </div>
      )}
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle type="source" position={Position.Right} className={handleCls} />
    </div>
  );
}

function CaixaNode({ data, selected }) {
  return (
    <div className={`${nodeCard} ${selected ? "border-copper-600" : "border-slate-300 dark:border-slate-600"}`}>
      <div className={`${nodeTitle} text-slate-500 dark:text-slate-400`}>⌗ {data.label}</div>
      <div className="text-[10px] text-slate-400 dark:text-slate-500">derivação</div>
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle type="source" position={Position.Right} className={handleCls} />
    </div>
  );
}

function TrechoEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd }) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8,
  });
  const info = data.info;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ strokeWidth: selected ? 2.5 : 1.5, stroke: selected ? "#b45309" : "#94a3b8" }}
      />
      <EdgeLabelRenderer>
        <div
          style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
          className="nodrag nopan rounded-xs border border-slate-200 bg-white px-1.5 py-1 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="number" min="0.1" step="0.5" value={data.distancia}
              onChange={(e) => data.onDist(id, e.target.value)}
              className="w-12 rounded-xs border border-slate-300 bg-white px-1 py-0.5 text-center text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            m
          </label>
          {info && (
            <div className={`mt-0.5 font-mono text-[10px] font-bold ${info.secao == null ? "text-red-600 dark:text-red-400" : "text-copper-700 dark:text-copper-400"}`}>
              {info.secao == null ? "não atende" : `${fmtSecao(info.secao)} · ${fmt(info.corrente, 1)}A`}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { quadro: QuadroNode, luminaria: LuminariaNode, caixa: CaixaNode };
const edgeTypes = { trecho: TrechoEdge };

/* ==================== Estado inicial e persistência ==================== */

function diagramaInicial() {
  return {
    nodes: [
      { id: QUADRO_ID, type: "quadro", position: { x: 30, y: 140 }, data: {}, deletable: false },
      { id: "n1", type: "luminaria", position: { x: 260, y: 140 }, data: { label: "L1", qtd: 1 } },
    ],
    edges: [
      { id: "e1", source: QUADRO_ID, target: "n1", type: "trecho", data: { distancia: 10 } },
    ],
  };
}

function defaults() {
  return {
    sistema: "ca-fn", // "ca-fn" | "ca-ff" | "cc"
    tensao: 220,
    fp: 0.92,
    potencia: 50,
    quedaMaxPct: 4,
    metodo: "B1",
  };
}

function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        params: { ...defaults(), ...s.params },
        nodes: Array.isArray(s.nodes) && s.nodes.length ? s.nodes : diagramaInicial().nodes,
        edges: Array.isArray(s.edges) ? s.edges : diagramaInicial().edges,
      };
    }
    // Migração da v1 (lista de trechos): aproveita só os parâmetros.
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const { sistema, tensao, fp, potencia, quedaMaxPct, metodo } = JSON.parse(v1);
      return { params: { ...defaults(), sistema, tensao, fp, potencia, quedaMaxPct, metodo }, ...diagramaInicial() };
    }
  } catch { /* estado inicial */ }
  return { params: defaults(), ...diagramaInicial() };
}

/* ==================== Aba ==================== */

export default function IluminacaoTab({ dark, ativo = true }) {
  const inicial = useMemo(carregarEstado, []);
  const [st, setSt] = useState(inicial.params);
  const [nodes, setNodes] = useState(inicial.nodes);
  const [edges, setEdges] = useState(inicial.edges);
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ params: st, nodes, edges }));
  }, [st, nodes, edges]);

  const cc = st.sistema === "cc";
  const tensao = Number(st.tensao) || 0;
  const entradasOk = tensao > 0 && Number(st.potencia) > 0 && Number(st.quedaMaxPct) > 0;

  const resultado = entradasOk
    ? calcularIluminacaoArvore({
        sistema: cc ? "cc" : "ca",
        tensao,
        fp: Number(st.fp) || 1,
        potencia: Number(st.potencia),
        quedaMaxPct: Number(st.quedaMaxPct),
        metodo: st.metodo,
        nos: nodes.map((n) => ({ id: n.id, tipo: n.type, qtd: Number(n.data.qtd) || 1 })),
        ligacoes: edges.map((e) => ({ id: e.id, de: e.source, para: e.target, distancia: Number(e.data?.distancia) || 0 })),
      })
    : null;

  /* ---------- edição do diagrama ---------- */

  const onNodesChange = useCallback(
    (changes) => setNodes((ns) => applyNodeChanges(changes.filter((c) => !(c.type === "remove" && c.id === QUADRO_ID)), ns)),
    []
  );
  const onEdgesChange = useCallback((changes) => setEdges((es) => applyEdgeChanges(changes, es)), []);
  const onConnect = useCallback(
    (conn) => setEdges((es) => addEdge({ ...conn, id: `e${Date.now()}`, type: "trecho", data: { distancia: 10 } }, es)),
    []
  );
  // Árvore: nada entra no quadro e cada nó tem um único trecho de chegada.
  const isValidConnection = useCallback(
    (c) => c.target !== QUADRO_ID && c.source !== c.target && !edges.some((e) => e.target === c.target),
    [edges]
  );

  const onQtd = useCallback((id, qtd) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, qtd } } : n)));
  }, []);
  const onDist = useCallback((id, distancia) => {
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { ...e.data, distancia } } : e)));
  }, []);

  const addNo = (tipo) => {
    const selecionado = nodes.find((n) => n.selected) ?? nodes[nodes.length - 1];
    const seq = nodes.filter((n) => n.type === tipo).length + 1;
    const id = `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const label = tipo === "luminaria" ? `L${seq}` : `CX${seq}`;
    const position = { x: selecionado.position.x + 220, y: selecionado.position.y + (seq % 2 ? 40 : -40) };
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      { id, type: tipo, position, selected: true, data: tipo === "luminaria" ? { label, qtd: 1 } : { label } },
    ]);
    // Já sai ligado ao nó selecionado (ou ao último), com 10 m para ajustar.
    setEdges((es) => [...es, { id: `e-${id}`, source: selecionado.id, target: id, type: "trecho", data: { distancia: 10 } }]);
  };

  const limparDiagrama = () => {
    const d = diagramaInicial();
    setNodes(d.nodes);
    setEdges(d.edges);
  };

  /* ---------- injeção de callbacks e resultados no diagrama ---------- */

  const infoPorLigacao = useMemo(() => {
    const m = new Map();
    for (const l of resultado?.ligacoes ?? []) m.set(l.id, l);
    return m;
  }, [resultado]);
  const quedaPorNo = useMemo(() => {
    const m = new Map();
    for (const n of resultado?.nos ?? []) m.set(n.id, n.quedaAcumPct);
    return m;
  }, [resultado]);

  const nodesRender = nodes.map((n) =>
    n.type === "luminaria"
      ? { ...n, data: { ...n.data, onQtd, quedaAcumPct: quedaPorNo.get(n.id) ?? null } }
      : n
  );
  const edgesRender = edges.map((e) => ({
    ...e,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#94a3b8" },
    data: { ...e.data, onDist, info: infoPorLigacao.get(e.id) ?? null },
  }));

  const rotulo = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.type === "quadro" ? "Quadro" : n.data.label]));
    return (id) => m.get(id) ?? id;
  }, [nodes]);

  const pior = resultado?.piorCaminho ?? null;

  return (
    <div className="space-y-3">
      {/* ==================== Parâmetros ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Parâmetros
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Sistema" tip="F-N e F-F são circuitos CA de 2 condutores (a fórmula de queda é a mesma; muda a tensão que você informa). CC é corrente contínua (ex.: iluminação em 12/24/48V), sem fator de potência.">
            <select value={st.sistema} onChange={(e) => set({ sistema: e.target.value })} className={inputCls}>
              <option value="ca-fn">CA — fase-neutro</option>
              <option value="ca-ff">CA — fase-fase</option>
              <option value="cc">CC — corrente contínua</option>
            </select>
          </Field>
          <Field label="Tensão (V)" tip="Tensão do circuito: F-N (ex. 127, 220), F-F (ex. 220, 380) ou CC (ex. 12, 24, 48).">
            <input type="number" min="1" value={st.tensao} onChange={(e) => set({ tensao: e.target.value })} className={inputCls} />
          </Field>
          {!cc && (
            <Field label="Fator de potência" tip="Das luminárias. Drivers de LED ficam entre 0,90 e 0,95; use 1,00 para carga resistiva.">
              <input type="number" min="0.1" max="1" step="0.01" value={st.fp} onChange={(e) => set({ fp: e.target.value })} className={inputCls} />
            </Field>
          )}
          <Field label="Potência por luminária (W)" tip="Potência de cada ponto. A corrente de cada trecho vem das luminárias que ele alimenta à jusante no diagrama.">
            <input type="number" min="0.1" step="0.1" value={st.potencia} onChange={(e) => set({ potencia: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Queda máx. (%)" tip="NBR 5410 6.2.7: 5% da origem em rede pública, 7% com transformador próprio; a prática usual é 4% no conjunto e 2% no circuito terminal. Vale para o caminho quadro→luminária mais desfavorável.">
            <input type="number" min="0.5" max="10" step="0.5" value={st.quedaMaxPct} onChange={(e) => set({ quedaMaxPct: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Método de instalação" tip="Para a checagem de capacidade de condução (NBR 5410 Tabela 36, PVC 70°C, cobre, 2 condutores carregados).">
            <select value={st.metodo} onChange={(e) => set({ metodo: e.target.value })} className={inputCls}>
              {METODOS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ==================== Diagrama ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Diagrama do circuito
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => addNo("luminaria")} className="rounded-xs border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
              + Luminária
            </button>
            <button type="button" onClick={() => addNo("caixa")} className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              + Caixa de derivação
            </button>
            <button type="button" onClick={limparDiagrama} title="Recomeçar o diagrama" className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:text-red-600 dark:border-slate-700 dark:text-slate-500 dark:hover:text-red-400">
              limpar
            </button>
          </div>
        </div>
        <div className="h-[420px] overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700">
          {/* Montado só com a aba visível: escondido (display:none) o React
              Flow mede dimensão zero e o fitView enquadra errado. */}
          {ativo && (
          <ReactFlow
            nodes={nodesRender}
            edges={edgesRender}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            deleteKeyCode={["Delete", "Backspace"]}
            colorMode={dark ? "dark" : "light"}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Novos nós já saem ligados ao nó selecionado — ou arraste do ponto direito de
          um nó até o esquerdo de outro para religar. Edite a distância em cada trecho;
          a seção calculada aparece no próprio trecho. Delete remove o nó/trecho selecionado.
        </p>
      </div>

      {/* ==================== Resultado ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Resultado
        </h2>
        {!resultado ? (
          <div className="rounded-sm border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Preencha os parâmetros e monte o circuito no diagrama — cada trecho
            recebe sua própria seção pelo pior entre queda de tensão acumulada,
            ampacidade e o mínimo de iluminação da norma (1,5 mm²).
          </div>
        ) : (
          <>
            {resultado.erros.map((a, i) => (
              <div key={`e${i}`} className="mb-2 rounded-xs border border-red-300 bg-red-50 px-2.5 py-1.5 text-[13px] text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                {a}
              </div>
            ))}
            {resultado.avisos.map((a, i) => (
              <div key={`a${i}`} className="mb-2 rounded-xs border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                {a}
              </div>
            ))}

            {resultado.erros.length === 0 && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700">
                    <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Luminárias</div>
                    <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{resultado.numLuminarias} × {fmt(Number(st.potencia), 0)} W</div>
                  </div>
                  <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700">
                    <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Corrente do circuito</div>
                    <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmt(resultado.correnteTotal)} A</div>
                  </div>
                  <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700" title="Queda acumulada na luminária mais desfavorável, com as seções sugeridas">
                    <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Pior caminho</div>
                    <div className={`font-mono text-[15px] font-bold ${resultado.dentroLimite ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {pior ? `${rotulo(pior.noId)} · ${fmt(pior.quedaPct)}%` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700" title="Seção mínima de circuito de iluminação — NBR 5410 Tabela 47">
                    <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Mínimo da norma</div>
                    <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmtSecao(SECAO_MIN_ILUMINACAO)}</div>
                  </div>
                </div>

                {!resultado.dimensionado && (
                  <div className="mt-2 rounded-xs border border-red-300 bg-red-50 px-2.5 py-2 text-[13px] font-medium text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                    Há trecho(s) em que nenhuma seção até 300 mm² atende — reduza
                    distâncias, aumente a tensão ou divida o circuito.
                  </div>
                )}

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left font-display text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                        <th className="py-1.5 pr-2">Trecho</th>
                        <th className="py-1.5 pr-2">Distância</th>
                        <th className="py-1.5 pr-2">Pontos</th>
                        <th className="py-1.5 pr-2">Corrente</th>
                        <th className="py-1.5 pr-2">Seção</th>
                        <th className="py-1.5 pr-2">Queda (V)</th>
                        <th className="py-1.5">Acum. (%)</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {resultado.ligacoes.map((l) => (
                        <tr key={l.id} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                          <td className="py-1 pr-2">{rotulo(l.de)} → {rotulo(l.para)}</td>
                          <td className="py-1 pr-2">{fmt(l.distancia, 1)} m</td>
                          <td className="py-1 pr-2">{l.pontos}</td>
                          <td className="py-1 pr-2">{fmt(l.corrente)} A</td>
                          <td className={`py-1 pr-2 font-bold ${l.secao == null ? "text-red-600 dark:text-red-400" : "text-copper-700 dark:text-copper-400"}`}>
                            {fmtSecao(l.secao)}
                          </td>
                          <td className="py-1 pr-2">{fmt(l.quedaVolts, 3)}</td>
                          <td className={`py-1 ${l.quedaAcumPct > Number(st.quedaMaxPct) ? "text-red-600 dark:text-red-400" : ""}`}>{fmt(l.quedaAcumPct, 3)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Seção por trecho: menor seção comercial que mantém a queda acumulada
                  ≤ {fmt(Number(st.quedaMaxPct), 1)}% em todo caminho quadro→luminária, atende a
                  ampacidade (Tab. 36, método {st.metodo}, 2 carregados) e o mínimo de 1,5 mm²
                  (Tab. 47). ρ do cobre = 1/56 Ω·mm²/m, 2 condutores
                  ({cc ? "CC" : "CA, reatância desprezada"}).
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
