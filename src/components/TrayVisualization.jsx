import { forwardRef } from "react";
import { VIAS_COLORS, getDimensions, ELETRODUTO_NORMAS } from "../data/corfioHEPR";
import { layoutCables, layoutCablesCircular } from "../lib/packing";

const PADDING = 64;
const WALL = 6; // espessura da chapa da eletrocalha (visual)

// Disposição dos condutores internos de um cabo multipolar,
// em fatores do raio externo R (aparência de corte real).
function innerConductors(n) {
  switch (n) {
    case 2:
      return { r: 0.5, pos: [[-0.5, 0], [0.5, 0]] };
    case 3:
      return { r: 0.44, pos: [[0, -0.52], [-0.45, 0.26], [0.45, 0.26]] };
    case 4:
      return { r: 0.42, pos: [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]] };
    case 5:
      // 4 condutores ao redor + 1 no centro (arranjo real de cabo pentapolar).
      return {
        r: 0.32,
        pos: [[-0.4525, -0.4525], [0.4525, -0.4525], [-0.4525, 0.4525], [0.4525, 0.4525], [0, 0]],
      };
    default:
      return { r: 0.72, pos: [[0, 0]] };
  }
}

// Condutor isolado em corte: isolação colorida (a capa) + núcleo de cobre.
function Conductor({ cx, cy, r, color }) {
  const coreR = r * 0.52; // condutor de cobre interno
  return (
    <g>
      {/* isolação (capa) */}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#00000066" strokeWidth={Math.max(0.3, r * 0.06)} />
      {/* condutor de cobre */}
      {coreR > 0.9 && (
        <circle cx={cx} cy={cy} r={coreR} fill="url(#copper)" stroke="#6e3d17" strokeWidth={Math.max(0.2, coreR * 0.1)} />
      )}
      {/* brilho cilíndrico */}
      <circle cx={cx} cy={cy} r={r} fill="url(#gloss)" />
    </g>
  );
}

// Cabo de comando (controle): todos os condutores são pretos numerados na
// realidade — não faz sentido decompor visualmente em N cores, então é
// desenhado como um cabo sólido único (capa cinza-escura + brilho).
const COMANDO_COLOR = "#4b5563";

// Um cabo desenhado em corte.
function Cable({ item }) {
  const { cx, cy, r, type, vias } = item;

  if (type === "comando") {
    return <Conductor cx={cx} cy={cy} r={r} color={COMANDO_COLOR} />;
  }

  if (type === "multipolar" && vias > 1) {
    const inner = innerConductors(vias);
    const cr = inner.r * r;
    return (
      <g>
        {/* capa externa do multipolar */}
        <circle cx={cx} cy={cy} r={r} fill="#3f4753" stroke="#1e2530" strokeWidth={Math.max(0.4, r * 0.05)} />
        {/* condutores internos isolados */}
        {inner.pos.map(([dx, dy], i) => (
          <Conductor key={i} cx={cx + dx * r} cy={cy + dy * r} r={cr} color={VIAS_COLORS[vias]} />
        ))}
        {/* brilho na capa */}
        <circle cx={cx} cy={cy} r={r} fill="url(#glossJacket)" />
      </g>
    );
  }

  // unipolar (inclui condutores de trifólio)
  return <Conductor cx={cx} cy={cy} r={r} color={VIAS_COLORS[vias] || VIAS_COLORS[1]} />;
}

// Miniatura de cabo para a legenda (cobre sólido — sem depender dos gradientes).
const COPPER = "#c67c3c";
function LegendGlyph({ type, vias }) {
  const R = 8;
  if (type === "comando") {
    return (
      <g>
        <circle cx={R} cy={R} r={R} fill={COMANDO_COLOR} stroke="#00000055" strokeWidth={0.6} />
        <circle cx={R} cy={R} r={R * 0.52} fill={COPPER} stroke="#6e3d17" strokeWidth={0.4} />
      </g>
    );
  }
  if (vias > 1) {
    const inner = innerConductors(vias);
    const cr = inner.r * R;
    return (
      <g>
        <circle cx={R} cy={R} r={R} fill="#3f4753" stroke="#1e2530" strokeWidth={0.6} />
        {inner.pos.map(([dx, dy], i) => (
          <g key={i}>
            <circle cx={R + dx * R} cy={R + dy * R} r={cr} fill={VIAS_COLORS[vias]} stroke="#00000040" strokeWidth={0.5} />
            {cr * 0.52 > 0.9 && (
              <circle cx={R + dx * R} cy={R + dy * R} r={cr * 0.52} fill={COPPER} stroke="#6e3d17" strokeWidth={0.3} />
            )}
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      <circle cx={R} cy={R} r={R} fill={VIAS_COLORS[vias]} stroke="#00000055" strokeWidth={0.6} />
      <circle cx={R} cy={R} r={R * 0.52} fill={COPPER} stroke="#6e3d17" strokeWidth={0.4} />
    </g>
  );
}

// ---- Estruturas (seção transversal) ----------------------------------------
// Todas desenham em torno da mesma cavidade útil (0..w de largura, 0..h de
// altura, fundo em y=h). Os cabos e as cotas são compartilhados.

const METAL = "url(#metal)";
const EDGE = "#5b6675";

function Eletrocalha({ w, h }) {
  const path = [
    `M ${-WALL} -2`, `L ${-WALL} ${h + WALL}`, `L ${w + WALL} ${h + WALL}`,
    `L ${w + WALL} -2`, `L ${w} -2`, `L ${w} ${h}`, `L 0 ${h}`, `L 0 -2`, "Z",
  ].join(" ");
  return (
    <>
      <rect x={0} y={0} width={w} height={h} fill="#eef1f5" />
      <rect x={0} y={h - 4} width={w} height={4} fill="#000000" opacity="0.06" />
      <path d={path} fill={METAL} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <rect x={-WALL} y={-2} width={WALL} height={3} rx={1.2} fill="#eef2f7" stroke={EDGE} strokeWidth={0.6} />
      <rect x={w} y={-2} width={WALL} height={3} rx={1.2} fill="#eef2f7" stroke={EDGE} strokeWidth={0.6} />
    </>
  );
}

function Perfilado({ w, h }) {
  const path = [
    `M ${-WALL} -2`, `L ${-WALL} ${h + WALL}`, `L ${w + WALL} ${h + WALL}`,
    `L ${w + WALL} -2`, `L ${w} -2`, `L ${w} ${h}`, `L 0 ${h}`, `L 0 -2`, "Z",
  ].join(" ");
  const lip = Math.min(12, w * 0.22); // aba reentrante no topo (perfil "perfilado")
  return (
    <>
      <rect x={0} y={0} width={w} height={h} fill="#eef1f5" />
      <rect x={0} y={h - 4} width={w} height={4} fill="#000000" opacity="0.06" />
      <path d={path} fill={METAL} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      {/* lábios reentrantes: o topo se dobra para dentro */}
      <rect x={-WALL} y={-2} width={WALL + lip} height={3.2} rx={1.2} fill={METAL} stroke={EDGE} strokeWidth={0.7} />
      <rect x={w - lip} y={-2} width={WALL + lip} height={3.2} rx={1.2} fill={METAL} stroke={EDGE} strokeWidth={0.7} />
    </>
  );
}

function Leito({ w, h, flange = "interna" }) {
  const RAIL = 9;   // largura da longarina (web)
  const FL = 6;     // comprimento da aba
  const FT = 2.4;   // espessura da aba
  const top = -2;
  const bot = h + 3;
  // side: -1 longarina esquerda (web em [-RAIL, 0]); +1 direita (web em [w, w+RAIL]).
  // Abas internas apontam para a cavidade; externas apontam para fora.
  const rail = (webX, side) => {
    const towardCavity = side < 0 ? webX + RAIL : webX - FL;
    const awayCavity = side < 0 ? webX - FL : webX + RAIL;
    const fx = flange === "externa" ? awayCavity : towardCavity;
    return (
      <g>
        <rect x={webX} y={top} width={RAIL} height={bot - top} rx={1.5} fill={METAL} stroke={EDGE} strokeWidth={0.9} />
        <rect x={fx} y={top} width={FL} height={FT} fill={METAL} stroke={EDGE} strokeWidth={0.5} />
        <rect x={fx} y={bot - FT} width={FL} height={FT} fill={METAL} stroke={EDGE} strokeWidth={0.5} />
      </g>
    );
  };
  return (
    <>
      {/* leve fundo difuso para leitura dos cabos (estrutura aberta) */}
      <rect x={0} y={0} width={w} height={h} rx={2} fill="#eef1f5" opacity="0.5" />
      {/* travessa (degrau) onde os cabos se apoiam */}
      <rect x={0} y={h} width={w} height={5} rx={1.5} fill={METAL} stroke={EDGE} strokeWidth={0.8} />
      {rail(-RAIL, -1)}
      {rail(w, 1)}
    </>
  );
}

function Aramado({ w, h }) {
  const R = Math.min(8, w / 2, h / 2); // raio de curvatura no fundo (tipo Rejiband)
  const wire = "#9aa7b8";
  const uPath =
    `M 0 -2 L 0 ${h - R} Q 0 ${h} ${R} ${h} L ${w - R} ${h} Q ${w} ${h} ${w} ${h - R} L ${w} -2`;
  const dots = [];
  const nX = Math.max(2, Math.round(w / 16));
  for (let i = 0; i <= nX; i++) dots.push([(w * i) / nX, h]);
  const nY = Math.max(1, Math.round((h - R) / 15));
  for (let i = 1; i <= nY; i++) {
    const y = h - R - ((h - R + 2) * i) / (nY + 1);
    dots.push([0, y]);
    dots.push([w, y]);
  }
  return (
    <>
      <rect x={0} y={0} width={w} height={h} rx={3} fill="#eef1f5" opacity="0.45" />
      <path d={uPath} fill="none" stroke={wire} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {dots.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.6} fill={wire} stroke={EDGE} strokeWidth={0.5} />
          <circle cx={x - 0.7} cy={y - 0.7} r={0.9} fill="#ffffff" opacity="0.55" />
        </g>
      ))}
    </>
  );
}

function Structure({ infraType, w, h, leitoFlange }) {
  if (infraType === "perfilado") return <Perfilado w={w} h={h} />;
  if (infraType === "leito") return <Leito w={w} h={h} flange={leitoFlange} />;
  if (infraType === "aramado") return <Aramado w={w} h={h} />;
  return <Eletrocalha w={w} h={h} />;
}

// Parede circular do eletroduto (tubo de aço em corte).
function Eletroduto({ R }) {
  const wallThickness = Math.max(2.5, R * 0.12);
  return (
    <>
      <circle cx={0} cy={0} r={R + wallThickness} fill={METAL} stroke={EDGE} strokeWidth={1} />
      <circle cx={0} cy={0} r={R} fill="#eef1f5" stroke={EDGE} strokeWidth={0.8} />
    </>
  );
}

// Gradientes e filtro compartilhados pelos dois modos de desenho (calha e duto).
function SharedDefs() {
  return (
    <defs>
      {/* brilho cilíndrico dos condutores */}
      <radialGradient id="gloss" cx="0.35" cy="0.28" r="0.75">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
      </radialGradient>
      {/* brilho suave na capa do multipolar */}
      <radialGradient id="glossJacket" cx="0.35" cy="0.25" r="0.8">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.03" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
      </radialGradient>
      {/* condutor de cobre */}
      <radialGradient id="copper" cx="0.4" cy="0.34" r="0.72">
        <stop offset="0%" stopColor="#f0b27a" />
        <stop offset="50%" stopColor="#c67c3c" />
        <stop offset="100%" stopColor="#8a4e22" />
      </radialGradient>
      {/* aspecto metálico da chapa */}
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e5e9ef" />
        <stop offset="45%" stopColor="#c3cbd6" />
        <stop offset="100%" stopColor="#8f9aab" />
      </linearGradient>
      {/* sombra dos cabos */}
      <filter id="cableShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.2" stdDeviation="1.1" floodColor="#000000" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

function CableLegend({ legendItems }) {
  if (legendItems.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {legendItems.map(({ type, vias }) => (
        <div key={`${type}-${vias}`} className="flex items-center gap-2">
          <svg width={20} height={20} viewBox="0 0 16 16">
            <LegendGlyph type={type} vias={vias} />
          </svg>
          <span className="text-xs uppercase text-slate-600 dark:text-slate-300">
            {type === "comando" ? `${vias} condutores` : vias === 1 ? "Unipolar" : `${vias} vias`}
          </span>
        </div>
      ))}
    </div>
  );
}

const TrayVisualization = forwardRef(function TrayVisualization({ cables, trayWidth, trayHeight, dark = false, infraType = "eletrocalha", leitoFlange = "interna", eletrodutoNorma = "nbr5624" }, svgRef) {
  const legendItems = [...new Map(cables.map((c) => [`${c.type}-${c.vias}`, { type: c.type, vias: c.vias }])).values()].sort(
    (a, b) => a.vias - b.vias
  );
  const bgFill = dark ? "#1e293b" : "#ffffff";
  const dimText = dark ? "#cbd5e1" : "#64748b";

  // Eletroduto: seção circular, sem gravidade — layout e desenho à parte.
  const ductDim = getDimensions(infraType, eletrodutoNorma);
  if (ductDim.kind === "duct") {
    const R = trayWidth / 2; // trayWidth guarda o diâmetro interno (mm)
    const wallThickness = Math.max(2.5, R * 0.12);
    const outerR = R + wallThickness;
    const items = layoutCablesCircular(cables, R);
    const size = (outerR + PADDING) * 2;
    const c0 = size / 2;
    const bitola = ductDim.sizes.find((s) => s.value === trayWidth)?.label;
    const normaLabel = ELETRODUTO_NORMAS.find((n) => n.id === eletrodutoNorma)?.label;

    return (
      <div className="flex w-full flex-col items-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="max-w-full"
          style={{ width: 420, height: "auto" }}
        >
          <SharedDefs />
          <rect x={0} y={0} width={size} height={size} fill={bgFill} />
          <g transform={`translate(${c0}, ${c0})`}>
            <ellipse cx={0} cy={outerR + 5} rx={outerR * 0.85} ry={3.5} fill="#000000" opacity="0.12" />
            <Eletroduto R={R} />
            <g filter="url(#cableShadow)">
              {items.map((item) => (
                <Cable key={item.key} item={item} />
              ))}
            </g>
            {normaLabel && (
              <text x={0} y={-outerR - 21} fill={dimText} fontSize={9.5} opacity={0.75} textAnchor="middle">
                {normaLabel}
              </text>
            )}
            <text x={0} y={-outerR - 8} fill={dimText} fontSize={11} textAnchor="middle">
              {bitola ? `${bitola} — ` : ""}Ø int. {trayWidth} mm
            </text>
          </g>
        </svg>
        <CableLegend legendItems={legendItems} />
      </div>
    );
  }

  const items = layoutCables(cables, trayWidth, trayHeight);
  const width = trayWidth + PADDING * 2;
  const height = trayHeight + PADDING * 1.5;

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="max-w-full"
      style={{ width: 520, height: "auto" }}
    >
      <SharedDefs />

      <rect x={0} y={0} width={width} height={height} fill={bgFill} />

      <g transform={`translate(${PADDING / 2}, ${PADDING / 2})`}>
        {/* sombra de apoio no piso */}
        <ellipse
          cx={trayWidth / 2}
          cy={trayHeight + WALL + 5}
          rx={trayWidth / 2 + WALL}
          ry={3.5}
          fill="#000000"
          opacity="0.12"
        />

        {/* estrutura (seção conforme o tipo de infraestrutura) */}
        <Structure infraType={infraType} w={trayWidth} h={trayHeight} leitoFlange={leitoFlange} />

        {/* cabos */}
        <g filter="url(#cableShadow)">
          {items.map((item) => (
            <Cable key={item.key} item={item} />
          ))}
        </g>

        {/* cota de largura */}
        <line x1={0} y1={trayHeight + WALL + 14} x2={trayWidth} y2={trayHeight + WALL + 14} stroke="#94a3b8" strokeWidth={1} />
        <line x1={0} y1={trayHeight + WALL + 10} x2={0} y2={trayHeight + WALL + 18} stroke="#94a3b8" strokeWidth={1} />
        <line x1={trayWidth} y1={trayHeight + WALL + 10} x2={trayWidth} y2={trayHeight + WALL + 18} stroke="#94a3b8" strokeWidth={1} />
        <text x={trayWidth / 2} y={trayHeight + WALL + 30} fill={dimText} fontSize={11} textAnchor="middle">
          {trayWidth} mm
        </text>

        {/* cota de altura (vertical, ao lado da linha) */}
        <line x1={trayWidth + WALL + 14} y1={0} x2={trayWidth + WALL + 14} y2={trayHeight} stroke="#94a3b8" strokeWidth={1} />
        <line x1={trayWidth + WALL + 10} y1={0} x2={trayWidth + WALL + 18} y2={0} stroke="#94a3b8" strokeWidth={1} />
        <line x1={trayWidth + WALL + 10} y1={trayHeight} x2={trayWidth + WALL + 18} y2={trayHeight} stroke="#94a3b8" strokeWidth={1} />
        <text
          x={trayWidth + WALL + 30}
          y={trayHeight / 2}
          fill={dimText}
          fontSize={11}
          textAnchor="middle"
          transform={`rotate(-90, ${trayWidth + WALL + 30}, ${trayHeight / 2})`}
        >
          {trayHeight} mm
        </text>
      </g>
    </svg>
  );

  return (
    <div className="flex w-full flex-col items-center">
      {svg}
      <CableLegend legendItems={legendItems} />
    </div>
  );
});

export default TrayVisualization;
