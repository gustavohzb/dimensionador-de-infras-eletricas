import { Field } from "../cabos/CircuitoForm";
import {
  SPDA_PB, DPS_PSPD, DPS_PEB, MEDIDAS_PTA, MEDIDAS_PTU, FIACAO_KS3, UW_VALORES,
} from "../../data/spdaNBR5419";
import { proximoNumero } from "../../lib/sequencialRotulos";

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

// Medidas marcáveis: os valores se multiplicam, então cada marcação reduz mais.
function Marcaveis({ titulo, tabela, ids, onChange }) {
  const alternar = (id) =>
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  return (
    <div>
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
        {titulo}
      </span>
      <div className="space-y-1">
        {tabela.map((t) => (
          <label key={t.id} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={ids.includes(t.id)}
              onChange={() => alternar(t.id)}
              className="mt-0.5 h-3.5 w-3.5 accent-copper-600"
            />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// `onSistemas` recebe um updater pelo mesmo motivo do LinhasForm: espalhar a
// lista das props faz dois cliques no mesmo lote de render se anularem.
export default function ProtecoesForm({ value: p, linhas, onChange: set, onSistemas }) {
  const sistemas = p.sistemas ?? [];

  const alterarSistema = (id, patch) =>
    onSistemas((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const adicionarSistema = () =>
    onSistemas((ss) => [
      ...ss,
      {
        id: `s${proximoNumero(ss.map((s) => s.id), /^s(\d+)$/)}`,
        uw: 2.5, blindado: false, interfaceIsolante: false, linhaId: linhas[0]?.id ?? null,
      },
    ]);

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Medidas de proteção
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Selecao
          label="SPDA (P_B)"
          tip="Tabela B.2 — nível de proteção do SPDA projetado conforme a NBR 5419-3."
          tabela={SPDA_PB}
          value={p.spdaNp}
          onChange={(v) => set({ spdaNp: v })}
        />
        <Selecao
          label="Sistema coordenado de DPS (P_SPD)"
          tip="Tabela B.3 — DPS conforme a NBR 5419-4."
          tabela={DPS_PSPD}
          value={p.dpsNp}
          onChange={(v) => set({ dpsNp: v })}
        />
        <Selecao
          label="DPS classe I na entrada (P_EB)"
          tip="Tabela B.7 — DPS classe I para a ligação equipotencial."
          tabela={DPS_PEB}
          value={p.dpsClasseI}
          onChange={(v) => set({ dpsClasseI: v })}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Marcaveis
          titulo="Contra tensões de toque e passo na estrutura (P_TA)"
          tabela={MEDIDAS_PTA}
          ids={p.medidasPta}
          onChange={(ids) => set({ medidasPta: ids })}
        />
        <Marcaveis
          titulo="Contra tensões de toque vindas da linha (P_TU)"
          tabela={MEDIDAS_PTU}
          ids={p.medidasPtu}
          onChange={(ids) => set({ medidasPtu: ids })}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Selecao
          label="Fiação interna (K_S3)"
          tip="Tabela B.5 — quanto menores os laços da fiação, menor a tensão induzida."
          tabela={FIACAO_KS3}
          value={p.fiacao}
          onChange={(v) => set({ fiacao: v })}
        />
        <Field
          label="Largura da malha de blindagem (m)"
          tip="K_S1 = K_S2 = 0,12 × largura, limitado a 1. Deixe vazio se não houver blindagem espacial."
        >
          <input
            type="number"
            step="any"
            value={p.larguraMalha ?? ""}
            disabled={p.blindagemContinua}
            onChange={(e) => set({ larguraMalha: e.target.value === "" ? null : Number(e.target.value) })}
            className={`${inputCls} disabled:opacity-40`}
          />
        </Field>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={p.blindagemContinua}
          onChange={(e) => set({ blindagemContinua: e.target.checked })}
          className="h-3.5 w-3.5 accent-copper-600"
        />
        Blindagem metálica contínua de espessura ≥ 0,1 mm (K_S1 = K_S2 = 10⁻⁴)
      </label>

      <div className="mt-3 flex items-center justify-between">
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Sistemas internos — {sistemas.length}
        </h3>
        <button
          type="button"
          onClick={adicionarSistema}
          className="rounded-xs border border-copper-600 px-2.5 py-1 text-[11px] font-medium text-copper-600 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
        >
          + sistema
        </button>
      </div>

      <p className="mb-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        R_C e R_M compõem a probabilidade de todos os sistemas (1 − ∏(1 − P_i)). Já R_U, R_V, R_W e
        R_Z usam o pior caso da linha — o menor U_W entre os sistemas ligados a ela (6.9.1.2).
      </p>

      <div className="space-y-2">
        {sistemas.map((s) => (
          <div key={s.id} className="grid grid-cols-2 items-end gap-2 rounded-xs border border-slate-200 p-2 sm:grid-cols-5 dark:border-slate-700">
            <Field label="U_W (kV)" tip="Tensão suportável nominal de impulso do equipamento mais vulnerável.">
              <select
                value={s.uw}
                onChange={(e) => alterarSistema(s.id, { uw: Number(e.target.value) })}
                className={inputCls}
              >
                {UW_VALORES.map((u) => (
                  <option key={u} value={u}>{String(u).replace(".", ",")}</option>
                ))}
              </select>
            </Field>
            <Field label="Linha que o alimenta">
              <select
                value={s.linhaId ?? ""}
                onChange={(e) => alterarSistema(s.id, { linhaId: e.target.value || null })}
                className={inputCls}
              >
                <option value="">Nenhuma</option>
                {linhas.map((l) => (
                  <option key={l.id} value={l.id}>{l.id.toUpperCase()} — {l.tipo}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.blindado}
                onChange={(e) => alterarSistema(s.id, { blindado: e.target.checked })}
                className="h-3.5 w-3.5 accent-copper-600"
              />
              Blindado
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={s.interfaceIsolante}
                onChange={(e) => alterarSistema(s.id, { interfaceIsolante: e.target.checked })}
                className="h-3.5 w-3.5 accent-copper-600"
              />
              Interface isolante
            </label>
            <button
              type="button"
              onClick={() => onSistemas((ss) => ss.filter((x) => x.id !== s.id))}
              className="pb-2 text-left text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400"
            >
              excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
