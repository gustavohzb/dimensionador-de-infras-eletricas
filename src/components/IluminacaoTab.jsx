import { useEffect, useState } from "react";
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
import { exportIluminacaoPDF, resumoCircuito } from "../lib/iluminacaoPdf";
import { METODOS_INSTALACAO } from "../data/nbr5410Ampacidade";

const STORAGE_KEY = "iluminacao.v3";
const STORAGE_KEY_V2 = "iluminacao.v2"; // 1 circuito único
const STORAGE_KEY_V1 = "iluminacao.v1"; // só parâmetros
const QUADRO_ID = "quadro";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));
const fmtSecao = (s) => (s == null ? "—" : `${String(s).replace(".", ",")} mm²`);
const uid = (prefixo) => `${prefixo}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

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
          {/* Método de instalação do trecho: vazio = usa o padrão da aba. */}
          <select
            value={data.metodo ?? ""}
            onChange={(e) => data.onMetodo(id, e.target.value)}
            title="Método de instalação deste trecho (Tab. 36). Vazio = método padrão dos parâmetros."
            className={`mt-0.5 w-full rounded-xs border bg-white px-0.5 py-0 font-mono text-[10px] dark:bg-slate-800 ${
              data.metodo
                ? "border-copper-400 text-copper-700 dark:border-copper-500/60 dark:text-copper-400"
                : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
            }`}
          >
            <option value="">padrão</option>
            {METODOS.map((m) => (
              <option key={m.id} value={m.id}>{m.id}</option>
            ))}
          </select>
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

function novoCircuito(nome, params) {
  return { id: uid("c"), nome, params: { ...defaults(), ...params }, ...diagramaInicial() };
}

function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.circuitos) && s.circuitos.length) {
        const ativoId = s.circuitos.some((c) => c.id === s.ativoId) ? s.ativoId : s.circuitos[0].id;
        return { circuitos: s.circuitos, ativoId };
      }
    }
    // Migrações: v2 vira o primeiro circuito; da v1 só aproveitamos parâmetros.
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      const s = JSON.parse(v2);
      const c = {
        ...novoCircuito("Circuito 1", s.params),
        nodes: Array.isArray(s.nodes) && s.nodes.length ? s.nodes : diagramaInicial().nodes,
        edges: Array.isArray(s.edges) ? s.edges : diagramaInicial().edges,
      };
      return { circuitos: [c], ativoId: c.id };
    }
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const { sistema, tensao, fp, potencia, quedaMaxPct, metodo } = JSON.parse(v1);
      const c = novoCircuito("Circuito 1", { sistema, tensao, fp, potencia, quedaMaxPct, metodo });
      return { circuitos: [c], ativoId: c.id };
    }
  } catch { /* estado inicial */ }
  const c = novoCircuito("Circuito 1");
  return { circuitos: [c], ativoId: c.id };
}

/* ==================== Aba ==================== */

export default function IluminacaoTab({ dark, ativo = true }) {
  const [store, setStore] = useState(carregarEstado);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const circ = store.circuitos.find((c) => c.id === store.ativoId) ?? store.circuitos[0];
  const st = circ.params;
  const { nodes, edges } = circ;

  // Todos os setters operam sobre o circuito ativo.
  const updateCirc = (fn) =>
    setStore((s) => ({
      ...s,
      circuitos: s.circuitos.map((c) => (c.id === s.ativoId ? { ...c, ...fn(c) } : c)),
    }));
  const set = (patch) => updateCirc((c) => ({ params: { ...c.params, ...patch } }));
  const setNodes = (u) => updateCirc((c) => ({ nodes: typeof u === "function" ? u(c.nodes) : u }));
  const setEdges = (u) => updateCirc((c) => ({ edges: typeof u === "function" ? u(c.edges) : u }));

  const cc = st.sistema === "cc";

  // Calcula um circuito qualquer (o ativo alimenta o diagrama/resultado; os
  // demais entram no quadro de cargas e no PDF).
  const calcularCircuito = (c) => {
    const p = c.params;
    const v = Number(p.tensao) || 0;
    if (!(v > 0 && Number(p.potencia) > 0 && Number(p.quedaMaxPct) > 0)) return null;
    return calcularIluminacaoArvore({
      sistema: p.sistema === "cc" ? "cc" : "ca",
      tensao: v,
      fp: Number(p.fp) || 1,
      potencia: Number(p.potencia),
      quedaMaxPct: Number(p.quedaMaxPct),
      metodo: p.metodo,
      nos: c.nodes.map((n) => ({ id: n.id, tipo: n.type, qtd: Number(n.data.qtd) || 1 })),
      ligacoes: c.edges.map((e) => ({
        id: e.id,
        de: e.source,
        para: e.target,
        distancia: Number(e.data?.distancia) || 0,
        metodo: e.data?.metodo || undefined,
      })),
    });
  };

  const resultados = new Map(store.circuitos.map((c) => [c.id, calcularCircuito(c)]));
  const resultado = resultados.get(circ.id) ?? null;

  const gerarPDF = () =>
    exportIluminacaoPDF({
      circuitos: store.circuitos.map((c) => ({
        circuito: c,
        resultado: resultados.get(c.id) ?? null,
        rotulos: new Map(c.nodes.map((n) => [n.id, n.type === "quadro" ? "Quadro" : n.data.label])),
      })),
    });

  /* ---------- circuitos ---------- */

  const addCircuito = () => {
    // Novo circuito herda os parâmetros do ativo (mesma rede, outra sala).
    const c = novoCircuito(`Circuito ${store.circuitos.length + 1}`, circ.params);
    setStore((s) => ({ circuitos: [...s.circuitos, c], ativoId: c.id }));
  };
  const removeCircuito = () => {
    if (store.circuitos.length <= 1) return;
    if (!window.confirm(`Excluir "${circ.nome}" e seu diagrama?`)) return;
    setStore((s) => {
      const restantes = s.circuitos.filter((c) => c.id !== s.ativoId);
      return { circuitos: restantes, ativoId: restantes[0].id };
    });
  };
  const renameCircuito = (nome) => updateCirc(() => ({ nome }));

  /* ---------- edição do diagrama ---------- */

  const onNodesChange = (changes) =>
    setNodes((ns) => applyNodeChanges(changes.filter((c) => !(c.type === "remove" && c.id === QUADRO_ID)), ns));
  const onEdgesChange = (changes) => setEdges((es) => applyEdgeChanges(changes, es));
  const onConnect = (conn) =>
    setEdges((es) => addEdge({ ...conn, id: uid("e"), type: "trecho", data: { distancia: 10 } }, es));
  // Árvore: nada entra no quadro e cada nó tem um único trecho de chegada.
  const isValidConnection = (c) =>
    c.target !== QUADRO_ID && c.source !== c.target && !edges.some((e) => e.target === c.target);

  const onQtd = (id, qtd) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, qtd } } : n)));
  const onDist = (id, distancia) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { ...e.data, distancia } } : e)));
  const onMetodo = (id, metodo) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { ...e.data, metodo: metodo || undefined } } : e)));

  const addNo = (tipo) => {
    const selecionado = nodes.find((n) => n.selected) ?? nodes[nodes.length - 1];
    const seq = nodes.filter((n) => n.type === tipo).length + 1;
    const id = uid("n");
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

  const infoPorLigacao = new Map((resultado?.ligacoes ?? []).map((l) => [l.id, l]));
  const quedaPorNo = new Map((resultado?.nos ?? []).map((n) => [n.id, n.quedaAcumPct]));

  const nodesRender = nodes.map((n) =>
    n.type === "luminaria"
      ? { ...n, data: { ...n.data, onQtd, quedaAcumPct: quedaPorNo.get(n.id) ?? null } }
      : n
  );
  const edgesRender = edges.map((e) => ({
    ...e,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#94a3b8" },
    data: { ...e.data, onDist, onMetodo, info: infoPorLigacao.get(e.id) ?? null },
  }));

  const rotuloPorId = new Map(nodes.map((n) => [n.id, n.type === "quadro" ? "Quadro" : n.data.label]));
  const rotulo = (id) => rotuloPorId.get(id) ?? id;
  const pior = resultado?.piorCaminho ?? null;

  return (
    <div className="space-y-3">
      {/* ==================== Circuitos ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Circuitos
          </h2>
          {store.circuitos.map((c) =>
            c.id === store.ativoId ? (
              <input
                key={c.id}
                value={c.nome}
                onChange={(e) => renameCircuito(e.target.value)}
                title="Circuito ativo — edite o nome aqui"
                className="w-32 rounded-xs border border-copper-500 bg-copper-50 px-2 py-1 text-xs font-bold text-copper-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-copper-500/60 dark:bg-copper-500/10 dark:text-copper-300"
              />
            ) : (
              <button
                key={c.id}
                type="button"
                onClick={() => setStore((s) => ({ ...s, ativoId: c.id }))}
                className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {c.nome}
              </button>
            )
          )}
          <button
            type="button"
            onClick={addCircuito}
            className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            + circuito
          </button>
          {store.circuitos.length > 1 && (
            <button
              type="button"
              onClick={removeCircuito}
              title="Excluir o circuito ativo"
              className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:text-red-600 dark:border-slate-700 dark:text-slate-500 dark:hover:text-red-400"
            >
              excluir
            </button>
          )}
        </div>
      </div>

      {/* ==================== Parâmetros ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Parâmetros — {circ.nome}
        </h2>
        {/* items-end alinha os inputs na mesma base mesmo quando um rótulo
            quebra em duas linhas. */}
        <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
          <Field label="Potência (W)" tip="Potência de cada luminária. A corrente de cada trecho vem das luminárias que ele alimenta à jusante no diagrama.">
            <input type="number" min="0.1" step="0.1" value={st.potencia} onChange={(e) => set({ potencia: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Queda máx. (%)" tip="NBR 5410 6.2.7: 5% da origem em rede pública, 7% com transformador próprio; a prática usual é 4% no conjunto e 2% no circuito terminal. Vale para o caminho quadro→luminária mais desfavorável.">
            <input type="number" min="0.5" max="10" step="0.5" value={st.quedaMaxPct} onChange={(e) => set({ quedaMaxPct: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Método padrão" tip="Método de instalação para a capacidade de condução (NBR 5410 Tabela 36, PVC 70°C, cobre, 2 condutores carregados). Trechos podem sobrepor no seletor do próprio trecho.">
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
            Diagrama — {circ.nome}
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
              Flow mede dimensão zero e o fitView enquadra errado. A key por
              circuito refaz o enquadramento ao trocar de circuito. */}
          {ativo && (
          <ReactFlow
            key={circ.id}
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
          um nó até o esquerdo de outro para religar. Em cada trecho: distância, método
          de instalação (vazio = padrão) e a seção calculada. Delete remove o nó/trecho
          selecionado.
        </p>
      </div>

      {/* ==================== Resultado ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Resultado — {circ.nome}
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
                        <th className="py-1.5 pr-2">Método</th>
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
                          <td className="py-1 pr-2">{l.metodo}</td>
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
                  ampacidade (Tab. 36, método do trecho ou padrão {st.metodo}, 2 carregados) e o
                  mínimo de 1,5 mm² (Tab. 47). ρ do cobre = 1/56 Ω·mm²/m, 2 condutores
                  ({cc ? "CC" : "CA, reatância desprezada"}).
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ==================== Quadro de cargas (todos os circuitos) ==================== */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Quadro de cargas — {store.circuitos.length} circuito{store.circuitos.length > 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={gerarPDF}
            className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-copper-700 dark:bg-copper-500 dark:hover:bg-copper-600"
          >
            Gerar PDF
          </button>
        </div>
        {(() => {
          const resumos = store.circuitos.map((c) => ({ id: c.id, r: resumoCircuito(c, resultados.get(c.id) ?? null) }));
          const totLum = resumos.reduce((a, { r }) => a + (r.luminarias ?? 0), 0);
          const totW = resumos.reduce((a, { r }) => a + (r.potenciaW ?? 0), 0);
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-display text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <th className="py-1.5 pr-2">Circuito</th>
                    <th className="py-1.5 pr-2">Sistema</th>
                    <th className="py-1.5 pr-2">Tensão</th>
                    <th className="py-1.5 pr-2">Lum.</th>
                    <th className="py-1.5 pr-2">Potência</th>
                    <th className="py-1.5 pr-2">Corrente</th>
                    <th className="py-1.5 pr-2">Seções (mm²)</th>
                    <th className="py-1.5">Pior queda</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {resumos.map(({ id, r }) => (
                    <tr
                      key={id}
                      onClick={() => setStore((s) => ({ ...s, ativoId: id }))}
                      title="Clique para abrir este circuito"
                      className={`cursor-pointer border-b border-slate-100 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60 ${
                        id === store.ativoId ? "bg-copper-50/60 dark:bg-copper-500/5" : ""
                      }`}
                    >
                      <td className="py-1 pr-2 font-sans font-medium">{r.nome}</td>
                      <td className="py-1 pr-2">{r.sistema}</td>
                      <td className="py-1 pr-2">{r.tensao} V</td>
                      <td className="py-1 pr-2">{r.luminarias ?? "—"}</td>
                      <td className="py-1 pr-2">{r.potenciaW == null ? "—" : `${fmt(r.potenciaW, 0)} W`}</td>
                      <td className="py-1 pr-2">{r.corrente == null ? "—" : `${fmt(r.corrente)} A`}</td>
                      <td className={`py-1 pr-2 ${r.secoes.includes(null) ? "text-red-600 dark:text-red-400" : "text-copper-700 dark:text-copper-400"}`}>
                        {r.secoes.length ? r.secoes.map((s) => (s == null ? "?" : String(s).replace(".", ","))).join(" / ") : "—"}
                      </td>
                      <td className={`py-1 font-bold ${r.piorQuedaPct == null ? "" : r.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {r.piorQuedaPct == null ? (r.temErro ? "erro no diagrama" : "—") : `${fmt(r.piorQuedaPct)}%`}
                      </td>
                    </tr>
                  ))}
                  <tr className="text-slate-800 dark:text-slate-100">
                    <td className="py-1.5 pr-2 font-sans font-bold">Total</td>
                    <td colSpan={2} />
                    <td className="py-1.5 pr-2 font-bold">{totLum}</td>
                    <td className="py-1.5 pr-2 font-bold">{fmt(totW, 0)} W</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                O PDF traz este quadro e o detalhamento de trechos de cada circuito.
                Correntes não são somadas — cada circuito tem sua tensão/sistema.
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
