// Memorial de cálculo em PDF da aba SPDA. As funções `rows*`/`linhas*` só
// preparam dados — puras e testadas à parte da renderização (que usa jsPDF
// e é verificada visualmente, como os outros memoriais do app).
//
// Referências de equação são as da ABNT NBR 5419-2:2026 (2ª edição), não da
// edição 2015 — o Anexo E dessa edição, que trazia tabelas de exemplo
// numérico como E.5/E.6, está "Vago" (reservado, sem conteúdo).

import { perdaL3 } from "./spdaRisco";

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

export function rowsProbabilidades(resultado) {
  const { probs } = resultado;
  const linhas = [
    { parametro: "Estrutura", equacao: "P_TA×P_B", simbolo: "P_A", resultado: probs.pa, ref: "B.1" },
    { parametro: "Estrutura (Tabela B.2)", equacao: "—", simbolo: "P_B", resultado: probs.pb, ref: "B.2" },
    { parametro: "Estrutura (Tabela B.7)", equacao: "—", simbolo: "P_EB", resultado: probs.peb, ref: "B.7" },
  ];
  probs.porSistema.forEach((s) => {
    const id = s.id.toUpperCase();
    linhas.push({ parametro: `Sistema ${id}`, equacao: "P_SPD×C_LD", simbolo: "P_C", resultado: s.pc, ref: "B.2" });
    linhas.push({ parametro: `Sistema ${id}`, equacao: "(K_S1×K_S2×K_S3×K_S4)²", simbolo: "P_M", resultado: s.pm, ref: "B.4" });
  });
  if (probs.porSistema.length > 1) {
    linhas.push({ parametro: "Composto (todos os sistemas)", equacao: "1−∏(1−P_Ci)", simbolo: "P_C", resultado: probs.pc, ref: "eq. 12" });
    linhas.push({ parametro: "Composto (todos os sistemas)", equacao: "1−∏(1−P_Mi)", simbolo: "P_M", resultado: probs.pm, ref: "eq. 13" });
  }
  probs.porLinha.forEach((p) => {
    const id = p.id.toUpperCase();
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_TU×P_EB×P_LD×C_LD", simbolo: "P_U", resultado: p.pu, ref: "B.8" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_EB×P_LD×C_LD", simbolo: "P_V", resultado: p.pv, ref: "B.9" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_SPD×P_LD×C_LD", simbolo: "P_W", resultado: p.pw, ref: "B.10" });
    linhas.push({ parametro: `Linha ${id}`, equacao: "P_SPD×P_LI×C_LI", simbolo: "P_Z", resultado: p.pz, ref: "B.11" });
  });
  return linhas;
}

export function rowsPerdas(entrada, resultado) {
  const { perdas } = resultado;
  const linhas = [
    { parametro: "Choque elétrico (L1)", equacao: "r_t×L_T×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_A", resultado: perdas.la, ref: "C.1/C.2" },
    { parametro: "Danos físicos (L1)", equacao: "r_p×r_f×h_z×L_F×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_B", resultado: perdas.lb, ref: "C.3" },
    { parametro: "Falha de sistemas internos (L1)", equacao: "L_O×(n_z/n_t)×(t_z/8760)×r_s", simbolo: "L_C", resultado: perdas.lc, ref: "C.4" },
  ];
  if (entrada.estrutura.patrimonioCultural) {
    linhas.push({
      parametro: "Danos físicos (L3 — patrimônio cultural)",
      equacao: "r_p×r_f×L_F×(c_z/c_t)",
      simbolo: "L_B",
      resultado: perdaL3(entrada.estrutura),
      ref: "C.7",
    });
  }
  return linhas;
}
