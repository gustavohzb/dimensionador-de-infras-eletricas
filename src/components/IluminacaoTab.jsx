import { useEffect, useState } from "react";
import { Field } from "./cabos/CircuitoForm";
import { calcularIluminacao, SECAO_MIN_ILUMINACAO } from "../lib/lightingDrop";
import { METODOS_INSTALACAO } from "../data/nbr5410Ampacidade";

const STORAGE_KEY = "iluminacao.v1";
const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));
const fmtSecao = (s) => (s == null ? "—" : `${String(s).replace(".", ",")} mm²`);

// Métodos com tabela PVC de 2 carregados (F/G são de cabos espaçados — não
// fazem sentido em circuito de iluminação).
const METODOS = METODOS_INSTALACAO.filter((m) => ["B1", "B2", "C", "D", "E"].includes(m.id));

function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* estado inicial */ }
  return defaults();
}

function defaults() {
  return {
    sistema: "ca-fn", // "ca-fn" | "ca-ff" | "cc"
    tensao: 220,
    fp: 0.92, // drivers de LED ficam tipicamente entre 0,9 e 0,95
    potencia: 50,
    numLuminarias: 10,
    quedaMaxPct: 4,
    metodo: "B1",
    // [{ distancia (m), pontos (luminárias que o trecho ainda alimenta) }]
    trechos: [],
  };
}

export default function IluminacaoTab() {
  const [st, setSt] = useState(carregarEstado);
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  }, [st]);

  const cc = st.sistema === "cc";
  const tensao = Number(st.tensao) || 0;
  const entradasOk =
    tensao > 0 && Number(st.potencia) > 0 && Number(st.numLuminarias) > 0 && Number(st.quedaMaxPct) > 0;

  const resultado = entradasOk
    ? calcularIluminacao({
        sistema: cc ? "cc" : "ca",
        tensao,
        fp: Number(st.fp) || 1,
        potencia: Number(st.potencia),
        numLuminarias: Number(st.numLuminarias),
        quedaMaxPct: Number(st.quedaMaxPct),
        metodo: st.metodo,
        trechos: st.trechos.map((t) => ({ distancia: Number(t.distancia) || 0, pontos: Number(t.pontos) || 0 })),
      })
    : null;

  const dentroLimite = resultado?.quedaFinalPct != null && resultado.quedaFinalPct <= Number(st.quedaMaxPct);

  const addTrecho = () => {
    const anterior = st.trechos[st.trechos.length - 1];
    // Sugestão: 1º trecho carrega todas; os seguintes repetem o anterior para
    // o usuário só ajustar (os acumulados diminuem ao longo do circuito).
    const pontos = anterior ? anterior.pontos : st.numLuminarias;
    set({ trechos: [...st.trechos, { distancia: 10, pontos }] });
  };
  const setTrecho = (i, patch) =>
    set({ trechos: st.trechos.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const removeTrecho = (i) => set({ trechos: st.trechos.filter((_, j) => j !== i) });

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ==================== Coluna de entradas ==================== */}
      <div className="space-y-3">
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Parâmetros
          </h2>
          <div className="grid grid-cols-2 gap-2">
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
            <Field label="Potência por luminária (W)" tip="Potência de cada ponto. A corrente de cada trecho = pontos acumulados × potência ÷ (tensão × FP).">
              <input type="number" min="0.1" step="0.1" value={st.potencia} onChange={(e) => set({ potencia: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Luminárias no circuito" tip="Total de pontos do circuito — o trecho que sai do quadro carrega todas.">
              <input type="number" min="1" step="1" value={st.numLuminarias} onChange={(e) => set({ numLuminarias: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Queda máx. (%)" tip="NBR 5410 6.2.7: 5% da origem em rede pública, 7% com transformador próprio; a prática usual é 4% no conjunto e 2% no circuito terminal. Ajuste conforme o caso da obra.">
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

        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Trechos do circuito
            </h2>
            <button
              type="button"
              onClick={addTrecho}
              className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              + trecho
            </button>
          </div>
          {st.trechos.length === 0 ? (
            <div className="rounded-sm border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Adicione os trechos na ordem do circuito: distância e quantas
              luminárias o trecho ainda alimenta (acumulado à jusante). Ex.:
              quadro→1ª luminária 30m carregando 10; depois 10m carregando 8...
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 font-display text-[10px] uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
                <span>#</span>
                <span>Distância (m)</span>
                <span>Pontos à jusante</span>
                <span />
              </div>
              {st.trechos.map((t, i) => (
                <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
                  <span className="px-1 font-mono text-[13px] text-slate-400 dark:text-slate-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="number" min="0.1" step="0.5" value={t.distancia}
                    onChange={(e) => setTrecho(i, { distancia: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="number" min="1" step="1" value={t.pontos}
                    onChange={(e) => setTrecho(i, { pontos: e.target.value })}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeTrecho(i)}
                    title="Remover trecho"
                    className="text-center text-[15px] text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== Coluna de resultados ==================== */}
      <div className="space-y-3">
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Resultado
          </h2>
          {!resultado ? (
            <div className="rounded-sm border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Preencha os parâmetros e adicione ao menos um trecho — o cabo
              mínimo sai do pior entre queda de tensão, capacidade de corrente
              e o mínimo de iluminação da norma (1,5 mm²).
            </div>
          ) : (
            <>
              {resultado.avisos.map((a, i) => (
                <div key={i} className="mb-2 rounded-xs border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  {a}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700">
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Corrente do circuito</div>
                  <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmt(resultado.correnteTotal)} A</div>
                </div>
                <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700" title="Menor seção comercial cuja queda total fica dentro do limite">
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Por queda de tensão</div>
                  <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmtSecao(resultado.secaoPorQueda)}</div>
                </div>
                <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700" title={`NBR 5410 Tab. 36 (PVC, cobre), método ${st.metodo}, 2 condutores carregados`}>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Por ampacidade</div>
                  <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmtSecao(resultado.secaoPorAmpacidade)}</div>
                </div>
                <div className="rounded-xs border border-slate-200 p-2 dark:border-slate-700" title="Seção mínima de circuito de iluminação — NBR 5410 Tabela 47">
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Mínimo da norma</div>
                  <div className="font-mono text-[15px] text-slate-800 dark:text-slate-100">{fmtSecao(SECAO_MIN_ILUMINACAO)}</div>
                </div>
              </div>

              {resultado.secaoSugerida != null ? (
                <div className="mt-2 rounded-xs border border-copper-300 bg-copper-50 p-2.5 dark:border-copper-500/40 dark:bg-copper-500/10">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-display text-[10px] uppercase tracking-[0.08em] text-copper-800/70 dark:text-copper-300/70">Cabo mínimo sugerido</span>
                      <div className="font-mono text-xl font-bold text-copper-900 dark:text-copper-200">
                        {fmtSecao(resultado.secaoSugerida)} <span className="text-[13px] font-normal">(cobre, PVC 70°C)</span>
                      </div>
                    </div>
                    <div className={`font-mono text-[15px] font-bold ${dentroLimite ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      queda total {fmt(resultado.quedaFinalPct)}% ({fmt(resultado.quedaFinalVolts)} V) ≤ {fmt(Number(st.quedaMaxPct), 1)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-xs border border-red-300 bg-red-50 px-2.5 py-2 text-[13px] font-medium text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                  Nenhuma seção até 300 mm² atende — reduza o comprimento, aumente
                  a tensão ou divida o circuito.
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left font-display text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      <th className="py-1.5 pr-2">#</th>
                      <th className="py-1.5 pr-2">Distância</th>
                      <th className="py-1.5 pr-2">Pontos</th>
                      <th className="py-1.5 pr-2">Corrente</th>
                      <th className="py-1.5 pr-2">Queda (V)</th>
                      <th className="py-1.5">Queda (%)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {resultado.trechos.map((t) => (
                      <tr key={t.numero} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="py-1 pr-2 text-slate-400 dark:text-slate-500">{String(t.numero).padStart(2, "0")}</td>
                        <td className="py-1 pr-2">{fmt(t.distancia, 1)} m</td>
                        <td className="py-1 pr-2">{t.pontos}</td>
                        <td className="py-1 pr-2">{fmt(t.corrente)} A</td>
                        <td className="py-1 pr-2">{fmt(t.quedaVolts, 3)}</td>
                        <td className="py-1">{fmt(t.quedaPct, 3)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Queda por trecho calculada na seção sugerida, com ρ do cobre = 1/56 Ω·mm²/m
                e 2 condutores ({cc ? "CC" : "CA, reatância desprezada"}). Critérios: queda
                de tensão (6.2.7), ampacidade (Tab. 36) e mínimo de iluminação (Tab. 47).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
