import {
  AGRUPAMENTO_T34,
  AGRUPAMENTO_T35,
  AGRUPAMENTO_T36,
  AGRUPAMENTO_T37,
  AGRUPAMENTO_T38,
  AGRUPAMENTO_T39,
  AGRUPAMENTO_T40,
  AGRUPAMENTO_T41,
  BANCOS_T39,
  BANCO_DUTOS_T37,
  ESPACAMENTOS_MM,
  ESPACAMENTOS_T36,
  METODOS_COM_CORRECAO_SOLO,
  METODOS_MT,
  METODOS_REFERENCIA_AMBIGUA,
  METODOS_SEM_AGRUPAMENTO,
  PROFUNDIDADES,
  RESISTIVIDADES_SOLO,
} from "../../data/cabosNBR14039";
import { CAMPOS_AGRUPAMENTO } from "../../lib/mtModelo";
import { Field } from "../cabos/CircuitoForm";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// A Tabela 30 (não enterradas) e a 31 (enterradas) vão de 10 a 80 °C de 5 em 5.
// A lista é fechada de propósito: o motor recusa temperatura fora dela em vez
// de interpolar, então oferecer um campo livre só produziria erro.
const TEMPERATURAS = Array.from({ length: 15 }, (_, i) => 10 + i * 5);

const DUTOS_POR_METODO = {
  F1: Object.keys(AGRUPAMENTO_T36.porDutos).map(Number),
  F2: Object.keys(AGRUPAMENTO_T37.porDutosOcupados).map(Number),
  G1: Object.keys(AGRUPAMENTO_T38.porDutos).map(Number),
  G2: Object.keys(AGRUPAMENTO_T39.porDutos).map(Number),
};

const ESPACAMENTOS_POR_METODO = { F1: ESPACAMENTOS_T36, G1: ESPACAMENTOS_MM };

const rotuloEspacamento = (e) => (e === "encostados" ? "Encostados" : `${e} mm entre centros`);

export default function TrechoMTForm({ trecho, formacao, indice, total, onChange, onRemover }) {
  const t = trecho;
  const set = (patch) => onChange({ ...t, ...patch });
  const metodo = METODOS_MT.find((m) => m.id === t.metodo);
  const campos = CAMPOS_AGRUPAMENTO[t.metodo] ?? [];
  const semAgrupamento = METODOS_SEM_AGRUPAMENTO.includes(t.metodo);
  const temSolo = METODOS_COM_CORRECAO_SOLO.includes(t.metodo);
  const referenciaAmbigua = METODOS_REFERENCIA_AMBIGUA.includes(t.metodo);
  const arranjos = (formacao === "tripolar" ? AGRUPAMENTO_T35 : AGRUPAMENTO_T34).arranjos;

  return (
    <div className="rounded-xs border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Trecho {indice + 1}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemover} className="text-[11px] text-red-600 hover:underline dark:text-red-400">
            remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3">
          <Field label="Método de instalação" tip="Maneira de instalar da Tabela 25. Escolhe a coluna de ampacidade das Tabelas 28/29, se há correção de solo e qual tabela de agrupamento vale.">
            <select value={t.metodo} onChange={(e) => set({ metodo: e.target.value, referenciaTemp: null })} className={inputCls}>
              {METODOS_MT.map((m) => (
                <option key={m.id} value={m.id}>{m.id} — {m.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Temperatura (°C)" tip={metodo?.enterrado ? "Temperatura do solo. Referência de 20 °C (Tabela 31)." : "Temperatura ambiente. Referência de 30 °C (Tabela 30)."}>
          <select value={t.temperatura} onChange={(e) => set({ temperatura: Number(e.target.value) })} className={inputCls}>
            {TEMPERATURAS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>

        <Field label="Distância (m)" tip="Comprimento deste trecho. A soma dos trechos entra na queda de tensão; a capacidade é decidida pelo pior trecho isolado.">
          <input type="number" min="0" step="1" value={t.distancia} onChange={(e) => set({ distancia: e.target.value })} className={inputCls} />
        </Field>

        <Field label="Agrupamento" tip="Marque quando houver outros circuitos ou dutos junto. Circuito isolado tem fator 1,00 — a norma só tabela grupos.">
          <label className="flex h-[34px] items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={!!t.agrupado} onChange={(e) => set({ agrupado: e.target.checked })} className="accent-copper-600" />
            agrupado
          </label>
        </Field>
      </div>

      {/* Decisão que a norma deixou em aberto. Aparece só em C e D, e o cálculo
          fica travado até ela ser tomada — de propósito. */}
      {referenciaAmbigua && (
        <div className="mt-2 rounded-xs border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">
            Canaleta fechada no solo: a norma não decide a referência de temperatura
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            A NBR 14039 não classifica os métodos C e D como enterrados nem como "demais maneiras
            de instalar". A 30 °C a Tabela 30 dá fator 1,00 e a Tabela 31 dá 0,93 — 7 % de
            ampacidade, portanto uma seção de diferença. Acima de ~38 °C o sinal se inverte.
            A escolha é sua e sai no memorial.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {[
              { id: "aoAr", label: "Tabela 30 — referência 30 °C, coluna exposto ao sol" },
              { id: "enterrado", label: "Tabela 31 — referência 20 °C, linhas subterrâneas" },
            ].map((o) => (
              <label key={o.id} className="flex items-center gap-1.5 text-[12px] text-amber-900 dark:text-amber-200">
                <input
                  type="radio"
                  name={`ref-${indice}`}
                  checked={t.referenciaTemp === o.id}
                  onChange={() => set({ referenciaTemp: o.id })}
                  className="accent-amber-600"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Campos de agrupamento: só os que a tabela daquele método consome. */}
      {t.agrupado && semAgrupamento && (
        <p className="mt-2 rounded-xs bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          O método {t.metodo} não tem tabela de agrupamento na NBR 14039. Com mais de um circuito,
          o fator precisa ser calculado pela IEC 60287-2-2.
        </p>
      )}

      {t.agrupado && campos.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {campos.includes("arranjo") && (
            <div className="col-span-2 sm:col-span-3">
              <Field label={`Arranjo (Tabela ${formacao === "tripolar" ? 35 : 34})`} tip="Arranjos normalizados da IEC 60287-2-2. Outras formas de agrupamento não têm fator tabelado e exigem cálculo.">
                <select value={t.arranjo ?? ""} onChange={(e) => set({ arranjo: e.target.value || null })} className={inputCls}>
                  <option value="">selecione…</option>
                  {arranjos.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {campos.includes("espacamentoRelativo") && (
            <Field label="Espaçamento e/Dₑ" tip="Distância entre grupos em múltiplos do diâmetro externo do cabo. O afastamento mínimo de qualquer superfície é 0,5·Dₑ.">
              <input type="number" min="0" step="0.25" value={t.espacamentoRelativo ?? ""} onChange={(e) => set({ espacamentoRelativo: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
            </Field>
          )}

          {campos.includes("dutos") && (
            <Field label={t.metodo === "F2" || t.metodo === "G2" ? "Dutos ocupados" : "Número de dutos"} tip="Contagem tabelada pela norma. Fora dessas quantidades não há fator, e o motor recusa em vez de interpolar.">
              <select value={t.dutos ?? ""} onChange={(e) => set({ dutos: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls}>
                <option value="">selecione…</option>
                {(DUTOS_POR_METODO[t.metodo] ?? []).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
          )}

          {campos.includes("espacamento") && (
            <Field label="Espaçamento entre dutos" tip="Distância entre os centros dos eletrodutos. Atenção: na Tabela 38 mais espaçamento nem sempre ajuda — nas seções grandes o fator piora.">
              <select value={t.espacamento ?? ""} onChange={(e) => { const v = e.target.value; set({ espacamento: v === "" ? null : (v === "encostados" ? v : Number(v)) }); }} className={inputCls}>
                <option value="">selecione…</option>
                {(ESPACAMENTOS_POR_METODO[t.metodo] ?? []).map((e2) => (
                  <option key={e2} value={e2}>{rotuloEspacamento(e2)}</option>
                ))}
              </select>
            </Field>
          )}

          {campos.includes("condutoresIsolados") && (
            <Field label="Condutores isolados" tip="Tabela 40: cabos diretamente enterrados e encostados. Não depende da seção nem do espaçamento.">
              <select value={t.condutoresIsolados ?? ""} onChange={(e) => set({ condutoresIsolados: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls}>
                <option value="">selecione…</option>
                {Object.keys(AGRUPAMENTO_T40.porCondutoresIsolados).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
          )}

          {campos.includes("regime") && (
            <Field label="Espaçamento" tip="Tabela 41. Em 2·Dₑ o fator vale para qualquer seção; em 200 mm entre centros ele passa a depender da seção.">
              <select value={t.regime ?? ""} onChange={(e) => set({ regime: e.target.value || null })} className={inputCls}>
                <option value="">selecione…</option>
                <option value="doisDe">2·Dₑ entre centros</option>
                <option value="mm200">200 mm entre centros</option>
              </select>
            </Field>
          )}

          {campos.includes("cabos") && (
            <Field label="Número de cabos" tip="Cabos unipolares espaçados diretamente enterrados (Tabela 41).">
              <select value={t.cabos ?? ""} onChange={(e) => set({ cabos: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls}>
                <option value="">selecione…</option>
                {AGRUPAMENTO_T41.numerosDeCabos.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Limites que a norma declara e que a tela mostra em vez de esconder. */}
          {t.metodo === "F2" && (
            <p className="col-span-2 text-[11px] text-slate-500 sm:col-span-3 dark:text-slate-400">
              Banco de dutos fixo da Tabela 37: {BANCO_DUTOS_T37.largura} × {BANCO_DUTOS_T37.altura} mm,
              topo a {BANCO_DUTOS_T37.profundidade} mm, dutos a {BANCO_DUTOS_T37.espacamento} mm entre centros.
              Dimensões diferentes afetam fortemente o fator.
            </p>
          )}
          {t.metodo === "G2" && t.dutos && BANCOS_T39[t.dutos] && (
            <p className="col-span-2 text-[11px] text-slate-500 sm:col-span-3 dark:text-slate-400">
              Banco da Tabela 39 para {t.dutos} dutos: {BANCOS_T39[t.dutos].largura} × {BANCOS_T39[t.dutos].altura} mm,
              topo a {AGRUPAMENTO_T39.profundidade} mm, dutos a {AGRUPAMENTO_T39.espacamento} mm entre centros.
            </p>
          )}
        </div>
      )}

      {/* Correção de solo: só nos seis métodos a que as Tabelas 32 e 33 se
          aplicam. Nos demais os campos nem aparecem, porque não seriam usados. */}
      {temSolo && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Resistividade do solo (K·m/W)" tip="Tabela 32. A referência é 2,5 K·m/W (fator 1,00). A norma avisa que estes fatores podem dar até 11 % menos capacidade que o cálculo pela IEC 60287.">
            <select value={t.resistividadeSolo} onChange={(e) => set({ resistividadeSolo: Number(e.target.value) })} className={inputCls}>
              {RESISTIVIDADES_SOLO.map((r) => (
                <option key={r} value={r}>{String(r).replace(".", ",")}</option>
              ))}
            </select>
          </Field>
          <Field label="Profundidade (m)" tip="Tabela 33. A referência é 0,9 m (fator 1,00).">
            <select value={t.profundidade} onChange={(e) => set({ profundidade: Number(e.target.value) })} className={inputCls}>
              {PROFUNDIDADES.map((p) => (
                <option key={p} value={p}>{String(p).replace(".", ",")}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}
