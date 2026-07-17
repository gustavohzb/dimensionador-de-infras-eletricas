import { useEffect, useRef, useState } from "react";
import { Field } from "./cabos/CircuitoForm";
import { calcularBanco } from "../lib/capacitorBank";
import { layoutPlaca } from "../lib/plateLayout";
import { POTENCIAS_CELULA, CELULAS_SIEMENS_440V } from "../data/capacitores";

const STORAGE_KEY = "capacitores.v1";
const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const fmt = (n, d = 1) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

// Dropdown de potência de célula: catálogo + "Outra..." abrindo campo livre.
function SeletorPotencia({ value, onChange }) {
  const custom = !POTENCIAS_CELULA.includes(value);
  return (
    <div className="flex gap-1">
      <select
        value={custom ? "outra" : value}
        onChange={(e) => onChange(e.target.value === "outra" ? 0 : Number(e.target.value))}
        className={inputCls}
      >
        {POTENCIAS_CELULA.map((p) => (
          <option key={p} value={p}>{String(p).replace(".", ",")} kvar</option>
        ))}
        <option value="outra">Outra...</option>
      </select>
      {custom && (
        <input
          type="number"
          min="0"
          step="0.1"
          value={value || ""}
          placeholder="kvar"
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputCls} w-24`}
          autoFocus
        />
      )}
    </div>
  );
}

// Id estável do estágio: é o que amarra o arranjo da placa à célula, mesmo
// quando outro estágio some da lista e os índices deslocam.
const novoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `e${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

function estadoInicial() {
  // Merge com os defaults: estados salvos antes de um campo existir (ex.: os
  // da placa de montagem) ganham o valor default em vez de undefined.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const salvo = { ...defaults(), ...JSON.parse(raw) };
      // Estados salvos antes do arrasto existir não têm id nos estágios.
      return { ...salvo, estagios: salvo.estagios.map((e) => ({ ...e, id: e.id ?? novoId() })) };
    }
  } catch { /* estado inicial */ }
  return defaults();
}

function defaults() {
  return {
    vRede: 380,
    vCapacitor: 440,
    fatorDisjEstagio: 1.63,
    fatorDisjGeral: 1.25,
    trafoKva: "",
    percentualAlvo: 33,
    estagios: [],
    // Placa de montagem — "auto" usa o Ø típico do catálogo por kvar
    // (DIAMETROS_CELULA); um número trava todas as células no mesmo Ø.
    placaDiametro: "auto",
    placaEspacamento: 40,
    placaMargem: 50,
    placaCelulasPorFileira: 6,
    // Arranjo das células nos slots da grade (lista de chaves), quando o
    // usuário arrastou algo. null = automático, na ordem dos estágios.
    placaOrdem: null,
  };
}

// Vista superior da placa de montagem: células cilíndricas (vista de topo =
// círculos) em grade, com as dimensões mínimas da placa cotadas. SVG em mm.
// Arrastar uma célula troca ela de slot com a de destino (ver onTrocar) — a
// grade continua governando a placa, então a cota segue sendo um cálculo.
function PlacaMontagem({ placa, dark, onTrocar }) {
  const { celulas, largura, altura } = placa;
  const svgRef = useRef(null);
  // { slot, dx, dy, x, y, alvo } enquanto uma célula está sendo arrastada.
  const [drag, setDrag] = useState(null);

  // Pixel de tela → milímetro do desenho.
  const paraMm = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const slotMaisProximo = (x, y) => {
    let melhor = null;
    let menor = Infinity;
    celulas.forEach((c, i) => {
      const d = (c.cx - x) ** 2 + (c.cy - y) ** 2;
      if (d < menor) {
        menor = d;
        melhor = i;
      }
    });
    return melhor;
  };

  const iniciar = (i, c) => (e) => {
    if (!onTrocar) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = paraMm(e);
    // guarda onde dentro da célula o usuário pegou, pra ela não "pular"
    setDrag({ slot: i, dx: c.cx - p.x, dy: c.cy - p.y, x: p.x, y: p.y, alvo: i });
  };
  const mover = (e) => {
    if (!drag) return;
    const p = paraMm(e);
    setDrag((d) => (d ? { ...d, x: p.x, y: p.y, alvo: slotMaisProximo(p.x + d.dx, p.y + d.dy) } : d));
  };
  const soltar = () => {
    if (drag && drag.alvo != null && drag.alvo !== drag.slot) onTrocar(drag.slot, drag.alvo);
    setDrag(null);
  };

  if (!celulas.length) return null;

  const fonte = Math.max(10, largura / 55);
  // A faixa das cotas e o respiro do viewBox acompanham a fonte — fixos, o
  // texto rotacionado da cota vertical vazava pra fora da imagem nas placas
  // largas (a fonte escala com a largura, a faixa não escalava).
  const cota = fonte * 2.4;
  const pad = fonte * 1.4;
  const corCota = dark ? "#8f9aa5" : "#64748b";
  // A caneca é prateada nos dois temas, então o texto sobre ela é sempre
  // escuro — no dark mode o texto claro sumia em cima do alumínio.
  const corTextoCelula = "#2b333a";

  const celulaSvg = (c, i, arrastada) => {
    const cx = arrastada ? drag.x + drag.dx : c.cx;
    const cy = arrastada ? drag.y + drag.dy : c.cy;
    return (
      <g
        key={c.key}
        onPointerDown={iniciar(i, c)}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        style={{ cursor: onTrocar ? (arrastada ? "grabbing" : "grab") : "default" }}
        opacity={arrastada ? 0.9 : 1}
      >
        <circle cx={cx} cy={cy} r={c.d / 2} fill="url(#celula-topo)" stroke="#6b7480" strokeWidth={c.d / 60} />
        {/* terminal central da caneca */}
        <circle cx={cx} cy={cy} r={c.d / 9} fill={dark ? "#39424a" : "#5c6670"} />
        <text x={cx} y={cy - c.d / 5} textAnchor="middle" fontSize={fonte} fontWeight="600" fill={corTextoCelula} fontFamily="JetBrains Mono, monospace">
          E{String(c.estagio).padStart(2, "0")}
        </text>
        <text x={cx} y={cy + c.d / 2.9} textAnchor="middle" fontSize={fonte * 0.85} fill={corTextoCelula} fontFamily="JetBrains Mono, monospace">
          {String(c.kvar).replace(".", ",")}
        </text>
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-(cota + pad)} ${-pad} ${largura + cota + pad * 2} ${altura + cota + pad * 2}`}
      className="w-full select-none"
      style={{ touchAction: "none" }}
      role="img"
      aria-label={`Placa de montagem ${Math.round(largura)} × ${Math.round(altura)} mm`}
    >
      <defs>
        <radialGradient id="celula-topo" cx="38%" cy="35%" r="72%">
          <stop offset="0%" stopColor="#eef1f4" />
          <stop offset="55%" stopColor="#b7bec8" />
          <stop offset="100%" stopColor="#7c8794" />
        </radialGradient>
      </defs>
      {/* a placa */}
      <rect
        x="0"
        y="0"
        width={largura}
        height={altura}
        fill={dark ? "#232a30" : "#e8ebee"}
        stroke={dark ? "#4b565f" : "#94a3b8"}
        strokeWidth={largura / 400}
      />
      {/* slot de destino do arrasto */}
      {drag && drag.alvo != null && drag.alvo !== drag.slot && (
        <circle
          cx={celulas[drag.alvo].cx}
          cy={celulas[drag.alvo].cy}
          r={placa.diametro / 2 + fonte * 0.35}
          fill="none"
          stroke={dark ? "#d98a4b" : "#b4622a"}
          strokeWidth={fonte / 5}
          strokeDasharray={`${fonte / 2} ${fonte / 3}`}
        />
      )}
      {/* células — a arrastada sai da ordem e é redesenhada por último, pra
          ficar por cima das demais (SVG pinta na ordem do documento) */}
      {celulas.map((c, i) => (drag?.slot === i ? null : celulaSvg(c, i, false)))}
      {drag && celulaSvg(celulas[drag.slot], drag.slot, true)}
      {/* cota horizontal (embaixo) */}
      <g stroke={corCota} strokeWidth={largura / 600}>
        <line x1="0" y1={altura + cota * 0.72} x2={largura} y2={altura + cota * 0.72} />
        <line x1="0" y1={altura + fonte * 0.3} x2="0" y2={altura + cota * 0.9} />
        <line x1={largura} y1={altura + fonte * 0.3} x2={largura} y2={altura + cota * 0.9} />
      </g>
      <text x={largura / 2} y={altura + cota * 0.72 - fonte * 0.35} textAnchor="middle" fontSize={fonte} fill={corCota} fontFamily="JetBrains Mono, monospace">
        {Math.round(largura)} mm
      </text>
      {/* cota vertical (esquerda) */}
      <g stroke={corCota} strokeWidth={largura / 600}>
        <line x1={-cota * 0.72} y1="0" x2={-cota * 0.72} y2={altura} />
        <line x1={-cota * 0.9} y1="0" x2={-fonte * 0.3} y2="0" />
        <line x1={-cota * 0.9} y1={altura} x2={-fonte * 0.3} y2={altura} />
      </g>
      <text
        x={-cota * 0.72 - fonte * 0.35}
        y={altura / 2}
        textAnchor="middle"
        fontSize={fonte}
        fill={corCota}
        fontFamily="JetBrains Mono, monospace"
        transform={`rotate(-90 ${-cota * 0.72 - fonte * 0.35} ${altura / 2})`}
      >
        {Math.round(altura)} mm
      </text>
    </svg>
  );
}

// Aba Capacitores: dimensionamento de banco de capacitores — correção da
// potência pela tensão de aplicação, corrente e disjuntor por estágio e a
// régua "banco ≈ 33% do trafo". Migração da planilha CAPAC-380 PARA 440.xlsx;
// o motor de cálculo (capacitorBank.js) tem a planilha como fixture de teste.
export default function CapacitoresTab({ dark }) {
  const [st, setSt] = useState(estadoInicial);
  // Formulário de novo estágio.
  const [numCelulas, setNumCelulas] = useState(2);
  const [pot1, setPot1] = useState(33.7);
  const [pot2, setPot2] = useState(33.7);
  const [repetir, setRepetir] = useState(1);

  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch { /* quota */ }
  }, [st]);

  const vRede = Number(st.vRede) || 0;
  const vCapacitor = Number(st.vCapacitor) || 0;
  const entradasOk = vRede > 0 && vCapacitor > 0;

  const banco = entradasOk
    ? calcularBanco({
        vRede,
        vCapacitor,
        fatorDisjEstagio: Number(st.fatorDisjEstagio) || 1.63,
        fatorDisjGeral: Number(st.fatorDisjGeral) || 1.25,
        estagios: st.estagios,
        trafo:
          Number(st.trafoKva) > 0
            ? { kva: Number(st.trafoKva), percentualAlvo: Number(st.percentualAlvo) || 33 }
            : null,
      })
    : null;

  const adicionarEstagios = () => {
    const celulas = numCelulas === 2 ? [pot1, pot2] : [pot1];
    if (celulas.some((c) => !(c > 0))) return;
    const n = Math.max(1, Math.min(50, Math.round(Number(repetir) || 1)));
    set({ estagios: [...st.estagios, ...Array.from({ length: n }, () => ({ id: novoId(), celulas }))] });
    setRepetir(1);
  };
  // O arranjo da placa sobrevive a adicionar/remover — as chaves apontam para
  // o id do estágio, e reconciliarOrdem descarta as que sumiram (ver layout).
  const removerEstagio = (i) => set({ estagios: st.estagios.filter((_, j) => j !== i) });
  const removerTodos = () => set({ estagios: [], placaOrdem: null });

  const placa = layoutPlaca({
    estagios: st.estagios,
    ordem: st.placaOrdem,
    diametro: st.placaDiametro === "auto" ? "auto" : Number(st.placaDiametro) || 85,
    espacamento: Number(st.placaEspacamento) || 0,
    margem: Number(st.placaMargem) || 0,
    celulasPorFileira: Number(st.placaCelulasPorFileira) || 6,
  });

  // Arrasto na placa: as duas células trocam de slot. Grava a ordem já
  // reconciliada, então o arranjo salvo nunca guarda chave morta.
  const trocarSlots = (a, b) => {
    const ordem = placa.ordem.slice();
    [ordem[a], ordem[b]] = [ordem[b], ordem[a]];
    set({ placaOrdem: ordem });
  };
  const rearranjar = () => set({ placaOrdem: null });

  // Veredito do trafo: verde dentro de ±10% relativos do alvo, âmbar fora.
  const veredito = banco?.trafo
    ? Math.abs(banco.trafo.percentualAtingido - Number(st.percentualAlvo)) <=
      Number(st.percentualAlvo) * 0.1
    : null;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ==================== Coluna de entradas ==================== */}
      <div className="space-y-3">
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Parâmetros
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tensão da rede (V)" tip="Tensão em que o banco vai operar. A potência entregue pelo capacitor cai com o quadrado da relação entre esta tensão e a nominal da célula.">
              <input type="number" min="1" value={st.vRede} onChange={(e) => set({ vRede: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Tensão do capacitor (V)" tip="Tensão nominal de placa das células capacitivas.">
              <input type="number" min="1" value={st.vCapacitor} onChange={(e) => set({ vCapacitor: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fator disj. estágio" tip="Sobredimensionamento do disjuntor de cada estágio. Capacitor exige folga por harmônicas e tolerância de +10% na tensão — a IEC pede suportar no mínimo 1,35×In; 1,63 é o usual de projeto.">
              <input type="number" min="1" step="0.01" value={st.fatorDisjEstagio} onChange={(e) => set({ fatorDisjEstagio: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fator disj. geral" tip="Sobredimensionamento do disjuntor geral do banco (1,25 usual — os estágios não chaveiam todos juntos).">
              <input type="number" min="1" step="0.01" value={st.fatorDisjGeral} onChange={(e) => set({ fatorDisjGeral: e.target.value })} className={inputCls} />
            </Field>
          </div>
          {entradasOk && (
            <div className="mt-2 rounded-xs border border-copper-200 bg-copper-50 px-2.5 py-1.5 text-[13px] text-copper-800 dark:border-copper-500/30 dark:bg-copper-500/10 dark:text-copper-300">
              Fator de correção: <b className="font-mono">({vRede}/{vCapacitor})² = {banco.fatorTensao.toFixed(3).replace(".", ",")}</b>
              {banco.fatorTensao === 1 && " — capacitor na tensão nominal, sem correção"}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Potência do trafo (kVA)" tip="Opcional. Informando, o app compara o banco montado com o alvo percentual do trafo.">
              <input type="number" min="0" value={st.trafoKva} placeholder="opcional" onChange={(e) => set({ trafoKva: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Alvo (% do trafo)" tip="Régua usual de projeto: banco de capacitores em torno de 33% da potência do transformador.">
              <input type="number" min="1" max="100" value={st.percentualAlvo} onChange={(e) => set({ percentualAlvo: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Estágios
            </h2>
            {st.estagios.length > 0 && (
              <button
                type="button"
                onClick={removerTodos}
                className="text-[12px] text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
              >
                remover todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Células por estágio">
              <select value={numCelulas} onChange={(e) => setNumCelulas(Number(e.target.value))} className={inputCls}>
                <option value={1}>1 célula</option>
                <option value={2}>2 células</option>
              </select>
            </Field>
            <Field label="Repetir">
              <input type="number" min="1" max="50" value={repetir} onChange={(e) => setRepetir(e.target.value)} className={inputCls} />
            </Field>
            <Field label={numCelulas === 2 ? "Célula 1 (kvar)" : "Célula (kvar)"} tip="Potência de placa da célula, na tensão nominal dela. Lista consolidada dos catálogos ABB/WEG; use Outra... para valores fora dela.">
              <SeletorPotencia value={pot1} onChange={setPot1} />
            </Field>
            {numCelulas === 2 && (
              <Field label="Célula 2 (kvar)">
                <SeletorPotencia value={pot2} onChange={setPot2} />
              </Field>
            )}
          </div>
          <button
            type="button"
            onClick={adicionarEstagios}
            className="mt-2 w-full rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-copper-700 dark:bg-copper-500 dark:hover:bg-copper-600"
          >
            + estágio{Number(repetir) > 1 ? `s (${repetir}×)` : ""}
          </button>

          {st.estagios.length > 0 && (
            <ul className="mt-2 space-y-1">
              {st.estagios.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xs border border-slate-200 px-2 py-1 text-[13px] dark:border-slate-700"
                >
                  <span
                    className="font-mono text-slate-700 dark:text-slate-200"
                    title={e.celulas
                      .map((c) => {
                        const cel = CELULAS_SIEMENS_440V[c];
                        return cel ? `${String(c).replace(".", ",")} kvar: ${cel.codigo} (Ø${String(cel.d).replace(".", ",")}×${cel.h}mm)` : null;
                      })
                      .filter(Boolean)
                      .join("\n") || undefined}
                  >
                    EST {String(i + 1).padStart(2, "0")} — {e.celulas.map((c) => String(c).replace(".", ",")).join(" + ")} kvar
                  </span>
                  <button
                    type="button"
                    onClick={() => removerEstagio(i)}
                    className="text-[12px] text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ==================== Coluna de resultados ==================== */}
      <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Resultado
        </h2>
        {!banco || banco.estagios.length === 0 ? (
          <div className="rounded-sm border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Adicione estágios ao lado — cada linha mostra a potência corrigida
            para a tensão da rede, a corrente e o disjuntor do estágio.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-display text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <th className="py-1.5 pr-2">#</th>
                    <th className="py-1.5 pr-2">kvar @{vCapacitor}V</th>
                    <th className="py-1.5 pr-2">kvar @{vRede}V</th>
                    <th className="py-1.5 pr-2">Corrente</th>
                    <th className="py-1.5">Disjuntor</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {banco.estagios.map((e) => (
                    <tr key={e.numero} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                      <td className="py-1 pr-2 text-slate-400 dark:text-slate-500">{String(e.numero).padStart(2, "0")}</td>
                      <td className="py-1 pr-2">{fmt(e.kvarNominal)}</td>
                      <td className="py-1 pr-2">{fmt(e.kvarReal)}</td>
                      <td className="py-1 pr-2">{fmt(e.corrente)} A</td>
                      <td className="py-1">
                        {fmt(e.disjCalculado)} A →{" "}
                        {e.disjComercial ? (
                          <b>{e.disjComercial} A</b>
                        ) : (
                          <b className="text-red-600 dark:text-red-400">acima da escala</b>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-xs border border-copper-300 bg-copper-50 p-2.5 dark:border-copper-500/40 dark:bg-copper-500/10">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[13px] text-copper-900 dark:text-copper-200 sm:grid-cols-4">
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">kvar @{vCapacitor}V</div>
                  {fmt(banco.kvarNominalTotal)}
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">kvar @{vRede}V</div>
                  {fmt(banco.kvarRealTotal)}
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">Corrente total</div>
                  {fmt(banco.correnteTotal)} A
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">Disj. geral</div>
                  {fmt(banco.disjGeralCalculado)} A →{" "}
                  {banco.disjGeralComercial ? <b>{banco.disjGeralComercial} A</b> : <b className="text-red-600 dark:text-red-400">acima da escala</b>}
                </div>
              </div>
            </div>

            {banco.trafo && (
              <div
                className={`mt-2 rounded-xs px-2.5 py-1.5 text-[13px] font-medium ${
                  veredito
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                Banco real {fmt(banco.kvarRealTotal)} kvar = <b>{fmt(banco.trafo.percentualAtingido)}%</b> do trafo
                (alvo {fmt(Number(st.percentualAlvo), 0)}% = {fmt(banco.trafo.alvoKvar)} kvar)
              </div>
            )}
          </>
        )}
      </div>

      {st.estagios.length > 0 && (
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Placa de montagem — vista superior
            </h2>
            <div className="flex items-center gap-3">
              {st.placaOrdem && (
                <button
                  type="button"
                  onClick={rearranjar}
                  className="text-[12px] text-slate-400 transition hover:text-copper-600 dark:hover:text-copper-400"
                >
                  rearranjar automaticamente
                </button>
              )}
              <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                placa mín. {Math.round(placa.largura)} × {Math.round(placa.altura)} mm
              </span>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Ø célula (mm)" tip="Automático usa o Ø do catálogo Siemens BR (células B32, 440V/60Hz) por kvar: Ø53 até 2,5 kvar, Ø63 até 6, Ø79,5 até 15 e Ø89,5 acima — o 33,7 kvar (B32344-E4282-Z040) é Ø89,5×348mm. WEG UCWT fica próximo. Manual trava todas as células no mesmo Ø.">
              <div className="flex gap-1">
                <select
                  value={st.placaDiametro === "auto" ? "auto" : "manual"}
                  onChange={(e) => set({ placaDiametro: e.target.value === "auto" ? "auto" : 85 })}
                  className={inputCls}
                >
                  <option value="auto">Automático</option>
                  <option value="manual">Manual</option>
                </select>
                {st.placaDiametro !== "auto" && (
                  <input
                    type="number"
                    min="10"
                    value={st.placaDiametro}
                    onChange={(e) => set({ placaDiametro: e.target.value })}
                    className={`${inputCls} w-20`}
                  />
                )}
              </div>
            </Field>
            <Field label="Espaçamento (mm)" tip="Folga entre células, para ventilação e passagem da fiação.">
              <input type="number" min="0" value={st.placaEspacamento} onChange={(e) => set({ placaEspacamento: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Margem (mm)" tip="Distância da primeira/última célula até a borda da placa.">
              <input type="number" min="0" value={st.placaMargem} onChange={(e) => set({ placaMargem: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Células por fileira">
              <input type="number" min="1" max="20" value={st.placaCelulasPorFileira} onChange={(e) => set({ placaCelulasPorFileira: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <PlacaMontagem placa={placa} dark={dark} onTrocar={trocarSlots} />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Arraste um capacitor para trocá-lo de lugar com outro. Layout de referência — a placa
            mínima sai do arranjo (margem + células + espaçamentos). Confira os diâmetros no
            catálogo do fabricante antes de fabricar.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
