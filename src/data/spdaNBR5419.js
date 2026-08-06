// Tabelas da ABNT NBR 5419-2:2026 (Proteção contra descargas atmosféricas —
// Parte 2: Análise de risco), usadas pela aba de Gerenciamento de Risco.
//
// Só dados: nenhuma conta mora aqui. As fórmulas ficam em lib/spdaRisco.js.
// Cada lista traz o `id` usado no estado da aba, o rótulo mostrado ao usuário
// e o valor normativo. Trocar um valor de norma é editar este arquivo.
//
// A Tabela F.1 (N_G por município) NÃO está aqui: o N_G é entrada do usuário,
// lido do Anexo F da norma, que é a única fonte que ela admite (A.1.3).

// --- Anexo A: fatores do número de eventos perigosos ---

// Tabela A.1 — fator de localização da estrutura (vale também para C_DJ).
export const LOCALIZACAO_CD = [
  { id: "cercadaAltos", label: "Cercada por objetos significativamente mais altos", valor: 0.25 },
  { id: "cercadaMesma", label: "Cercada por objetos de mesma altura ou mais baixos", valor: 0.5 },
  { id: "isolada", label: "Isolada: sem objetos nas vizinhanças", valor: 1 },
  { id: "topoColina", label: "Isolada no topo de colina ou monte", valor: 2 },
];

// Tabela A.2 — fator de instalação da linha elétrica.
export const INSTALACAO_CI = [
  { id: "aereo", label: "Aéreo", valor: 1 },
  { id: "enterrado", label: "Enterrado", valor: 0.5 },
  { id: "enterradoMalha", label: "Enterrado dentro de malha de aterramento", valor: 0.01 },
];

// Tabela A.3 — fator do tipo de linha elétrica.
export const TIPO_LINHA_CT = [
  { id: "btOuSinal", label: "Energia em BT ou sinal", valor: 1 },
  { id: "atComTrafo", label: "Energia em AT com transformador AT/BT", valor: 0.2 },
];

// Tabela A.4 — fator ambiental da linha elétrica.
export const AMBIENTE_CE = [
  { id: "rural", label: "Rural", valor: 1 },
  { id: "suburbano", label: "Suburbano", valor: 0.5 },
  { id: "urbano", label: "Urbano", valor: 0.1 },
  { id: "urbanoAlto", label: "Urbano com estruturas acima de 20 m", valor: 0.01 },
];

// --- Anexo B: probabilidades de dano ---

// Tabela B.1 — P_TA. Marcar mais de uma medida multiplica os valores (B.2.2).
export const MEDIDAS_PTA = [
  { id: "avisos", label: "Avisos de alerta", valor: 0.1 },
  { id: "isolacaoDescidas", label: "Isolação elétrica das descidas (só tensão de toque)", valor: 0.01 },
  { id: "equipotencializacaoSolo", label: "Equipotencialização do solo (só tensão de passo)", valor: 0.01 },
  { id: "descidaNatural", label: "Estrutura metálica ou concreto armado como descida natural", valor: 0.001 },
  { id: "restricoesFisicas", label: "Restrições físicas fixas (toque e passo)", valor: 0 },
];

// Tabela B.2 — P_B conforme o SPDA.
export const SPDA_PB = [
  { id: "nenhum", label: "Sem SPDA", valor: 1 },
  { id: "npIV", label: "SPDA NP IV", valor: 0.2 },
  { id: "npIII", label: "SPDA NP III", valor: 0.1 },
  { id: "npII", label: "SPDA NP II", valor: 0.05 },
  { id: "npI", label: "SPDA NP I", valor: 0.02 },
  { id: "npIDescidaNatural", label: "Captação NP I + descida natural", valor: 0.01 },
  { id: "coberturaMetalica", label: "Cobertura metálica como captação natural + descida natural", valor: 0.001 },
];

// Tabela B.3 — P_SPD do sistema coordenado de DPS.
export const DPS_PSPD = [
  { id: "nenhum", label: "Sem sistema coordenado de DPS", valor: 1 },
  { id: "npIIIIV", label: "DPS projetados para NP III-IV", valor: 0.05 },
  { id: "npII", label: "DPS projetados para NP II", valor: 0.02 },
  { id: "npI", label: "DPS projetados para NP I", valor: 0.01 },
  { id: "melhorQueNpI", label: "DPS melhores que NP I", valor: 0.005 },
];

// Tabela B.4 — C_LD e C_LI conforme a linha e a equipotencialização na entrada.
export const LINHA_CLD_CLI = [
  { id: "aereaNaoBlindada", label: "Aérea não blindada", cld: 1, cli: 1 },
  { id: "subterraneaNaoBlindada", label: "Subterrânea não blindada", cld: 1, cli: 1 },
  { id: "neutroMultiaterrado", label: "Energia com neutro multiaterrado", cld: 1, cli: 0.2 },
  { id: "subterraneaBlindadaSolta", label: "Subterrânea blindada, blindagem não interligada", cld: 1, cli: 0.3 },
  { id: "aereaBlindadaSolta", label: "Aérea blindada, blindagem não interligada", cld: 1, cli: 0.1 },
  { id: "blindadaInterligada", label: "Blindada, interligada ao mesmo barramento do equipamento", cld: 1, cli: 0 },
  { id: "dutoMetalico", label: "Cabo/duto de proteção, eletroduto ou tubo metálico interligado", cld: 0, cli: 0 },
  { id: "semLinhaExterna", label: "Sem linha externa ou linha não metálica (fibra óptica)", cld: 0, cli: 0 },
  { id: "interfaceIsolante", label: "Interface isolante conforme a NBR 5419-4", cld: 0, cli: 0 },
];

// Tabela B.5 — K_S3 conforme a fiação interna (valores para circuito de 100 m).
export const FIACAO_KS3 = [
  { id: "semCuidado", label: "Não blindado, sem cuidado de roteamento (laço ~50 m²)", valor: 1 },
  { id: "grandesLacos", label: "Não blindado, evitando grandes laços (~25 m²)", valor: 0.5 },
  { id: "lacosMedios", label: "Não blindado, evitando laços médios (~10 m²)", valor: 0.2 },
  { id: "pequenosLacos", label: "Não blindado, evitando pequenos laços (~0,5 m²)", valor: 0.01 },
  { id: "blindado", label: "Cabos blindados ou em condutos metálicos", valor: 0.0001 },
];

// Tabela B.6 — P_TU. Mais de uma medida multiplica os valores.
export const MEDIDAS_PTU = [
  { id: "avisos", label: "Avisos visíveis de alerta", valor: 0.1 },
  { id: "isolacao", label: "Isolação elétrica", valor: 0.01 },
  { id: "restricoesFisicas", label: "Restrições físicas", valor: 0 },
];

// Tabela B.7 — P_EB dos DPS classe I para equipotencialização.
export const DPS_PEB = [
  { id: "nenhum", label: "Sem DPS classe I", valor: 1 },
  { id: "npIIIIV", label: "DPS classe I para NP III-IV", valor: 0.05 },
  { id: "npII", label: "DPS classe I para NP II", valor: 0.02 },
  { id: "npI", label: "DPS classe I para NP I", valor: 0.01 },
  { id: "melhorQueNpI", label: "DPS classe I melhores que NP I", valor: 0.005 },
];

// Tensões suportáveis nominais de impulso das Tabelas B.8 e B.9 (kV).
export const UW_VALORES = [0.35, 0.5, 1, 1.5, 2.5, 4, 6];

// Tabela B.8 — P_LD conforme a blindagem da linha e o U_W do equipamento.
export const BLINDAGEM_RS = [
  {
    id: "naoBlindada",
    label: "Não blindada, ou blindagem não interligada ao equipamento",
    pld: { 0.35: 1, 0.5: 1, 1: 1, 1.5: 1, 2.5: 1, 4: 1, 6: 1 },
  },
  {
    id: "rs5a20",
    label: "Blindada interligada, 5 Ω/km < R_S ≤ 20 Ω/km",
    pld: { 0.35: 1, 0.5: 1, 1: 1, 1.5: 1, 2.5: 0.95, 4: 0.9, 6: 0.8 },
  },
  {
    id: "rs1a5",
    label: "Blindada interligada, 1 Ω/km < R_S ≤ 5 Ω/km",
    pld: { 0.35: 1, 0.5: 1, 1: 0.9, 1.5: 0.8, 2.5: 0.6, 4: 0.3, 6: 0.1 },
  },
  {
    id: "rsAte1",
    label: "Blindada interligada, R_S ≤ 1 Ω/km",
    pld: { 0.35: 1, 0.5: 0.85, 1: 0.6, 1.5: 0.4, 2.5: 0.2, 4: 0.04, 6: 0.02 },
  },
];

// Tabela B.9 — P_LI conforme o tipo de linha e o U_W. Abaixo de 1 kV a norma
// não tabela: usa-se 1 (pior caso), tratado em lib/spdaRisco.js.
export const PLI_POR_TIPO = {
  energia: { 1: 1, 1.5: 0.6, 2.5: 0.3, 4: 0.16, 6: 0.1 },
  sinal: { 1: 1, 1.5: 0.5, 2.5: 0.2, 4: 0.08, 6: 0.04 },
};

// --- Anexo C: perdas ---

// Tabela C.2 — L_T é o mesmo para todos os tipos de estrutura.
export const LT = 0.01;

// Tabela C.2 — L_F (danos físicos) por tipo de estrutura, na perda L1.
export const TIPO_ESTRUTURA_LF = [
  { id: "explosao", label: "Risco de explosão", lf: 0.1 },
  { id: "hospitalEscola", label: "Hospital, hotel, escola, edifício cívico", lf: 0.1 },
  { id: "publico", label: "Entretenimento público, igreja, museu", lf: 0.05 },
  { id: "industrial", label: "Industrial, comercial", lf: 0.02 },
  { id: "outros", label: "Outros", lf: 0.01 },
];

// Tabela C.2 — L_O (falha de sistemas internos). A norma só tabela os casos em
// que R_C/R_M/R_W/R_Z entram em R1, por isso a lista é curta.
export const LO_POR_ESTRUTURA = [
  { id: "explosao", label: "Risco de explosão", valor: 0.1 },
  { id: "utiCirurgico", label: "UTI e bloco cirúrgico de hospital", valor: 0.01 },
  { id: "outrasHospital", label: "Outras partes de hospital", valor: 0.001 },
];

// Tabela C.3 — r_t conforme o piso.
export const PISO_RT = [
  { id: "terraConcreto", label: "Terra, concreto (≤ 1 kΩ)", valor: 0.01 },
  { id: "marmoreCeramica", label: "Mármore, cerâmica (1 a 10 kΩ)", valor: 0.001 },
  { id: "britaCarpete", label: "Brita, tapete, carpete (10 a 100 kΩ)", valor: 0.0001 },
  { id: "asfaltoMadeira", label: "Asfalto, linóleo, madeira (≥ 100 kΩ)", valor: 0.00001 },
];

// Tabela C.4 — r_p conforme as providências contra incêndio.
export const PROVIDENCIAS_RP = [
  { id: "nenhuma", label: "Nenhuma providência, ou zona com risco de explosão", valor: 1 },
  { id: "manuais", label: "Extintores, alarme manual, hidrantes, compartimentação ou rotas de escape", valor: 0.5 },
  { id: "automaticas", label: "Instalações fixas automáticas ou alarme automático", valor: 0.2 },
];

// Tabela C.5 — r_f conforme o risco de incêndio ou explosão.
export const RISCO_RF = [
  { id: "explosaoZ0", label: "Explosão — zonas 0, 20 e explosivos sólidos", valor: 1 },
  { id: "explosaoZ1", label: "Explosão — zonas 1, 21", valor: 0.1 },
  { id: "explosaoZ2", label: "Explosão — zonas 2, 22", valor: 0.001 },
  { id: "incendioAlto", label: "Incêndio alto (carga ≥ 800 MJ/m²)", valor: 0.1 },
  { id: "incendioNormal", label: "Incêndio normal (400 a 800 MJ/m²)", valor: 0.01 },
  { id: "incendioBaixo", label: "Incêndio baixo (< 400 MJ/m²)", valor: 0.001 },
  { id: "nenhum", label: "Sem risco de incêndio ou explosão", valor: 0 },
];

// Tabela C.6 — h_z conforme o perigo especial.
export const PERIGO_HZ = [
  { id: "nenhum", label: "Sem perigo especial", valor: 1 },
  { id: "panicoBaixo", label: "Baixo nível de pânico (até 2 andares, até 100 pessoas)", valor: 2 },
  { id: "panicoMedio", label: "Nível médio de pânico (100 a 1 000 pessoas)", valor: 5 },
  { id: "evacuacaoDificil", label: "Dificuldade de evacuação (hospitais, pessoas imobilizadas)", valor: 5 },
  { id: "panicoAlto", label: "Alto nível de pânico (mais de 1 000 pessoas)", valor: 10 },
];

// Tabela C.7 — r_S conforme o tipo de construção.
export const CONSTRUCAO_RS = [
  { id: "simples", label: "Simples: madeira ou alvenaria simples", valor: 2 },
  { id: "robusta", label: "Robusta: estrutura metálica ou concreto armado", valor: 1 },
];

// Tabela C.9 — L_F da perda L3 (patrimônio cultural).
export const LF_L3 = 0.1;

// Tabela 4 — riscos toleráveis (1/ano).
export const RISCO_TOLERAVEL = { R1: 1e-5, R3: 1e-4 };

// Seção 7 — frequência de danos tolerável F_T (1/ano). O valor de sistema
// crítico é máximo: só autoridade com jurisdição pode alterá-lo. O de não
// crítico a norma dá como meramente representativo.
export const FREQUENCIA_TOLERAVEL = { critico: 0.1, naoCritico: 1 };
