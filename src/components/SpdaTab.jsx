import { useEffect, useMemo, useState } from "react";
import { defaultEntrada, avaliarRisco } from "../lib/spdaRisco";
import { exportSpdaPDF } from "../lib/spdaPdf";
import VereditoRisco from "./spda/VereditoRisco";
import ResultadoRisco from "./spda/ResultadoRisco";
import FrequenciaDanos from "./spda/FrequenciaDanos";
import SugestaoMedidas from "./spda/SugestaoMedidas";
import EstruturaForm from "./spda/EstruturaForm";
import LinhasForm from "./spda/LinhasForm";
import ProtecoesForm from "./spda/ProtecoesForm";

const STORAGE_KEY = "spdaRisco.v1";

// Lazy: sem a função, o parse do localStorage rodaria a cada render.
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const salvo = JSON.parse(raw);
      // Espalha sobre o padrão para não quebrar se um campo novo entrar depois.
      const base = defaultEntrada();
      const estrutura = { ...base.estrutura, ...salvo.estrutura };
      // A ocupação era guardada em horas por ano; virou horas por dia mais dias
      // por semana. Converte o que estiver salvo assumindo semana cheia, que é
      // como o valor antigo tinha sido informado.
      if (salvo.estrutura?.tz != null && salvo.estrutura.horasDia == null) {
        estrutura.horasDia = Math.min(24, +(salvo.estrutura.tz / 365).toFixed(2));
        estrutura.diasSemana = 7;
      }
      delete estrutura.tz;
      // Sistemas salvos antes da Seção 7 não têm as marcações novas. Sem o
      // padrão explícito o checkbox nasce não controlado e o React reclama.
      const protecoes = { ...base.protecoes, ...salvo.protecoes };
      protecoes.sistemas = (protecoes.sistemas ?? []).map((s) => ({
        critico: false, zpr0a: false, ...s,
      }));
      return { estrutura, linhas: salvo.linhas ?? base.linhas, protecoes };
    }
  } catch { /* estado inicial */ }
  return defaultEntrada();
}

export default function SpdaTab() {
  const [entrada, setEntrada] = useState(carregar);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entrada));
    } catch { /* quota */ }
  }, [entrada]);

  const resultado = useMemo(() => avaliarRisco(entrada), [entrada]);

  const setParte = (parte) => (patch) =>
    setEntrada((e) => ({ ...e, [parte]: { ...e[parte], ...patch } }));

  const [gerandoPdf, setGerandoPdf] = useState(false);

  const exportarPdf = () => {
    setGerandoPdf(true);
    exportSpdaPDF({ entrada, resultado }).finally(() => setGerandoPdf(false));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-base font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
              Gerenciamento de risco — SPDA
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Análise de risco conforme a <b>ABNT NBR 5419-2:2026</b>, com a estrutura tratada como
              zona de estudo única. Calcula as oito componentes de risco, soma R1 e R3 e compara com os
              riscos toleráveis da Tabela 4.
            </p>
          </div>
          {entrada.estrutura.ng != null && (
            <button
              type="button"
              onClick={exportarPdf}
              disabled={gerandoPdf}
              className="shrink-0 rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700 disabled:opacity-50"
            >
              {gerandoPdf ? "Gerando…" : "Relatório PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Sem município escolhido não há N_G, e sem N_G todas as componentes dão
          zero — o que a aba exibiria como "proteção não é necessária". */}
      <VereditoRisco resultado={resultado} pendente={entrada.estrutura.ng == null} />

      {entrada.estrutura.ng != null && <ResultadoRisco resultado={resultado} />}
      {entrada.estrutura.ng != null && <FrequenciaDanos frequencias={resultado.frequencias} />}
      {entrada.estrutura.ng != null && (
        <SugestaoMedidas
          entrada={entrada}
          resultado={resultado}
          onAplicar={(nova) => setEntrada(nova)}
        />
      )}

      <EstruturaForm value={entrada.estrutura} onChange={setParte("estrutura")} />

      <LinhasForm
        linhas={entrada.linhas}
        onChange={(fn) => setEntrada((e) => ({ ...e, linhas: fn(e.linhas) }))}
      />

      <ProtecoesForm
        value={entrada.protecoes}
        linhas={entrada.linhas}
        onChange={setParte("protecoes")}
        onSistemas={(fn) =>
          setEntrada((e) => ({ ...e, protecoes: { ...e.protecoes, sistemas: fn(e.protecoes.sistemas) } }))
        }
      />
    </div>
  );
}
