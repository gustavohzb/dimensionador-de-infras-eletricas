import { useEffect, useRef, useState } from "react";
import { RISCO_TOLERAVEL } from "../../data/spdaNBR5419";
import { cientifica } from "./formato";

function Veredito({ titulo, valor, tolerado, precisa }) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm border px-3 py-2 ${
        precisa
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-500/10"
          : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10"
      }`}
    >
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        {titulo}
      </span>
      <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-100">
        {cientifica(valor)}
        <span className="ml-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">/ano</span>
      </span>
      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
        tolerável {cientifica(tolerado)}
      </span>
      <span
        className={`ml-auto rounded-xs px-2 py-0.5 text-xs font-semibold ${
          precisa
            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        }`}
      >
        {precisa ? "Proteção necessária" : "Proteção não é necessária"}
      </span>
    </div>
  );
}

// Barra de veredito que acompanha a rolagem: enquanto o usuário preenche os
// painéis mais abaixo, R1 continua à vista e reage a cada campo alterado.
//
// Precisa ficar como filha direta do contêiner que abrange a aba inteira —
// `position: sticky` só gruda dentro dos limites do próprio pai, e dentro do
// cartão de resultado ela se descolaria logo depois da tabela.
export default function VereditoRisco({ resultado, pendente }) {
  const { r1, r3, precisa } = resultado;
  const barra = useRef(null);
  const [grudado, setGrudado] = useState(false);

  // Pior sistema pela Seção 7. Sem sistema interno não há o que avaliar, e o
  // cartão não aparece — melhor do que exibir "0" e sugerir aprovação.
  const { frequencias = [] } = resultado;
  const piorF = frequencias.length
    ? frequencias.reduce((a, b) => (a.maior / a.ft >= b.maior / b.ft ? a : b))
    : null;

  // Truque padrão para saber se o sticky está ativo: com `top: -1px`, um pixel
  // sai da tela ao grudar, e a razão de interseção cai abaixo de 1. Serve só
  // para a sombra aparecer quando a barra está sobreposta ao conteúdo.
  useEffect(() => {
    const alvo = barra.current;
    if (!alvo) return;
    const observador = new IntersectionObserver(
      ([entrada]) => setGrudado(entrada.intersectionRatio < 1),
      { threshold: [1] }
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={barra}
      className={`sticky -top-px z-20 space-y-2 bg-slate-50 py-2 transition-shadow dark:bg-slate-950 ${
        grudado ? "shadow-[0_10px_14px_-12px_rgba(15,23,42,0.5)]" : ""
      }`}
    >
      {/* Sem N_G não há cálculo: mostrar R1 = 0 em verde diria "não precisa de
          proteção", que é a resposta oposta à correta para um dado que falta. */}
      {pendente ? (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <b className="font-display text-[11px] font-bold uppercase tracking-[0.1em]">
            Aguardando o município
          </b>
          <span className="ml-2">
            Escolha o estado e o município no painel Estrutura para o cálculo começar.
          </span>
        </div>
      ) : (
      <div className={`grid gap-2 ${r3 !== null || piorF ? "sm:grid-cols-2" : ""}`}>
        <Veredito
          titulo="R1 — vida humana"
          valor={r1}
          tolerado={RISCO_TOLERAVEL.R1}
          precisa={precisa.r1}
        />
        {r3 !== null && (
          <Veredito
            titulo="R3 — patrimônio cultural"
            valor={r3}
            tolerado={RISCO_TOLERAVEL.R3}
            precisa={precisa.r3}
          />
        )}
        {piorF && (
          <Veredito
            titulo="F — frequência de danos"
            valor={piorF.maior}
            tolerado={piorF.ft}
            precisa={precisa.f}
          />
        )}
      </div>
      )}
    </div>
  );
}
