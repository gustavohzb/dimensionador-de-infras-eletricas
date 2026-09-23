// Curadoria dos resultados da busca reversa para exibição.

import { describe, it, expect } from "vitest";
import { findBestFits, selectDiverseResults } from "./reverseSearch";

// Resultado mínimo com o que selectDiverseResults olha: tipo, norma e altura.
// A ordem dos arrays imita a saída real de findBestFits (área crescente).
const calha = (h, w) => ({ infraType: "eletrocalha", eletrodutoNorma: null, trayHeight: h, trayWidth: w });
const duto = (norma, id) => ({ infraType: "eletroduto", eletrodutoNorma: norma, trayHeight: id, trayWidth: id });

describe("findBestFits com trifólios espaçados", () => {
  const trif = (d) => ({ d, type: "unipolar", vias: 1, trifolio: true });

  it("desligado, a busca é exatamente a de hoje", () => {
    const cabos = [trif(20), trif(20)];
    expect(findBestFits(cabos, { trifoliosEspacados: false })).toEqual(findBestFits(cabos, {}));
  });

  it("ligado, reprova o leito que só cabe com os feixes encostados", () => {
    // Dois feixes Ø20 exigem 3·2D = 120 mm espaçados, contra 80 encostados.
    const cabos = [trif(20), trif(20)];
    const larguras = (op) =>
      findBestFits(cabos, op).filter((r) => r.infraType === "leito").map((r) => r.trayWidth);
    expect(Math.min(...larguras({}))).toBeLessThan(120);
    expect(Math.min(...larguras({ trifoliosEspacados: true }))).toBeGreaterThanOrEqual(120);
  });

  it("ligado, eletroduto sai do ranking", () => {
    const cabos = [trif(10), trif(10)];
    expect(findBestFits(cabos, {}).some((r) => r.infraType === "eletroduto")).toBe(true);
    expect(findBestFits(cabos, { trifoliosEspacados: true }).some((r) => r.infraType === "eletroduto")).toBe(false);
  });

  it("ligado num trecho misto, o septo continua mandando", () => {
    // Com septo o compartimento já é outra geometria — a aba desabilita a
    // chave nesse caso, e a busca não pode divergir dela.
    const cabos = [trif(20), { d: 10, type: "comando", vias: 4 }];
    const com = findBestFits(cabos, { trifoliosEspacados: true });
    expect(com).toEqual(findBestFits(cabos, {}));
    expect(com.every((r) => r.hasSeptum)).toBe(true);
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
