// Memorial de cálculo em PDF da aba SPDA. As funções `rows*`/`linhas*` só
// preparam dados — puras e testadas à parte da renderização (que usa jsPDF
// e é verificada visualmente, como os outros memoriais do app).
//
// Referências de equação são as da ABNT NBR 5419-2:2026 (2ª edição), não da
// edição 2015 — o Anexo E dessa edição, que trazia tabelas de exemplo
// numérico como E.5/E.6, está "Vago" (reservado, sem conteúdo).

import { perdaL3 } from "./spdaRisco";
import {
  LOCALIZACAO_CD, CONSTRUCAO_RS, TIPO_ESTRUTURA_LF, PISO_RT, RISCO_RF,
  PROVIDENCIAS_RP, PERIGO_HZ, LO_POR_ESTRUTURA, INSTALACAO_CI, AMBIENTE_CE,
  TIPO_LINHA_CT, LINHA_CLD_CLI, BLINDAGEM_RS, SPDA_PB, DPS_PSPD, DPS_PEB,
  MEDIDAS_PTA, MEDIDAS_PTU, FIACAO_KS3,
} from "../data/spdaNBR5419";

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

function rotulo(tabela, id) {
  return tabela.find((t) => t.id === id)?.label ?? "—";
}

export function linhasEstrutura(e) {
  const pares = [
    ["Dimensões (L × W × H)", `${e.L} × ${e.W} × ${e.H} m`],
  ];
  if (e.Hp) pares.push(["Saliência H_P", `${e.Hp} m`]);
  pares.push(["Município", e.municipio && e.uf ? `${e.municipio}/${e.uf}` : "—"]);
  pares.push(["N_G", e.ng != null ? `${e.ng} raios/km²/ano` : "—"]);
  pares.push(["Localização relativa (C_D)", rotulo(LOCALIZACAO_CD, e.cd)]);
  pares.push(["Tipo de construção (r_S)", rotulo(CONSTRUCAO_RS, e.construcao)]);
  pares.push(["Uso da edificação (L_F)", rotulo(TIPO_ESTRUTURA_LF, e.tipoEstrutura)]);
  pares.push(["Piso da área ocupada (r_t)", rotulo(PISO_RT, e.piso)]);
  pares.push(["Risco de incêndio/explosão (r_f)", rotulo(RISCO_RF, e.riscoIncendio)]);
  pares.push(["Combate a incêndio (r_p)", rotulo(PROVIDENCIAS_RP, e.providencias)]);
  pares.push(["Perigo especial (h_z)", rotulo(PERIGO_HZ, e.perigoEspecial)]);
  pares.push(["Pessoas na zona / na estrutura (n_z / n_t)", `${e.nz} / ${e.nt}`]);
  pares.push(["Ocupação", `${e.horasDia} h/dia, ${e.diasSemana} dias/semana`]);
  pares.push(["Explosão ou risco imediato à vida", e.explosaoOuRiscoVida ? "Sim" : "Não"]);
  if (e.explosaoOuRiscoVida) {
    pares.push(["Consequência da falha dos sistemas internos (L_O)", rotulo(LO_POR_ESTRUTURA, e.loEstrutura)]);
  }
  pares.push(["Patrimônio cultural", e.patrimonioCultural ? "Sim" : "Não"]);
  if (e.patrimonioCultural) {
    pares.push(["Valor do acervo / total (c_z / c_t)", `${e.cz} / ${e.ct}`]);
  }
  return pares;
}

export function linhasLinhaEletrica(l) {
  const pares = [
    ["Tipo", l.tipo === "energia" ? "Energia" : "Sinal"],
    ["Comprimento L_L", `${l.ll} m`],
    ["Instalação (C_I)", rotulo(INSTALACAO_CI, l.ci)],
    ["Ambiente (C_E)", rotulo(AMBIENTE_CE, l.ce)],
    ["Tipo de linha (C_T)", rotulo(TIPO_LINHA_CT, l.ct)],
    ["Blindagem (C_LD/C_LI)", rotulo(LINHA_CLD_CLI, l.blindagem)],
    ["Resistência da blindagem (P_LD)", rotulo(BLINDAGEM_RS, l.rs)],
  ];
  if (l.adjacente) {
    pares.push([
      "Estrutura adjacente",
      `${l.adjacente.L} × ${l.adjacente.W} × ${l.adjacente.H} m, ${rotulo(LOCALIZACAO_CD, l.adjacente.cd)}`,
    ]);
  }
  return pares;
}

export function linhasProtecoes(p) {
  const listaOuNenhuma = (tabela, ids) =>
    ids.length ? ids.map((id) => rotulo(tabela, id)).join("; ") : "Nenhuma";
  return [
    ["SPDA (P_B)", rotulo(SPDA_PB, p.spdaNp)],
    ["Sistema coordenado de DPS (P_SPD)", rotulo(DPS_PSPD, p.dpsNp)],
    ["DPS classe I na entrada (P_EB)", rotulo(DPS_PEB, p.dpsClasseI)],
    ["Medidas contra toque/passo na estrutura (P_TA)", listaOuNenhuma(MEDIDAS_PTA, p.medidasPta)],
    ["Medidas contra toque vindo da linha (P_TU)", listaOuNenhuma(MEDIDAS_PTU, p.medidasPtu)],
    ["Fiação interna (K_S3)", rotulo(FIACAO_KS3, p.fiacao)],
    [
      "Blindagem espacial",
      p.blindagemContinua
        ? "Contínua ≥ 0,1 mm (K_S1 = K_S2 = 10⁻⁴)"
        : p.larguraMalha
          ? `Malha, largura ${p.larguraMalha} m`
          : "Nenhuma",
    ],
  ];
}

export function linhasSistemaInterno(s) {
  return [
    ["U_W", `${String(s.uw).replace(".", ",")} kV`],
    ["Blindado", s.blindado ? "Sim" : "Não"],
    ["Interface isolante", s.interfaceIsolante ? "Sim" : "Não"],
    ["Linha associada", s.linhaId ? s.linhaId.toUpperCase() : "Nenhuma"],
    ["Crítico (Seção 7)", s.critico ? "Sim" : "Não"],
    ["Em ZPR₀ᴬ (Seção 7)", s.zpr0a ? "Sim" : "Não"],
  ];
}
