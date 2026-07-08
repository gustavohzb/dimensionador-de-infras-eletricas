import { useState, useMemo } from "react";
import { getDiameter, getDimensions } from "../data/corfioHEPR";

let nextId = 1;

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

  const addCable = ({ section, cableType, vias }) => {
    const d = getDiameter(section, cableType, vias);
    setCables((prev) => [
      ...prev,
      { id: nextId++, section, d, type: cableType, vias: cableType === "multipolar" ? vias : 1 },
    ]);
  };

  const addTrifolio = ({ section }) => {
    const d = getDiameter(section, "unipolar", 1);
    setCables((prev) => [
      ...prev,
      { id: nextId++, section, d, type: "unipolar", vias: 1, trifolio: true },
    ]);
  };

  const removeGroup = (groupKey) => {
    setCables((prev) => {
      const idx = prev.findIndex(
        (c) => `${c.section}-${c.vias}-${c.trifolio ? "t" : "s"}` === groupKey
      );
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeAll = () => setCables([]);

  const groupedCables = useMemo(() => {
    const map = new Map();
    cables.forEach((c) => {
      const key = `${c.section}-${c.vias}-${c.trifolio ? "t" : "s"}`;
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
  const cableArea = useMemo(
    () =>
      cables.reduce(
        (acc, c) => acc + Math.PI * Math.pow(c.d / 2, 2) * (c.trifolio ? 3 : 1),
        0
      ),
    [cables]
  );
  const ocupacao = trayArea > 0 ? (cableArea / trayArea) * 100 : 0;

  // Regra de ocupação da NBR 5410. Conta condutores, não "linhas" da lista —
  // um trifólio é fisicamente 3 condutores, não 1.
  // Eletroduto (seção circular): 1 condutor → 53%, 2 → 31%, 3 ou mais → 40%.
  // Demais infraestruturas (calha, perfilado, leito, aramado): 1 → 53%, 2+ → 40%.
  const conductorCount = cables.reduce((acc, c) => acc + (c.trifolio ? 3 : 1), 0);
  const limite = isDuct
    ? conductorCount === 1
      ? 53
      : conductorCount === 2
        ? 31
        : 40
    : conductorCount > 1
      ? 40
      : 53;
  const dentroLimite = ocupacao <= limite;

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
    removeGroup,
    removeAll,
    trayArea,
    cableArea,
    ocupacao,
    limite,
    dentroLimite,
  };
}
