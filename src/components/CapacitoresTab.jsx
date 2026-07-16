import { useEffect, useState } from "react";
import { Field } from "./cabos/CircuitoForm";
import { calcularBanco } from "../lib/capacitorBank";
import { POTENCIAS_CELULA } from "../data/capacitores";

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

function estadoInicial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* estado inicial */ }
  return {
    vRede: 380,
    vCapacitor: 440,
    fatorDisjEstagio: 1.63,
    fatorDisjGeral: 1.25,
    trafoKva: "",
    percentualAlvo: 33,
    estagios: [],
  };
}

// Aba Capacitores: dimensionamento de banco de capacitores — correção da
// potência pela tensão de aplicação, corrente e disjuntor por estágio e a
// régua "banco ≈ 33% do trafo". Migração da planilha CAPAC-380 PARA 440.xlsx;
// o motor de cálculo (capacitorBank.js) tem a planilha como fixture de teste.
export default function CapacitoresTab() {
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
    set({ estagios: [...st.estagios, ...Array.from({ length: n }, () => ({ celulas }))] });
    setRepetir(1);
  };
  const removerEstagio = (i) => set({ estagios: st.estagios.filter((_, j) => j !== i) });

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
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Estágios
          </h2>
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
                  <span className="font-mono text-slate-700 dark:text-slate-200">
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
    </div>
  );
}
