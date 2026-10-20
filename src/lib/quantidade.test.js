import { describe, it, expect } from "vitest";
import { lerQuantidade, QTD_MAX } from "./quantidade";

describe("lerQuantidade", () => {
  it("lê o número digitado", () => {
    expect(lerQuantidade("54")).toBe(54);
  });

  it("vazio, zero, negativo ou texto viram 1", () => {
    ["", "0", "-3", "abc"].forEach((t) => expect(lerQuantidade(t)).toBe(1));
  });

  it("decimal é truncado", () => {
    expect(lerQuantidade("3.7")).toBe(3);
  });

  it("limita ao máximo", () => {
    expect(lerQuantidade("99999")).toBe(QTD_MAX);
  });
});
