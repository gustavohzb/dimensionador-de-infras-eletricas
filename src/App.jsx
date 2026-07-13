import { useState } from "react";
import logo from "./assets/logo.png";
import { useDarkMode } from "./hooks/useDarkMode";
import InfraTab from "./components/InfraTab";
import QuadroCargasTab from "./components/QuadroCargasTab";
import SobreTab from "./components/SobreTab";

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
          <div />
          {/* O texto "Gustavo" e a linha divisória do logo são pretos/cinza-
              escuros (parte da arte original) e ficam ilegíveis no modo
              escuro — o painel claro por trás só aparece no dark mode. */}
          <div className="rounded-xl px-4 py-1.5 dark:bg-slate-100/90">
            <img src={logo} alt="Dimensionador do Gustavo" className="h-32 w-auto" />
          </div>
          <div className="flex justify-end">
            <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {[
            { id: "infra", label: "Infraestrutura" },
            { id: "quadroCargas", label: "Cabos Elétricos" },
            { id: "sobre", label: "Sobre" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-slate-200 bg-slate-50 text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-3">
        <div className={activeTab === "infra" ? "" : "hidden"}>
          <InfraTab dark={dark} />
        </div>

        <div className={activeTab === "quadroCargas" ? "" : "hidden"}>
          <QuadroCargasTab />
        </div>

        <div className={activeTab === "sobre" ? "" : "hidden"}>
          <SobreTab />
        </div>
      </main>
    </div>
  );
}
