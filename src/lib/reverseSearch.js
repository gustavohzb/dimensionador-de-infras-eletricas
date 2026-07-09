import { INFRA_TYPES, ELETRODUTO_NORMAS, getDimensions } from "../data/corfioHEPR";
import { layoutCables, layoutCablesCircular, rectFits, circularFits } from "./packing";
import { computeOccupancy } from "./occupancy";

const RECT_TYPES = ["eletrocalha", "perfilado", "leito", "aramado"];
const INFRA_LABEL = Object.fromEntries(INFRA_TYPES.map((t) => [t.id, t.label]));

// Modo reverso: dado um conjunto de cabos, testa TODAS as infraestruturas e
// normas cadastradas e retorna as que realmente comportam os cabos — não só
// pela conta de área % (necessária mas não suficiente), mas confirmando
// contra o mesmo motor de empacotamento físico (gravidade) usado na
// visualização. Ordenado da menor área útil para a maior.
export function findBestFits(cables) {
  if (!cables || cables.length === 0) return [];
  const results = [];

  for (const infraType of RECT_TYPES) {
    const dim = getDimensions(infraType);
    for (const w of dim.widths) {
      for (const h of dim.heights) {
        const trayArea = w * h;
        const occ = computeOccupancy(cables, trayArea, false);
        if (!occ.dentroLimite) continue; // já falha na área % — nem tenta empacotar
        const items = layoutCables(cables, w, h);
        if (!rectFits(items, w, h)) continue; // falhou fisicamente apesar da área % ok
        results.push({
          infraType,
          eletrodutoNorma: null,
          leitoFlange: "interna",
          trayWidth: w,
          trayHeight: h,
          trayArea,
          label: `${INFRA_LABEL[infraType]} ${w}×${h}mm`,
          ...occ,
        });
      }
    }
  }

  for (const norma of ELETRODUTO_NORMAS) {
    const dim = getDimensions("eletroduto", norma.id);
    for (const size of dim.sizes) {
      const R = size.value / 2;
      const trayArea = Math.PI * R * R;
      const occ = computeOccupancy(cables, trayArea, true);
      if (!occ.dentroLimite) continue;
      const items = layoutCablesCircular(cables, R);
      if (!circularFits(items, R)) continue;
      results.push({
        infraType: "eletroduto",
        eletrodutoNorma: norma.id,
        leitoFlange: "interna",
        trayWidth: size.value,
        trayHeight: size.value,
        trayArea,
        label: `Eletroduto ${norma.label} ${size.label}`,
        ...occ,
      });
    }
  }

  results.sort((a, b) => a.trayArea - b.trayArea);
  return results;
}
