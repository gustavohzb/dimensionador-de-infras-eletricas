# ABNT NBR 5419-2:2026 — parâmetros para a aba de Gerenciamento de Risco

Nota de pesquisa extraída da norma (edição de março/2026, 270 páginas) durante
o brainstorming da aba de SPDA. Serve de fonte única para implementar o motor
de cálculo sem depender de novo acesso ao visualizador.

> As constantes abaixo são os parâmetros funcionais necessários para aplicar o
> método da norma — mesma natureza das tabelas da NBR 5410 já embutidas no app
> (Tab. 36, 37, 40, 42, 45, 48, 58). A Tabela F.1 (N_G por município, ~5 570
> linhas, páginas 82 a 256) **não** foi extraída: é o grosso do documento e sua
> republicação num app público não se justifica. O N_G é entrada do usuário.

## O que mudou em relação à edição de 2015

- **R2 deixou de existir.** Só restam **R1** (perda de vida humana) e **R3**
  (perda de patrimônio cultural). O R4 (econômico) virou Anexo D informativo.
- **Nova Seção 7 — frequência de danos F**, que ocupa o papel do antigo R2 com
  outra lógica: análise por equipamento/sistema interno, não por tipo de perda.
- **N_G tabelado por município** (Anexo F). A norma **proíbe** usar N_G de outra
  fonte: "Dados obtidos de outras fontes não podem ser utilizados" (A.1.3).
- Terminologia: "zonas de estudo Z_S"; **N_DJ** (estrutura adjacente) entra em
  R_U, R_V e R_W — na 2015 era N_DA.
- Perdas: L_A e L_U usam a mesma equação; entrou o fator **r_S** (tipo de
  construção) nas equações de perda de L1.

## Seção 5 — risco tolerável

Tabela 4:

| Risco | R_T (1/ano) |
|---|---|
| R1 — perda de vida humana ou ferimentos permanentes | 10⁻⁵ |
| R3 — perda de patrimônio cultural | 10⁻⁴ |

A autoridade com jurisdição local tem prioridade na determinação de R_T.

## Seção 6 — componentes de risco (Tabela 6)

| Dano | S1 (na estrutura) | S2 (perto da estrutura) | S3 (na linha) | S4 (perto da linha) |
|---|---|---|---|---|
| D1 ferimentos por choque | R_A = N_D × P_A × L_A | — | R_U = (N_L + N_DJ) × P_U × L_A | — |
| D2 danos físicos | R_B = N_D × P_B × L_B | — | R_V = (N_L + N_DJ) × P_V × L_V | — |
| D3 falha de sistemas internos | R_C = N_D × P_C × L_C | R_M = N_M × P_M × L_M | R_W = (N_L + N_DJ) × P_W × L_W | R_Z = N_I × P_Z × L_Z |

- R1 considera todas as componentes; R_C, R_M, R_W e R_Z só entram em R1
  quando há risco de explosão ou quando a falha dos sistemas internos põe em
  risco imediato a vida humana ou o meio ambiente.
- R3 considera apenas R_B e R_V.
- Risco total R = soma das componentes aplicáveis em todas as zonas Z_S.
- Com vários sistemas internos numa zona:
  `P_C = 1 − ∏(1 − P_Ci)` e `P_M = 1 − ∏(1 − P_Mi)` (equações 12 e 13).

## Seção 7 — frequência de danos F

`F_X = N_X × P_X` (equação 15). Tabela 7:

| S1 | S2 | S3 | S4 |
|---|---|---|---|
| F_C = N_D × P_C | F_M = N_M × P_M | F_W = (N_L + N_DJ) × P_W | F_Z = N_I × P_Z |
| F_B = N_D × P_B ᵃ | | F_V = (N_L + N_DJ) × P_EB | |

ᵃ Só para equipamentos em ZPR₀ᴬ, isolados ou no topo da estrutura; nas demais
situações F_B = 0.

Frequência tolerável F_T: **0,1/ano para sistema crítico** (valor máximo, só
alterável por autoridade com jurisdição) e **1/ano para não crítico**
(meramente representativo). Sistema crítico = aquele cuja falha pode afetar uma
comunidade, com perdas irreversíveis ou de longa duração, ou que possa levar
indiretamente a danos físicos ou ameaça à vida.

## Anexo A — número de eventos perigosos N

Áreas de exposição equivalentes:

- `A_D = L × W + 2 × (3 × H) × (L + W) + π × (3 × H)²`   (A.1)
- Saliência na cobertura: `A'_D = π × (3 × H_P)²` (A.2); adota-se o maior entre
  A_D calculado com H mínimo e A'_D.
- `A_M = 2 × 500 × (L + W) + π × 500²`   (A.6)
- `A_L = 40 × L_L`   (A.8)
- `A_I = 4 000 × L_L`   (A.10)
- L_L desconhecido → assumir 1 000 m. Para ρ > 400 Ω·m em trecho enterrado:
  `A_L = 0,6 × √ρ × L_L`.

Números de eventos:

- `N_D = N_G × A_D × C_D × 10⁻⁶`   (A.3)
- `N_DJ = N_G × A_DJ × C_DJ × C_T × 10⁻⁶`   (A.4)
- `N_M = N_G × A_M × 10⁻⁶`   (A.5)
- `N_L = N_G × A_L × C_I × C_E × C_T × 10⁻⁶`   (A.7)
- `N_I = N_G × A_I × C_I × C_E × C_T × 10⁻⁶`   (A.9)

Tabela A.1 — fator de localização C_D (e C_DJ):

| Localização relativa | C_D |
|---|---|
| Cercada por objetos significativamente mais altos | 0,25 |
| Cercada por objetos de mesma altura ou ligeiramente mais baixos | 0,5 |
| Isolada: nenhum objeto nas vizinhanças ou objetos bem mais baixos | 1 |
| Isolada no topo de colina ou monte | 2 |

Tabela A.2 — fator de instalação da linha C_I:

| Instalação | C_I |
|---|---|
| Aéreo | 1 |
| Enterrado | 0,5 |
| Enterrado dentro dos limites de eletrodo de aterramento em malha | 0,01 |

Tabela A.3 — tipo de linha C_T:

| Tipo | C_T |
|---|---|
| Energia em BT ou sinal | 1 |
| Energia em AT com transformador AT/BT de enrolamentos separados | 0,2 |

Tabela A.4 — fator ambiental C_E:

| Ambiente | C_E |
|---|---|
| Rural | 1 |
| Suburbano | 0,5 |
| Urbano | 0,1 |
| Urbano com estruturas acima de 20 m | 0,01 |

## Anexo B — probabilidades P

Composições:

- `P_A = P_TA × P_B`   (B.1)
- `P_C = P_SPD × C_LD`   (B.2)
- `P_M = P_SPD × P_MS` com DPS coordenado; sem DPS, `P_M = P_MS`   (B.3)
- `P_MS = (K_S1 × K_S2 × K_S3 × K_S4)²`   (B.4)
- `P_U = P_TU × P_EB × P_LD × C_LD`   (B.8)
- `P_V = P_EB × P_LD × C_LD`   (B.9)
- `P_W = P_SPD × P_LD × C_LD`   (B.10)
- `P_Z = P_SPD × P_LI × C_LI`   (B.11)

Tabela B.1 — P_TA (choque por tensões de toque e passo; medidas se multiplicam):

| Medida adicional | P_TA |
|---|---|
| Nenhuma | 1 |
| Avisos de alerta | 10⁻¹ |
| Isolação elétrica das descidas (≥ 3 mm de polietileno reticulado) — só toque | 10⁻² |
| Equipotencialização do solo por eletrodo reticulado — só passo | 10⁻² |
| Estrutura metálica contínua ou concreto armado como descida natural | 10⁻³ |
| Restrições físicas fixas (toque e passo) | 0 |

Tabela B.2 — P_B (danos físicos, conforme o SPDA):

| Característica | NP | P_B |
|---|---|---|
| Não protegida por SPDA | — | 1 |
| Protegida por SPDA | IV | 0,2 |
| | III | 0,1 |
| | II | 0,05 |
| | I | 0,02 |
| Captação NP I + estrutura metálica/concreto armado como descida natural | — | 0,01 |
| Cobertura metálica como captação natural + descida natural (5419-3:2026, 8.1.2-b) | — | 0,001 |

Tabela B.3 — P_SPD (DPS coordenado, conforme o NP de projeto):

| NP | P_SPD |
|---|---|
| Sem sistema coordenado de DPS | 1 |
| III–IV | 0,05 |
| II | 0,02 |
| I | 0,01 |
| Melhor que NP I | 0,005 a 0,001 |

Tabela B.4 — C_LD e C_LI:

| Linha externa | Equipotencialização na entrada | C_LD | C_LI |
|---|---|---|---|
| Aérea não blindada | Nenhuma ou indefinida | 1 | 1 |
| Subterrânea não blindada | Nenhuma ou indefinida | 1 | 1 |
| Energia com neutro multiaterrado | Nenhuma | 1 | 0,2 |
| Subterrânea blindada | Blindagem não interligada ao mesmo barramento | 1 | 0,3 |
| Aérea blindada | Blindagem não interligada ao mesmo barramento | 1 | 0,1 |
| Aérea ou subterrânea blindada | Blindagem interligada ao mesmo barramento | 1 | 0 |
| Cabo/duto de proteção, eletroduto ou tubo metálico | Blindagem interligada ao mesmo barramento | 0 | 0 |
| Sem linha externa ou linha não metálica (fibra óptica) | Sistemas independentes | 0 | 0 |
| Qualquer tipo | Interfaces isolantes conforme 5419-4 | 0 | 0 |

Para sistemas internos **não blindados**, usar C_LD = 1 (B.4.4).

Tabela B.5 — K_S3 (fiação interna; valores para circuito de 100 m):

| Fiação interna | K_S3 |
|---|---|
| Cabo não blindado, sem cuidado de roteamento (laço ~50 m²) | 1 |
| Cabo não blindado, evitando grandes laços (~25 m²) | 0,5 |
| Cabo não blindado, evitando laços médios (~10 m²) | 0,2 |
| Cabo não blindado, evitando pequenos laços (~0,5 m²) | 0,01 |
| Cabos blindados ou em condutos metálicos | 0,0001 |

Demais fatores de P_MS:

- `K_S1 = 0,12 × w_m1` (largura da malha em metros); idem K_S2 com w_m2.
- Blindagem metálica contínua de espessura ≥ 0,1 mm: `K_S1 = K_S2 = 10⁻⁴`.
- Rede de equipotencialização em malha (5419-4): K_S1 e K_S2 podem cair à metade.
- Máximo de K_S1 e K_S2 limitado a 1.
- `K_S4 = 1 / U_W` (U_W em kV), limitado a 1; com equipamentos de U_W distintos,
  usa-se o menor U_W.
- Interfaces isolantes (transformador de isolação com grade aterrada, fibra
  óptica, acoplamento óptico): `P_MS = 0`.
- Equipamento fora das normas de U_W: `P_M = 1`.

Tabela B.6 — P_TU (choque por toque, descarga na linha):

| Medida | P_TU |
|---|---|
| Nenhuma | 1 |
| Avisos visíveis de alerta | 10⁻¹ |
| Isolação elétrica | 10⁻² |
| Restrições físicas | 0 |

Tabela B.7 — P_EB (DPS classe I para equipotencialização):

| NP | P_EB |
|---|---|
| Sem DPS classe I | 1 |
| III–IV | 0,05 |
| II | 0,02 |
| I | 0,01 |
| Melhor que NP I | 0,005 a 0,001 |

Tabela B.8 — P_LD por U_W (kV):

| Condição | 0,35 | 0,5 | 1 | 1,5 | 2,5 | 4 | 6 |
|---|---|---|---|---|---|---|---|
| Não blindada, ou blindagem não interligada | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Blindada interligada, 5 < R_S ≤ 20 Ω/km | 1 | 1 | 1 | 1 | 0,95 | 0,9 | 0,8 |
| Blindada interligada, 1 < R_S ≤ 5 Ω/km | 1 | 1 | 0,9 | 0,8 | 0,6 | 0,3 | 0,1 |
| Blindada interligada, R_S ≤ 1 Ω/km | 1 | 0,85 | 0,6 | 0,4 | 0,2 | 0,04 | 0,02 |

Tabela B.9 — P_LI por U_W (kV):

| Tipo de linha | 1 | 1,5 | 2,5 | 4 | 6 |
|---|---|---|---|---|---|
| Energia | 1 | 0,6 | 0,3 | 0,16 | 0,1 |
| Sinal | 1 | 0,5 | 0,2 | 0,08 | 0,04 |

## Anexo C — perdas L

### L1 (vida humana) — Tabela C.1

- `L_A = L_U = r_t × L_T × (n_z/n_t) × (t_z/8760) × r_s`   (C.1, C.2)
- `L_B = L_V = r_p × r_f × h_z × L_F × (n_z/n_t) × (t_z/8760) × r_s`   (C.3)
- `L_C = L_M = L_W = L_Z = L_O × (n_z/n_t) × (t_z/8760) × r_s`   (C.4)

Tabela C.2 — valores típicos:

| Dano | Símbolo | Valor | Tipo de estrutura |
|---|---|---|---|
| D1 ferimentos | L_T | 10⁻² | todos |
| D2 danos físicos | L_F | 10⁻¹ | risco de explosão |
| | | 10⁻¹ | hospital, hotel, escola, edifício cívico |
| | | 5 × 10⁻² | entretenimento público, igreja, museu |
| | | 2 × 10⁻² | industrial, comercial |
| | | 10⁻² | outros |
| D3 falha de sistemas | L_O | 10⁻¹ | risco de explosão |
| | | 10⁻² | UTI e bloco cirúrgico |
| | | 10⁻³ | outras partes de hospital |

Perda adicional fora da estrutura: `L_FT = L_F + L_E`, com
`L_E = L_FE × t_e/8760` (C.5, C.6); se desconhecidos, assumir L_FE = 1 e
t_e/8760 = 1. Quando usado, L_FT substitui L_F na equação C.3.

Tabela C.3 — r_t (tipo de piso):

| Superfície | Resistência de contato | r_t |
|---|---|---|
| Terra, concreto | ≤ 1 kΩ | 10⁻² |
| Mármore, cerâmica | 1–10 kΩ | 10⁻³ |
| Brita, tapete, carpete | 10–100 kΩ | 10⁻⁴ |
| Asfalto, linóleo, madeira | ≥ 100 kΩ | 10⁻⁵ |

Tabela C.4 — r_p (providências contra incêndio; se houver mais de uma, usa-se
o menor valor aplicável):

| Providências | r_p |
|---|---|
| Nenhuma, ou zona com risco de explosão | 1 |
| Extintores, instalações manuais, alarme manual, hidrantes, compartimentação, rotas de escape | 0,5 |
| Instalações fixas automáticas ou alarme automático | 0,2 |

Em estruturas com risco de explosão, r_p = 1 sempre.

Tabela C.5 — r_f (risco de incêndio ou explosão):

| Risco | Quantidade | r_f |
|---|---|---|
| Explosão | Zonas 0, 20 e explosivos sólidos | 1 |
| | Zonas 1, 21 | 10⁻¹ |
| | Zonas 2, 22 | 10⁻³ |
| Incêndio | Alto (carga ≥ 800 MJ/m²) | 10⁻¹ |
| | Normal (400 a 800 MJ/m²) | 10⁻² |
| | Baixo (< 400 MJ/m²) | 10⁻³ |
| Nenhum | | 0 |

Tabela C.6 — h_z (perigo especial):

| Perigo especial | h_z |
|---|---|
| Sem perigo especial | 1 |
| Baixo nível de pânico (até 2 andares, até 100 pessoas) | 2 |
| Nível médio de pânico (eventos com 100 a 1 000 pessoas) | 5 |
| Dificuldade de evacuação (hospitais, pessoas imobilizadas) | 5 |
| Alto nível de pânico (eventos com mais de 1 000 pessoas) | 10 |

Tabela C.7 — r_S (tipo de construção):

| Tipo de estrutura | r_S |
|---|---|
| Simples: madeira ou alvenaria simples | 2 |
| Robusta: estrutura metálica ou concreto armado | 1 |

### L3 (patrimônio cultural) — Tabela C.8

`L_B = L_V = r_p × r_f × L_F × (c_z/c_t)`   (C.7)

onde c_z é o valor do patrimônio na zona e c_t o valor total da edificação e
conteúdo. Tabela C.9: L_F = 10⁻¹ para museus e galerias.
