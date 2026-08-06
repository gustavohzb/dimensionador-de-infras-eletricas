import { useMemo } from "react";
import { Field } from "../cabos/CircuitoForm";
import { estadosNG, cidadesNG, buscarNG, totalMunicipios } from "../../data/ngMunicipios";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Seleção do N_G por estado e município, direto da Tabela F.1 do Anexo F.
//
// Não há campo para digitar o valor: a norma (A.1.3) só reconhece os números do
// próprio Anexo F, então deixar o campo aberto abriria porta para uma análise
// que ela não aceita.
export default function CampoNG({ ng, uf, municipio, onChange }) {
  const estados = useMemo(() => estadosNG(), []);
  const cidades = useMemo(() => (uf ? cidadesNG(uf) : []), [uf]);
  const vazia = totalMunicipios() === 0;

  return (
    <div className="sm:col-span-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Estado" tip="Unidade federativa do município onde a estrutura será construída.">
          <select
            value={uf ?? ""}
            onChange={(ev) => onChange({ uf: ev.target.value || null, municipio: null, ng: null })}
            disabled={vazia}
            className={`${inputCls} disabled:opacity-40`}
          >
            <option value="">Selecione…</option>
            {estados.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Município"
          tip="Ao escolher o município, o N_G correspondente da Tabela F.1 é aplicado automaticamente."
        >
          <select
            value={municipio ?? ""}
            onChange={(ev) => {
              const nome = ev.target.value || null;
              onChange({ municipio: nome, ng: nome ? buscarNG(uf, nome) : null });
            }}
            disabled={!uf || vazia}
            className={`${inputCls} disabled:opacity-40`}
          >
            <option value="">{uf ? "Selecione…" : "Escolha o estado"}</option>
            {cidades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field
          label="N_G (raios/km²/ano)"
          tip="Densidade de descargas atmosféricas para a terra, da Tabela F.1 do Anexo F da NBR 5419-2:2026. Vem preenchido pelo município escolhido — o item A.1.3 da norma não admite valores de outra fonte."
        >
          <div className="flex h-[34px] items-center rounded-xs border border-slate-200 bg-slate-50 px-2.5 font-mono text-sm tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {ng == null ? <span className="text-slate-400 dark:text-slate-500">—</span> : String(ng).replace(".", ",")}
          </div>
        </Field>
      </div>

      {vazia ? (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
          ⚠ A tabela de municípios ainda não foi carregada nesta versão do aplicativo.
        </p>
      ) : (
        !municipio && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Escolha o estado e o município para o cálculo usar o N_G da Tabela F.1.
          </p>
        )
      )}
    </div>
  );
}
