import { INFRA_TYPES, ELETRODUTO_NORMAS } from "../data/corfioHEPR";

// Mini-ícone da seção de cada infraestrutura (24x18).
function InfraIcon({ id }) {
  const stroke = "currentColor";
  if (id === "eletrocalha") {
    return (
      <svg width="20" height="15" viewBox="0 0 24 18" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2 V15 H21 V2" />
      </svg>
    );
  }
  if (id === "perfilado") {
    return (
      <svg width="20" height="15" viewBox="0 0 24 18" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2 H3 V15 H21 V2 H16" />
      </svg>
    );
  }
  if (id === "leito") {
    return (
      <svg width="20" height="15" viewBox="0 0 24 18" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2 V16 M20 2 V16" />
        <path d="M4 15 H20" />
        <path d="M8 15 V12 M12 15 V12 M16 15 V12" strokeWidth="1.1" />
      </svg>
    );
  }
  if (id === "eletroduto") {
    // tubo em corte: parede externa + cavidade interna
    return (
      <svg width="20" height="15" viewBox="0 0 24 18" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="7" />
        <circle cx="12" cy="9" r="3.1" />
      </svg>
    );
  }
  // aramado (malha de arame)
  return (
    <svg width="20" height="15" viewBox="0 0 24 18" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2 V13 Q3 15 5 15 H19 Q21 15 21 13 V2" />
      <path d="M8 4 V15 M13 4 V15 M17 5 V15" strokeWidth="1" opacity="0.8" />
      <path d="M3 8 H21 M4 12 H20" strokeWidth="1" opacity="0.8" />
    </svg>
  );
}

function ToggleGroup({ options, value, onChange }) {
  const cols = options.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid ${cols} gap-2`}>
      {options.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-xs border px-2.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border-copper-600 bg-copper-50 text-copper-700 dark:border-copper-500 dark:bg-copper-500/15 dark:text-copper-300"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function InfraSelector({
  infraType,
  setInfraType,
  leitoFlange,
  setLeitoFlange,
  eletrodutoNorma,
  setEletrodutoNorma,
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {INFRA_TYPES.map(({ id, label }) => {
          const active = infraType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setInfraType(id)}
              className={`flex items-center gap-1.5 rounded-xs border px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-copper-600 bg-copper-50 text-copper-700 dark:border-copper-500 dark:bg-copper-500/15 dark:text-copper-300"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className={active ? "text-copper-600 dark:text-copper-300" : "text-slate-400 dark:text-slate-400"}>
                <InfraIcon id={id} />
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {infraType === "leito" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Abas das longarinas</label>
          <ToggleGroup
            options={[
              { id: "interna", label: "Abas Internas" },
              { id: "externa", label: "Abas Externas" },
            ]}
            value={leitoFlange}
            onChange={setLeitoFlange}
          />
        </div>
      )}

      {infraType === "eletroduto" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Norma</label>
          <ToggleGroup options={ELETRODUTO_NORMAS} value={eletrodutoNorma} onChange={setEletrodutoNorma} />
        </div>
      )}
    </div>
  );
}
