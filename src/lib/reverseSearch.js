import { INFRA_TYPES, ELETRODUTO_NORMAS, getDimensions } from "../data/corfioHEPR";
import {
  layoutCables,
  layoutCablesCircular,
  layoutCablesSplit,
  splitWidthByArea,
  rectFits,
  circularFits,
  countLayers,
  SEPTUM_THICKNESS,
} from "./packing";
import { computeOccupancy } from "./occupancy";

const RECT_TYPES = ["eletrocalha", "perfilado", "leito", "aramado"];
// Septo divisor é um acessório real de calha/perfilado/leito (chapa fechada
// ou semi-fechada). Aramado (tela) e eletroduto (tubo redondo) não têm esse
// acessório na prática — trechos mistos de Força+Comando nesses dois tipos
// devem usar infraestruturas separadas, não são oferecidos aqui.
const SEPTUM_TYPES = ["eletrocalha", "perfilado", "leito"];
const INFRA_LABEL = Object.fromEntries(INFRA_TYPES.map((t) => [t.id, t.label]));

// Testa várias divisões de largura até achar uma que acomode fisicamente os
// dois compartimentos (força e comando) dentro do limite de ocupação da NBR
// 5410 de cada um — a divisão proporcional por área nem sempre é a que cabe.
function trySplit(cables, w, h, septum, maxLayers) {
  const forca = cables.filter((c) => c.type !== "comando");
  const comando = cables.filter((c) => c.type === "comando");
  const available = w - septum;
  if (available <= 0) return null;

  const proportional = splitWidthByArea(forca, comando, available);
  const ratios = [0.5, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8];
  const candidates = [proportional, ...ratios.map((r) => Math.round(available * r))];

  for (const w1 of candidates) {
    if (w1 < 1 || available - w1 < 1) continue;
    const result = layoutCablesSplit(cables, w, h, septum, w1);
    if (!result.fits) continue;
    const forcaOcc = computeOccupancy(forca, w1 * h, false);
    const comandoOcc = computeOccupancy(comando, result.w2 * h, false);
    if (!forcaOcc.dentroLimite || !comandoOcc.dentroLimite) continue;
    const camadas = countLayers(result.items);
    if (maxLayers && camadas > maxLayers) continue;
    return {
      splitX: w1,
      septum,
      ocupacao: Math.max(forcaOcc.ocupacao, comandoOcc.ocupacao),
      limite: Math.min(forcaOcc.limite, comandoOcc.limite),
      cableArea: forcaOcc.cableArea + comandoOcc.cableArea,
      camadas,
    };
  }
  return null;
}

// Modo reverso: dado um conjunto de cabos, testa TODAS as infraestruturas e
// normas cadastradas e retorna as que realmente comportam os cabos — não só
// pela conta de área % (necessária mas não suficiente), mas confirmando
// contra o mesmo motor de empacotamento físico (gravidade) usado na
// visualização. Ordenado da menor área útil para a maior.
export function findBestFits(cables, options = {}) {
  if (!cables || cables.length === 0) return [];
  const { maxLayers } = options; // opcional: limite de camadas de empilhamento
  const hasForca = cables.some((c) => c.type !== "comando");
  const hasComando = cables.some((c) => c.type === "comando");
  const mixed = hasForca && hasComando;
  const results = [];

  for (const infraType of mixed ? SEPTUM_TYPES : RECT_TYPES) {
    const dim = getDimensions(infraType);
    for (const w of dim.widths) {
      for (const h of dim.heights) {
        const trayArea = w * h;

        if (mixed) {
          const fit = trySplit(cables, w, h, SEPTUM_THICKNESS, maxLayers);
          if (!fit) continue;
          results.push({
            infraType,
            eletrodutoNorma: null,
            leitoFlange: "interna",
            trayWidth: w,
            trayHeight: h,
            trayArea,
            label: `${INFRA_LABEL[infraType]} ${w}×${h}mm (com septo divisor)`,
            hasSeptum: true,
            septum: fit.septum,
            splitX: fit.splitX,
            ocupacao: fit.ocupacao,
            limite: fit.limite,
            dentroLimite: true,
            cableArea: fit.cableArea,
            camadas: fit.camadas,
          });
          continue;
        }

        const occ = computeOccupancy(cables, trayArea, false);
        if (!occ.dentroLimite) continue; // já falha na área % — nem tenta empacotar
        const items = layoutCables(cables, w, h);
        if (!rectFits(items, w, h)) continue; // falhou fisicamente apesar da área % ok
        const camadas = countLayers(items);
        if (maxLayers && camadas > maxLayers) continue;
        results.push({
          infraType,
          eletrodutoNorma: null,
          leitoFlange: "interna",
          trayWidth: w,
          trayHeight: h,
          trayArea,
          label: `${INFRA_LABEL[infraType]} ${w}×${h}mm`,
          camadas,
          ...occ,
        });
      }
    }
  }

  if (!mixed) {
    for (const norma of ELETRODUTO_NORMAS) {
      const dim = getDimensions("eletroduto", norma.id);
      for (const size of dim.sizes) {
        const R = size.value / 2;
        const trayArea = Math.PI * R * R;
        const occ = computeOccupancy(cables, trayArea, true);
        if (!occ.dentroLimite) continue;
        const items = layoutCablesCircular(cables, R);
        if (!circularFits(items, R)) continue;
        const camadas = countLayers(items);
        if (maxLayers && camadas > maxLayers) continue;
        results.push({
          infraType: "eletroduto",
          eletrodutoNorma: norma.id,
          leitoFlange: "interna",
          trayWidth: size.value,
          trayHeight: size.value,
          trayArea,
          label: `Eletroduto ${norma.label} ${size.label}`,
          camadas,
          ...occ,
        });
      }
    }
  }

  results.sort((a, b) => a.trayArea - b.trayArea);
  return results;
}
