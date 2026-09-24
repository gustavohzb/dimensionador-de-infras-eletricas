// Curadoria dos resultados da busca reversa para exibição.

import { describe, it, expect } from "vitest";
import { findBestFits, selectDiverseResults } from "./reverseSearch";

// Resultado mínimo com o que selectDiverseResults olha: tipo, norma e altura.
// A ordem dos arrays imita a saída real de findBestFits (área crescente).
const calha = (h, w) => ({ infraType: "eletrocalha", eletrodutoNorma: null, trayHeight: h, trayWidth: w });
const duto = (norma, id) => ({ infraType: "eletroduto", eletrodutoNorma: norma, trayHeight: id, trayWidth: id });

describe("findBestFits com trifólios espaçados", () => {
  const trif = (d) => ({ d, type: "unipolar", vias: 1, trifolio: true });
  const trif2D = (d) => ({ ...trif(d), espacado: true });
  const leitos = (cabos) =>
    findBestFits(cabos).filter((r) => r.infraType === "leito").map((r) => r.trayWidth);

  it("o arranjo vem do próprio cabo: trifólio 2D reprova o leito que só serve encostado", () => {
    // Dois feixes Ø20 pedem 3·2D = 120 mm espaçados, contra 80 encostados.
    expect(Math.min(...leitos([trif(20), trif(20)]))).toBeLessThan(120);
    expect(Math.min(...leitos([trif2D(20), trif2D(20)]))).toBeGreaterThanOrEqual(120);
  });

  it("com trifólio 2D no trecho, eletroduto sai do ranking", () => {
    expect(findBestFits([trif(10), trif(10)]).some((r) => r.infraType === "eletroduto")).toBe(true);
    expect(findBestFits([trif2D(10), trif2D(10)]).some((r) => r.infraType === "eletroduto")).toBe(false);
  });

  it("sem trifólio 2D, a busca é a de sempre", () => {
    // O campo `espacado: false` explícito não pode mudar nada.
    const cabos = [trif(20), trif(20)];
    expect(findBestFits(cabos.map((c) => ({ ...c, espacado: false })))).toEqual(findBestFits(cabos));
  });

  it("num trecho misto o septo continua mandando", () => {
    const com2D = [trif2D(20), { d: 10, type: "comando", vias: 4 }];
    const sem = [trif(20), { d: 10, type: "comando", vias: 4 }];
    expect(findBestFits(com2D)).toEqual(findBestFits(sem));
  });
});

describe("selectDiverseResults", () => {
  it("eletroduto: só a menor bitola que comporta, uma por norma", () => {
    const results = [
      duto("nbr5624", 22.0),
      duto("nbr5624", 28.4), // bitola acima da mesma norma — previsível, não entra
      duto("inoxSch10", 22.5),
      duto("inoxSch10", 28.2),
      duto("inoxSch40", 21.0),
    ];
    expect(selectDiverseResults(results)).toEqual([
      duto("nbr5624", 22.0),
      duto("inoxSch10", 22.5),
      duto("inoxSch40", 21.0),
    ]);
  });

  it("bandeja: mantém duas alturas por tipo", () => {
    const results = [calha(50, 100), calha(50, 150), calha(100, 100), calha(150, 100)];
    // 50x150 sai (altura repetida); 150 sai (já tem duas alturas)
    expect(selectDiverseResults(results)).toEqual([calha(50, 100), calha(100, 100)]);
  });

  it("maxPerGroup não afrouxa o limite do eletroduto", () => {
    const results = [duto("nbr5597", 22.0), duto("nbr5597", 28.4), calha(50, 100), calha(100, 100)];
    const selected = selectDiverseResults(results, 3);
    expect(selected.filter((r) => r.infraType === "eletroduto")).toHaveLength(1);
    expect(selected.filter((r) => r.infraType === "eletrocalha")).toHaveLength(2);
  });
});
