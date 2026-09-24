import { useState, useMemo } from "react";
import { getDiameter, getDimensions } from "../data/corfioHEPR";
import { computeOccupancy } from "../lib/occupancy";

let nextId = 1;

// Chave da linha em "Cabos no trecho". UMA função para agrupar e para remover:
// se as duas contas divergissem (uma sabendo do trifólio 2D e a outra não), o
// botão Remover de uma linha apagaria o cabo de outra.
export const chaveGrupo = (c) =>
  `${c.type}-${c.section}-${c.vias}-${c.trifolio ? (c.espacado ? "e" : "t") : "s"}-${c.material ?? "cobre"}-${c.groupId ?? ""}`;

export function useCableTray() {
  const [infraType, setInfraTypeRaw] = useState("eletrocalha");
  const [leitoFlange, setLeitoFlange] = useState("interna"); // abas do leito: interna | externa
  const [eletrodutoNorma, setEletrodutoNormaRaw] = useState("nbr5624"); // norma do eletroduto
  const [trayWidth, setTrayWidth] = useState(100);
  const [trayHeight, setTrayHeight] = useState(50);
  const [cables, setCables] = useState([]);

  // Ajusta trayWidth/trayHeight às medidas válidas de uma configuração de dimensões.
  const applyDimensions = (dim) => {
    if (dim.kind === "duct") {
      const values = dim.sizes.map((s) => s.value);
      setTrayWidth((w) => (values.includes(w) ? w : dim.default.w));
      setTrayHeight((h) => (values.includes(h) ? h : dim.default.h));
    } else {
      setTrayWidth((w) => (dim.widths.includes(w) ? w : dim.default.w));
      setTrayHeight((h) => (dim.heights.includes(h) ? h : dim.default.h));
    }
  };

  // Ao trocar a infraestrutura, ajusta as dimensões às medidas válidas do tipo.
  const setInfraType = (type) => {
    setInfraTypeRaw(type);
    applyDimensions(getDimensions(type, eletrodutoNorma));
  };

  // Ao trocar a norma do eletroduto, ajusta a bitola para uma válida na nova norma.
  const setEletrodutoNorma = (norma) => {
    setEletrodutoNormaRaw(norma);
    applyDimensions(getDimensions("eletroduto", norma));
  };

  // `groupId` é opcional — só usado pela importação de planilha, pra manter
  // cada ramal do memorial como uma linha própria em "Cabos do trecho" (sem
  // ele, dois cabos com a mesma especificação se juntam na mesma linha, o
  // comportamento normal ao adicionar manualmente pelo formulário).
  const addCable = ({ section, cableType, vias, groupId, material = "cobre" }) => {
    const d = getDiameter(section, cableType, vias, material);
    setCables((prev) => [
      ...prev,
      { id: nextId++, section, d, type: cableType, vias: cableType === "multipolar" ? vias : 1, material, ...(groupId ? { groupId } : {}) },
    ]);
  };

  // `espacado` é o botão "Trifólio 2D": o feixe entra na fileira com vão livre
  // de 2× o diâmetro. Como é um campo do cabo, vai junto no JSON de `cables` e
  // é salvo com o projeto sem precisar de coluna nova no Supabase.
  const addTrifolio = ({ section, groupId, material = "cobre", espacado = false }) => {
    const d = getDiameter(section, "unipolar", 1, material);
    setCables((prev) => [
      ...prev,
      {
        id: nextId++, section, d, type: "unipolar", vias: 1, trifolio: true, material,
        ...(espacado ? { espacado: true } : {}),
        ...(groupId ? { groupId } : {}),
      },
    ]);
  };

  // Adiciona um cabo já pronto (objeto completo, exceto id) — usado por
  // catálogos diferentes do Corfio (ex.: cabos de comando CABLIE), que têm
  // seu próprio formulário mas reaproveitam todo o resto (empacotamento,
  // ocupação, visualização).
  const addCustomCable = (partial) => {
    setCables((prev) => [...prev, { id: nextId++, ...partial }]);
  };

  const removeGroup = (groupKey) => {
    setCables((prev) => {
      const idx = prev.findIndex((c) => chaveGrupo(c) === groupKey);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeAll = () => setCables([]);

  // Zera tudo: infraestrutura, dimensões e cabos voltam ao estado inicial.
  // Usado ao desvincular de um projeto — não deve sobrar nada dele na tela.
  const resetAll = () => {
    setInfraTypeRaw("eletrocalha");
    setEletrodutoNormaRaw("nbr5624");
    setLeitoFlange("interna");
    setTrayWidth(100);
    setTrayHeight(50);
    setCables([]);
  };

  // Restaura de uma vez um projeto salvo (Supabase). Reatribui ids novos aos
  // cabos carregados para não colidir com o contador local de ids.
  const loadState = (saved) => {
    setInfraTypeRaw(saved.infra_type);
    setEletrodutoNormaRaw(saved.eletroduto_norma || "nbr5624");
    setLeitoFlange(saved.leito_flange || "interna");
    setTrayWidth(saved.tray_width);
    setTrayHeight(saved.tray_height);
    setCables((saved.cables || []).map((c) => ({ ...c, id: nextId++ })));
  };

  const groupedCables = useMemo(() => {
    const map = new Map();
    cables.forEach((c) => {
      const key = chaveGrupo(c);
      if (map.has(key)) {
        map.get(key).quantity += c.trifolio ? 3 : 1;
      } else {
        map.set(key, { ...c, key, quantity: c.trifolio ? 3 : 1 });
      }
    });
    return Array.from(map.values());
  }, [cables]);

  // Eletroduto tem seção circular: trayWidth guarda o diâmetro interno (mm).
  const isDuct = getDimensions(infraType, eletrodutoNorma).kind === "duct";
  const trayArea = isDuct ? Math.PI * Math.pow(trayWidth / 2, 2) : trayWidth * trayHeight;
  const { cableArea, ocupacao, limite, dentroLimite } = useMemo(
    () => computeOccupancy(cables, trayArea, isDuct),
    [cables, trayArea, isDuct]
  );

  return {
    infraType,
    setInfraType,
    leitoFlange,
    setLeitoFlange,
    eletrodutoNorma,
    setEletrodutoNorma,
    trayWidth,
    setTrayWidth,
    trayHeight,
    setTrayHeight,
    cables,
    groupedCables,
    addCable,
    addTrifolio,
    addCustomCable,
    removeGroup,
    removeAll,
    resetAll,
    loadState,
    trayArea,
    cableArea,
    ocupacao,
    limite,
    dentroLimite,
  };
}
