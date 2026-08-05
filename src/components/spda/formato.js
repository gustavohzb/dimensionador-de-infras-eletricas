// Notação científica em português, como aparece num memorial: 2,34 × 10⁻⁵.
// Compartilhada pelo veredito e pela tabela de componentes.
const SUPER = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

export function cientifica(n) {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mant = (n / 10 ** exp).toFixed(2).replace(".", ",");
  const expTexto = String(exp).split("").map((c) => SUPER[c]).join("");
  return `${mant} × 10${expTexto}`;
}
