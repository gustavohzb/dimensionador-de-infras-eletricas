import { useState } from "react";
import { buscarMedidas, atendeNorma } from "../../lib/spdaBusca";
import { cientifica } from "./formato";

function Combinacao({ c, ordem, onAplicar }) {
  return (
    <div className="rounded-xs border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Opção {ordem}
        </span>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          R1 = {cientifica(c.r1)}
          {c.r3 !== null && <> · R3 = {cientifica(c.r3)}</>}
          {c.piorF && <> · F = {cientifica(c.piorF.maior)}</>}
        </span>
        <button
          type="button"
          onClick={() => onAplicar(c.entrada)}
          className="ml-auto rounded-xs bg-copper-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-copper-700"
        >
          aplicar
        </button>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {c.escolhas.map((e) => (
          <li key={e.eixo} className="text-xs text-slate-600 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">{e.eixo}:</span> {e.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Painel que responde "o que fazer", e não só "precisa de proteção".
//
// Só aparece quando algum critério reprova: com tudo aprovado não há o que
// recomendar, e um painel vazio na tela sugeriria que falta alguma coisa.
export default function SugestaoMedidas({ entrada, resultado, onAplicar }) {
  // Guarda junto o estado para o qual a busca foi feita. Um efeito que zerasse
  // o resultado a cada mudança de `entrada` não bastaria: efeito roda depois da
  // pintura, e por um quadro a tela mostraria a recomendação velha ao lado do
  // risco novo. Comparando aqui, na renderização, o resultado envelhecido nunca
  // chega a aparecer.
  const [busca, setBusca] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const vigente = busca && busca.paraEntrada === entrada ? busca.dados : null;

  const precisa = !atendeNorma(resultado);
  if (!precisa) return null;

  // A busca segura a thread por até ~2 s. Sem ceder um quadro antes, o
  // "procurando" só apareceria depois que ela terminasse — ou seja, nunca.
  //
  // O `finally` não é decoração: sem ele, uma exceção na busca deixaria
  // `buscando` verdadeiro para sempre, com o botão desabilitado em
  // "Procurando…" e sem saída a não ser recarregar a página.
  const procurar = () => {
    setBuscando(true);
    setTimeout(() => {
      try {
        setBusca({ paraEntrada: entrada, dados: buscarMedidas(entrada) });
      } finally {
        setBuscando(false);
      }
    }, 0);
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Como atender a norma
      </h2>
      <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
        O app procura as combinações de medidas que trazem R1, R3 e a frequência de danos para
        dentro dos limites, da menor para a maior intervenção em obra. A ordem é julgamento de
        engenharia, não valor normativo.
        <b className="ml-1 text-amber-700 dark:text-amber-400">
          Aplicar altera campos dos painéis Estrutura e Proteções.
        </b>
      </p>

      {vigente === null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={procurar}
            disabled={buscando}
            className="rounded-xs bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-700 disabled:opacity-50"
          >
            {buscando ? "Procurando…" : "Procurar medidas"}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {buscando
              ? "Varrendo as combinações; pode levar alguns segundos."
              : "A varredura é completa, então demora alguns segundos em casos difíceis."}
          </span>
        </div>
      ) : vigente.semNg ? (
        // Sem N_G todo número de eventos é zero, e com ele todo risco. A busca
        // se recusa a rodar aí — dizer "não falta proteção nenhuma" seria a
        // coisa mais perigosa que este painel poderia afirmar. O motivo é
        // outro, e a saída também: escolher o município.
        <div className="rounded-xs border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <b>Ainda não há o que procurar.</b> O município não foi escolhido, então não existe N_G e
          nenhum risco pode ser calculado. Escolha o município no painel Estrutura e procure de novo.
        </div>
      ) : vigente.combinacoes.length === 0 ? (
        <div className="rounded-xs border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {/* Este painel chama a busca sem teto, e sem teto ela varre a grade
              inteira — então hoje `esgotou` nunca vem verdadeiro por aqui. O
              ramo fica porque a alternativa é pior: quem um dia passar um teto
              faria a mensagem de baixo afirmar que nada resolve depois de uma
              varredura que parou no meio. */}
          {vigente.esgotou ? (
            <>
              <b>A busca foi interrompida antes do fim.</b> Ela parou no limite de avaliações, então
              pode existir combinação que ela nem chegou a ver.
            </>
          ) : (
            // O catálogo do app não é a norma: ele cobre as medidas que a aba
            // sabe modelar, e um projeto real pode atender por um caminho que
            // não está aqui. A mensagem afirma só o que foi de fato verificado
            // — que nenhuma combinação DESTE catálogo resolve — e oferece as
            // outras frentes como direções a estudar, não como o remédio.
            <>
              <b>Nenhuma combinação do catálogo do app resolve.</b> Foram avaliadas as{" "}
              {vigente.avaliadas.toLocaleString("pt-BR")} combinações que o app sabe montar e nenhuma
              traz os três critérios para dentro do limite. Isso não esgota a norma: o catálogo cobre
              as medidas modeladas nesta aba, e vale estudar também reduzir a ocupação da zona,
              dividir a estrutura em zonas ou rever a geometria — além de conferir os dados de
              entrada.
            </>
          )}
          {vigente.melhorParcial && (
            <div className="mt-1.5">
              <div className="font-mono">
                melhor encontrado: R1 = {cientifica(vigente.melhorParcial.r1)}
                {vigente.melhorParcial.r3 !== null && (
                  <> · R3 = {cientifica(vigente.melhorParcial.r3)}</>
                )}
                {vigente.melhorParcial.piorF && (
                  <> · F = {cientifica(vigente.melhorParcial.piorF.maior)}</>
                )}
              </div>
              {/* Sem as medidas, o bloco diz "cheguei até aqui" e esconde o
                  como. São elas que dizem de que ponto vale a pena partir. */}
              {vigente.melhorParcial.escolhas.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {vigente.melhorParcial.escolhas.map((e) => (
                    <li key={e.eixo}>
                      <span className="opacity-70">{e.eixo}:</span> {e.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-1">com as medidas já declaradas, sem acrescentar nenhuma.</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {vigente.combinacoes.map((c, i) => (
            <Combinacao key={c.indices.join(",")} c={c} ordem={i + 1} onAplicar={onAplicar} />
          ))}
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {vigente.avaliadas.toLocaleString("pt-BR")} combinações avaliadas.
          </p>
        </div>
      )}
    </div>
  );
}
