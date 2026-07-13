import {
  CONDUTOS, DISTRIBUICOES, ESQUEMAS, FORMAS_PARTIDA,
  FATOR_TEMP_AMBIENTE, FATOR_TEMP_SOLO, SECOES,
} from "../../data/cabosNBR5410";
import { correnteDeProjeto, dimensionarCircuitoPro, designacaoCabos, UNIDADES_POTENCIA } from "../../lib/cableSizingPro";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const labelCls = "mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400";

// Tooltip nativo (atributo title): funciona em desktop no hover; em mobile o
// ⓘ segura o texto no toque longo na maioria dos navegadores.
export function Field({ label, tip, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {tip && (
          <span
            title={tip}
            className="ml-1 inline-block cursor-help select-none rounded-full text-[10px] text-slate-400 dark:text-slate-500"
            aria-label={tip}
          >
            ⓘ
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export const defaultTrecho = () => ({
  condutoId: "eletrocalha",
  distribuicao: null,
  camadas: 1,
  circuitos: 1,
  temperatura: 30,
  distancia: 30,
});

export const defaultCircuito = () => ({
  tag: "AL-01",
  descricao: "",
  modo: "corrente", // "corrente" | "potencia"
  corrente: 40,
  potencia: 10,
  unidade: "CV",
  fp: 0.92,
  rendimento: 0.92,
  fatorServico: 1,
  esquemaId: "trifCnCt",
  tensao: 380,
  formaPartidaId: "nenhuma",
  material: "cobre",
  tipoCabo: "unipolar",
  porFase: 1,
  secaoMinima: 2.5,
  quedaMaxRegime: 4,
  quedaMaxPartida: 10,
  trechos: [defaultTrecho()],
});

export function computeCircuito(c) {
  const ib = correnteDeProjeto(c);
  if (ib.error) return { error: ib.error };
  return dimensionarCircuitoPro({
    corrente: ib.corrente,
    esquemaId: c.esquemaId,
    tensao: Number(c.tensao),
    fp: Number(c.fp),
    material: c.material,
    tipoCabo: c.tipoCabo,
    porFase: Number(c.porFase),
    formaPartidaId: c.formaPartidaId,
    quedaMaxRegime: Number(c.quedaMaxRegime),
    quedaMaxPartida: Number(c.quedaMaxPartida),
    secaoMinima: Number(c.secaoMinima),
    trechos: c.trechos,
  });
}

function TrechoEditor({ trecho, index, onChange, onRemove, removable, tipoCabo }) {
  const conduto = CONDUTOS.find((x) => x.id === trecho.condutoId);
  const temps = Object.keys(conduto?.subterraneo ? FATOR_TEMP_SOLO : FATOR_TEMP_AMBIENTE).map(Number);
  const mostraDistribuicao =
    conduto?.agrupamento === "dutos" ||
    (tipoCabo === "unipolar" && (conduto?.id === "leito" || conduto?.id === "perfilado"));
  const opcoesDistribuicao =
    conduto?.agrupamento === "dutos" ? DISTRIBUICOES.dutos : DISTRIBUICOES.camadaUnica;
  const mostraCamadas =
    (conduto?.id === "leito" || conduto?.id === "perfilado") && conduto?.agrupamento !== "dutos";

  const set = (patch) => onChange({ ...trecho, ...patch });

  return (
    <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Trecho {String(index + 1).padStart(2, "0")}
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400"
          >
            remover
          </button>
        )}
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Conduto"
            tip="Onde o cabo passa neste trecho. Define o método de referência da NBR 5410 (B1/B2 eletroduto e calha fechada, E/F leito e perfilado, D subterrâneo) e a tabela de agrupamento."
          >
            <select
              value={trecho.condutoId}
              onChange={(e) => {
                const novo = CONDUTOS.find((x) => x.id === e.target.value);
                set({
                  condutoId: e.target.value,
                  distribuicao: novo?.agrupamento === "dutos" ? "variosPorDuto" : null,
                  temperatura: novo?.subterraneo ? 20 : 30,
                });
              }}
              className={inputCls}
            >
              {CONDUTOS.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Distância (m)">
            <input type="number" min="0" value={trecho.distancia} onChange={(e) => set({ distancia: e.target.value })} className={inputCls} />
          </Field>
        </div>
        {mostraDistribuicao && (
          <Field
            label="Distribuição dos condutores"
            tip="Arranjo físico dos cabos: trifólio (3 cabos encostados em triângulo) dissipa melhor que justapostos em linha; espaçados ≥ 2× o diâmetro dissipam ainda mais. Nos dutos subterrâneos define o fator de agrupamento."
          >
            <select
              value={trecho.distribuicao ?? opcoesDistribuicao[0].id}
              onChange={(e) => set({ distribuicao: e.target.value })}
              className={inputCls}
            >
              {opcoesDistribuicao.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Field
            label="Circuitos agrup."
            tip="Total de circuitos que dividem este conduto (incluindo este). Mais circuitos juntos = menos dissipação de calor = fator de agrupamento (FCA) menor — Tab. 42/45."
          >
            <input type="number" min="1" value={trecho.circuitos} onChange={(e) => set({ circuitos: e.target.value })} className={inputCls} />
          </Field>
          {mostraCamadas ? (
            <Field label="Camadas" tip="Cabos empilhados em mais de uma camada dissipam pior — o fator de agrupamento cai bastante da 1ª para a 2ª camada.">
              <select value={trecho.camadas} onChange={(e) => set({ camadas: Number(e.target.value) })} className={inputCls}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3+</option>
              </select>
            </Field>
          ) : (
            <div />
          )}
          <Field
            label={conduto?.subterraneo ? "Temp. solo (°C)" : "Temp. amb. (°C)"}
            tip="Temperatura no entorno do cabo neste trecho. Acima da referência (30°C no ar, 20°C no solo) a capacidade cai — fator FCT da Tab. 40."
          >
            <select value={trecho.temperatura} onChange={(e) => set({ temperatura: Number(e.target.value) })} className={inputCls}>
              {temps.map((t) => (
                <option key={t} value={t}>{t}°C</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

export function CircuitoForm({ value, onChange, showIdentificacao = true }) {
  const c = value;
  const set = (patch) => onChange({ ...c, ...patch });
  const setTrecho = (i, t) => {
    const trechos = c.trechos.slice();
    trechos[i] = t;
    set({ trechos });
  };
  const esquema = ESQUEMAS.find((e) => e.id === c.esquemaId);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Carga</h2>
        <div className="space-y-2">
          {showIdentificacao && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <Field label="TAG">
                <input value={c.tag} onChange={(e) => set({ tag: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Descrição">
                <input value={c.descricao} onChange={(e) => set({ descricao: e.target.value })} className={inputCls} placeholder="ex.: Bomba d'água 01" />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "corrente", label: "Por corrente" },
              { id: "potencia", label: "Por potência" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set({ modo: m.id })}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  c.modo === m.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {c.modo === "corrente" ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Corrente Ib (A)">
                <input type="number" min="0" value={c.corrente} onChange={(e) => set({ corrente: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Fator de serviço">
                <input type="number" min="1" step="0.05" value={c.fatorServico} onChange={(e) => set({ fatorServico: e.target.value })} className={inputCls} />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <Field label="Potência">
                  <input type="number" min="0" value={c.potencia} onChange={(e) => set({ potencia: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Unidade">
                  <select value={c.unidade} onChange={(e) => set({ unidade: e.target.value })} className={inputCls}>
                    {UNIDADES_POTENCIA.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="F.P." tip="Fator de potência da carga (cos φ). Usado na conversão potência → corrente e na queda de tensão.">
                  <input type="number" min="0.1" max="1" step="0.01" value={c.fp} onChange={(e) => set({ fp: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Rendimento" tip="Rendimento do motor (η). A corrente é calculada pela potência no eixo dividida pelo rendimento — só relevante para CV/kW de motores.">
                  <input type="number" min="0.1" max="1" step="0.01" value={c.rendimento} onChange={(e) => set({ rendimento: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Fator serviço" tip="Multiplicador da corrente nominal (reserva térmica do motor, ex.: 1,15). Deixe 1 se não se aplica.">
                  <input type="number" min="1" step="0.05" value={c.fatorServico} onChange={(e) => set({ fatorServico: e.target.value })} className={inputCls} />
                </Field>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Condutores carregados"
              tip="Quantos condutores transportam corrente (fases e neutro). Define a coluna da tabela de ampacidade (2 ou 3 carregados) e se o circuito leva neutro e condutor de proteção. Harmônicas >15%: neutro conta como carregado (fator 0,86)."
            >
              <select value={c.esquemaId} onChange={(e) => set({ esquemaId: e.target.value })} className={inputCls}>
                {ESQUEMAS.map((e2) => (
                  <option key={e2.id} value={e2.id}>{e2.label}</option>
                ))}
              </select>
            </Field>
            <Field label={esquema?.kQueda === 2 ? "Tensão (V)" : "Tensão de linha (V)"}>
              <input type="number" min="0" value={c.tensao} onChange={(e) => set({ tensao: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field
            label="Forma de partida (motores)"
            tip="Motores puxam corrente muito maior na partida (Ip = fator × In). A queda de tensão na partida é verificada com essa corrente contra o limite '% na partida'."
          >
            <select value={c.formaPartidaId} onChange={(e) => set({ formaPartidaId: e.target.value })} className={inputCls}>
              {FORMAS_PARTIDA.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}{f.fator > 1 ? ` — Ip ≈ ${f.fator}×In` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Condutor</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Material"
              tip="Alumínio é mais barato porém conduz menos (seções maiores) e a NBR 5410 só permite a partir de 16mm²."
            >
              <select value={c.material} onChange={(e) => set({ material: e.target.value })} className={inputCls}>
                <option value="cobre">Cobre</option>
                <option value="aluminio">Alumínio</option>
              </select>
            </Field>
            <Field
              label="Tipo de cabo"
              tip="Unipolar: um condutor por cabo (ex.: 3 cabos separados). Multipolar: todas as veias num só cabo. Muda o método de referência da NBR 5410 e a ampacidade."
            >
              <select value={c.tipoCabo} onChange={(e) => set({ tipoCabo: e.target.value })} className={inputCls}>
                <option value="unipolar">Unipolar</option>
                <option value="multipolar">Multipolar</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Condutores por fase"
              tip="Cabos em paralelo por fase — a corrente se divide entre eles. Usado quando um cabo só não dá conta ou para facilitar a instalação."
            >
              <input type="number" min="1" max="6" value={c.porFase} onChange={(e) => set({ porFase: e.target.value })} className={inputCls} />
            </Field>
            <Field
              label="Seção mínima (mm²)"
              tip="Piso da seção: NBR 5410 Tab. 47 exige 1,5mm² para iluminação e 2,5mm² para força (cobre); alumínio no mínimo 16mm²."
            >
              <select value={c.secaoMinima} onChange={(e) => set({ secaoMinima: Number(e.target.value) })} className={inputCls}>
                {SECOES.map((s) => (
                  <option key={s} value={s}>{s}mm²</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Trechos da instalação
          </h2>
          {c.trechos.length < 4 && (
            <button
              type="button"
              onClick={() => set({ trechos: [...c.trechos, defaultTrecho()] })}
              className="rounded-lg border border-blue-600 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              + trecho
            </button>
          )}
        </div>
        <div className="space-y-2">
          {c.trechos.map((t, i) => (
            <TrechoEditor
              key={i}
              trecho={t}
              index={i}
              tipoCabo={c.tipoCabo}
              removable={c.trechos.length > 1}
              onChange={(nt) => setTrecho(i, nt)}
              onRemove={() => set({ trechos: c.trechos.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Queda de tensão</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Máx. em regime (%)"
            tip="Limite de queda de tensão em operação normal: NBR 5410 admite 4% a partir da entrada da concessionária e 7% a partir de transformador próprio."
          >
            <input type="number" min="0.5" step="0.5" value={c.quedaMaxRegime} onChange={(e) => set({ quedaMaxRegime: e.target.value })} className={inputCls} />
          </Field>
          <Field
            label="Máx. na partida (%)"
            tip="Limite de queda durante a partida do motor — 10% é o valor usual de projeto para não derrubar contatores nem afetar outras cargas."
          >
            <input type="number" min="1" step="0.5" value={c.quedaMaxPartida} onChange={(e) => set({ quedaMaxPartida: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          NBR 5410: 4% em regime a partir da entrada (7% de transformador próprio); 10% usual na
          partida de motores. A queda usa a soma das distâncias dos trechos.
        </p>
      </div>
    </div>
  );
}

const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

function ResultRow({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={
          strong
            ? "text-base font-bold text-slate-800 dark:text-slate-100"
            : "font-semibold text-slate-700 dark:text-slate-200"
        }
      >
        {value}
      </span>
    </div>
  );
}

export const CRITERIO_LABEL = {
  capacidade: "capacidade de condução",
  quedaRegime: "queda de tensão em regime",
  quedaPartida: "queda de tensão na partida",
  minima: "seção mínima",
};

export function ResultadoCircuito({ result, esquemaId, tipoCabo, porFase }) {
  if (result.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
        {result.error}
      </div>
    );
  }
  const esquema = ESQUEMAS.find((e) => e.id === esquemaId);
  const nPar = result.porFase ?? porFase ?? 1;
  const designacao = designacaoCabos({ esquemaId, tipoCabo, result });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
        <div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300">
            Cabos do circuito (EPR/XLPE 90°C)
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
            critério dominante: {CRITERIO_LABEL[result.criterio]}
          </div>
        </div>
        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{designacao}</div>
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
        <ResultRow label="Corrente de projeto Ib" value={`${fmt(result.corrente, 1)} A`} />
        {nPar > 1 && <ResultRow label="Corrente por cabo (paralelo)" value={`${fmt(result.correntePorCabo, 1)} A`} />}
        {result.correntePartida != null && (
          <ResultRow label="Corrente de partida Ip" value={`${fmt(result.correntePartida, 1)} A`} />
        )}
        <ResultRow label="Capacidade corrigida do conjunto" value={`${fmt(result.capacidadeCorrigida, 1)} A`} />
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
        <ResultRow label="Seção por capacidade" value={`${result.secaoCapacidade}mm²`} />
        <ResultRow
          label="Seção por queda em regime"
          value={result.secaoQuedaRegime ? `${result.secaoQuedaRegime}mm²` : "não verificada"}
        />
        <ResultRow
          label="Seção por queda na partida"
          value={result.secaoQuedaPartida ? `${result.secaoQuedaPartida}mm²` : "não verificada"}
        />
        {result.quedaRegime != null && (
          <ResultRow label={`Queda em regime (${fmt(result.comprimentoTotal, 0)}m)`} value={`${fmt(result.quedaRegime)}%`} />
        )}
        {result.quedaPartida != null && (
          <ResultRow label="Queda na partida" value={`${fmt(result.quedaPartida)}%`} />
        )}
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
        <div
          className="cursor-help text-[11px] font-semibold text-slate-500 dark:text-slate-400"
          title="FCT: fator de correção de temperatura (Tab. 40). FCA: fator de agrupamento (Tab. 42/45). I′: corrente que o cabo precisa suportar já descontados os fatores — Ib ÷ (FCT × FCA)."
        >
          Por trecho ⓘ
        </div>
        {result.detalhesTrechos.map((t, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {String(i + 1).padStart(2, "0")} · {t.condutoLabel} (mét. {t.metodo}) · FCT {fmt(t.fct)} · FCA {fmt(t.fca)}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              I′ {fmt(t.iCorrigida, 1)} A
            </span>
          </div>
        ))}
      </div>

      {esquema?.harmonicas && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Harmônicas &gt; 15%: neutro considerado carregado — fator adicional 0,86 aplicado (Tab. 46)
          e neutro com a mesma seção da fase.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        Cálculo conforme NBR 5410 (Tabelas 37/39/40/42/45/46/48/58) para isolação EPR/XLPE 90°C.
        Queda de tensão com R a 90°C e reatância típica de projeto. Não substitui a coordenação com a
        proteção (Ib ≤ In ≤ Iz) nem a verificação de curto-circuito — confira no projeto executivo.
      </p>
    </div>
  );
}
