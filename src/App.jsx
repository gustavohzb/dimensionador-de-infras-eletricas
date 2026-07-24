import { useState } from "react";
import logo from "./assets/logo.png";
import { useDarkMode } from "./hooks/useDarkMode";
import InfraTab from "./components/InfraTab";
import QuadroCargasTab from "./components/QuadroCargasTab";
import CapacitoresTab from "./components/CapacitoresTab";
import IluminacaoTab from "./components/IluminacaoTab";
import AtualizacoesTab from "./components/AtualizacoesTab";
import SobreTab from "./components/SobreTab";

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xs border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {dark ? (
        // sol
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // lua
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [activeTab, setActiveTab] = useState("infra"); // "infra" | "quadroCargas"
  // Ponte "enviar cabos do Quadro de Cargas → aba Infraestrutura (Auto)".
  // { linhas, material } enquanto há um envio a consumir; null caso contrário.
  const [pendingImport, setPendingImport] = useState(null);

  const enviarParaInfra = (payload) => {
    setPendingImport(payload);
    setActiveTab("infra");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Titleblock: cabeçalho no espírito de carimbo de prancha técnica —
          régua de cobre embaixo, identificação à esquerda, selos à direita. */}
      <header className="border-b-2 border-copper-600 bg-white dark:border-copper-500 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          {/* O texto "Gustavo" e a linha divisória do logo são pretos/cinza-
              escuros (parte da arte original) e ficam ilegíveis no modo
              escuro — o painel claro por trás só aparece no dark mode. */}
          <div className="rounded-xs px-2 py-1 dark:bg-slate-100/90">
            <img src={logo} alt="Dimensionador do Gustavo" className="h-20 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xs border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              NBR 5410:2004
            </span>
            <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-4 px-4">
          {[
            { id: "infra", label: "Infraestrutura" },
            { id: "quadroCargas", label: "Cabos Elétricos" },
            { id: "iluminacao", label: "Iluminação" },
            { id: "capacitores", label: "Capacitores" },
            { id: "atualizacoes", label: "Atualizações" },
            { id: "sobre", label: "Sobre" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-0.5 border-b-2 px-1 pb-2 pt-1 font-display text-[13px] font-bold uppercase tracking-[0.08em] transition ${
                activeTab === tab.id
                  ? "border-copper-600 text-copper-700 dark:border-copper-400 dark:text-copper-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-3">
        <div className={activeTab === "infra" ? "" : "hidden"}>
          <InfraTab
            dark={dark}
            pendingImport={pendingImport}
            onConsumeImport={() => setPendingImport(null)}
          />
        </div>

        <div className={activeTab === "quadroCargas" ? "" : "hidden"}>
          <QuadroCargasTab onEnviarParaInfra={enviarParaInfra} />
        </div>

        <div className={activeTab === "iluminacao" ? "" : "hidden"}>
          <IluminacaoTab dark={dark} ativo={activeTab === "iluminacao"} />
        </div>

        <div className={activeTab === "capacitores" ? "" : "hidden"}>
          <CapacitoresTab dark={dark} />
        </div>

        {/* Só monta quando aberta: são mais de cem cartões e a aba não guarda
            nada que precise sobreviver à troca (as outras ficam montadas
            porque carregam o trecho/circuito em edição). */}
        {activeTab === "atualizacoes" && <AtualizacoesTab />}

        <div className={activeTab === "sobre" ? "" : "hidden"}>
          <SobreTab />
        </div>
      </main>
    </div>
  );
}
