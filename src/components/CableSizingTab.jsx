import { useState } from "react";
import { METODOS_INSTALACAO, TEMPERATURAS } from "../data/nbr5410Ampacidade";
import { ARRANJOS } from "../lib/derating";
import { sizeCable, TIPOS_CIRCUITO } from "../lib/cableSizing";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const labelCls = "mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400";

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ResultRow({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={
          strong
            ? "text-base font-bold text-slate-800 dark:text-slate-100"
            : "font-semibold text-slate-700 dark:text-slate-200"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function CableSizingTab() {
  // Entrada por corrente direta ou por potência (o app converte).
  const [modo, setModo] = useState("corrente"); // "corrente" | "potencia"
  const [corrente, setCorrente] = useState(40);
  const [potencia, setPotencia] = useState(10000); // W
  const [fp, setFp] = useState(0.92);
  const [sistema, setSistema] = useState("tri"); // "mono" | "tri"
  const [tensao, setTensao] = useState(380); // FN no mono, FF no tri
  const [metodo, setMetodo] = useState("B1");
  const [tempAmbiente, setTempAmbiente] = useState(30);
  const [arranjo, setArranjo] = useState("feixe");
  const [circuitos, setCircuitos] = useState(1);
  const [comprimento, setComprimento] = useState(30);
  const [quedaMax, setQuedaMax] = useState(4);
  const [tipoCircuito, setTipoCircuito] = useState("forca");

  const ib =
    modo === "corrente"
      ? Number(corrente)
      : sistema === "tri"
        ? Number(potencia) / (Math.sqrt(3) * Number(tensao) * Number(fp))
        : Number(potencia) / (Number(tensao) * Number(fp));

  const result = sizeCable({
    corrente: ib,
    sistema,
    tensao: Number(tensao),
    metodo,
    tempAmbiente: Number(tempAmbiente),
    arranjo,
    circuitos: Number(circuitos),
    comprimento: Number(comprimento),
    quedaMax: Number(quedaMax),
    tipoCircuito,
  });

  const criterioLabel = {
    capacidade: "capacidade de condução",
    queda: "queda de tensão",
    minima: "seção mínima do tipo de circuito (NBR 5410 Tab. 47)",
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Circuito</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "corrente", label: "Por corrente" },
                { id: "potencia", label: "Por potência" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModo(m.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    modo === m.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {modo === "corrente" ? (
              <Field label="Corrente de projeto Ib (A)">
                <input type="number" min="0" value={corrente} onChange={(e) => setCorrente(e.target.value)} className={inputCls} />
              </Field>
            ) : (
              <>
                <Field label="Potência (W)">
                  <input type="number" min="0" value={potencia} onChange={(e) => setPotencia(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Fator de potência">
                  <input type="number" min="0.1" max="1" step="0.01" value={fp} onChange={(e) => setFp(e.target.value)} className={inputCls} />
                </Field>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Sistema">
                <select value={sistema} onChange={(e) => setSistema(e.target.value)} className={inputCls}>
                  <option value="mono">Monofásico (F+N)</option>
                  <option value="tri">Trifásico</option>
                </select>
              </Field>
              <Field label={sistema === "tri" ? "Tensão FF (V)" : "Tensão FN (V)"}>
                <input type="number" min="0" value={tensao} onChange={(e) => setTensao(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <Field label="Tipo de circuito (seção mínima)">
              <select value={tipoCircuito} onChange={(e) => setTipoCircuito(e.target.value)} className={inputCls}>
                {TIPOS_CIRCUITO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — mín. {t.minSecao}mm²
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Instalação</h2>
          <div className="space-y-2">
            <Field label="Método de instalação (NBR 5410 Tab. 33)">
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={inputCls}>
                {METODOS_INSTALACAO.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Temp. ambiente (°C)">
                <select value={tempAmbiente} onChange={(e) => setTempAmbiente(e.target.value)} className={inputCls}>
                  {TEMPERATURAS.map((t) => (
                    <option key={t} value={t}>
                      {t}°C
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Circuitos agrupados">
                <input
                  type="number"
                  min="1"
                  value={circuitos}
                  onChange={(e) => setCircuitos(Math.max(1, Number(e.target.value) || 1))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Arranjo do agrupamento (Tab. 42)">
              <select value={arranjo} onChange={(e) => setArranjo(e.target.value)} className={inputCls}>
                {ARRANJOS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Queda de tensão</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Comprimento (m)">
              <input type="number" min="0" value={comprimento} onChange={(e) => setComprimento(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Queda máxima (%)">
              <input type="number" min="0.5" step="0.5" value={quedaMax} onChange={(e) => setQuedaMax(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            NBR 5410: 4% a partir da entrada; 7% a partir de transformador próprio. Comprimento 0 pula essa verificação.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Resultado</h2>

          {result.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
              {result.error}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                <div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">Seção recomendada (cobre, EPR/HEPR 90°C)</div>
                  <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
                    critério dominante: {criterioLabel[result.criterio]}
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {result.secaoFinal}mm²
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                <ResultRow label="Corrente de projeto Ib" value={`${result.corrente.toFixed(1)} A`} />
                <ResultRow label="Fator de temperatura (Tab. 40)" value={result.fct.toFixed(2).replace(".", ",")} />
                <ResultRow label="Fator de agrupamento (Tab. 42)" value={result.fca.toFixed(2).replace(".", ",")} />
                <ResultRow
                  label="Corrente corrigida Ib ÷ (FCT × FCA)"
                  value={`${result.correnteCorrigida.toFixed(1)} A`}
                />
              </div>

              <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                <ResultRow label="Seção mínima por capacidade (Tab. 37)" value={`${result.secaoCapacidade}mm²`} />
                <ResultRow
                  label="Seção mínima por queda de tensão"
                  value={result.secaoQueda ? `${result.secaoQueda}mm²` : "não verificada"}
                />
                <ResultRow
                  label="Capacidade do cabo escolhido (corrigida)"
                  value={`${result.capacidadeCorrigida.toFixed(1)} A`}
                />
                {result.quedaReal != null && (
                  <ResultRow label="Queda de tensão no cabo escolhido" value={`${result.quedaReal.toFixed(2).replace(".", ",")}%`} />
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Cálculo conforme NBR 5410 para condutores de cobre com isolação EPR/XLPE 90°C (linha HEPR
                Corfio): capacidade pela Tabela 37 corrigida pelos fatores de temperatura (Tab. 40) e
                agrupamento (Tab. 42), e queda de tensão com resistividade do cobre a 70°C. Não substitui a
                coordenação com a proteção (Ib ≤ In ≤ Iz) nem a verificação de curto-circuito — confira o
                resultado no projeto executivo.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
