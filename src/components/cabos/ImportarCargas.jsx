import { useMemo, useState } from "react";
import { PAPEIS, parseLista, detectarColunas, montarCircuitos } from "../../lib/importCargas";
import { UNIDADES_POTENCIA } from "../../lib/cableSizingPro";
import { ESQUEMAS, FORMAS_PARTIDA } from "../../data/cabosNBR5410";

const selectCls =
  "rounded-xs border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const inputCls = `${selectCls} w-20`;

// Resumo do circuito que a linha vai virar — a coluna "vira" da prévia.
function resumo(c) {
  const carga =
    c.modo === "corrente"
      ? `${String(c.corrente).replace(".", ",")} A`
      : `${String(c.potencia).replace(".", ",")} ${c.unidade}`;
  return `${c.tag} · ${carga} · ${c.tensao} V · ${c.trechos[0].distancia} m`;
}

function CampoPadrao({ label, children }) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
      {children}
    </label>
  );
}

export default function ImportarCargas({ tagsExistentes, existingCount, onImportar, onClose }) {
  const [text, setText] = useState("");
  const [analise, setAnalise] = useState(null); // { grade, temCabecalho, papeis }
  const [askReplace, setAskReplace] = useState(false);
  // Padrões do lote: completam o que a lista não traz. Coluna vence padrão.
  const [padroes, setPadroes] = useState({
    unidade: "CV",
    esquemaId: "trifCnCt",
    tensao: 380,
    distancia: 30,
    formaPartidaId: "nenhuma",
  });

  const analisar = () => {
    const grade = parseLista(text);
    if (!grade.length) return;
    setAnalise({ grade, ...detectarColunas(grade) });
    setAskReplace(false);
  };

  // Prévia ao vivo: corrigir um papel ou um padrão refaz os circuitos na hora.
  const previa = useMemo(
    () => (analise ? montarCircuitos({ ...analise, padroes, tagsExistentes }) : null),
    [analise, padroes, tagsExistentes]
  );
  const dados = analise ? (analise.temCabecalho ? analise.grade.slice(1) : analise.grade) : [];

  const setPapel = (idx, papel) =>
    setAnalise((a) => ({ ...a, papeis: a.papeis.map((p, i) => (i === idx ? papel : p)) }));
  const setPadrao = (patch) => setPadroes((p) => ({ ...p, ...patch }));

  const confirmar = (substituir) => {
    // Substituir zera o quadro: a sequência AL-NN recomeça do zero.
    const { circuitos } = montarCircuitos({
      ...analise,
      padroes,
      tagsExistentes: substituir ? [] : tagsExistentes,
    });
    if (!circuitos.length) return;
    onImportar({ circuitos, substituir });
  };

  const handleConfirm = () => {
    if (existingCount > 0) setAskReplace(true);
    else confirmar(false);
  };

  return (
    <div className="space-y-2.5">
      {!analise && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cole a lista de cargas direto do Excel (uma linha por carga). Só a <b>potência</b> é
            obrigatória — descrição, TAG, tensão e distância são lidas quando existirem, e o resto
            sai dos padrões do lote. Unidade junto do número ("15 CV", "3,7 kW") também funciona.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"Exaustor\t15 CV\nBomba d'água\t7,5 CV"}
            className="w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={analisar}
              disabled={!text.trim()}
              className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
            >
              Analisar lista
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {analise && (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-xs border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="w-full text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Padrões do lote — usados onde a lista não informa
            </span>
            <CampoPadrao label="Unidade">
              <select
                value={padroes.unidade}
                onChange={(e) => setPadrao({ unidade: e.target.value })}
                className={selectCls}
              >
                {UNIDADES_POTENCIA.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </CampoPadrao>
            <CampoPadrao label="Esquema">
              <select
                value={padroes.esquemaId}
                onChange={(e) => setPadrao({ esquemaId: e.target.value })}
                className={selectCls}
              >
                {ESQUEMAS.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
            </CampoPadrao>
            <CampoPadrao label="Tensão (V)">
              <input
                type="number"
                value={padroes.tensao}
                onChange={(e) => setPadrao({ tensao: e.target.value })}
                className={inputCls}
              />
            </CampoPadrao>
            <CampoPadrao label="Distância (m)">
              <input
                type="number"
                value={padroes.distancia}
                onChange={(e) => setPadrao({ distancia: e.target.value })}
                className={inputCls}
              />
            </CampoPadrao>
            <CampoPadrao label="Partida">
              <select
                value={padroes.formaPartidaId}
                onChange={(e) => setPadrao({ formaPartidaId: e.target.value })}
                className={selectCls}
              >
                {FORMAS_PARTIDA.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </CampoPadrao>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {analise.papeis.map((papel, c) => (
                    <th key={c} className="px-1.5 py-1">
                      <select
                        value={papel}
                        onChange={(e) => setPapel(c, e.target.value)}
                        aria-label={`Papel da coluna ${c + 1}`}
                        className={`${selectCls} w-full font-semibold`}
                      >
                        {PAPEIS.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </th>
                  ))}
                  <th className="px-1.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Vira
                  </th>
                </tr>
                {analise.temCabecalho && (
                  <tr className="text-[11px] italic text-slate-400 dark:text-slate-500">
                    {analise.grade[0].map((cel, c) => (
                      <td key={c} className="px-1.5 py-0.5">{cel || "—"}</td>
                    ))}
                    <td className="px-1.5 py-0.5">cabeçalho (não importa)</td>
                  </tr>
                )}
              </thead>
              <tbody>
                {dados.map((linha, i) => {
                  const st = previa.porLinha[i];
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 dark:border-slate-800 ${
                        st.aviso ? "text-red-500 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {linha.map((cel, c) => (
                        <td key={c} className="max-w-[160px] truncate px-1.5 py-1">{cel || "—"}</td>
                      ))}
                      <td className="whitespace-nowrap px-1.5 py-1 font-mono text-[11px]">
                        {st.aviso ? "⚠ sem potência — pulada" : resumo(st.circuito)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {previa.avisos.length > 0 && (
            <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              {previa.avisos.map((a, i) => (
                <li key={i}>⚠ {a}</li>
              ))}
            </ul>
          )}

          {askReplace ? (
            <div className="rounded-xs border border-copper-300 bg-copper-50 px-3 py-2.5 dark:border-copper-800 dark:bg-copper-500/10">
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                O quadro já tem <b>{existingCount}</b> circuito{existingCount > 1 ? "s" : ""}. Somar
                os importados ou substituir tudo?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmar(false)}
                  className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700"
                >
                  Somar
                </button>
                <button
                  type="button"
                  onClick={() => confirmar(true)}
                  className="flex-1 rounded-xs border border-copper-600 px-3 py-1.5 text-sm font-semibold text-copper-700 transition hover:bg-copper-100 dark:border-copper-500 dark:text-copper-300 dark:hover:bg-copper-500/10"
                >
                  Substituir
                </button>
                <button
                  type="button"
                  onClick={() => setAskReplace(false)}
                  className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={previa.circuitos.length === 0}
                className="flex-1 rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-700 disabled:opacity-50"
              >
                {previa.circuitos.length > 0
                  ? `Importar ${previa.circuitos.length} circuito${previa.circuitos.length > 1 ? "s" : ""}`
                  : "Nada para importar"}
              </button>
              <button
                type="button"
                onClick={() => setAnalise(null)}
                className="rounded-xs border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
