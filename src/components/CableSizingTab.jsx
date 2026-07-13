import { useState } from "react";
import {
  CircuitoForm, ResultadoCircuito, computeCircuito, defaultCircuito,
} from "./cabos/CircuitoForm";

// Dimensionamento de um circuito por vez, com as mesmas opções da planilha
// de dimensionamento de cabos (carga, partida, trechos, paralelo, material).
export default function CableSizingTab() {
  const [circuito, setCircuito] = useState(defaultCircuito);
  const result = computeCircuito(circuito);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_1fr]">
      <section>
        <CircuitoForm value={circuito} onChange={setCircuito} showIdentificacao={false} />
      </section>
      <section>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Resultado</h2>
          <ResultadoCircuito result={result} esquemaId={circuito.esquemaId} porFase={Number(circuito.porFase)} />
        </div>
      </section>
    </div>
  );
}
