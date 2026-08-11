import { useEffect, useMemo, useState } from "react";
import { findBestFits, selectDiverseResults } from "../lib/reverseSearch";

// O filtro entra ANTES do corte por diversidade: se cortasse primeiro, o
// selectDiverseResults gastaria as vagas com tipos que seriam descartados
// logo em seguida, e sobrariam menos opções do tipo pedido.
const filtrar = (results, infraType) =>
  infraType ? results.filter((r) => r.infraType === infraType) : results;

// Máquina de estados da busca reversa de infraestrutura, compartilhada pela
// aba Infraestrutura (modo Auto) e pelo painel de simulação do Quadro de
// Cargas. As duas rodam o mesmo findBestFits; o que muda é quem dispara e se
// a primeira opção é aplicada sozinha.
//
// `infraType` null significa todos os tipos. `maxLayers` "" significa sem
// limite (é o value de um <select>).
export function useBuscaInfra({ infraTypeInicial = null, autoAplicar = false } = {}) {
  const [results, setResults] = useState(null); // null = ainda não buscou
  const [layerHint, setLayerHint] = useState(null);
  const [searching, setSearching] = useState(false);
  const [maxLayers, setMaxLayers] = useState("");
  const [infraTypeRaw, setInfraTypeRaw] = useState(infraTypeInicial);
  const [applied, setApplied] = useState(null);

  // `maxLayers` e `infraType` são lidos do escopo do render: quem chamar
  // setMaxLayers e buscar no mesmo handler veria o valor antigo. Dispare a
  // busca de um efeito que dependa deles, não em seguida ao setState.
  const buscar = (cables) => {
    if (!cables || cables.length === 0) return;
    setSearching(true);
    setApplied(null);
    // Adia um tick pro botão re-renderizar em "Buscando…" antes do cálculo
    // síncrono, que segura a thread.
    setTimeout(() => {
      const numLayers = maxLayers ? Number(maxLayers) : undefined;
      const found = findBestFits(cables, { maxLayers: numLayers });
      let hint = null;
      if (found.length === 0 && numLayers) {
        const unrestricted = findBestFits(cables, {});
        if (unrestricted.length > 0) hint = Math.min(...unrestricted.map((r) => r.camadas));
      }
      setResults(found);
      setLayerHint(hint);
      setSearching(false);
    }, 10);
  };

  // Trocar o tipo invalida a opção aplicada: ela pode nem estar mais na lista.
  const setInfraType = (t) => {
    setInfraTypeRaw(t);
    setApplied(null);
  };

  const displayResults = useMemo(
    () => (results ? selectDiverseResults(filtrar(results, infraTypeRaw), 2) : null),
    [results, infraTypeRaw]
  );

  // Com autoAplicar, a menor opção entra sozinha assim que a lista aparece —
  // o desenho fica pronto sem clique. A aba Infra não usa: lá o usuário
  // escolhe clicando em "Ver".
  //
  // O `searching` no guard não é decoração: `buscar` zera o `applied` na hora,
  // mas só troca o `results` 10 ms depois. Sem ele, o efeito rodaria no render
  // do meio e aplicaria a primeira opção da lista ANTERIOR — e nunca mais se
  // corrigiria, porque na chegada dos resultados novos o `applied` já não
  // estaria nulo.
  useEffect(() => {
    if (!autoAplicar || applied || searching) return;
    if (displayResults && displayResults.length > 0) setApplied(displayResults[0]);
  }, [autoAplicar, applied, displayResults, searching]);

  return {
    results,
    displayResults,
    applied,
    searching,
    layerHint,
    maxLayers,
    setMaxLayers,
    infraType: infraTypeRaw,
    setInfraType,
    buscar,
    aplicar: setApplied,
  };
}
