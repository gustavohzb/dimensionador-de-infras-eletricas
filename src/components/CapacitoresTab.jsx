import { useEffect, useRef, useState } from "react";
import { Field } from "./cabos/CircuitoForm";
import { calcularBanco } from "../lib/capacitorBank";
import { exportCapacitorPDF } from "../lib/capacitorPdf";
import { layoutPlaca, trocarNaOrdem } from "../lib/plateLayout";
import { POTENCIAS_CELULA, CELULAS_SIEMENS_440V } from "../data/capacitores";
import { equipamentosSiemens, CONTATOR_TETO } from "../data/siemensCatalog";
import ProjectsPanel from "./ProjectsPanel";
import { useCapacitorProjects } from "../hooks/useCapacitorProjects";

const STORAGE_KEY = "capacitores.v1";
const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const fmt = (n, d = 1) => (n == null ? "—" : n.toFixed(d).replace(".", ","));

// Escala fixa do desenho da placa: cada milímetro real vira ESCALA_PX px na
// tela. É o que torna a vista proporcional e comparável entre bancos — sem
// isso o SVG preenchia a largura do container e uma placa estreita e alta
// (célula empilhada) esticava a altura pra manter a proporção, ficando enorme.
// 0,6 px/mm ≈ 1:6 na tela; max-width:100% ainda encolhe junto em telas estreitas.
const ESCALA_PX = 0.6;

// Dropdown de potência de célula: catálogo + "Outra..." abrindo campo livre.
function SeletorPotencia({ value, onChange }) {
  const custom = !POTENCIAS_CELULA.includes(value);
  return (
    <div className="flex gap-1">
      <select
        value={custom ? "outra" : value}
        onChange={(e) => onChange(e.target.value === "outra" ? 0 : Number(e.target.value))}
        className={inputCls}
      >
        {POTENCIAS_CELULA.map((p) => (
          <option key={p} value={p}>{String(p).replace(".", ",")} kvar</option>
        ))}
        <option value="outra">Outra...</option>
      </select>
      {custom && (
        <input
          type="number"
          min="0"
          step="0.1"
          value={value || ""}
          placeholder="kvar"
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputCls} w-24`}
          autoFocus
        />
      )}
    </div>
  );
}

// Id estável do estágio: é o que amarra o arranjo da placa à célula, mesmo
// quando outro estágio some da lista e os índices deslocam.
const novoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `e${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

function estadoInicial() {
  // Merge com os defaults: estados salvos antes de um campo existir (ex.: os
  // da placa de montagem) ganham o valor default em vez de undefined.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const salvo = { ...defaults(), ...JSON.parse(raw) };
      // Estados salvos antes do arrasto existir não têm id nos estágios.
      return { ...salvo, estagios: salvo.estagios.map((e) => ({ ...e, id: e.id ?? novoId() })) };
    }
  } catch { /* estado inicial */ }
  return defaults();
}

function defaults() {
  return {
    vRede: 380,
    vCapacitor: 440,
    fatorDisjEstagio: 1.63,
    fatorDisjGeral: 1.25,
    fatorContator: 1.43,
    // "generica" dimensiona por corrente (disjuntor comercial); "siemens"
    // acrescenta os códigos do configurador (capacitor, contator, proteção).
    marca: "generica",
    // Com Siemens: proteger cada célula por "disjuntor" ou por "fusivel"
    // (fusível NH + seccionadora porta-fusíveis). Decide quais colunas de
    // proteção aparecem na tela e no relatório.
    protecaoSiemens: "disjuntor",
    trafoKva: "",
    percentualAlvo: 33,
    estagios: [],
    // Placa de montagem — "auto" usa o Ø típico do catálogo por kvar
    // (DIAMETROS_CELULA); um número trava todas as células no mesmo Ø.
    placaDiametro: "auto",
    placaEspacamento: 40,
    placaMargem: 50,
    placaCelulasPorFileira: 6,
    // Arranjo das células nos slots da grade (lista de chaves), quando o
    // usuário arrastou algo. null = automático, na ordem dos estágios.
    placaOrdem: null,
  };
}

// Vista superior da placa de montagem: células cilíndricas (vista de topo =
// círculos) em grade, com as dimensões mínimas da placa cotadas. SVG em mm.
// Arrastar uma célula troca ela de slot com a de destino (ver onTrocar) — a
// grade continua governando a placa, então a cota segue sendo um cálculo.
function PlacaMontagem({ placa, dark, onTrocar, medidasApos, svgRef }) {
  const { celulas, slots } = placa;
  // { slot, dx, dy, x, y, alvo } enquanto uma célula está sendo arrastada.
  // `slot` e `alvo` são índices na grade (placa.slots), não na lista de células
  // — é o que permite soltar num slot vazio.
  const [drag, setDrag] = useState(null);

  // Pixel de tela → milímetro do desenho.
  const paraMm = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // Percorre a grade inteira, e não só as células — soltar num slot vazio é o
  // que deixa juntar as células e encolher a placa.
  const slotMaisProximo = (x, y) => {
    let melhor = null;
    let menor = Infinity;
    slots.forEach((s) => {
      const d = (s.cx - x) ** 2 + (s.cy - y) ** 2;
      if (d < menor) {
        menor = d;
        melhor = s.idx;
      }
    });
    return melhor;
  };

  const iniciar = (c) => (e) => {
    if (!onTrocar) return;
    // Captura no <svg>, não no <g> da célula: ao começar o arrasto a célula é
    // remontada no fim do desenho (pra ficar por cima), o nó antigo morre e
    // levaria a captura junto — os pointermove/up cairiam em quem estivesse
    // sob o cursor, e em cima de espaço vazio não cai em ninguém.
    // A captura é reforço (segura o arrasto se o cursor sair do desenho), não
    // requisito: sem ela os handlers do <svg> continuam valendo.
    try {
      svgRef.current.setPointerCapture(e.pointerId);
    } catch { /* ponteiro já solto */ }
    // A célula acompanha o cursor pelo centro, sem guardar o ponto da pegada:
    // ao começar o arrasto a vista passa a cobrir a grade inteira e a escala
    // do SVG muda, então um offset medido agora valeria a escala antiga e a
    // célula pularia no primeiro movimento. Começa na casa dela, sem piscar.
    setDrag({ slot: c.idx, x: c.cx, y: c.cy, alvo: c.idx });
  };
  const mover = (e) => {
    if (!drag) return;
    const p = paraMm(e);
    setDrag((d) => (d ? { ...d, x: p.x, y: p.y, alvo: slotMaisProximo(p.x, p.y) } : d));
  };
  // O alvo é recalculado aqui, no ponto onde a célula foi realmente solta — o
  // `alvo` do estado serve só pra destacar o slot durante o arrasto, e seria
  // um alvo velho se o último pointermove não coincidisse com a solta.
  const soltar = (e) => {
    if (!drag) return;
    const p = paraMm(e);
    const alvo = slotMaisProximo(p.x, p.y);
    if (alvo != null && alvo !== drag.slot) onTrocar(drag.slot, alvo);
    setDrag(null);
  };
  const cancelar = () => setDrag(null);

  if (!celulas.length) return null;

  // A placa desenhada é a que resultaria de soltar a célula onde ela está
  // agora: o usuário vê a cota do destino antes de commitar.
  const previa = drag && drag.alvo != null && drag.alvo !== drag.slot ? medidasApos(drag.slot, drag.alvo) : null;
  const largura = previa?.largura ?? placa.largura;
  const altura = previa?.altura ?? placa.altura;
  // Durante o arrasto a vista cobre a grade inteira — a placa pode estar mais
  // estreita que ela, e sem isso os slots livres à direita ficariam cortados.
  // Depende só da grade (não do alvo), então não treme enquanto se arrasta.
  const vistaL = drag ? Math.max(placa.gradeLargura, largura) : largura;
  // gradeAltura inclui a fileira-vaga de pouso, então ela aparece assim que o
  // usuário pega uma célula — sem isso, arrastar para baixo ficava cortado.
  const vistaA = drag ? Math.max(placa.gradeAltura, altura) : altura;

  const fonte = Math.max(10, vistaL / 55);
  // A faixa das cotas e o respiro do viewBox acompanham a fonte — fixos, o
  // texto rotacionado da cota vertical vazava pra fora da imagem nas placas
  // largas (a fonte escala com a largura, a faixa não escalava).
  const cota = fonte * 2.4;
  const pad = fonte * 1.4;
  const corCota = dark ? "#8f9aa5" : "#64748b";
  // A caneca é prateada nos dois temas, então o texto sobre ela é sempre
  // escuro — no dark mode o texto claro sumia em cima do alumínio.
  const corTextoCelula = "#2b333a";

  // viewBox em mm; a largura na tela sai de mm × escala fixa, então o desenho
  // cresce com a placa em vez de esticar pra preencher o container.
  const vbW = vistaL + cota + pad * 2;
  const vbH = vistaA + cota + pad * 2;

  const celulaSvg = (c, arrastada) => {
    const cx = arrastada ? drag.x : c.cx;
    const cy = arrastada ? drag.y : c.cy;
    return (
      <g
        key={c.key}
        onPointerDown={iniciar(c)}
        style={{ cursor: onTrocar ? (arrastada ? "grabbing" : "grab") : "default" }}
        opacity={arrastada ? 0.9 : 1}
      >
        <circle cx={cx} cy={cy} r={c.d / 2} fill="url(#celula-topo)" stroke="#6b7480" strokeWidth={c.d / 60} />
        {/* terminal central da caneca */}
        <circle cx={cx} cy={cy} r={c.d / 9} fill={dark ? "#39424a" : "#5c6670"} />
        <text x={cx} y={cy - c.d / 5} textAnchor="middle" fontSize={fonte} fontWeight="600" fill={corTextoCelula} fontFamily="JetBrains Mono, monospace">
          E{String(c.estagio).padStart(2, "0")}
        </text>
        <text x={cx} y={cy + c.d / 2.9} textAnchor="middle" fontSize={fonte * 0.85} fill={corTextoCelula} fontFamily="JetBrains Mono, monospace">
          {String(c.kvar).replace(".", ",")}
        </text>
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-(cota + pad)} ${-pad} ${vbW} ${vbH}`}
      className="block mx-auto select-none"
      style={{ touchAction: "none", width: `${vbW * ESCALA_PX}px`, maxWidth: "100%", height: "auto" }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={cancelar}
      role="img"
      aria-label={`Placa de montagem ${Math.round(largura)} × ${Math.round(altura)} mm`}
    >
      <defs>
        <radialGradient id="celula-topo" cx="38%" cy="35%" r="72%">
          <stop offset="0%" stopColor="#eef1f4" />
          <stop offset="55%" stopColor="#b7bec8" />
          <stop offset="100%" stopColor="#7c8794" />
        </radialGradient>
      </defs>
      {/* a placa */}
      <rect
        x="0"
        y="0"
        width={largura}
        height={altura}
        fill={dark ? "#232a30" : "#e8ebee"}
        stroke={dark ? "#4b565f" : "#94a3b8"}
        strokeWidth={largura / 400}
      />
      {/* slots livres: só aparecem durante o arrasto, pra não poluir o desenho
          — é onde dá pra soltar a célula e juntar o banco */}
      {drag &&
        slots
          .filter((s) => !s.key && s.idx !== drag.alvo)
          .map((s) => (
            <circle
              key={s.idx}
              cx={s.cx}
              cy={s.cy}
              r={placa.diametro / 2}
              fill="none"
              stroke={corCota}
              strokeWidth={fonte / 8}
              strokeDasharray={`${fonte / 3} ${fonte / 3}`}
              opacity="0.45"
            />
          ))}
      {/* origem: marca em vermelho pontilhado a casa de onde a célula saiu,
          pra o usuário não perder de vista de onde está movendo */}
      {drag && (
        <circle
          cx={slots[drag.slot].cx}
          cy={slots[drag.slot].cy}
          r={placa.diametro / 2}
          fill="none"
          stroke={dark ? "#f87171" : "#dc2626"}
          strokeWidth={fonte / 6}
          strokeDasharray={`${fonte / 2} ${fonte / 3}`}
        />
      )}
      {/* slot de destino do arrasto */}
      {drag && drag.alvo != null && drag.alvo !== drag.slot && (
        <circle
          cx={slots[drag.alvo].cx}
          cy={slots[drag.alvo].cy}
          r={placa.diametro / 2 + fonte * 0.35}
          fill="none"
          stroke={dark ? "#d98a4b" : "#b4622a"}
          strokeWidth={fonte / 5}
          strokeDasharray={`${fonte / 2} ${fonte / 3}`}
        />
      )}
      {/* células — a arrastada sai da ordem e é redesenhada por último, pra
          ficar por cima das demais (SVG pinta na ordem do documento) */}
      {celulas.map((c) => (drag?.slot === c.idx ? null : celulaSvg(c, false)))}
      {drag && celulaSvg(celulas.find((c) => c.idx === drag.slot), true)}
      {/* cota horizontal (embaixo) */}
      <g stroke={corCota} strokeWidth={largura / 600}>
        <line x1="0" y1={altura + cota * 0.72} x2={largura} y2={altura + cota * 0.72} />
        <line x1="0" y1={altura + fonte * 0.3} x2="0" y2={altura + cota * 0.9} />
        <line x1={largura} y1={altura + fonte * 0.3} x2={largura} y2={altura + cota * 0.9} />
      </g>
      <text x={largura / 2} y={altura + cota * 0.72 - fonte * 0.35} textAnchor="middle" fontSize={fonte} fill={corCota} fontFamily="JetBrains Mono, monospace">
        {Math.round(largura)} mm
      </text>
      {/* cota vertical (esquerda) */}
      <g stroke={corCota} strokeWidth={largura / 600}>
        <line x1={-cota * 0.72} y1="0" x2={-cota * 0.72} y2={altura} />
        <line x1={-cota * 0.9} y1="0" x2={-fonte * 0.3} y2="0" />
        <line x1={-cota * 0.9} y1={altura} x2={-fonte * 0.3} y2={altura} />
      </g>
      <text
        x={-cota * 0.72 - fonte * 0.35}
        y={altura / 2}
        textAnchor="middle"
        fontSize={fonte}
        fill={corCota}
        fontFamily="JetBrains Mono, monospace"
        transform={`rotate(-90 ${-cota * 0.72 - fonte * 0.35} ${altura / 2})`}
      >
        {Math.round(altura)} mm
      </text>
    </svg>
  );
}

// Aba Capacitores: dimensionamento de banco de capacitores — correção da
// potência pela tensão de aplicação, corrente e disjuntor por estágio e a
// régua "banco ≈ 33% do trafo". Migração da planilha CAPAC-380 PARA 440.xlsx;
// o motor de cálculo (capacitorBank.js) tem a planilha como fixture de teste.
export default function CapacitoresTab({ dark }) {
  const [st, setSt] = useState(estadoInicial);
  // Formulário de novo estágio. `editando` guarda o índice do estágio em edição
  // (null = criando um novo) — ao editar, o formulário vira "salvar".
  const [numCelulas, setNumCelulas] = useState(1);
  const [pot1, setPot1] = useState(33.7);
  const [pot2, setPot2] = useState(33.7);
  const [repetir, setRepetir] = useState(1);
  const [editando, setEditando] = useState(null);
  // SVG da placa, para embutir no relatório PDF.
  const placaSvgRef = useRef(null);

  // Registro de projetos (Supabase). O estado do banco inteiro é salvo/carregado
  // como um projeto nomeado; sem projeto ativo a aba começa zerada.
  const projectsApi = useCapacitorProjects();
  const [activeProject, setActiveProject] = useState(null);
  // Volta o formulário de novo estágio ao padrão (usado ao carregar/desvincular).
  const resetForm = () => {
    setNumCelulas(1);
    setPot1(33.7);
    setPot2(33.7);
    setRepetir(1);
    setEditando(null);
  };
  const handleCreateProject = async (nome, state) => {
    const criado = await projectsApi.createProject(nome, state);
    setActiveProject({ id: criado.id, nome: criado.nome });
  };
  const handleSaveChanges = async (id, state) => {
    await projectsApi.updateProject(id, state);
  };
  const handleLoadProject = async (id) => {
    const salvo = await projectsApi.loadProject(id);
    const dados = { ...defaults(), ...(salvo.dados || {}) };
    // Garante id em cada estágio (projetos antigos podem não ter) — é o que
    // amarra o arranjo da placa à célula.
    setSt({ ...dados, estagios: (dados.estagios || []).map((e) => ({ ...e, id: e.id ?? novoId() })) });
    setActiveProject({ id: salvo.id, nome: salvo.nome });
    resetForm();
  };
  const handleDeleteProject = async (id) => {
    await projectsApi.deleteProject(id);
    if (activeProject?.id === id) setActiveProject(null);
  };
  const handleUnlinkProject = () => {
    if (!window.confirm("Desvincular e zerar a aba (parâmetros, estágios e placa)?")) return;
    setActiveProject(null);
    setSt(defaults());
    resetForm();
  };

  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch { /* quota */ }
  }, [st]);

  const vRede = Number(st.vRede) || 0;
  const vCapacitor = Number(st.vCapacitor) || 0;
  const entradasOk = vRede > 0 && vCapacitor > 0;

  const banco = entradasOk
    ? calcularBanco({
        vRede,
        vCapacitor,
        fatorDisjEstagio: Number(st.fatorDisjEstagio) || 1.63,
        fatorDisjGeral: Number(st.fatorDisjGeral) || 1.25,
        fatorContator: Number(st.fatorContator) || 1.43,
        estagios: st.estagios,
        trafo:
          Number(st.trafoKva) > 0
            ? { kva: Number(st.trafoKva), percentualAlvo: Number(st.percentualAlvo) || 33 }
            : null,
      })
    : null;

  // Com a marca Siemens, cada célula tem contator e proteção próprios no
  // modelo do configurador — os códigos saem na tela e no relatório. A
  // proteção exibida é a escolhida: disjuntor ou fusível + seccionadora.
  const equipamentos =
    st.marca === "siemens" && banco && st.estagios.length > 0
      ? equipamentosSiemens(st.estagios, vCapacitor, banco.estagios.map((e) => e.disjComercial))
      : null;
  const protecao = st.protecaoSiemens === "fusivel" ? "fusivel" : "disjuntor";

  const celulasDoForm = () => (numCelulas === 2 ? [pot1, pot2] : [pot1]);

  const adicionarEstagios = () => {
    const celulas = celulasDoForm();
    if (celulas.some((c) => !(c > 0))) return;
    const n = Math.max(1, Math.min(50, Math.round(Number(repetir) || 1)));
    set({ estagios: [...st.estagios, ...Array.from({ length: n }, () => ({ id: novoId(), celulas }))] });
    setRepetir(1);
  };

  // Abre um estágio no formulário. Mantemos o id ao salvar, então o arranjo da
  // placa sobrevive à edição (a chave da célula é id do estágio + índice).
  const editarEstagio = (i) => {
    const e = st.estagios[i];
    setEditando(i);
    setNumCelulas(e.celulas.length);
    setPot1(e.celulas[0]);
    setPot2(e.celulas[1] ?? e.celulas[0]);
  };
  const cancelarEdicao = () => setEditando(null);
  const salvarEdicao = () => {
    const celulas = celulasDoForm();
    if (celulas.some((c) => !(c > 0))) return;
    // Preserva o id: se o nº de células mudar, reconciliarOrdem trata a chave
    // que sumiu como buraco e encaixa a nova — o resto do arranjo fica de pé.
    set({ estagios: st.estagios.map((e, j) => (j === editando ? { ...e, celulas } : e)) });
    setEditando(null);
  };

  // O arranjo da placa sobrevive a adicionar/remover — as chaves apontam para
  // o id do estágio, e reconciliarOrdem descarta as que sumiram (ver layout).
  const removerEstagio = (i) => {
    if (editando === i) setEditando(null);
    set({ estagios: st.estagios.filter((_, j) => j !== i) });
  };
  const removerTodos = () => {
    setEditando(null);
    set({ estagios: [], placaOrdem: null });
  };

  const paramsPlaca = {
    estagios: st.estagios,
    diametro: st.placaDiametro === "auto" ? "auto" : Number(st.placaDiametro) || 85,
    espacamento: Number(st.placaEspacamento) || 0,
    margem: Number(st.placaMargem) || 0,
    celulasPorFileira: Number(st.placaCelulasPorFileira) || 6,
  };
  const placa = layoutPlaca({ ...paramsPlaca, ordem: st.placaOrdem });

  // Arrasto na placa: as duas células trocam de slot. Grava a ordem já
  // reconciliada, então o arranjo salvo nunca guarda chave morta.
  const trocarSlots = (a, b) => set({ placaOrdem: trocarNaOrdem(placa.ordem, a, b) });
  // Que tamanho a placa teria se a célula fosse solta ali — o desenho mostra
  // isso durante o arrasto, antes de commitar. Mesmo motor da placa real, pra
  // a prévia não poder discordar do resultado.
  const medidasApos = (a, b) => {
    const p = layoutPlaca({ ...paramsPlaca, ordem: trocarNaOrdem(placa.ordem, a, b) });
    return { largura: p.largura, altura: p.altura };
  };
  const rearranjar = () => set({ placaOrdem: null });

  const exportarPDF = () =>
    exportCapacitorPDF({
      svgEl: placaSvgRef.current,
      projectName: activeProject?.nome,
      params: {
        vRede,
        vCapacitor,
        fatorDisjEstagio: Number(st.fatorDisjEstagio) || 1.63,
        fatorDisjGeral: Number(st.fatorDisjGeral) || 1.25,
        fatorContator: Number(st.fatorContator) || 1.43,
        percentualAlvo: Number(st.percentualAlvo) || 33,
      },
      banco,
      placa,
      equipamentos,
      protecao,
    });

  // Veredito do trafo: verde dentro de ±10% relativos do alvo, âmbar fora.
  const veredito = banco?.trafo
    ? Math.abs(banco.trafo.percentualAtingido - Number(st.percentualAlvo)) <=
      Number(st.percentualAlvo) * 0.1
    : null;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ==================== Coluna de entradas ==================== */}
      <div className="space-y-3">
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Projetos
          </h2>
          <ProjectsPanel
            projects={projectsApi.projects}
            loading={projectsApi.loading}
            error={projectsApi.error}
            refresh={projectsApi.refresh}
            activeProject={activeProject}
            onCreate={handleCreateProject}
            onSaveChanges={handleSaveChanges}
            onLoad={handleLoadProject}
            onDelete={handleDeleteProject}
            onUnlink={handleUnlinkProject}
            currentState={st}
          />
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Parâmetros
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tensão da rede (V)" tip="Tensão em que o banco vai operar. A potência entregue pelo capacitor cai com o quadrado da relação entre esta tensão e a nominal da célula.">
              <input type="number" min="1" value={st.vRede} onChange={(e) => set({ vRede: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Tensão do capacitor (V)" tip="Tensão nominal de placa das células capacitivas.">
              <input type="number" min="1" value={st.vCapacitor} onChange={(e) => set({ vCapacitor: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fator disj. estágio" tip="Sobredimensionamento do disjuntor de cada estágio. Capacitor exige folga por harmônicas e tolerância de +10% na tensão — a IEC pede suportar no mínimo 1,35×In; 1,63 é o usual de projeto.">
              <input type="number" min="1" step="0.01" value={st.fatorDisjEstagio} onChange={(e) => set({ fatorDisjEstagio: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fator disj. geral" tip="Sobredimensionamento do disjuntor geral do banco (1,25 usual — os estágios não chaveiam todos juntos).">
              <input type="number" min="1" step="0.01" value={st.fatorDisjGeral} onChange={(e) => set({ fatorDisjGeral: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fator contator" tip="Corrente mínima do contator de cada estágio = In × este fator. 1,43 = 1,3 (harmônicas, IEC 60831) × 1,1 (tolerância de capacitância). É um piso de especificação — contator dedicado a capacitor (ex.: WEG CWMC) é escolhido por kvar no catálogo.">
              <input type="number" min="1" step="0.01" value={st.fatorContator} onChange={(e) => set({ fatorContator: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Marca" tip="Genérica dimensiona por corrente (disjuntor comercial mais próximo). Siemens acrescenta, na tela e no relatório, os códigos do configurador oficial: capacitor B32, contator 3MT7 e a proteção de cada célula.">
              <select value={st.marca ?? "generica"} onChange={(e) => set({ marca: e.target.value })} className={inputCls}>
                <option value="generica">Genérica</option>
                <option value="siemens">Siemens</option>
              </select>
            </Field>
            {st.marca === "siemens" && (
              <Field label="Proteção da célula" tip="Disjuntor usa os códigos 5SY/3VJ/3VM/3VA do configurador. Seccionadora porta-fusíveis usa o fusível NH (3NA/3NE) com a seccionadora 3NP/3NH correspondente.">
                <select value={st.protecaoSiemens ?? "disjuntor"} onChange={(e) => set({ protecaoSiemens: e.target.value })} className={inputCls}>
                  <option value="disjuntor">Disjuntor</option>
                  <option value="fusivel">Seccionadora porta-fusíveis</option>
                </select>
              </Field>
            )}
          </div>
          {entradasOk && (
            <div className="mt-2 rounded-xs border border-copper-200 bg-copper-50 px-2.5 py-1.5 text-[13px] text-copper-800 dark:border-copper-500/30 dark:bg-copper-500/10 dark:text-copper-300">
              Fator de correção: <b className="font-mono">({vRede}/{vCapacitor})² = {banco.fatorTensao.toFixed(3).replace(".", ",")}</b>
              {banco.fatorTensao === 1 && " — capacitor na tensão nominal, sem correção"}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Potência do trafo (kVA)" tip="Opcional. Informando, o app compara o banco montado com o alvo percentual do trafo.">
              <input type="number" min="0" value={st.trafoKva} placeholder="opcional" onChange={(e) => set({ trafoKva: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Alvo (% do trafo)" tip="Régua usual de projeto: banco de capacitores em torno de 33% da potência do transformador.">
              <input type="number" min="1" max="100" value={st.percentualAlvo} onChange={(e) => set({ percentualAlvo: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Estágios
            </h2>
            {st.estagios.length > 0 && (
              <button
                type="button"
                onClick={removerTodos}
                className="text-[12px] text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
              >
                remover todos
              </button>
            )}
          </div>
          {editando != null && (
            <div className="mb-2 flex items-center justify-between rounded-xs bg-copper-50 px-2.5 py-1 text-[12px] text-copper-800 dark:bg-copper-500/10 dark:text-copper-300">
              <span>Editando o estágio {String(editando + 1).padStart(2, "0")}</span>
              <button type="button" onClick={cancelarEdicao} className="font-medium underline-offset-2 hover:underline">
                cancelar
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Células por estágio">
              <select value={numCelulas} onChange={(e) => setNumCelulas(Number(e.target.value))} className={inputCls}>
                <option value={1}>1 célula</option>
                <option value={2}>2 células</option>
              </select>
            </Field>
            {editando == null && (
              <Field label="Repetir">
                <input type="number" min="1" max="50" value={repetir} onChange={(e) => setRepetir(e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label={numCelulas === 2 ? "Célula 1 (kvar)" : "Célula (kvar)"} tip="Potência de placa da célula, na tensão nominal dela. Lista consolidada dos catálogos ABB/WEG; use Outra... para valores fora dela.">
              <SeletorPotencia value={pot1} onChange={setPot1} />
            </Field>
            {numCelulas === 2 && (
              <Field label="Célula 2 (kvar)">
                <SeletorPotencia value={pot2} onChange={setPot2} />
              </Field>
            )}
          </div>
          <button
            type="button"
            onClick={editando != null ? salvarEdicao : adicionarEstagios}
            className="mt-2 w-full rounded-xs bg-copper-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-copper-700 dark:bg-copper-500 dark:hover:bg-copper-600"
          >
            {editando != null ? "salvar alterações" : `+ estágio${Number(repetir) > 1 ? `s (${repetir}×)` : ""}`}
          </button>

          {st.estagios.length > 0 && (
            <ul className="mt-2 space-y-1">
              {st.estagios.map((e, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-xs border px-2 py-1 text-[13px] ${
                    editando === i
                      ? "border-copper-400 bg-copper-50 dark:border-copper-500/50 dark:bg-copper-500/10"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span
                    className="font-mono text-slate-700 dark:text-slate-200"
                    title={e.celulas
                      .map((c) => {
                        const cel = CELULAS_SIEMENS_440V[c];
                        return cel ? `${String(c).replace(".", ",")} kvar: ${cel.codigo} (Ø${String(cel.d).replace(".", ",")}×${cel.h}mm)` : null;
                      })
                      .filter(Boolean)
                      .join("\n") || undefined}
                  >
                    EST {String(i + 1).padStart(2, "0")} — {e.celulas.map((c) => String(c).replace(".", ",")).join(" + ")} kvar
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editarEstagio(i)}
                      className="text-[12px] text-slate-400 transition hover:text-copper-600 dark:hover:text-copper-400"
                    >
                      editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removerEstagio(i)}
                      className="text-[12px] text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                    >
                      remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ==================== Coluna de resultados ==================== */}
      <div className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Resultado
          </h2>
          {banco && banco.estagios.length > 0 && (
            <button
              type="button"
              onClick={exportarPDF}
              className="rounded-xs border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Relatório PDF
            </button>
          )}
        </div>
        {!banco || banco.estagios.length === 0 ? (
          <div className="rounded-sm border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Adicione estágios ao lado — cada linha mostra a potência corrigida
            para a tensão da rede, a corrente e o disjuntor do estágio.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-display text-[11px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <th className="py-1.5 pr-2">#</th>
                    <th className="py-1.5 pr-2">kvar @{vCapacitor}V</th>
                    <th className="py-1.5 pr-2">kvar @{vRede}V</th>
                    <th className="py-1.5 pr-2">Corrente</th>
                    <th className="py-1.5 pr-2" title="Corrente mínima do contator do estágio (In × fator contator)">Contator</th>
                    <th className="py-1.5">Disjuntor</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {banco.estagios.map((e) => (
                    <tr key={e.numero} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                      <td className="py-1 pr-2 text-slate-400 dark:text-slate-500">{String(e.numero).padStart(2, "0")}</td>
                      <td className="py-1 pr-2">{fmt(e.kvarNominal)}</td>
                      <td className="py-1 pr-2">{fmt(e.kvarReal)}</td>
                      <td className="py-1 pr-2">{fmt(e.corrente)} A</td>
                      <td className="py-1 pr-2">≥ {fmt(e.contatorMin)} A</td>
                      <td className="py-1">
                        {fmt(e.disjCalculado)} A →{" "}
                        {e.disjComercial ? (
                          <b>{e.disjComercial} A</b>
                        ) : (
                          <b className="text-red-600 dark:text-red-400">acima da escala</b>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-xs border border-copper-300 bg-copper-50 p-2.5 dark:border-copper-500/40 dark:bg-copper-500/10">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[13px] text-copper-900 dark:text-copper-200 sm:grid-cols-4">
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">kvar @{vCapacitor}V</div>
                  {fmt(banco.kvarNominalTotal)}
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">kvar @{vRede}V</div>
                  {fmt(banco.kvarRealTotal)}
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">Corrente total</div>
                  {fmt(banco.correnteTotal)} A
                </div>
                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.08em] opacity-70">Disj. geral</div>
                  {fmt(banco.disjGeralCalculado)} A →{" "}
                  {banco.disjGeralComercial ? <b>{banco.disjGeralComercial} A</b> : <b className="text-red-600 dark:text-red-400">acima da escala</b>}
                </div>
              </div>
            </div>

            {equipamentos && (
              <div className="mt-3">
                <h3 className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Equipamentos Siemens (configurador)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left font-display text-[10px] uppercase tracking-[0.06em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">Células</th>
                        <th className="py-1 pr-2">Capacitor</th>
                        <th className="py-1 pr-2" title="Contator do ESTÁGIO (bobina 240V 50-60Hz), pelo kvar total — o estágio chaveia inteiro, mesma régua dos módulos MT do configurador">Contator</th>
                        {protecao === "disjuntor" ? (
                          <th className="py-1" title="Disjuntor do ESTÁGIO, pela linha do catálogo com kvar ≥ total do estágio">Disjuntor</th>
                        ) : (
                          <>
                            <th className="py-1 pr-2" title="Fusível NH do ESTÁGIO, pela linha do catálogo com kvar ≥ total do estágio">Fusível</th>
                            <th className="py-1" title="Seccionadora porta-fusíveis correspondente">Seccionadora</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="font-mono text-slate-700 dark:text-slate-200">
                      {equipamentos.map((e) => {
                        // Divisão sugerida em estágios de célula única — é como o
                        // próprio configurador Siemens monta bancos grandes.
                        const divisao = e.celulas
                          .map((c) => `${c.qtd} estágio${c.qtd > 1 ? "s" : ""} de ${String(c.kvar).replace(".", ",")} kvar`)
                          .join(" + ");
                        const foraTotal = (
                          <span
                            className="text-amber-600 dark:text-amber-400"
                            title={`${fmt(e.kvarTotal)} kvar passa do maior contator Siemens (${CONTATOR_TETO.codigo}, ${CONTATOR_TETO.maxKvar} kvar). Divida em ${divisao} (1 célula por estágio, como o configurador faz), ou dimensione pela corrente da tabela de estágios acima.`}
                          >
                            fora do catálogo
                          </span>
                        );
                        const refTip = e.protecao?.viaAmpere != null
                          ? `Disjuntor de ${e.protecao.viaAmpere} A — corrente comercial do estágio (In × fator disj.), acima da faixa do configurador`
                          : e.protecao && e.protecao.kvarRef !== e.kvarTotal
                          ? `Linha de ${String(e.protecao.kvarRef).replace(".", ",")} kvar do catálogo (menor que cobre os ${fmt(e.kvarTotal)} kvar do estágio)`
                          : undefined;
                        return (
                          <tr key={e.numero} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-1 pr-2 text-slate-400 dark:text-slate-500">{String(e.numero).padStart(2, "0")}</td>
                            <td className="py-1 pr-2 whitespace-nowrap" title={`${fmt(e.kvarTotal)} kvar no estágio`}>
                              {e.celulas.map((c) => `${c.qtd}× ${String(c.kvar).replace(".", ",")}`).join(" + ")} kvar
                            </td>
                            <td className="py-1 pr-2">
                              {e.celulas.map((c, j) => (
                                <div key={j} className="whitespace-nowrap">
                                  {c.encontrado ? (
                                    <span title={`Código de pedido: ${c.codigoPedido}`}>{c.codigo}</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      {String(c.kvar).replace(".", ",")} kvar não existe em {vCapacitor}V
                                    </span>
                                  )}
                                </div>
                              ))}
                            </td>
                            <td className="py-1 pr-2 whitespace-nowrap">{e.contator ?? foraTotal}</td>
                            {protecao === "disjuntor" ? (
                              <td className="py-1 whitespace-nowrap" title={refTip}>
                                {e.protecao ? (
                                  e.protecao.disjuntor ?? (
                                    <span className="text-amber-600 dark:text-amber-400" title="O configurador não indica disjuntor para esta faixa — usar fusível NH com seccionadora">
                                      sem disjuntor — usar fusível
                                    </span>
                                  )
                                ) : foraTotal}
                              </td>
                            ) : (
                              <>
                                <td className="py-1 pr-2 whitespace-nowrap" title={refTip}>
                                  {e.protecao?.fusivel ? `${e.protecao.fusivel} ${e.protecao.fusivelIn}A` : foraTotal}
                                </td>
                                <td className="py-1 whitespace-nowrap">{e.protecao?.baseFusivel ?? ""}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Contator (bobina 240V 50-60Hz) e proteção por estágio, dimensionados pelo kvar total — o estágio chaveia inteiro. Códigos do configurador Siemens.
                </p>
              </div>
            )}

            {banco.trafo && (
              <div
                className={`mt-2 rounded-xs px-2.5 py-1.5 text-[13px] font-medium ${
                  veredito
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                Banco real {fmt(banco.kvarRealTotal)} kvar = <b>{fmt(banco.trafo.percentualAtingido)}%</b> do trafo
                (alvo {fmt(Number(st.percentualAlvo), 0)}% = {fmt(banco.trafo.alvoKvar)} kvar)
              </div>
            )}
          </>
        )}
      </div>

      {st.estagios.length > 0 && (
        <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              Placa de montagem — vista superior
            </h2>
            <div className="flex items-center gap-3">
              {st.placaOrdem && (
                <button
                  type="button"
                  onClick={rearranjar}
                  className="text-[12px] text-slate-400 transition hover:text-copper-600 dark:hover:text-copper-400"
                >
                  rearranjar automaticamente
                </button>
              )}
              <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                placa mín. {Math.round(placa.largura)} × {Math.round(placa.altura)} mm
              </span>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Ø célula (mm)" tip="Automático usa o Ø do configurador Siemens (células B32, 440V/60Hz) por kvar: Ø53 até 2,5 kvar, Ø63,5 até 6, Ø75 até 12 e Ø85 acima — o 33,7 kvar (B32344E4282Z040) é Ø85×348mm. WEG UCWT fica próximo. Manual trava todas as células no mesmo Ø.">
              <div className="flex gap-1">
                <select
                  value={st.placaDiametro === "auto" ? "auto" : "manual"}
                  onChange={(e) => set({ placaDiametro: e.target.value === "auto" ? "auto" : 85 })}
                  className={inputCls}
                >
                  <option value="auto">Automático</option>
                  <option value="manual">Manual</option>
                </select>
                {st.placaDiametro !== "auto" && (
                  <input
                    type="number"
                    min="10"
                    value={st.placaDiametro}
                    onChange={(e) => set({ placaDiametro: e.target.value })}
                    className={`${inputCls} w-20`}
                  />
                )}
              </div>
            </Field>
            <Field label="Espaçamento (mm)" tip="Folga entre células, para ventilação e passagem da fiação.">
              <input type="number" min="0" value={st.placaEspacamento} onChange={(e) => set({ placaEspacamento: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Margem (mm)" tip="Distância da primeira/última célula até a borda da placa.">
              <input type="number" min="0" value={st.placaMargem} onChange={(e) => set({ placaMargem: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Células por fileira">
              <input type="number" min="1" max="20" value={st.placaCelulasPorFileira} onChange={(e) => set({ placaCelulasPorFileira: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <PlacaMontagem placa={placa} dark={dark} onTrocar={trocarSlots} medidasApos={medidasApos} svgRef={placaSvgRef} />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Arraste um capacitor para trocá-lo de lugar com outro, movê-lo para um espaço vazio ou
            puxá-lo para a fileira de baixo — juntando as células a placa encolhe, espalhando-as ela
            cresce. Layout de referência: a placa mínima vai até a última posição ocupada (margem +
            células + espaçamentos). Confira os diâmetros no catálogo do fabricante antes de fabricar.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
