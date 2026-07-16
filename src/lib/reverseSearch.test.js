// Curadoria dos resultados da busca reversa para exibição.

import { describe, it, expect } from "vitest";
import { selectDiverseResults } from "./reverseSearch";

// Resultado mínimo com o que selectDiverseResults olha: tipo, norma e altura.
// A ordem dos arrays imita a saída real de findBestFits (área crescente).
const calha = (h, w) => ({ infraType: "eletrocalha", eletrodutoNorma: null, trayHeight: h, trayWidth: w });
const duto = (norma, id) => ({ infraType: "eletroduto", eletrodutoNorma: norma, trayHeight: id, trayWidth: id });

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
