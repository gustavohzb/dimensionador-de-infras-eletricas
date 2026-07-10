// Motor de empacotamento físico por gravidade — compartilhado entre a
// visualização (TrayVisualization) e o modo reverso (ReverseMode), que
// precisa rodar a mesma simulação contra várias infraestruturas candidatas
// para confirmar que os cabos cabem de verdade (não só na conta de área %).

export function layoutCables(cables, trayWidth, trayHeight) {
  const items = [];
  const placed = []; // círculos já posicionados: { cx, cy, r }

  // Folga numérica: tangência exata (cabo encostado no vizinho) não conta
  // como colisão, senão o erro de ponto flutuante "ergue" o cabo rente.
  const EPS = 0.01;

  // Nível de repouso: menor altura viável (maior cy) para um círculo em cx,
  // sem sobrepor ninguém. Diferente da queda vertical pura, permite a posição
  // "deslizou pelo flanco do vizinho até o fundo", como um cabo acomodado à mão.
  const dropCy = (cx, r) => {
    const floor = trayHeight - r;
    const forbidden = []; // intervalos de cy proibidos por sobreposição
    const tops = [];      // cy exato de repouso sobre cada obstáculo
    for (const p of placed) {
      const dx = cx - p.cx;
      const sum = r + p.r;
      if (Math.abs(dx) < sum - EPS) {
        const v = Math.sqrt(Math.max(0, sum * sum - dx * dx));
        forbidden.push([p.cy - v, p.cy + v]);
        tops.push(p.cy - v);
      }
    }
    const ok = (cy) =>
      cy <= floor + 1e-9 &&
      forbidden.every(([lo, hi]) => cy <= lo + 1e-9 || cy >= hi - 1e-9);
    if (ok(floor)) return floor; // fundo livre nesta posição
    let best = -Infinity;
    for (const t of tops) if (t > best && ok(t)) best = t;
    return best === -Infinity ? floor : best;
  };

  // Deposição por gravidade: o cabo procura o ponto de repouso MAIS BAIXO
  // que consegue alcançar (rola para vãos/cantos), sem sobrepor ninguém.
  // Candidatos: encostado nas paredes, ao lado de cada círculo e nos vales
  // entre pares de círculos. Escolhe o de maior cy (mais fundo); empata pela esquerda.
  const lowestDrop = (r) => {
    if (trayWidth - r < r) return { cx: trayWidth / 2, cy: trayHeight - r };
    const clamp = (x) => Math.min(Math.max(x, r), trayWidth - r);
    const floorCy = trayHeight - r;
    const cands = new Set([r, trayWidth - r]);
    for (const p of placed) {
      cands.add(clamp(p.cx - (r + p.r)));
      cands.add(clamp(p.cx + (r + p.r)));
      // contato exato apoiado no fundo, encostando em p (p pode ter centro mais alto)
      const sum = r + p.r;
      const dy = floorCy - p.cy;
      const h2 = sum * sum - dy * dy;
      if (h2 > 0) {
        const dxf = Math.sqrt(h2);
        cands.add(clamp(p.cx - dxf));
        cands.add(clamp(p.cx + dxf));
      }
    }
    if (placed.length <= 140) {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const p = placed[i], q = placed[j];
          const d = Math.hypot(p.cx - q.cx, p.cy - q.cy);
          const rp = r + p.r, rq = r + q.r;
          if (d === 0 || d > rp + rq || d < Math.abs(rp - rq)) continue;
          const a = (d * d - rq * rq + rp * rp) / (2 * d);
          const h2 = rp * rp - a * a;
          if (h2 < 0) continue;
          const h = Math.sqrt(h2);
          const mx = p.cx + (a * (q.cx - p.cx)) / d;
          const ox = (-(q.cy - p.cy) / d) * h;
          cands.add(clamp(mx + ox));
          cands.add(clamp(mx - ox));
        }
      }
    }
    let best = null;
    for (const cx of cands) {
      const cy = dropCy(cx, r);
      if (!best || cy > best.cy + 1e-6 || (Math.abs(cy - best.cy) < 1e-6 && cx < best.cx)) {
        best = { cx, cy };
      }
    }
    return best;
  };

  const add = (cx, cy, r, type, vias, key) => {
    placed.push({ cx, cy, r });
    items.push({ cx, cy, r, type, vias, key });
  };

  // Deposição do feixe de trifólio (rígido): acha a origem X que deixa o
  // feixe mais baixo. Os dois condutores da base nivelam pelo obstáculo mais alto.
  const dropTrifolio = (r) => {
    const bundleW = 4 * r; // 2·d
    const maxX = trayWidth - bundleW;
    if (maxX < 0) return { x: 0, baseCy: trayHeight - r };
    const clampX = (x) => Math.min(Math.max(x, 0), maxX);
    const floorCy = trayHeight - r;
    const cands = new Set([0, maxX]);
    for (const p of placed) {
      // encostar o condutor esquerdo (cx = X+r) ou direito (cx = X+3r) ao lado de p
      cands.add(clampX(p.cx - (r + p.r) - r));
      cands.add(clampX(p.cx + (r + p.r) - r));
      cands.add(clampX(p.cx - (r + p.r) - 3 * r));
      cands.add(clampX(p.cx + (r + p.r) - 3 * r));
      // contato exato com a base do trifólio apoiada no fundo
      const sum = r + p.r;
      const dy = floorCy - p.cy;
      const h2 = sum * sum - dy * dy;
      if (h2 > 0) {
        const dxf = Math.sqrt(h2);
        cands.add(clampX(p.cx + dxf - r));
        cands.add(clampX(p.cx - dxf - 3 * r));
      }
    }
    let best = null;
    for (const x of cands) {
      const baseCy = Math.min(dropCy(x + r, r), dropCy(x + 3 * r, r));
      if (!best || baseCy > best.baseCy + 1e-6 || (Math.abs(baseCy - best.baseCy) < 1e-6 && x < best.x)) {
        best = { x, baseCy };
      }
    }
    return best;
  };

  cables.forEach((c, idx) => {
    const r = c.d / 2;
    if (c.trifolio) {
      const { x, baseCy } = dropTrifolio(r);
      add(x + r, baseCy, r, "unipolar", 1, `${idx}-1`);
      add(x + 3 * r, baseCy, r, "unipolar", 1, `${idx}-2`);
      // Condutor de topo no "vale", encostando nos dois de baixo (trifólio real).
      add(x + 2 * r, baseCy - r * Math.sqrt(3), r, "unipolar", 1, `${idx}-3`);
    } else {
      const { cx, cy } = lowestDrop(r);
      add(cx, cy, r, c.type, c.vias, idx);
    }
  });

  return items;
}

// ---- Empacotamento com septo divisor (Força + Comando) ----------------------
// A NBR 5410 exige separação física entre circuitos de força e de comando/
// sinal quando compartilham a mesma calha/perfilado/leito. Resolvido aqui
// dividindo a largura útil em dois compartimentos — cada um empacotado de
// forma independente pelo mesmo motor de gravidade acima — com uma parede
// (septo) real entre eles.
export const SEPTUM_THICKNESS = 2; // mm — espessura típica de um septo divisor de chapa

function conductorArea(list) {
  return list.reduce((acc, c) => acc + Math.PI * Math.pow(c.d / 2, 2) * (c.trifolio ? 3 : 1), 0);
}

// Divide a largura disponível entre os dois compartimentos proporcionalmente
// à área ocupada por cada grupo de cabos (mais cabos, mais espaço), com um
// mínimo de 15% para cada lado para não degenerar o compartimento menor.
export function splitWidthByArea(forca, comando, available) {
  const forcaArea = conductorArea(forca);
  const comandoArea = conductorArea(comando);
  const total = forcaArea + comandoArea;
  const ratio = total > 0 ? forcaArea / total : 0.5;
  const clamped = Math.min(0.85, Math.max(0.15, ratio));
  return Math.round(available * clamped);
}

// Empacota um trecho misto (cabos tipo "comando" vs. os demais, tratados como
// força) em dois compartimentos separados por um septo. `w1` pode ser fixado
// (usado pela busca do modo reverso, que testa várias divisões) — sem ele,
// usa a divisão proporcional por área, adequada para a visualização.
export function layoutCablesSplit(cables, trayWidth, trayHeight, septum = SEPTUM_THICKNESS, w1) {
  const forca = cables.filter((c) => c.type !== "comando");
  const comando = cables.filter((c) => c.type === "comando");
  const available = Math.max(0, trayWidth - septum);
  const width1 = w1 ?? splitWidthByArea(forca, comando, available);
  const width2 = available - width1;
  const forcaItems = layoutCables(forca, width1, trayHeight);
  const comandoItemsLocal = layoutCables(comando, width2, trayHeight);
  const comandoItems = comandoItemsLocal.map((it) => ({
    ...it,
    cx: it.cx + width1 + septum,
    key: `cmd-${it.key}`,
  }));
  const fits =
    width1 > 0 &&
    width2 > 0 &&
    rectFits(forcaItems, width1, trayHeight) &&
    rectFits(comandoItemsLocal, width2, trayHeight);
  return { items: [...forcaItems, ...comandoItems], w1: width1, w2: width2, septum, fits };
}

// ---- Empacotamento circular por gravidade (eletrodutos) --------------------
// O eletroduto é um tubo fechado, mas a gravidade continua puxando os cabos
// para baixo: eles se acomodam no fundo curvo do tubo e uns sobre os outros,
// exatamente como na calha — só que o "chão" aqui é o arco inferior da parede
// em vez de uma reta. cy cresce para baixo (convenção SVG); cy=0 é o centro
// do tubo e cy=+R é o ponto mais profundo.
export function layoutCablesCircular(cables, R) {
  const items = [];
  const placed = []; // { cx, cy, r }
  const EPS = 0.01;

  // Piso curvo: maior cy alcançável na parede para uma posição horizontal cx
  // (o tubo, visto de lado, tem "profundidade" máxima sqrt((R-r)² - cx²)).
  // Fora do intervalo [-(R-r), R-r] a posição é inválida (não cabe ali).
  const wallFloor = (cx, r) => {
    const wallLimit = R - r;
    if (Math.abs(cx) > wallLimit + EPS) return -Infinity;
    return Math.sqrt(Math.max(0, wallLimit * wallLimit - cx * cx));
  };

  // Nível de repouso: maior cy viável em cx, sem sobrepor ninguém — mesma
  // lógica da calha retangular, trocando o "chão" reto pelo arco da parede.
  const dropCy = (cx, r) => {
    const floor = wallFloor(cx, r);
    if (floor === -Infinity) return -Infinity;
    const forbidden = [];
    const tops = [];
    for (const p of placed) {
      const dx = cx - p.cx;
      const sum = r + p.r;
      if (Math.abs(dx) < sum - EPS) {
        const v = Math.sqrt(Math.max(0, sum * sum - dx * dx));
        forbidden.push([p.cy - v, p.cy + v]);
        tops.push(p.cy - v);
      }
    }
    const ok = (cy) =>
      cy <= floor + 1e-9 &&
      forbidden.every(([lo, hi]) => cy <= lo + 1e-9 || cy >= hi - 1e-9);
    if (ok(floor)) return floor;
    let best = -Infinity;
    for (const t of tops) if (t > best && ok(t)) best = t;
    return best === -Infinity ? floor : best;
  };

  // Mesma busca de candidatos da calha (encostado na parede, ao lado de cada
  // cabo e nos vales entre pares), adaptada ao limite horizontal curvo.
  const lowestDrop = (r) => {
    const wallLimit = R - r;
    if (wallLimit < 0) return { cx: 0, cy: dropCy(0, r) };
    const clamp = (x) => Math.min(Math.max(x, -wallLimit), wallLimit);
    // cx=0 é o ponto mais profundo do tubo (fundo do arco); os extremos
    // (-wallLimit/wallLimit) tocam a parede na lateral (altura do centro),
    // úteis só quando a pilha já transborda para os lados.
    const cands = new Set([0, -wallLimit, wallLimit]);
    for (const p of placed) {
      cands.add(clamp(p.cx - (r + p.r)));
      cands.add(clamp(p.cx + (r + p.r)));
    }
    if (placed.length <= 140) {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const p = placed[i], q = placed[j];
          const d = Math.hypot(p.cx - q.cx, p.cy - q.cy);
          const rp = r + p.r, rq = r + q.r;
          if (d === 0 || d > rp + rq || d < Math.abs(rp - rq)) continue;
          const a = (d * d - rq * rq + rp * rp) / (2 * d);
          const h2 = rp * rp - a * a;
          if (h2 < 0) continue;
          const h = Math.sqrt(h2);
          const mx = p.cx + (a * (q.cx - p.cx)) / d;
          const ox = (-(q.cy - p.cy) / d) * h;
          cands.add(clamp(mx + ox));
          cands.add(clamp(mx - ox));
        }
      }
    }
    let best = null;
    for (const cx of cands) {
      const cy = dropCy(cx, r);
      if (cy === -Infinity) continue;
      if (!best || cy > best.cy + 1e-6 || (Math.abs(cy - best.cy) < 1e-6 && cx < best.cx)) {
        best = { cx, cy };
      }
    }
    return best || { cx: 0, cy: dropCy(0, r) };
  };

  const add = (cx, cy, r, type, vias, key) => {
    placed.push({ cx, cy, r });
    items.push({ cx, cy, r, type, vias, key });
  };

  // Feixe de trifólio (rígido): acha o centro horizontal que deixa o feixe
  // mais fundo. Os dois condutores da base nivelam pelo obstáculo mais alto.
  const dropTrifolio = (r) => {
    const cands = new Set([0]);
    for (const p of placed) {
      const d = r + p.r;
      cands.add(p.cx - d - r);
      cands.add(p.cx + d - r);
      cands.add(p.cx - d + r);
      cands.add(p.cx + d + r);
    }
    let best = null;
    for (const cxc of cands) {
      const cyLeft = dropCy(cxc - r, r);
      const cyRight = dropCy(cxc + r, r);
      if (cyLeft === -Infinity || cyRight === -Infinity) continue;
      const baseCy = Math.min(cyLeft, cyRight);
      if (!best || baseCy > best.baseCy + 1e-6 || (Math.abs(baseCy - best.baseCy) < 1e-6 && cxc < best.cxc)) {
        best = { cxc, baseCy };
      }
    }
    return best || { cxc: 0, baseCy: dropCy(0, r) };
  };

  cables.forEach((c, idx) => {
    const r = c.d / 2;
    if (c.trifolio) {
      const { cxc, baseCy } = dropTrifolio(r);
      add(cxc - r, baseCy, r, "unipolar", 1, `${idx}-1`);
      add(cxc + r, baseCy, r, "unipolar", 1, `${idx}-2`);
      // Condutor de topo no "vale", encostando nos dois de baixo.
      add(cxc, baseCy - r * Math.sqrt(3), r, "unipolar", 1, `${idx}-3`);
    } else {
      const { cx, cy } = lowestDrop(r);
      add(cx, cy, r, c.type, c.vias, idx);
    }
  });

  return items;
}

// ---- Verificação de "cabe de verdade" ---------------------------------------
// Usado pelo modo reverso: a conta de área % é necessária mas não suficiente
// — confirma contra a geometria real (nenhum cabo pode "vazar" pra fora do
// contorno físico da infraestrutura).
const FIT_EPS = 0.05;

export function rectFits(items, trayWidth, trayHeight) {
  return items.every(
    (i) => i.cy - i.r >= -FIT_EPS && i.cx - i.r >= -FIT_EPS && i.cx + i.r <= trayWidth + FIT_EPS
  );
}

export function circularFits(items, R) {
  return items.every((i) => Math.hypot(i.cx, i.cy) + i.r <= R + FIT_EPS);
}

// ---- Contagem de camadas ----------------------------------------------------
// Usado pelo modo reverso para limitar empilhamento (relevante pra
// dissipação térmica): a "camada" de um cabo é 1 se ele repousa direto no
// fundo/parede (nada embaixo o sustentando), ou 1 + a maior camada de quem
// o sustenta — segue a mesma noção física de apoio já usada no empacotamento
// por gravidade, não uma grade artificial. O número de camadas do trecho é o
// maior valor entre todos os cabos.
export function countLayers(items) {
  if (items.length === 0) return 0;
  const memo = new Array(items.length).fill(undefined);
  const layerOf = (i, visiting) => {
    if (memo[i] !== undefined) return memo[i];
    if (visiting.has(i)) return 1; // guarda contra ciclo (não deveria ocorrer fisicamente)
    visiting.add(i);
    const item = items[i];
    let maxSupporter = 0;
    items.forEach((other, j) => {
      if (j === i) return;
      const dist = Math.hypot(item.cx - other.cx, item.cy - other.cy);
      const touching = Math.abs(dist - (item.r + other.r)) < FIT_EPS;
      const below = other.cy > item.cy + FIT_EPS;
      if (touching && below) maxSupporter = Math.max(maxSupporter, layerOf(j, visiting));
    });
    memo[i] = maxSupporter + 1;
    return memo[i];
  };
  items.forEach((_, i) => layerOf(i, new Set()));
  return Math.max(...memo);
}
