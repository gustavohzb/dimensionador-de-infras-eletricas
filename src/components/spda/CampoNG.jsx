import { useMemo, useState } from "react";
import { Field } from "../cabos/CircuitoForm";
import { estadosDaTabela, cidadesDoEstado, buscarNG } from "../../lib/importNG";
import { carregarTabelaNG, salvarTabelaNG, removerTabelaNG } from "../../lib/tabelaNGLocal";
import ImportarNG from "./ImportarNG";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Referência estável para o caso "sem tabela": um `[]` literal seria um array
// novo a cada render e invalidaria os useMemo abaixo em toda passagem.
const SEM_LINHAS = [];

const DICA_NG =
  "Procure o município na Tabela F.1 do Anexo F da NBR 5419-2:2026. É o único dado que a norma aceita de fonte externa a ela — o item A.1.3 proíbe expressamente usar valores de outras fontes. No Brasil os valores vão de cerca de 2 no litoral do Nordeste a mais de 30 no Centro-Oeste.";

// Campo de N_G com seleção por estado e cidade quando o usuário já colou a
// Tabela F.1 no navegador; caso contrário, o campo numérico de sempre.
//
// A tabela vive fora do estado da aba (ver lib/tabelaNGLocal.js): ela é
// conteúdo da norma e pertence à máquina de quem tem a licença, não ao projeto.
export default function CampoNG({ ng, uf, municipio, onChange }) {
  const [tabela, setTabela] = useState(carregarTabelaNG);
  const [importando, setImportando] = useState(false);

  const linhas = tabela?.linhas ?? SEM_LINHAS;
  const estados = useMemo(() => estadosDaTabela(linhas), [linhas]);
  const cidades = useMemo(() => (uf ? cidadesDoEstado(linhas, uf) : []), [linhas, uf]);

  // Valor tabelado da cidade escolhida, para avisar quando o número no campo
  // tiver sido editado à mão e não bater mais com a tabela.
  const ngTabelado = uf && municipio ? buscarNG(linhas, uf, municipio) : null;
  const divergente = ngTabelado != null && Number(ng) !== ngTabelado;

  const confirmarImportacao = (novasLinhas) => {
    setTabela(salvarTabelaNG(novasLinhas));
    setImportando(false);
  };

  const descartarTabela = () => {
    if (!window.confirm("Remover a tabela de N_G deste navegador? O campo volta a ser manual.")) return;
    removerTabelaNG();
    setTabela(null);
    onChange({ uf: null, municipio: null });
  };

  if (importando) {
    return (
      <div className="sm:col-span-2">
        <ImportarNG onImportar={confirmarImportacao} onCancelar={() => setImportando(false)} />
      </div>
    );
  }

  return (
    <div className="sm:col-span-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tabela && (
          <>
            <Field label="Estado" tip="Estados presentes na tabela de N_G importada.">
              <select
                value={uf ?? ""}
                onChange={(ev) => onChange({ uf: ev.target.value || null, municipio: null })}
                className={inputCls}
              >
                <option value="">Selecione…</option>
                {estados.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Cidade"
              tip="Ao escolher a cidade, o N_G da Tabela F.1 é preenchido automaticamente."
            >
              <select
                value={municipio ?? ""}
                onChange={(ev) => {
                  const nome = ev.target.value || null;
                  onChange({ municipio: nome, ng: nome ? buscarNG(linhas, uf, nome) : ng });
                }}
                disabled={!uf}
                className={`${inputCls} disabled:opacity-40`}
              >
                <option value="">{uf ? "Selecione…" : "Escolha o estado"}</option>
                {cidades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        <div className={tabela ? "" : "sm:col-span-3"}>
          <Field label="N_G (raios/km²/ano)" tip={DICA_NG}>
            <input
              type="number"
              step="any"
              value={ng ?? ""}
              onChange={(ev) => onChange({ ng: ev.target.value === "" ? null : Number(ev.target.value) })}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {tabela ? (
          <>
            <span className="text-slate-500 dark:text-slate-400">
              Tabela local com{" "}
              <b className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                {linhas.length.toLocaleString("pt-BR")}
              </b>{" "}
              municípios.
            </span>
            <button
              type="button"
              onClick={() => setImportando(true)}
              className="text-copper-700 underline decoration-dotted underline-offset-2 hover:text-copper-800 dark:text-copper-400"
            >
              Substituir
            </button>
            <button
              type="button"
              onClick={descartarTabela}
              className="text-slate-500 underline decoration-dotted underline-offset-2 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-500 dark:text-slate-400">
              Consulte o valor na Tabela F.1 do Anexo F da norma.
            </span>
            <button
              type="button"
              onClick={() => setImportando(true)}
              className="text-copper-700 underline decoration-dotted underline-offset-2 hover:text-copper-800 dark:text-copper-400"
            >
              Importar a tabela para escolher por cidade
            </button>
          </>
        )}
      </div>

      {divergente && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
          ⚠ O valor digitado difere do tabelado para {municipio}/{uf}, que é{" "}
          <b className="font-mono">{String(ngTabelado).replace(".", ",")}</b>.
        </p>
      )}
    </div>
  );
}
