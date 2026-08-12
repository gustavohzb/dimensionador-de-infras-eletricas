import { Component, Fragment } from "react";
import { CHAVES_POR_ABA, limparEstadoDaAba, rotuloDaAba } from "../lib/estadoAbas";

// Uma barreira por aba, não uma para o app inteiro.
//
// Sem barreira nenhuma, um erro de render derruba a árvore toda e sobra uma
// tela branca — e como as sete abas ficam montadas ao mesmo tempo (o App
// esconde as inativas com `hidden` em vez de desmontar), um bug na aba de
// Capacitores apagava o app de quem estava mexendo em Infraestrutura. Por aba,
// o estrago fica na aba que falhou.
//
// Pior: o estado vem do localStorage, então o F5 relê o mesmo dado e quebra de
// novo. Daí o botão de recomeçar — é a única saída que não passa por limpar o
// storage inteiro no DevTools, que levaria junto todos os outros projetos.
//
// Limitação conhecida: barreira de erro do React só pega erro de render e de
// ciclo de vida. Erro dentro de um onClick continua estourando no console.
export default class ErrorBoundary extends Component {
  state = { erro: null, tentativa: 0, limpou: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error(`[aba ${this.props.aba}]`, erro, info?.componentStack);
  }

  recomecar = () => {
    let limpou = [];
    try {
      limpou = limparEstadoDaAba(this.props.aba, window.localStorage);
    } catch {
      // localStorage bloqueado (aba anônima, política do navegador): remontar
      // ainda é melhor que continuar na tela de erro.
    }
    // Trocar a `key` força o React a montar a aba do zero, que é o que faz ela
    // reler o localStorage — agora vazio — e cair no estado padrão.
    this.setState((s) => ({ erro: null, tentativa: s.tentativa + 1, limpou }));
  };

  render() {
    const { aba, children } = this.props;
    const { erro, tentativa, limpou } = this.state;

    if (erro) {
      const temEstadoSalvo = (CHAVES_POR_ABA[aba] ?? []).length > 0;
      return (
        <div className="rounded-sm border border-red-300 bg-white p-4 shadow-sm dark:border-red-500/40 dark:bg-slate-900">
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-red-600 dark:text-red-400">
            A aba {rotuloDaAba(aba)} falhou
          </h2>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            As outras abas continuam funcionando — troque de aba que elas estão
            intactas.{" "}
            {temEstadoSalvo
              ? "Recomeçar apaga o que está salvo nesta aba e volta ao estado inicial; uma cópia do que foi apagado fica guardada, então dá para recuperar o projeto depois."
              : "Esta aba não guarda nada salvo, então recomeçar só a recarrega."}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xs border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {String(erro?.message || erro)}
          </pre>
          <button
            type="button"
            onClick={this.recomecar}
            className="mt-3 rounded-xs border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/70 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Recomeçar esta aba
          </button>
        </div>
      );
    }

    return (
      <>
        {limpou?.length > 0 && (
          <div className="mb-2 flex items-start justify-between gap-3 rounded-xs border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <p>
              Esta aba foi reiniciada. O que estava salvo ficou guardado em{" "}
              <span className="font-mono">
                {limpou.map((c) => `${c}.backup`).join(", ")}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={() => this.setState({ limpou: null })}
              className="shrink-0 font-medium underline"
            >
              Ok
            </button>
          </div>
        )}
        {/* Fragment com key em vez de div: remonta a aba sem inserir um nó a
            mais no layout. */}
        <Fragment key={tentativa}>{children}</Fragment>
      </>
    );
  }
}
