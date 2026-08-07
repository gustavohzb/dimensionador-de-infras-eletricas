// Memorial de cálculo em PDF da aba SPDA. As funções `rows*`/`linhas*` só
// preparam dados — puras e testadas à parte da renderização (que usa jsPDF
// e é verificada visualmente, como os outros memoriais do app).
//
// Referências de equação são as da ABNT NBR 5419-2:2026 (2ª edição), não da
// edição 2015 — o Anexo E dessa edição, que trazia tabelas de exemplo
// numérico como E.5/E.6, está "Vago" (reservado, sem conteúdo).

export function rowsAreasExposicao(resultado) {
  const { eventos } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "L×W+2×(3H)×(L+W)+π×(3H)²", simbolo: "A_D", resultado: eventos.ad, ref: "A.1" },
    { parametro: "Descargas próximas", equacao: "2×500×(L+W)+π×500²", simbolo: "A_M", resultado: eventos.am, ref: "A.6" },
  ];
  eventos.porLinha.forEach((ev) => {
    const id = ev.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "40×L_L", simbolo: "A_L", resultado: ev.al, ref: "A.8" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "4 000×L_L", simbolo: "A_I", resultado: ev.ai, ref: "A.10" });
    if (ev.adj != null) {
      linhas.push({
        parametro: `Estrutura adjacente à linha ${id}`,
        equacao: "L_J×W_J+2×(3H_J)×(L_J+W_J)+π×(3H_J)²",
        simbolo: "A_DJ",
        resultado: ev.adj,
        ref: "A.1",
      });
    }
  });
  return linhas;
}

export function rowsNumeroEventos(resultado) {
  const { eventos } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "N_G×A_D×C_D×10⁻⁶", simbolo: "N_D", resultado: eventos.nd, ref: "A.3" },
    { parametro: "Descargas próximas", equacao: "N_G×A_M×10⁻⁶", simbolo: "N_M", resultado: eventos.nm, ref: "A.5" },
  ];
  eventos.porLinha.forEach((ev) => {
    const id = ev.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "N_G×A_L×C_I×C_E×C_T×10⁻⁶", simbolo: "N_L", resultado: ev.nl, ref: "A.7" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "N_G×A_I×C_I×C_E×C_T×10⁻⁶", simbolo: "N_I", resultado: ev.ni, ref: "A.9" });
    if (ev.ndj) {
      linhas.push({
        parametro: `Estrutura adjacente à linha ${id}`,
        equacao: "N_G×A_DJ×C_DJ×C_T×10⁻⁶",
        simbolo: "N_DJ",
        resultado: ev.ndj,
        ref: "A.4",
      });
    }
  });
  return linhas;
}
