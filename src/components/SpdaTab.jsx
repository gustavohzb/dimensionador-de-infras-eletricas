import { useEffect, useMemo, useState } from "react";
import { defaultEntrada, avaliarRisco } from "../lib/spdaRisco";
import ResultadoRisco from "./spda/ResultadoRisco";

const STORAGE_KEY = "spdaRisco.v1";

// Lazy: sem a função, o parse do localStorage rodaria a cada render.
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const salvo = JSON.parse(raw);
      // Espalha sobre o padrão para não quebrar se um campo novo entrar depois.
      const base = defaultEntrada();
      return {
        estrutura: { ...base.estrutura, ...salvo.estrutura },
        linhas: salvo.linhas ?? base.linhas,
        protecoes: { ...base.protecoes, ...salvo.protecoes },
      };
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

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="font-display text-base font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
          Gerenciamento de risco — SPDA
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Análise de risco conforme a <b>ABNT NBR 5419-2:2026</b>, com a estrutura tratada como
          zona de estudo única. Calcula as oito componentes de risco, soma R1 e R3 e compara com os
          riscos toleráveis da Tabela 4.
        </p>
      </div>

      <ResultadoRisco resultado={resultado} />

      {/* Painéis de entrada entram aqui nas tarefas seguintes. */}
      <div className="text-xs text-slate-400 dark:text-slate-500">
        Entrada em construção — por enquanto o cálculo usa os valores padrão.
      </div>
    </div>
  );
}
