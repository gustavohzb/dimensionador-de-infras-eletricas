// Gerenciamento de risco da ABNT NBR 5419-2:2026 — motor de cálculo.
//
// Só funções puras: recebe o objeto de entrada da aba e devolve números.
// As tabelas normativas ficam em data/spdaNBR5419.js; as fórmulas, aqui.
// Referências entre parênteses são as equações e tabelas da norma.

import {
  LOCALIZACAO_CD, INSTALACAO_CI, TIPO_LINHA_CT, AMBIENTE_CE,
  MEDIDAS_PTA, MEDIDAS_PTU, SPDA_PB, DPS_PSPD, DPS_PEB, FIACAO_KS3,
  LINHA_CLD_CLI, BLINDAGEM_RS, PLI_POR_TIPO, UW_VALORES,
  LT, LF_L3, TIPO_ESTRUTURA_LF, LO_POR_ESTRUTURA, PISO_RT,
  PROVIDENCIAS_RP, RISCO_RF, PERIGO_HZ, CONSTRUCAO_RS,
} from "../data/spdaNBR5419";

// Busca o valor de uma tabela pelo id. Id desconhecido devolve 0 em vez de
// NaN: um fator ausente zera a componente, o que é visível no resultado, ao
// passo que NaN se espalharia silenciosamente por todas as somas.
export function fator(tabela, id) {
  return tabela.find((t) => t.id === id)?.valor ?? 0;
}

// A.1 — área de exposição equivalente da estrutura. Com saliência na cobertura
// (A.2), vale o maior entre a área da estrutura e a da saliência.
export function areaExposicaoEstrutura({ L, W, H, Hp = null }) {
  const ad = L * W + 2 * (3 * H) * (L + W) + Math.PI * (3 * H) ** 2;
  if (!Hp) return ad;
  return Math.max(ad, Math.PI * (3 * Hp) ** 2);
}

// A.6 — área de exposição de descargas próximas da estrutura (até 500 m).
export function areaExposicaoProxima({ L, W }) {
  return 2 * 500 * (L + W) + Math.PI * 500 ** 2;
}

// A.8 e A.10 — áreas de exposição da linha elétrica e das descargas próximas.
export function areasLinha(ll) {
  return { al: 40 * ll, ai: 4000 * ll };
}

// A.3 a A.9 — números médios anuais de eventos perigosos.
export function numeroEventos({ estrutura, linhas = [] }) {
  const ng = Number(estrutura.ng) || 0;
  const ad = areaExposicaoEstrutura(estrutura);
  const am = areaExposicaoProxima(estrutura);
  const nd = ng * ad * fator(LOCALIZACAO_CD, estrutura.cd) * 1e-6; // (A.3)
  const nm = ng * am * 1e-6; // (A.5)

  const porLinha = linhas.map((linha) => {
    const { al, ai } = areasLinha(Number(linha.ll) || 0);
    const ci = fator(INSTALACAO_CI, linha.ci);
    const ce = fator(AMBIENTE_CE, linha.ce);
    const ct = fator(TIPO_LINHA_CT, linha.ct);
    // (A.4) — só quando há estrutura adjacente na outra ponta da linha.
    const ndj = linha.adjacente
      ? ng * areaExposicaoEstrutura(linha.adjacente) * fator(LOCALIZACAO_CD, linha.adjacente.cd) * ct * 1e-6
      : 0;
    return {
      id: linha.id,
      al,
      ai,
      nl: ng * al * ci * ce * ct * 1e-6, // (A.7)
      ni: ng * ai * ci * ce * ct * 1e-6, // (A.9)
      ndj,
    };
  });

  return { nd, nm, ad, am, porLinha };
}

// Medidas de proteção marcadas se multiplicam (B.2.2 e nota da Tabela B.6).
// Sem nenhuma marcada o fator é 1 — ou seja, nenhuma redução.
export function produtoMedidas(tabela, ids = []) {
  return ids.reduce((acc, id) => acc * fator(tabela, id), 1);
}

// Probabilidade composta de vários sistemas internos na mesma zona: a chance de
// pelo menos um falhar (equações 12 e 13).
//
// A forma direta `1 - ∏(1 - p)` perde tudo em ponto flutuante quando as
// probabilidades são pequenas: com p = 3e-26, `1 - p` arredonda para 1 e o
// resultado vira zero. E aqui elas SÃO pequenas — P_MS é um produto de quatro
// fatores elevado ao quadrado, e chega à casa de 10⁻²⁶ com blindagem boa.
// log1p e expm1 são feitos para essa faixa e mantêm a precisão.
function composta(valores) {
  const soma = valores.reduce((acc, p) => acc + Math.log1p(-p), 0);
  // O `+ 0` normaliza o zero negativo que -expm1(0) devolve, para não aparecer
  // "-0" na tela. Soma com zero preserva qualquer outro valor, inclusive NaN.
  return -Math.expm1(soma) + 0;
}

// Busca em tabela indexada por U_W. A norma tabela P_LI a partir de 1 kV; abaixo
// disso não há valor, e adota-se 1 (nenhuma redução, que é o pior caso).
function porUw(mapa, uw) {
  return mapa[uw] ?? 1;
}

// Linha à qual o sistema interno está conectado. Sem linha, a Tabela B.4 dá
// C_LD = C_LI = 0 ("sem conexões com linhas elétricas externas").
function linhaDoSistema(linhas, sistema) {
  return linhas.find((l) => l.id === sistema.linhaId) ?? null;
}

function cldDaLinha(linha) {
  if (!linha) return 0;
  return LINHA_CLD_CLI.find((t) => t.id === linha.blindagem)?.cld ?? 1;
}

function cliDaLinha(linha) {
  if (!linha) return 0;
  return LINHA_CLD_CLI.find((t) => t.id === linha.blindagem)?.cli ?? 1;
}

// B.1 a B.11 — todas as probabilidades de dano da zona.
export function probabilidades({ linhas = [], protecoes }) {
  const sistemas = protecoes.sistemas ?? [];
  const pb = fator(SPDA_PB, protecoes.spdaNp);
  const pspd = fator(DPS_PSPD, protecoes.dpsNp);
  const peb = fator(DPS_PEB, protecoes.dpsClasseI);
  const pa = produtoMedidas(MEDIDAS_PTA, protecoes.medidasPta) * pb; // (B.1)
  const ptu = produtoMedidas(MEDIDAS_PTU, protecoes.medidasPtu);

  // K_S1 e K_S2: blindagem metálica contínua ≥ 0,1 mm vale 10⁻⁴; malha vale
  // 0,12 × largura; sem nenhuma das duas, não há blindagem espacial (= 1).
  // O máximo é 1 (nota de B.4.13).
  const ks = protecoes.blindagemContinua
    ? 1e-4
    : Math.min(1, protecoes.larguraMalha ? 0.12 * Number(protecoes.larguraMalha) : 1);
  const ks3 = fator(FIACAO_KS3, protecoes.fiacao);

  // P_C por sistema (B.2). Sistema interno não blindado força C_LD = 1 (B.4.4).
  const pcPorSistema = sistemas.map((s) => {
    const linha = linhaDoSistema(linhas, s);
    const cld = s.blindado ? cldDaLinha(linha) : (linha ? 1 : 0);
    return pspd * cld;
  });

  // P_M por sistema (B.3 e B.4). K_S4 = 1/U_W, limitado a 1 (B.4.14).
  const pmPorSistema = sistemas.map((s) => {
    if (s.interfaceIsolante) return 0; // P_MS = 0 (B.4.11)
    const ks4 = Math.min(1, 1 / (Number(s.uw) || 1));
    const pms = (ks * ks * ks3 * ks4) ** 2;
    // Sem sistema coordenado de DPS, P_M = P_MS (B.4.8).
    return protecoes.dpsNp === "nenhum" ? pms : pspd * pms;
  });

  const porLinha = linhas.map((linha) => {
    const daLinha = sistemas.filter((s) => s.linhaId === linha.id);
    // 6.9.1.2-a: quando mais de um valor se aplica, escolhe-se o maior — o que
    // significa o menor U_W entre os equipamentos servidos pela linha.
    const uw = daLinha.length
      ? Math.min(...daLinha.map((s) => Number(s.uw) || UW_VALORES[0]))
      : UW_VALORES[0];
    const pld = BLINDAGEM_RS.find((b) => b.id === linha.rs)?.pld[uw] ?? 1;
    const pli = porUw(PLI_POR_TIPO[linha.tipo] ?? PLI_POR_TIPO.energia, uw);
    const cld = cldDaLinha(linha);
    const cli = cliDaLinha(linha);
    return {
      id: linha.id,
      pu: ptu * peb * pld * cld, // (B.8)
      pv: peb * pld * cld, // (B.9)
      pw: pspd * pld * cld, // (B.10)
      pz: pspd * pli * cli, // (B.11)
    };
  });

  return { pa, pb, pc: composta(pcPorSistema), pm: composta(pmPorSistema), porLinha };
}

// C.1 a C.4 — perdas de vida humana (L1) da zona de estudo.
export function perdasL1(estrutura) {
  const rt = fator(PISO_RT, estrutura.piso);
  const rp = fator(PROVIDENCIAS_RP, estrutura.providencias);
  const rf = fator(RISCO_RF, estrutura.riscoIncendio);
  const hz = fator(PERIGO_HZ, estrutura.perigoEspecial);
  const rs = fator(CONSTRUCAO_RS, estrutura.construcao);
  const lf = TIPO_ESTRUTURA_LF.find((t) => t.id === estrutura.tipoEstrutura)?.lf ?? 0;
  const lo = fator(LO_POR_ESTRUTURA, estrutura.loEstrutura);

  // Presença de pessoas: fração da zona (n_z/n_t) e do ano (t_z/8760).
  const nt = Number(estrutura.nt) || 1;
  const presenca = ((Number(estrutura.nz) || 0) / nt) * ((Number(estrutura.tz) || 0) / 8760);

  return {
    la: rt * LT * presenca * rs, // (C.1) — vale também para L_U (C.2)
    lb: rp * rf * hz * lf * presenca * rs, // (C.3) — vale também para L_V
    lc: lo * presenca * rs, // (C.4) — vale para L_M, L_W e L_Z
  };
}

// C.7 — perda de patrimônio cultural (L3). Vale para L_B e L_V de R3.
export function perdaL3(estrutura) {
  const rp = fator(PROVIDENCIAS_RP, estrutura.providencias);
  const rf = fator(RISCO_RF, estrutura.riscoIncendio);
  const ct = Number(estrutura.ct) || 1;
  return rp * rf * LF_L3 * ((Number(estrutura.cz) || 0) / ct);
}
