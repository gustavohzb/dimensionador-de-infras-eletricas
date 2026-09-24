// Motor de empacotamento físico por gravidade — compartilhado entre a
// visualização (TrayVisualization) e o modo reverso (ReverseMode), que
// precisa rodar a mesma simulação contra várias infraestruturas candidatas
// para confirmar que os cabos cabem de verdade (não só na conta de área %).

// Altura do condutor de cima do trifólio sobre a base, em raios: os três
// centros formam um triângulo equilátero de lado 2r.
const RAIZ3 = Math.sqrt(3);

// `preposicionados` são círculos que já ocupam o trecho e não pertencem a esta
// deposição — a fileira de trifólios espaçados os usa para que os cabos soltos
// caiam DEPOIS dela, desviando dos feixes em vez de passar por dentro. Eles
// entram como obstáculo e não saem no resultado: quem os posicionou já os tem.
export function layoutCables(cables, trayWidth, trayHeight, preposicionados = []) {
  const items = [];
  const placed = preposicionados.map((p) => ({ cx: p.cx, cy: p.cy, r: p.r })); // { cx, cy, r }

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

  // material do cabo sendo depositado — a forEach abaixo o atualiza antes de
  // cada add (só para render; a ocupação não depende de material).
  let curMaterial;
  const add = (cx, cy, r, type, vias, key, trifolioGroup) => {
    placed.push({ cx, cy, r });
    items.push({ cx, cy, r, type, vias, key, ...(trifolioGroup !== undefined ? { trifolioGroup } : {}), ...(curMaterial ? { material: curMaterial } : {}) });
  };

  // Deposição do feixe de trifólio (rígido): acha a origem X que deixa o
  // feixe mais baixo.
  //
  // O feixe é UM corpo de três condutores, então não dá para descer cada um
  // pelo seu próprio dropCy e nivelar pelo mais alto: nivelar ERGUE o outro
  // acima do repouso dele, e subir não é seguro — o condutor entra no
  // obstáculo que estava logo acima. O condutor de cima, então, nem repouso
  // próprio tem (ele viaja pendurado nos outros dois).
  //
  // Em vez disso, resolve para o corpo inteiro: projeta o intervalo proibido
  // de cada obstáculo, para cada um dos três condutores, no MESMO eixo
  // (baseCy) e procura o baseCy mais fundo que escapa de todos.
  const dropTrifolio = (r) => {
    const bundleW = 4 * r; // 2·d
    const maxX = trayWidth - bundleW;
    if (maxX < 0) return { x: 0, baseCy: trayHeight - r };
    const clampX = (x) => Math.min(Math.max(x, 0), maxX);
    const floorCy = trayHeight - r;
    const dyTopo = r * RAIZ3; // o condutor de cima fica essa altura acima da base

    const cands = new Set([0, maxX]);
    for (const p of placed) {
      // encostar o condutor esquerdo (cx = X+r), o de cima (X+2r) ou o
      // direito (X+3r) ao lado de p
      const sum = r + p.r;
      for (const off of [r, 2 * r, 3 * r]) {
        cands.add(clampX(p.cx - sum - off));
        cands.add(clampX(p.cx + sum - off));
      }
      // contato exato com a base do trifólio apoiada no fundo
      const dy = floorCy - p.cy;
      const h2 = sum * sum - dy * dy;
      if (h2 > 0) {
        const dxf = Math.sqrt(h2);
        cands.add(clampX(p.cx + dxf - r));
        cands.add(clampX(p.cx - dxf - 3 * r));
      }
    }

    // baseCy mais fundo em que os TRÊS condutores ficam livres, ou -Infinity
    // se este X não comporta o feixe.
    const baseCyEm = (x) => {
      const condutores = [
        { cx: x + r, dy: 0 },
        { cx: x + 3 * r, dy: 0 },
        { cx: x + 2 * r, dy: -dyTopo },
      ];
      const forbidden = [];
      for (const { cx, dy } of condutores) {
        for (const p of placed) {
          const dx = cx - p.cx;
          const sum = r + p.r;
          if (Math.abs(dx) < sum - EPS) {
            const v = Math.sqrt(Math.max(0, sum * sum - dx * dx));
            // proibido no cy DAQUELE condutor (cy = baseCy + dy) → em baseCy
            forbidden.push([p.cy - v - dy, p.cy + v - dy]);
          }
        }
      }
      const ok = (b) =>
        b <= floorCy + 1e-9 &&
        forbidden.every(([lo, hi]) => b <= lo + 1e-9 || b >= hi - 1e-9);
      if (ok(floorCy)) return floorCy; // fundo livre para o feixe inteiro
      let melhor = -Infinity;
      for (const [lo] of forbidden) if (lo > melhor && ok(lo)) melhor = lo;
      return melhor;
    };

    let best = null;
    for (const x of cands) {
      const baseCy = baseCyEm(x);
      if (baseCy === -Infinity) continue;
      if (!best || baseCy > best.baseCy + 1e-6 || (Math.abs(baseCy - best.baseCy) < 1e-6 && x < best.x)) {
        best = { x, baseCy };
      }
    }
    // Trecho lotado a ponto de não sobrar posição válida: deposita no fundo e
    // deixa o rectFits/ocupação reprovarem, em vez de devolver null e quebrar.
    return best ?? { x: 0, baseCy: floorCy };
  };

  cables.forEach((c, idx) => {
    curMaterial = c.material;
    const r = c.d / 2;
    if (c.trifolio) {
      const { x, baseCy } = dropTrifolio(r);
      const group = `trif-${idx}`;
      add(x + r, baseCy, r, "unipolar", 1, `${idx}-1`, group);
      add(x + 3 * r, baseCy, r, "unipolar", 1, `${idx}-2`, group);
      // Condutor de topo no "vale", encostando nos dois de baixo (trifólio real).
      add(x + 2 * r, baseCy - r * Math.sqrt(3), r, "unipolar", 1, `${idx}-3`, group);
    } else {
      const { cx, cy } = lowestDrop(r);
      add(cx, cy, r, c.type, c.vias, idx);
    }
  });

  return items;
}

// ---- Fileira de trifólios espaçados de 2D ----------------------------------
// Arranjo de instalação em que os feixes são deliberadamente afastados, e não
// empurrados uns contra os outros pela gravidade. Por isso é função própria e
// não um caso dentro do motor acima: aqui não há posição a procurar. A fileira
// é aritmética — todos os feixes apoiados no fundo, o vão é dado.
//
// O vão livre é de 2× o diâmetro, medido de BORDA A BORDA. Entre feixes de
// bitolas diferentes usa o MAIOR dos dois diâmetros, que é o que garante folga
// de ao menos 2D para os dois lados.
//
// O feixe tem 2D de largura: dois condutores lado a lado na base, e o de cima
// cai no vale entre eles sem alargar o conjunto. Com vão de 2D, o passo é 4D.
//
// NÃO mexe em fator de agrupamento. O vão é espaço vazio, não é cabo, e não
// entra na contagem de circuitos — quatro feixes espaçados são os mesmos
// quatro circuitos de quando estão encostados.

// Origem X de cada feixe e largura total da fileira. Fonte única do passo:
// o desenho e a largura exigida que a tela mostra saem daqui, e não podem
// divergir.
function fileiraTrifolios(feixes) {
  const origens = [];
  let x = 0;
  feixes.forEach((c, i) => {
    origens.push(x);
    const proximo = feixes[i + 1];
    x += 2 * c.d + (proximo ? 2 * Math.max(c.d, proximo.d) : 0);
  });
  return { origens, largura: x };
}

// Quem entra na fileira: o trifólio marcado como espaçado. O espaçamento é de
// cada feixe (botão "Trifólio 2D"), não do trecho — um mesmo trecho pode ter
// trifólios encostados e espaçados.
export const ehTrifolioEspacado = (c) => Boolean(c.trifolio && c.espacado);

// Largura que a fileira exige, em mm. Zero quando não há trifólio 2D no trecho.
export function larguraTrifolioEspacado(cables) {
  return fileiraTrifolios(cables.filter(ehTrifolioEspacado)).largura;
}

// R e S na base, T no topo, com a base alternando a cada feixe — a transposição
// do detalhe de instalação. É INDICAÇÃO DE PROJETO, não verificação: o app não
// tem como saber como o cabo foi puxado em campo.
const FASES_BASE = [["R", "S"], ["S", "R"]];

export function layoutCablesTrifolioEspacado(cables, trayWidth, trayHeight) {
  const feixes = cables.filter(ehTrifolioEspacado);
  const resto = cables.filter((c) => !ehTrifolioEspacado(c));
  const { origens, largura } = fileiraTrifolios(feixes);

  const items = [];
  feixes.forEach((c, idx) => {
    const r = c.d / 2;
    const x = origens[idx];
    const baseCy = trayHeight - r;
    const [esquerdo, direito] = FASES_BASE[idx % 2];
    const comum = {
      r,
      type: "unipolar",
      vias: 1,
      trifolioGroup: `trif-${idx}`,
      espacado: true,
      ...(c.material ? { material: c.material } : {}),
    };
    items.push({ ...comum, cx: x + r, cy: baseCy, key: `${idx}-1`, fase: esquerdo });
    items.push({ ...comum, cx: x + 3 * r, cy: baseCy, key: `${idx}-2`, fase: direito });
    // Condutor de topo no vale entre os dois de baixo, como no trifólio real.
    items.push({ ...comum, cx: x + 2 * r, cy: baseCy - r * RAIZ3, key: `${idx}-3`, fase: "T" });
  });

  // O resto — trifólio encostado, cabo solto, multipolar — vai para a DIREITA
  // da fileira, num compartimento próprio. Por gravidade livre ele caía dentro
  // do vão de 2D, e o vão deixava de ser livre: o arranjo perdia o sentido.
  //
  // O compartimento começa depois de mais um vão de 2D, medido pelo último
  // feixe: sem ele, o que viesse depois encostaria no último trifólio 2D, e
  // esse feixe só estaria espaçado de um lado. Sem fileira, o compartimento é
  // o trecho inteiro e o resultado é o da gravidade pura.
  const ultimo = feixes[feixes.length - 1];
  const inicio = ultimo && resto.length ? largura + 2 * ultimo.d : 0;
  const restoPosto = layoutCables(resto, trayWidth - inicio, trayHeight).map((it) => ({
    ...it,
    cx: it.cx + inicio,
    key: `resto-${it.key}`,
    // o empacotamento por gravidade numera os feixes a partir de zero, igual à
    // fileira — sem prefixo, dois feixes diferentes teriam o mesmo grupo
    ...(it.trifolioGroup !== undefined ? { trifolioGroup: `resto-${it.trifolioGroup}` } : {}),
  }));
  return [...items, ...restoPosto];
}

// Veredito do trecho com trifólio 2D, para o texto da tela. Vem do DESENHO
// real (rectFits), não da conta da fileira: com trifólio comum ou cabo solto à
// direita, a fileira sozinha diria que cabe enquanto o trecho transborda.
//
// `faltam` só existe quando é exato — trecho só de trifólios 2D, onde a
// largura exigida é a da fileira. Com outros cabos à direita eles podem
// empilhar, e não há uma largura mínima única: aí o número fica null, em vez
// de um valor inventado.
export function verificarTrifolioEspacado(cables, trayWidth, trayHeight) {
  const fileira = larguraTrifolioEspacado(cables);
  const temResto = cables.some((c) => !ehTrifolioEspacado(c));
  const cabe = rectFits(layoutCablesTrifolioEspacado(cables, trayWidth, trayHeight), trayWidth);
  const faltam = !cabe && !temResto && fileira > trayWidth ? fileira - trayWidth : null;
  return { fileira, temResto, cabe, faltam };
}

// Vãos entre feixes consecutivos, para a cota do desenho. Derivado dos itens
// JÁ POSICIONADOS, e não do passo recalculado: assim a cota não tem como
// medir uma coisa e o desenho mostrar outra.
//
// `cy` é a altura dos condutores da base, que é onde a cota é desenhada —
// dentro do leito, junto do que ela mede.
export function vaosDaFileira(items) {
  const grupos = new Map();
  for (const it of items) {
    if (!it.espacado) continue; // só a fileira tem vão; o resto está encostado
    const g = grupos.get(it.trifolioGroup) ?? { esquerda: Infinity, direita: -Infinity, cy: -Infinity };
    g.esquerda = Math.min(g.esquerda, it.cx - it.r);
    g.direita = Math.max(g.direita, it.cx + it.r);
    g.cy = Math.max(g.cy, it.cy); // o condutor de cima tem cy menor
    grupos.set(it.trifolioGroup, g);
  }
  const feixes = [...grupos.values()].sort((a, b) => a.esquerda - b.esquerda);
  const vaos = [];
  for (let i = 0; i < feixes.length - 1; i++) {
    const a = feixes[i], b = feixes[i + 1];
    vaos.push({
      x1: a.direita,
      x2: b.esquerda,
      valor: +(b.esquerda - a.direita).toFixed(2),
      cy: Math.max(a.cy, b.cy),
    });
  }
  return vaos;
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
    rectFits(forcaItems, width1) &&
    rectFits(comandoItemsLocal, width2);
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
      // Lado a lado na MESMA altura. Vale quando o apoio é um piso reto ou o
      // próprio vizinho; num tubo, sozinho, não basta — ver abaixo.
      cands.add(clamp(p.cx - (r + p.r)));
      cands.add(clamp(p.cx + (r + p.r)));
      // Apoiado na PAREDE e encostado em p ao mesmo tempo. É o análogo curvo
      // do "contato exato apoiado no fundo" da calha reta, e sem ele o cabo
      // parava no extremo da parede, na altura do centro do tubo: num piso
      // reto dois cabos em repouso ficam na mesma altura, mas num tubo o
      // vizinho escorrega pelo arco até tocar, e fica mais fundo.
      // O centro procurado está na circunferência de raio (R-r) em torno do
      // eixo E a (r + p.r) do centro de p — a mesma interseção de duas
      // circunferências usada nos vales entre pares, com a parede no lugar
      // de um dos cabos.
      const dEixo = Math.hypot(p.cx, p.cy);
      const rc = r + p.r;
      if (dEixo > 0 && dEixo <= wallLimit + rc && dEixo >= Math.abs(wallLimit - rc)) {
        const a = (dEixo * dEixo - rc * rc + wallLimit * wallLimit) / (2 * dEixo);
        const h2 = wallLimit * wallLimit - a * a;
        if (h2 >= 0) {
          const h = Math.sqrt(h2);
          const mx = (a * p.cx) / dEixo;
          const ox = (-p.cy / dEixo) * h;
          cands.add(clamp(mx + ox));
          cands.add(clamp(mx - ox));
        }
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
      if (cy === -Infinity) continue;
      if (!best || cy > best.cy + 1e-6 || (Math.abs(cy - best.cy) < 1e-6 && cx < best.cx)) {
        best = { cx, cy };
      }
    }
    return best || { cx: 0, cy: dropCy(0, r) };
  };

  // material do cabo sendo depositado — a forEach abaixo o atualiza antes de
  // cada add (só para render; a ocupação não depende de material).
  let curMaterial;
  const add = (cx, cy, r, type, vias, key, trifolioGroup) => {
    placed.push({ cx, cy, r });
    items.push({ cx, cy, r, type, vias, key, ...(trifolioGroup !== undefined ? { trifolioGroup } : {}), ...(curMaterial ? { material: curMaterial } : {}) });
  };

  // Feixe de trifólio (rígido): acha o centro horizontal que deixa o feixe
  // mais fundo. Vale aqui a mesma ressalva da calha retangular — nivelar os
  // dois condutores da base pelo mais obstruído ergueria o outro acima do
  // repouso dele, sem garantia de estar livre lá em cima, e o condutor de
  // cima não tem repouso próprio. Resolve para o corpo inteiro, projetando
  // os intervalos proibidos dos três condutores no eixo baseCy.
  const dropTrifolio = (r) => {
    const dyTopo = r * RAIZ3;
    const cands = new Set([0]);
    for (const p of placed) {
      const d = r + p.r;
      // encostar o condutor esquerdo (cxc-r), o de cima (cxc) ou o direito
      // (cxc+r) ao lado de p
      for (const off of [-r, 0, r]) {
        cands.add(p.cx - d - off);
        cands.add(p.cx + d - off);
      }
    }

    // Feixe apoiado na PAREDE e encostado num cabo ao mesmo tempo — o que
    // faltava aqui, pelo mesmo motivo do cabo solto: o candidato acima põe o
    // condutor ao LADO de p, na mesma altura, que é repouso de piso reto. Num
    // tubo o feixe escorrega pelo arco, e o repouso de verdade é o ponto em
    // que os dois contatos acontecem juntos.
    //
    // O feixe é rígido, então sua posição é só (cxc, baseCy) — e nesse plano
    // toda condição de contato vira uma CIRCUNFERÊNCIA: encostar o condutor
    // de deslocamento o na parede é estar a (R-r) do ponto -o; encostá-lo em
    // p é estar a (r+p.r) do ponto (p - o). O repouso é a interseção de duas
    // delas, a mesma conta já usada nos vales entre pares.
    const desloc = [
      { x: -r, y: 0 },
      { x: r, y: 0 },
      { x: 0, y: -dyTopo },
    ];
    const xDaInterseccao = (ax, ay, ar, bx, by, br) => {
      const dd = Math.hypot(bx - ax, by - ay);
      if (dd === 0 || dd > ar + br || dd < Math.abs(ar - br)) return;
      const a = (dd * dd - br * br + ar * ar) / (2 * dd);
      const h2 = ar * ar - a * a;
      if (h2 < 0) return;
      const h = Math.sqrt(h2);
      const mx = ax + (a * (bx - ax)) / dd;
      const ox = (-(by - ay) / dd) * h;
      cands.add(mx + ox);
      cands.add(mx - ox);
    };
    for (const naParede of desloc) {
      // circunferência do condutor `naParede` tocando o tubo
      const ax = -naParede.x, ay = -naParede.y, ar = R - r;
      // o mais fundo desta circunferência sozinha, quando só a parede limita
      cands.add(ax);
      for (const p of placed) {
        for (const noCabo of desloc) {
          xDaInterseccao(ax, ay, ar, p.cx - noCabo.x, p.cy - noCabo.y, r + p.r);
        }
      }
    }

    const baseCyEm = (cxc) => {
      const capEsq = wallFloor(cxc - r, r);
      const capDir = wallFloor(cxc + r, r);
      if (capEsq === -Infinity || capDir === -Infinity) return -Infinity;
      const cap = Math.min(capEsq, capDir);
      const condutores = [
        { cx: cxc - r, dy: 0 },
        { cx: cxc + r, dy: 0 },
        { cx: cxc, dy: -dyTopo },
      ];
      const forbidden = [];
      for (const { cx, dy } of condutores) {
        for (const p of placed) {
          const dx = cx - p.cx;
          const sum = r + p.r;
          if (Math.abs(dx) < sum - EPS) {
            const v = Math.sqrt(Math.max(0, sum * sum - dx * dx));
            forbidden.push([p.cy - v - dy, p.cy + v - dy]);
          }
        }
      }
      const ok = (b) =>
        b <= cap + 1e-9 &&
        forbidden.every(([lo, hi]) => b <= lo + 1e-9 || b >= hi - 1e-9);
      if (ok(cap)) return cap;
      let melhor = -Infinity;
      for (const [lo] of forbidden) if (lo > melhor && ok(lo)) melhor = lo;
      return melhor;
    };

    let best = null;
    for (const cxc of cands) {
      const baseCy = baseCyEm(cxc);
      if (baseCy === -Infinity) continue;
      if (!best || baseCy > best.baseCy + 1e-6 || (Math.abs(baseCy - best.baseCy) < 1e-6 && cxc < best.cxc)) {
        best = { cxc, baseCy };
      }
    }
    // Tubo lotado: deposita no fundo e deixa o circularFits/ocupação reprovarem.
    return best ?? { cxc: 0, baseCy: dropCy(0, r) };
  };

  cables.forEach((c, idx) => {
    curMaterial = c.material;
    const r = c.d / 2;
    if (c.trifolio) {
      const { cxc, baseCy } = dropTrifolio(r);
      const group = `trif-${idx}`;
      add(cxc - r, baseCy, r, "unipolar", 1, `${idx}-1`, group);
      add(cxc + r, baseCy, r, "unipolar", 1, `${idx}-2`, group);
      // Condutor de topo no "vale", encostando nos dois de baixo.
      add(cxc, baseCy - r * Math.sqrt(3), r, "unipolar", 1, `${idx}-3`, group);
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
export const FIT_EPS = 0.05;

// O fundo não precisa de checagem: a deposição por gravidade nunca coloca um
// cabo abaixo de cy = trayHeight - r. O que pode vazar é o topo (pilha alta
// demais) e as laterais — por isso a altura não entra aqui.
export function rectFits(items, trayWidth) {
  return items.every(
    (i) => i.cy - i.r >= -FIT_EPS && i.cx - i.r >= -FIT_EPS && i.cx + i.r <= trayWidth + FIT_EPS
  );
}

export function circularFits(items, R) {
  return items.every((i) => Math.hypot(i.cx, i.cy) + i.r <= R + FIT_EPS);
}

// ---- Contagem de camadas ----------------------------------------------------
// Usado pelo modo reverso para limitar empilhamento (relevante pra
// dissipação térmica): a "camada" de um cabo é 1 se toca o fundo/parede
// direto (independente do que mais encosta nele), ou 1 + a maior camada de
// quem o sustenta por baixo — segue a mesma noção física de apoio já usada
// no empacotamento por gravidade, não uma grade artificial. O número de
// camadas do trecho é o maior valor entre todos os cabos.
//
// `isGrounded(item)` diz se aquele item toca o fundo/parede diretamente —
// precisa ser checado ANTES de olhar pra vizinhos: um cabo pequeno "aninhado"
// no chão ao lado de um cabo grande também encosta na lateral dele, e esse
// contato pode apontar mais pra baixo do que pro lado (por causa da
// diferença de raio) sem que o pequeno esteja de fato apoiado no grande —
// mas como ele já toca o chão, é camada 1 de qualquer forma.
//
// Um feixe de trifólio (3 condutores, marcados com o mesmo `trifolioGroup`
// pelo empacotamento) conta como UMA unidade — mesmo sendo fisicamente 2
// condutores embaixo + 1 em cima, o feixe é manuseado e instalado como uma
// peça só, então pra fins de camada ele é 1 (não 2): o grupo todo vira
// camada 1 se qualquer membro tocar o fundo/parede, ou 1 + a maior camada
// de quem sustenta qualquer membro de FORA do grupo (um vizinho do próprio
// feixe não conta como apoio extra). Só quando algo de fora se apoia em
// cima do feixe é que aparece uma camada a mais.
export function countLayers(items, isGrounded) {
  if (items.length === 0) return 0;

  const unitOf = items.map((it, i) => it.trifolioGroup ?? `single-${i}`);
  const itemsByUnit = new Map();
  items.forEach((_, i) => {
    const u = unitOf[i];
    if (!itemsByUnit.has(u)) itemsByUnit.set(u, []);
    itemsByUnit.get(u).push(i);
  });

  const memo = new Map();
  const layerOfUnit = (u, visiting) => {
    if (memo.has(u)) return memo.get(u);
    const indices = itemsByUnit.get(u);
    if (isGrounded && indices.some((i) => isGrounded(items[i]))) {
      memo.set(u, 1);
      return 1;
    }
    if (visiting.has(u)) return 1; // guarda contra ciclo (não deveria ocorrer fisicamente)
    visiting.add(u);
    let maxSupporter = 0;
    for (const i of indices) {
      const item = items[i];
      items.forEach((other, j) => {
        if (unitOf[j] === u) return; // vizinho do mesmo feixe não conta como empilhamento
        const dy = other.cy - item.cy;
        const dist = Math.hypot(item.cx - other.cx, dy);
        const touching = Math.abs(dist - (item.r + other.r)) < FIT_EPS;
        // "Abaixo" exige contato predominantemente vertical — cabos encostados
        // lado a lado têm o contato dominado por dx, não por dy.
        const below = dist > 0 && dy > dist * 0.5;
        if (touching && below) maxSupporter = Math.max(maxSupporter, layerOfUnit(unitOf[j], visiting));
      });
    }
    const result = maxSupporter + 1;
    memo.set(u, result);
    return result;
  };

  let max = 0;
  for (const u of itemsByUnit.keys()) max = Math.max(max, layerOfUnit(u, new Set()));
  return max;
}
