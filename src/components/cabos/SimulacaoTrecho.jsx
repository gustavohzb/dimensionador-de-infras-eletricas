import { useEffect, useMemo, useRef, useState } from "react";
import { INFRA_TYPES } from "../../data/corfioHEPR";
import { useBuscaInfra } from "../../hooks/useBuscaInfra";
import { exportarSvgPng } from "../../lib/exportarSvgPng";
import { circuitosParaCabos, condutoPredominante, ocupacaoAplicada, resumoPorBitola } from "../../lib/simulacaoTrecho";
import OccupancyMeter from "../OccupancyMeter";
import TrayVisualization from "../TrayVisualization";

const cardCls =
  "rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const h2Cls =
  "font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400";
const selectCls =
  "rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const botaoCls =
  "rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

// Assinatura do conjunto de cabos: muda exatamente quando o desenho precisa de
// uma busca nova. Mexer na descrição de um circuito não mexe nela; mudar a
// carga a ponto de trocar a bitola, sim.
const assinatura = (cabos) =>
  cabos.map((c) => `${c.type}:${c.vias}:${c.section}:${c.d}:${c.trifolio ? "t" : "s"}`).join("|");

export default function SimulacaoTrecho({ circuitos, resultados, selecionados, preset, dark = false, onAbrirNaInfra }) {
  const [semTrifolio, setSemTrifolio] = useState(() => new Set());
  const [assinBuscada, setAssinBuscada] = useState(null);
  const svgRef = useRef(null);

  // Array novo a cada render no pai — a chave estável é o que impede o efeito
  // de busca de disparar sem parar.
  const selKey = selecionados.join(",");

  const circuitosSel = useMemo(
    () => selecionados.map((i) => circuitos[i]).filter(Boolean),
    // selKey no lugar de `selecionados`: o pai devolve um array novo a cada
    // render, e depender dele refaria a conta sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selKey, circuitos]
  );
  const condutoInicial = useMemo(() => condutoPredominante(circuitosSel), [circuitosSel]);

  const {
    displayResults, applied, searching, layerHint, results,
    maxLayers, setMaxLayers, infraType, setInfraType, buscar, aplicar,
  } = useBuscaInfra({ infraTypeInicial: condutoInicial, autoAplicar: true });

  const { cabos, itens, avisos } = useMemo(
    () => circuitosParaCabos({ circuitos, resultados, selecionados, material: preset.material, semTrifolio }),
    // selKey no lugar de `selecionados`: o pai devolve um array novo a cada
    // render, e depender dele refaria a conta sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circuitos, resultados, selKey, preset.material, semTrifolio]
  );

  // Lido dentro do efeito sem entrar nas dependências: a busca é disparada
  // pelos controles DO PAINEL, não por edições nos circuitos (ver o aviso de
  // desatualizado abaixo). findBestFits testa ~240 layouts, e o painel fica
  // logo acima do formulário de edição.
  const cabosRef = useRef(cabos);
  cabosRef.current = cabos;

  useEffect(() => {
    setAssinBuscada(assinatura(cabosRef.current));
    buscar(cabosRef.current);
    // `buscar` fica de fora de propósito: o hook o recria a cada render, e
    // incluí-lo poria a busca em laço. `cabos` também fica de fora — uma
    // mudança nos cabos só deve marcar "desatualizado", não re-rodar a busca
    // sozinha (ver comentário acima).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraType, maxLayers, semTrifolio, selKey]);

  const desatualizado = !searching && assinBuscada !== null && assinBuscada !== assinatura(cabos);
  const oc = ocupacaoAplicada(cabos, applied);

  const reSimular = () => {
    setAssinBuscada(assinatura(cabos));
    buscar(cabos);
  };

  const alternarTrifolio = (indice) => {
    setSemTrifolio((prev) => {
      const next = new Set(prev);
      if (next.has(indice)) next.delete(indice);
      else next.add(indice);
      return next;
    });
  };

  const elegiveisTrifolio = itens.filter((it) => it.podeTrifolio);
  const resumo = useMemo(() => resumoPorBitola(cabos), [cabos]);

  return (
    <div className={`${cardCls} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2Cls}>
          Simulação do trecho{" "}
          <span className="text-slate-400 dark:text-slate-500">
            ({itens.length} circuito{itens.length === 1 ? "" : "s"} · {cabos.length} cabo{cabos.length === 1 ? "" : "s"})
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Tipo
            <select
              value={infraType ?? ""}
              onChange={(e) => setInfraType(e.target.value || null)}
              className={selectCls}
            >
              <option value="">Todos</option>
              {INFRA_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Camadas
            <select value={maxLayers} onChange={(e) => setMaxLayers(e.target.value)} className={selectCls}>
              <option value="">Sem limite</option>
              <option value="1">1 (sem empilhar)</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => exportarSvgPng(svgRef.current, "simulacao-trecho.png", dark)}
            disabled={!applied}
            className={`${botaoCls} disabled:opacity-40`}
          >
            Exportar PNG
          </button>
        </div>
      </div>

      {/* O filtro nasce do conduto declarado, mas só na montagem: realinhar o
          seletor enquanto o usuário mexe na seleção mudaria a busca por baixo
          dele. Por isso o aviso aponta para o seletor em vez de afirmar em que
          tipo a busca está. */}
      {condutoInicial === null && circuitosSel.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Os circuitos marcados declaram condutos diferentes (ou um conduto sem equivalente aqui),
          então não dá para escolher o tipo por eles — confira o <b>Tipo</b> acima. Simular um tipo
          que não bate com o conduto usado no dimensionamento contradiz o método de referência e o
          fator de agrupamento que definiram a bitola.
        </p>
      )}

      {avisos.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
          {avisos.map((a, i) => (
            <li key={i}>⚠ {a}</li>
          ))}
        </ul>
      )}

      {desatualizado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-500/10">
          <span className="text-xs text-amber-800 dark:text-amber-300">
            Os cabos mudaram depois desta busca — a infraestrutura mostrada pode não ser mais a melhor.
          </span>
          <button
            type="button"
            onClick={reSimular}
            className="rounded-xs bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Re-simular
          </button>
        </div>
      )}

      {searching && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Buscando…</p>
      )}

      {!searching && cabos.length === 0 && (
        <p className="rounded-xs border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum cabo para simular. Marque circuitos calculados com sucesso na tabela acima.
        </p>
      )}

      {!searching && results && results.length > 0 && displayResults.length === 0 && (
        <p className="rounded-xs border border-amber-200 bg-amber-50 px-3 py-3 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          Nenhuma opção deste tipo comporta os cabos. Escolha <b>Todos</b> em Tipo para ver as demais.
        </p>
      )}

      {!searching && results && results.length === 0 && layerHint && (
        <p className="rounded-xs border border-amber-200 bg-amber-50 px-3 py-3 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          Nenhuma opção cabe com o limite de <b>{maxLayers} camada{Number(maxLayers) > 1 ? "s" : ""}</b>.
          Com esses cabos, a pilha mais baixa possível precisa de pelo menos{" "}
          <b>{layerHint} camada{layerHint > 1 ? "s" : ""}</b>.
        </p>
      )}

      {!searching && results && results.length === 0 && !layerHint && (
        <p className="rounded-xs border border-red-200 bg-red-50 px-3 py-3 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          Nenhuma infraestrutura cadastrada comporta esses cabos dentro do limite de ocupação da
          NBR 5410. Considere dividir em mais de um trecho.
        </p>
      )}

      {displayResults && displayResults.length > 0 && (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {displayResults.map((r, i) => {
            const ativo =
              applied && applied.label === r.label &&
              applied.trayWidth === r.trayWidth && applied.trayHeight === r.trayHeight;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => aplicar(r)}
                  className={`w-full rounded-xs border px-2.5 py-1.5 text-left text-xs transition ${
                    ativo
                      ? "border-copper-600 bg-copper-50 dark:border-copper-500 dark:bg-copper-500/10"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="block truncate font-medium text-slate-700 dark:text-slate-200">
                    {r.label} {ativo && <span className="text-copper-600 dark:text-copper-400">✓</span>}
                  </span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                    {r.ocupacao.toFixed(1)}% ocupado
                    {r.camadas != null && ` · ${r.camadas} camada${r.camadas > 1 ? "s" : ""}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {applied && oc && cabos.length > 0 && (
        <>
          <div className="flex justify-center overflow-x-auto rounded-sm bg-slate-50 p-3 dark:bg-slate-800/60">
            <TrayVisualization
              ref={svgRef}
              cables={cabos}
              trayWidth={applied.trayWidth}
              trayHeight={applied.trayHeight}
              dark={dark}
              infraType={applied.infraType}
              leitoFlange={applied.leitoFlange}
              eletrodutoNorma={applied.eletrodutoNorma}
              legenda={itens}
              resumo={resumo}
            />
          </div>

          <OccupancyMeter
            trayArea={oc.trayArea}
            cableArea={oc.cableArea}
            ocupacao={oc.ocupacao}
            limite={oc.limite}
            dentroLimite={oc.dentroLimite}
          />
          {!oc.dentroLimite && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Os cabos atuais já não cabem dentro do limite de ocupação da NBR 5410 para esta
              infraestrutura — re-simule ou reveja os circuitos marcados.
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        {elegiveisTrifolio.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
              Trifólio
            </span>
            {elegiveisTrifolio.map((it) => (
              <label
                key={it.indice}
                title="As 3 fases correm amarradas em feixe. Desmarque se correrem soltas na calha."
                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={!semTrifolio.has(it.indice)}
                  onChange={() => alternarTrifolio(it.indice)}
                  className="h-3.5 w-3.5 accent-copper-600"
                />
                <span className="font-mono">{it.tag}</span>
              </label>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onAbrirNaInfra}
          title="Leva os mesmos cabos para a aba Infraestrutura, onde dá para somar cabos à mão, salvar o trecho como projeto, ver o derating e gerar o Relatório PDF."
          className="text-xs font-medium text-copper-600 hover:text-copper-700 dark:text-copper-400 dark:hover:text-copper-300"
        >
          Abrir na aba Infraestrutura →
        </button>
      </div>
    </div>
  );
}
