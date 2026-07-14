import { SECOES, CONDUTOR_TEMPS } from "../../data/cabosNBR5410";
import { Field } from "./CircuitoForm";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Preset do quadro: parâmetros únicos que valem para todos os circuitos.
// A temperatura ambiente/solo fica em cada trecho (não é global).
export default function PresetPanel({ value, onChange }) {
  const p = value;
  const set = (patch) => onChange({ ...p, ...patch });

  // Alumínio de baixa tensão só existe com isolação XLPE/EPR (90°C) — não há
  // cabo de alumínio isolado em PVC 70°C no mercado. Só o cobre oferece 70°C.
  const tempsCondutor =
    p.material === "aluminio" ? CONDUTOR_TEMPS.filter((t) => t.id === 90) : CONDUTOR_TEMPS;

  // Ao trocar de material, força 90°C se o 70°C ficar indisponível (alumínio).
  const setMaterial = (material) => {
    const patch = { material };
    if (material === "aluminio" && Number(p.condutorTemp) === 70) patch.condutorTemp = 90;
    set(patch);
  };

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
          <select value={p.material} onChange={(e) => setMaterial(e.target.value)} className={inputCls}>
            <option value="cobre">Cobre</option>
            <option value="aluminio">Alumínio</option>
          </select>
        </Field>
        <Field
          label="Temp. do condutor"
          tip="Isolação/temperatura do condutor. Muda a tabela de ampacidade (Tab. 37/39 para 90°C EPR/XLPE; Tab. 36/38 para 70°C PVC), os fatores de temperatura (Tab. 40) e a resistência na queda de tensão. O PVC admite ambiente até 60°C. Alumínio existe só em 90°C (XLPE/EPR)."
        >
          <select value={p.condutorTemp ?? 90} onChange={(e) => set({ condutorTemp: Number(e.target.value) })} className={inputCls}>
            {tempsCondutor.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
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
          label="F.P. (cos φ)"
          tip="Fator de potência do projeto (cos φ), usado na conversão potência → corrente e na queda de tensão. Vale para todos os circuitos."
        >
          <input type="number" min="0.1" max="1" step="0.01" value={p.fp ?? 0.92} onChange={(e) => set({ fp: e.target.value })} className={inputCls} />
        </Field>
      </div>
    </div>
  );
}
