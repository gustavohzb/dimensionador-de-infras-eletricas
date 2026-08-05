import { Field } from "../cabos/CircuitoForm";
import {
  INSTALACAO_CI, AMBIENTE_CE, TIPO_LINHA_CT, LINHA_CLD_CLI, BLINDAGEM_RS,
  UW_VALORES, LOCALIZACAO_CD,
} from "../../data/spdaNBR5419";
import { proximoNumero } from "../../lib/sequencialRotulos";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const TIPOS_LINHA = [
  { id: "energia", label: "Energia" },
  { id: "sinal", label: "Sinal" },
];

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

function novaLinha(existentes) {
  const n = proximoNumero(existentes.map((l) => l.id), /^l(\d+)$/);
  return {
    id: `l${n}`, tipo: "energia", ll: 1000, ci: "aereo", ce: "rural", ct: "btOuSinal",
    blindagem: "aereaNaoBlindada", rs: "naoBlindada", adjacente: null,
  };
}

// `onChange` recebe um updater, não a lista pronta: espalhar a `linhas` das
// props faz dois cliques no mesmo lote de render lerem a mesma lista, e o
// segundo desfaz o primeiro (excluir duas linhas removia só uma). O updater
// sempre enxerga o estado fresco.
export default function LinhasForm({ linhas, onChange }) {
  const alterar = (i, patch) =>
    onChange((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const alterarAdjacente = (i, patch) =>
    onChange((ls) => ls.map((l, j) => (j === i ? { ...l, adjacente: { ...l.adjacente, ...patch } } : l)));

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Linhas elétricas — {linhas.length}
        </h2>
        <button
          type="button"
          onClick={() => onChange((ls) => [...ls, novaLinha(ls)])}
          className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700"
        >
          + linha
        </button>
      </div>

      <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
        Uma entrada por linha com roteamento próprio (6.5.4). Linhas de mesmo roteamento podem ser
        reunidas na de piores características — maior N_I e menor U_W (6.5.5).
      </p>

      {linhas.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sem linhas elétricas: R_U, R_V, R_W e R_Z ficam zeradas.
        </p>
      )}

      <div className="space-y-3">
        {linhas.map((l, i) => (
          <div key={l.id} className="rounded-xs border border-slate-200 p-2.5 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                {l.id.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => onChange((ls) => ls.filter((x) => x.id !== l.id))}
                className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400"
              >
                excluir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Selecao label="Tipo" tabela={TIPOS_LINHA} value={l.tipo} onChange={(v) => alterar(i, { tipo: v })} />
              <Field
                label="Comprimento L_L (m)"
                tip="Comprimento do trecho. Desconhecido, a norma manda assumir 1 000 m (A.4.1)."
              >
                <input
                  type="number"
                  value={l.ll ?? ""}
                  onChange={(e) => alterar(i, { ll: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Selecao label="Instalação (C_I)" tabela={INSTALACAO_CI} value={l.ci} onChange={(v) => alterar(i, { ci: v })} />
              <Selecao label="Ambiente (C_E)" tabela={AMBIENTE_CE} value={l.ce} onChange={(v) => alterar(i, { ce: v })} />
              <Selecao label="Tipo de linha (C_T)" tabela={TIPO_LINHA_CT} value={l.ct} onChange={(v) => alterar(i, { ct: v })} />
              <Selecao
                label="Blindagem e equipotencialização"
                tip="Tabela B.4 — define C_LD e C_LI."
                tabela={LINHA_CLD_CLI}
                value={l.blindagem}
                onChange={(v) => alterar(i, { blindagem: v })}
              />
              <Selecao
                label="Resistência da blindagem (P_LD)"
                tip="Tabela B.8 — R_S da blindagem do cabo, combinada com o U_W do equipamento."
                tabela={BLINDAGEM_RS}
                value={l.rs}
                onChange={(v) => alterar(i, { rs: v })}
              />
            </div>

            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={!!l.adjacente}
                onChange={(e) =>
                  alterar(i, { adjacente: e.target.checked ? { L: 20, W: 20, H: 6, cd: "isolada" } : null })
                }
                className="h-3.5 w-3.5 accent-copper-600"
              />
              Há estrutura na outra extremidade da linha (entra como N_DJ)
            </label>

            {l.adjacente && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field label="L_J (m)">
                  <input type="number" value={l.adjacente.L} onChange={(e) => alterarAdjacente(i, { L: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="W_J (m)">
                  <input type="number" value={l.adjacente.W} onChange={(e) => alterarAdjacente(i, { W: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="H_J (m)">
                  <input type="number" value={l.adjacente.H} onChange={(e) => alterarAdjacente(i, { H: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Selecao label="Localização (C_DJ)" tabela={LOCALIZACAO_CD} value={l.adjacente.cd} onChange={(v) => alterarAdjacente(i, { cd: v })} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Os valores de U_W ({UW_VALORES.map((u) => String(u).replace(".", ",")).join(", ")} kV) são
        informados por sistema interno, no painel de proteções.
      </p>
    </div>
  );
}
