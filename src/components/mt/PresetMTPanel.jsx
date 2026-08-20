import { ISOLACOES_MT, TEMP_FINAL_BLINDAGEM } from "../../data/cabosNBR14039";
import { CLASSES_TENSAO_MT } from "../../data/cabosPrysmianMT";
import { ATERRAMENTOS_NEUTRO } from "../../lib/mtSizing";
import { Field } from "../cabos/CircuitoForm";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Classes de tensão da NBR 14039. Só as que têm geometria transcrita do
// catálogo permitem calcular a reatância; nas outras o campo de reserva do
// preset entra, e o motor marca o valor como premissa no memorial.
const CLASSES = ["3,6/6 kV", "6/10 kV", "8,7/15 kV", "12/20 kV", "15/25 kV", "20/35 kV"];
const COM_CATALOGO = new Set(CLASSES_TENSAO_MT.map((c) => c.id));

// Coberturas da Tabela 44, com a temperatura final da blindagem que cada uma
// permite — é ela, e não o material da blindagem, que limita o curto.
const COBERTURAS = Object.entries(TEMP_FINAL_BLINDAGEM)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([id, temp]) => ({ id, label: `${id} — ${temp} °C` }));

export default function PresetMTPanel({ value, onChange }) {
  const p = value;
  const set = (patch) => onChange({ ...p, ...patch });
  const aterramento = ATERRAMENTOS_NEUTRO.find((a) => a.id === p.aterramentoNeutro);
  const semCatalogo = !COM_CATALOGO.has(p.classeTensao) || p.material !== "cobre";

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Preset do projeto
        </h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          vale para todos os circuitos
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Material" tip="Material do condutor. O catálogo transcrito só tem cobre; em alumínio a reatância cai no valor de reserva.">
          <select value={p.material} onChange={(e) => set({ material: e.target.value })} className={inputCls}>
            <option value="cobre">Cobre</option>
            <option value="aluminio">Alumínio</option>
          </select>
        </Field>

        <Field label="Isolação" tip="Temperatura máxima do condutor em regime (Tabela 27). Escolhe a tabela de ampacidade: 28 para 90 °C, 29 para EPR 105.">
          <select value={p.isolacao} onChange={(e) => set({ isolacao: Number(e.target.value) })} className={inputCls}>
            {ISOLACOES_MT.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Classe de tensão" tip="Entra só na designação do cabo. A NBR 14039 declara em 6.2.5 que a ampacidade tabelada vale para todas as classes — ela não muda nenhuma conta.">
          <select value={p.classeTensao} onChange={(e) => set({ classeTensao: e.target.value })} className={inputCls}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{COM_CATALOGO.has(c) ? c : `${c} (sem catálogo)`}</option>
            ))}
          </select>
        </Field>

        <Field label="Cobertura" tip="Material da cobertura do cabo (Tabela 44). É ele que define a temperatura final admitida na blindagem durante o curto — não o material da blindagem.">
          <select value={p.cobertura} onChange={(e) => set({ cobertura: e.target.value })} className={inputCls}>
            {COBERTURAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Queda máx. regime (%)" tip="CONVENÇÃO DO PROJETISTA: a NBR 14039 não fixa limite de queda de tensão como a NBR 5410 fixa 4 %. O valor adotado sai identificado no memorial.">
          <input type="number" min="0.5" step="0.5" value={p.quedaMaxRegime} onChange={(e) => set({ quedaMaxRegime: e.target.value })} className={inputCls} />
        </Field>

        <Field label="F.P. (cos φ)" tip="Fator de potência do projeto, usado na conversão kVA → corrente e na queda de tensão.">
          <input type="number" min="0.1" max="1" step="0.01" value={p.fp} onChange={(e) => set({ fp: e.target.value })} className={inputCls} />
        </Field>

        <Field label="Aterramento do neutro" tip="Define a corrente de falta fase-terra que a blindagem tem de suportar. No neutro solidamente aterrado o app adota o Icc trifásico, e declara isso como premissa.">
          <select value={p.aterramentoNeutro} onChange={(e) => set({ aterramentoNeutro: e.target.value })} className={inputCls}>
            {ATERRAMENTOS_NEUTRO.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </Field>

        {aterramento?.pedeCorrente && (
          <Field
            label="Corrente de falta (A)"
            tip={p.aterramentoNeutro === "resistor"
              ? "Corrente limitada pelo resistor de aterramento, do projeto da subestação."
              : "Corrente capacitiva de falta à terra do sistema isolado."}
          >
            <input type="number" min="1" step="1" value={p.correnteFalta} onChange={(e) => set({ correnteFalta: e.target.value })} className={inputCls} />
          </Field>
        )}

        {semCatalogo && (
          <Field label="Reatância de reserva (Ω/km)" tip="Só é usada porque este cabo não está no catálogo transcrito. Quando está, a reatância sai da geometria dele pela IEC 60287-1-1 e este campo é ignorado.">
            <input type="number" min="0.01" step="0.01" value={p.reatancia} onChange={(e) => set({ reatancia: e.target.value })} className={inputCls} />
          </Field>
        )}
      </div>

      {semCatalogo && (
        <p className="mt-2 rounded-xs bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Sem geometria de catálogo para esta combinação: a reatância passa a ser a informada acima, e o memorial a declara como premissa.
        </p>
      )}
    </div>
  );
}
