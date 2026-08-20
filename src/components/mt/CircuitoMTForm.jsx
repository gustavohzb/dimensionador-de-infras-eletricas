import { TEMPO_MAX_CURTO } from "../../data/cabosNBR14039";
import { defaultTrechoMT } from "../../lib/mtModelo";
import { Field } from "../cabos/CircuitoForm";
import TrechoMTForm from "./TrechoMTForm";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function CircuitoMTForm({ value, onChange }) {
  const c = value;
  const set = (patch) => onChange({ ...c, ...patch });

  const setTrecho = (i, t) => {
    const trechos = c.trechos.slice();
    trechos[i] = t;
    set({ trechos });
  };

  return (
    <div className="space-y-3 rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="TAG">
          <input value={c.tag} onChange={(e) => set({ tag: e.target.value })} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="Descrição">
            <input value={c.descricao} onChange={(e) => set({ descricao: e.target.value })} className={inputCls} placeholder="ramal de entrada, alimentador da SE-02…" />
          </Field>
        </div>
        <Field label="Formação" tip="Três unipolares em trifólio ou um cabo tripolar. Decide a tabela de agrupamento do método A1 (34 ou 35) e a designação do cabo.">
          <select value={c.formacao} onChange={(e) => set({ formacao: e.target.value, trechos: c.trechos.map((t) => ({ ...t, arranjo: null })) })} className={inputCls}>
            <option value="unipolar">Unipolares em trifólio</option>
            <option value="tripolar">Tripolar</option>
          </select>
        </Field>

        <Field label="Carga" tip="A corrente de projeto sai da potência do transformador ou é digitada direto, quando já vem do estudo de carga.">
          <select value={c.modo} onChange={(e) => set({ modo: e.target.value })} className={inputCls}>
            <option value="potencia">Potência (kVA)</option>
            <option value="corrente">Corrente (A)</option>
          </select>
        </Field>
        {c.modo === "potencia" ? (
          <Field label="Potência (kVA)">
            <input type="number" min="1" step="1" value={c.potenciaKVA} onChange={(e) => set({ potenciaKVA: e.target.value })} className={inputCls} />
          </Field>
        ) : (
          <Field label="Corrente (A)">
            <input type="number" min="1" step="1" value={c.corrente} onChange={(e) => set({ corrente: e.target.value })} className={inputCls} />
          </Field>
        )}
        <Field label="Tensão (kV)" tip="Tensão de linha de operação. Não confundir com a classe de tensão do cabo, que fica no preset e não entra no cálculo.">
          <input type="number" min="1" step="0.1" value={c.tensao} onChange={(e) => set({ tensao: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Espaçamento entre cabos (mm)" tip="Distância entre eixos. Em branco = trifólio encostado, e aí a distância é o próprio diâmetro externo do cabo. Afastar os cabos aumenta a reatância.">
          <input type="number" min="0" step="10" value={c.espacamentoCabos ?? ""} placeholder="trifólio" onChange={(e) => set({ espacamentoCabos: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>

      <div>
        <h3 className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Curto-circuito e blindagem
        </h3>
        <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
          Por circuito, não no preset: cada alimentador tem seu cubículo, seu relé e seu ponto de falta.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Icc trifásico (kA)" tip="No ponto deste circuito, dado da concessionária ou do estudo de curto-circuito.">
            <input type="number" min="0.1" step="0.1" value={c.iccTrifasico} onChange={(e) => set({ iccTrifasico: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Tempo de atuação (s)" tip={`Tempo de eliminação do defeito pela proteção deste circuito. A norma limita o cálculo a ${TEMPO_MAX_CURTO} s.`}>
            <input type="number" min="0.05" max={TEMPO_MAX_CURTO} step="0.05" value={c.tempoCurto} onChange={(e) => set({ tempoCurto: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Blindagem (mm²)" tip="O padrão do catálogo é 6 mm² em qualquer seção de condutor. Blindagem maior existe sob consulta — e é o que resolve quando a falta fase-terra é alta, porque engrossar o condutor não ajuda.">
            <input type="number" min="1" step="1" value={c.blindagemEspecificada} onChange={(e) => set({ blindagemEspecificada: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Aterramento da blindagem" tip="Não afeta a ampacidade: a norma declara em 6.2.5 que os valores tabelados valem para um ponto, dois ou mais, ou cross-bonding. Entra no memorial e na especificação.">
            <select value={c.aterramentoBlindagem} onChange={(e) => set({ aterramentoBlindagem: e.target.value })} className={inputCls}>
              <option value="umPonto">Em um ponto</option>
              <option value="doisPontos">Em dois ou mais pontos</option>
              <option value="crossBonding">Cross-bonding</option>
            </select>
          </Field>
          <div className="col-span-2 sm:col-span-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={!!c.conexaoSoldada} onChange={(e) => set({ conexaoSoldada: e.target.checked })} className="accent-copper-600" />
              conexões soldadas (limita a temperatura final a 160 °C — Tabela 43)
            </label>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Trechos
          </h3>
          <button
            type="button"
            onClick={() => set({ trechos: [...c.trechos, defaultTrechoMT()] })}
            className="rounded-xs border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            + trecho
          </button>
        </div>
        <div className="space-y-2">
          {c.trechos.map((t, i) => (
            <TrechoMTForm
              key={i}
              trecho={t}
              formacao={c.formacao}
              indice={i}
              total={c.trechos.length}
              onChange={(novo) => setTrecho(i, novo)}
              onRemover={() => set({ trechos: c.trechos.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
