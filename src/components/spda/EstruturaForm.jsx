import { Field } from "../cabos/CircuitoForm";
import {
  LOCALIZACAO_CD, CONSTRUCAO_RS, TIPO_ESTRUTURA_LF, PISO_RT,
  RISCO_RF, PROVIDENCIAS_RP, PERIGO_HZ, LO_POR_ESTRUTURA,
} from "../../data/spdaNBR5419";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Selecao({ label, tip, tabela, value, onChange }) {
  return (
    <Field label={label} tip={tip}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {tabela.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Numero({ label, tip, value, onChange }) {
  return (
    <Field label={label} tip={tip}>
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={inputCls}
      />
    </Field>
  );
}

export default function EstruturaForm({ value: e, onChange: set }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Estrutura
      </h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Numero label="Comprimento L (m)" value={e.L} onChange={(v) => set({ L: v })} />
        <Numero label="Largura W (m)" value={e.W} onChange={(v) => set({ W: v })} />
        <Numero label="Altura H (m)" value={e.H} onChange={(v) => set({ H: v })} />
        <Numero
          label="Saliência H_P (m)"
          tip="Altura de saliência na cobertura (torre, chaminé, casa de máquinas). Deixe vazio se não houver: com valor, adota-se a maior área entre a da estrutura e a da saliência (equações A.1 e A.2)."
          value={e.Hp}
          onChange={(v) => set({ Hp: v })}
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Numero
          label="N_G (raios/km²/ano)"
          tip="Densidade de descargas atmosféricas do município, da Tabela F.1 do Anexo F da NBR 5419-2:2026. A norma (A.1.3) não admite valores de outra fonte."
          value={e.ng}
          onChange={(v) => set({ ng: v })}
        />
        <Selecao
          label="Localização (C_D)"
          tip="Tabela A.1 — quanto mais exposta a estrutura, maior o fator."
          tabela={LOCALIZACAO_CD}
          value={e.cd}
          onChange={(v) => set({ cd: v })}
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Selecao
          label="Tipo de construção (r_S)"
          tip="Tabela C.7 — construção simples dobra a perda."
          tabela={CONSTRUCAO_RS}
          value={e.construcao}
          onChange={(v) => set({ construcao: v })}
        />
        <Selecao
          label="Tipo de estrutura (L_F)"
          tip="Tabela C.2 — define a perda típica por danos físicos."
          tabela={TIPO_ESTRUTURA_LF}
          value={e.tipoEstrutura}
          onChange={(v) => set({ tipoEstrutura: v })}
        />
        <Selecao
          label="Piso (r_t)"
          tip="Tabela C.3 — quanto mais isolante o piso, menor o risco de choque."
          tabela={PISO_RT}
          value={e.piso}
          onChange={(v) => set({ piso: v })}
        />
        <Selecao
          label="Risco de incêndio ou explosão (r_f)"
          tip="Tabela C.5 — a carga de incêndio classifica em alto, normal ou baixo."
          tabela={RISCO_RF}
          value={e.riscoIncendio}
          onChange={(v) => set({ riscoIncendio: v })}
        />
        <Selecao
          label="Providências contra incêndio (r_p)"
          tip="Tabela C.4 — havendo mais de uma, vale a de menor valor."
          tabela={PROVIDENCIAS_RP}
          value={e.providencias}
          onChange={(v) => set({ providencias: v })}
        />
        <Selecao
          label="Perigo especial (h_z)"
          tip="Tabela C.6 — pânico e dificuldade de evacuação aumentam a perda."
          tabela={PERIGO_HZ}
          value={e.perigoEspecial}
          onChange={(v) => set({ perigoEspecial: v })}
        />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Numero label="Pessoas na zona (n_z)" value={e.nz} onChange={(v) => set({ nz: v })} />
        <Numero label="Pessoas na estrutura (n_t)" value={e.nt} onChange={(v) => set({ nt: v })} />
        <Numero
          label="Horas por ano (t_z)"
          tip="Tempo de presença de pessoas na zona. O ano inteiro são 8 760 h."
          value={e.tz}
          onChange={(v) => set({ tz: v })}
        />
      </div>

      <label className="mt-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={e.explosaoOuRiscoVida}
          onChange={(ev) => set({ explosaoOuRiscoVida: ev.target.checked })}
          className="mt-0.5 h-3.5 w-3.5 accent-copper-600"
        />
        <span>
          Risco de explosão, ou a falha dos sistemas internos põe em risco imediato a vida humana ou
          o meio ambiente — <b>nota "a" da Tabela 2</b>: só assim R_C, R_M, R_W e R_Z entram em R1.
        </span>
      </label>

      {e.explosaoOuRiscoVida && (
        <div className="mt-2">
          <Selecao
            label="Perda por falha de sistemas internos (L_O)"
            tip="Tabela C.2 — só tabelada para os casos em que essas componentes entram em R1."
            tabela={LO_POR_ESTRUTURA}
            value={e.loEstrutura}
            onChange={(v) => set({ loEstrutura: v })}
          />
        </div>
      )}

      <label className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={e.patrimonioCultural}
          onChange={(ev) => set({ patrimonioCultural: ev.target.checked })}
          className="mt-0.5 h-3.5 w-3.5 accent-copper-600"
        />
        <span>A estrutura abriga patrimônio cultural — avaliar também o risco R3.</span>
      </label>

      {e.patrimonioCultural && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Numero
            label="Valor do patrimônio na zona (c_z)"
            tip="Equação C.7 — na mesma moeda de c_t."
            value={e.cz}
            onChange={(v) => set({ cz: v })}
          />
          <Numero
            label="Valor total da edificação e conteúdo (c_t)"
            value={e.ct}
            onChange={(v) => set({ ct: v })}
          />
        </div>
      )}
    </div>
  );
}
