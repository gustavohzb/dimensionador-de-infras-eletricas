import { useEffect, useState } from "react";
import { defaultCircuitoMT, defaultPresetMT, normalizarProjetoMT } from "../lib/mtModelo";
import { dimensionarCircuitoMT } from "../lib/mtSizing";
import { proximoNumero } from "../lib/sequencialRotulos";
import { exportMemorialMT } from "../lib/mtPdf";
import PresetMTPanel from "./mt/PresetMTPanel";
import CircuitoMTForm from "./mt/CircuitoMTForm";
import ResultadoMT, { CriterioMTPill } from "./mt/ResultadoMT";
import { CRITERIO_MT_LEGENDA } from "./mt/criteriosMT";

const STORAGE_KEY = "mediaTensao.v1";

const br = (n) => String(n).replace(".", ",");

function novoCircuito(n) {
  return { ...defaultCircuitoMT(), tag: `AL-MT-${String(n).padStart(2, "0")}` };
}

// Lê o estado salvo passando SEMPRE por normalizarProjetoMT: o JSON parsear não
// garante que o circuito tem o formato de hoje. A aba de baixa tensão aprendeu
// isso tarde, e enquanto não aprendeu um projeto antigo podia reabrir com
// trecho faltando e derrubar a aba no primeiro render.
function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const projeto = normalizarProjetoMT(JSON.parse(raw));
      if (projeto.circuitos.length) return projeto;
    }
  } catch { /* estado inicial */ }
  return { circuitos: [novoCircuito(1)], preset: defaultPresetMT() };
}

export default function MediaTensaoTab() {
  const [inicial] = useState(carregarEstado);
  const [circuitos, setCircuitos] = useState(inicial.circuitos);
  const [preset, setPreset] = useState(inicial.preset);
  const [selecionado, setSelecionado] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuitos, preset }));
    } catch { /* quota */ }
  }, [circuitos, preset]);

  const resultados = circuitos.map((c) => dimensionarCircuitoMT({ preset, circuito: c }));
  const atual = circuitos[selecionado] ?? circuitos[0];
  const resultado = resultados[selecionado] ?? resultados[0];

  const setAtual = (c) => {
    const next = circuitos.slice();
    next[selecionado] = c;
    setCircuitos(next);
  };

  const adicionar = () => {
    const n = proximoNumero(circuitos.map((c) => c.tag), /^AL-MT-(\d+)$/);
    setCircuitos([...circuitos, novoCircuito(n)]);
    setSelecionado(circuitos.length);
  };

  const exportar = async () => {
    try {
      await exportMemorialMT({ projectName: preset.nomeProjeto, circuitos, resultados, preset });
    } catch (err) {
      // Falhar na exportação não pode derrubar a aba junto: o projeto inteiro
      // está na tela e o usuário perderia o contexto por causa de um PDF.
      console.error("Memorial de média tensão não pôde ser gerado:", err);
    }
  };

  const remover = (i) => {
    if (circuitos.length === 1) return;
    setCircuitos(circuitos.filter((_, j) => j !== i));
    setSelecionado((s) => (s >= i && s > 0 ? s - 1 : s));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
            Cabos de média tensão
          </h1>
          <div className="flex items-center gap-2">
            <input
              value={preset.nomeProjeto}
              onChange={(e) => setPreset({ ...preset, nomeProjeto: e.target.value })}
              placeholder="nome do projeto"
              className="w-48 rounded-xs border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={exportar}
              className="rounded-xs border border-copper-600 px-2.5 py-1 text-[11px] font-semibold text-copper-700 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-400 dark:hover:bg-copper-500/10"
            >
              Memorial PDF
            </button>
          </div>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          ABNT NBR 14039:2021, de 1,0 kV a 36,2 kV. Quatro critérios: capacidade de condução, queda
          de tensão, curto-circuito no condutor e curto-circuito na blindagem. Onde a norma não tem
          tabela, o cálculo é recusado com o motivo — nunca se adota 1,00 por conta própria.
        </p>
      </div>

      <PresetMTPanel value={preset} onChange={setPreset} />

      <div className="rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Circuitos
          </h2>
          <button
            type="button"
            onClick={adicionar}
            className="rounded-xs border border-copper-600 px-2 py-1 text-[11px] font-semibold text-copper-700 hover:bg-copper-50 dark:border-copper-500 dark:text-copper-400 dark:hover:bg-copper-500/10"
          >
            + circuito
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-1.5 font-medium">TAG</th>
                <th className="px-3 py-1.5 font-medium">Carga</th>
                <th className="px-3 py-1.5 font-medium">Cabo</th>
                <th className="px-3 py-1.5 font-medium">Crit.</th>
                <th className="px-3 py-1.5 font-medium">Blindagem</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {circuitos.map((c, i) => {
                const r = resultados[i];
                return (
                  <tr
                    key={i}
                    onClick={() => setSelecionado(i)}
                    className={`cursor-pointer border-t border-slate-100 dark:border-slate-800 ${
                      i === selecionado ? "bg-copper-50/60 dark:bg-copper-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-3 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-200">{c.tag}</td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                      {c.modo === "potencia" ? `${br(c.potenciaKVA)} kVA` : `${br(c.corrente)} A`} · {br(c.tensao)} kV
                    </td>
                    <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">
                      {r.error ? <span className="text-red-600 dark:text-red-400">não calculado</span> : r.designacao}
                    </td>
                    <td className="px-3 py-1.5">{r.error ? "—" : <CriterioMTPill criterio={r.criterio} />}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                      {r.error ? "—" : `${r.blindagem.secaoEspecificada} mm²`}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {circuitos.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); remover(i); }}
                          className="text-[11px] text-red-600 hover:underline dark:text-red-400"
                        >
                          remover
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-3 py-1.5 text-[11px] text-slate-400 dark:text-slate-500">{CRITERIO_MT_LEGENDA}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CircuitoMTForm value={atual} onChange={setAtual} />
        <ResultadoMT result={resultado} />
      </div>
    </div>
  );
}
