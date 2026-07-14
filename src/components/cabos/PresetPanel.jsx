import { SECOES, FATOR_TEMP_AMBIENTE } from "../../data/cabosNBR5410";
import { Field } from "./CircuitoForm";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const TEMPS = Object.keys(FATOR_TEMP_AMBIENTE).map(Number);

// Preset do quadro: parâmetros únicos que valem para todos os circuitos.
export default function PresetPanel({ value, onChange }) {
  const p = value;
  const set = (patch) => onChange({ ...p, ...patch });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Preset do quadro
        </h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          vale para todos os circuitos
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field
          label="Material"
          tip="Material dos condutores de todos os circuitos. Alumínio conduz menos (seções maiores) e a NBR 5410 só permite a partir de 16mm²."
        >
          <select value={p.material} onChange={(e) => set({ material: e.target.value })} className={inputCls}>
            <option value="cobre">Cobre</option>
            <option value="aluminio">Alumínio</option>
          </select>
        </Field>
        <Field
          label="Temp. condutor (°C)"
          tip="Temperatura ambiente/solo usada em todos os trechos de todos os circuitos. Acima da referência (30°C ar, 20°C solo) a capacidade cai — fator FCT da Tab. 40."
        >
          <select value={p.temperatura} onChange={(e) => set({ temperatura: Number(e.target.value) })} className={inputCls}>
            {TEMPS.map((t) => (
              <option key={t} value={t}>{t}°C</option>
            ))}
          </select>
        </Field>
        <Field
          label="Seção mín. NBR (mm²)"
          tip="Piso da seção: NBR 5410 Tab. 47 exige 1,5mm² para iluminação e 2,5mm² para força (cobre); alumínio no mínimo 16mm²."
        >
          <select value={p.secaoMinima} onChange={(e) => set({ secaoMinima: Number(e.target.value) })} className={inputCls}>
            {SECOES.map((s) => (
              <option key={s} value={s}>{s}mm²</option>
            ))}
          </select>
        </Field>
        <Field
          label="Seção máx. multipolar (mm²)"
          tip="Até esta seção o circuito usa cabo multipolar; acima dela, unipolar. Reflete o catálogo (não há multipolar em seções muito grandes)."
        >
          <select value={p.secaoMaxMultipolar} onChange={(e) => set({ secaoMaxMultipolar: Number(e.target.value) })} className={inputCls}>
            {SECOES.map((s) => (
              <option key={s} value={s}>{s}mm²</option>
            ))}
          </select>
        </Field>
        <Field
          label="Queda máx. regime (%)"
          tip="Limite de queda de tensão em operação normal: NBR 5410 admite 4% a partir da entrada da concessionária e 7% a partir de transformador próprio."
        >
          <input type="number" min="0.5" step="0.5" value={p.quedaMaxRegime} onChange={(e) => set({ quedaMaxRegime: e.target.value })} className={inputCls} />
        </Field>
        <Field
          label="Queda máx. partida (%)"
          tip="Limite de queda durante a partida do motor — 10% é o valor usual de projeto para não derrubar contatores nem afetar outras cargas."
        >
          <input type="number" min="1" step="0.5" value={p.quedaMaxPartida} onChange={(e) => set({ quedaMaxPartida: e.target.value })} className={inputCls} />
        </Field>
      </div>
    </div>
  );
}
