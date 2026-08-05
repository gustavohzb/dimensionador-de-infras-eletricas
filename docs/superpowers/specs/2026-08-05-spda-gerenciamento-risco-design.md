# Gerenciamento de risco / SPDA — NBR 5419-2:2026 (Etapa 1)

**Data:** 2026-08-05 · **Status:** aprovado pelo Gustavo

**Fonte dos parâmetros:** [nbr5419-2-2026-parametros.md](nbr5419-2-2026-parametros.md),
extraído da ABNT NBR 5419-2:2026 (edição de março/2026).

## Problema

O app dimensiona infraestrutura, cabos, iluminação e capacitores, mas não faz
gerenciamento de risco de descargas atmosféricas. A norma foi reeditada em
março de 2026 com mudanças estruturais em relação à de 2015 — o R2 deixou de
existir, entrou a frequência de danos F, e o N_G passou a ser tabelado por
município — de modo que planilhas e ferramentas antigas ficaram desatualizadas.

## Decomposição em etapas

Este spec cobre a **Etapa 1**. As demais têm spec próprio quando chegarem.

| Etapa | Entrega |
|---|---|
| **1** | Dados + motor de cálculo + aba com zona única: R1, R3 e o veredito de necessidade de SPDA |
| 2 | Seleção automática de NP e medidas de proteção + frequência de danos F (Seção 7) |
| 3 | Zonas de estudo Z_S múltiplas e trechos de linha S_L |
| 4 | Memorial em PDF + projetos salvos no Supabase |

## Escopo da Etapa 1

Calcular, para uma estrutura tratada como **zona de estudo única**, as oito
componentes de risco, somar **R1** (vida humana) e **R3** (patrimônio
cultural), comparar com os riscos toleráveis da Tabela 4 (10⁻⁵ e 10⁻⁴) e dizer
se a proteção é necessária.

**Fora do escopo da Etapa 1:** múltiplas zonas, múltiplos trechos de linha,
sugestão automática de medidas, frequência de danos F, PDF, projetos salvos.

## Regras de cálculo

Todas as fórmulas e tabelas estão no documento de parâmetros. Os pontos que
exigem decisão de implementação:

1. **Componentes que entram em R1.** R_A, R_B, R_U e R_V sempre. R_C, R_M, R_W
   e R_Z **somente** quando o usuário marcar "risco de explosão ou risco
   imediato à vida/meio ambiente" (nota "a" da Tabela 2). Sem a marcação, as
   quatro são calculadas e exibidas, mas não somadas em R1.
2. **R3** soma apenas R_B e R_V, com as perdas da Tabela C.8 (`L_B = L_V =
   r_p × r_f × L_F × c_z/c_t`, L_F = 10⁻¹ para museus e galerias). Quando o
   usuário não marcar que há patrimônio cultural, R3 não é avaliado.
3. **Duas linhas elétricas** na Etapa 1: uma de energia e uma de sinal, cada
   uma opcional e com trecho único. As contribuições R_U, R_V, R_W e R_Z são
   somadas entre as linhas.
4. **Estrutura adjacente** (a da outra extremidade da linha, que entra como
   N_DJ em R_U, R_V e R_W) é opcional por linha: sem ela, N_DJ = 0; com ela,
   o usuário informa L_J, W_J, H_J e C_DJ, e vale a equação A.4.
5. **N_G** é entrada numérica obrigatória. A aba explica que o valor sai da
   Tabela F.1 do Anexo F e registra que a norma (A.1.3) não admite outra fonte.
   A tabela da norma **não** é embutida no app.
6. **A_D com saliência**: campo opcional de altura de saliência H_P; quando
   preenchido, adota-se o maior entre A_D pela equação A.1 (com a altura
   mínima) e A'_D = π × (3 × H_P)².
7. **L_L desconhecido** → 1 000 m, conforme A.4.1, com o campo pré-preenchido
   nesse valor.
8. **Limites**: K_S1, K_S2 e K_S4 limitados a 1; P_MS = 0 com interface
   isolante; P_M = 1 para equipamento fora das normas de U_W; C_LD = 1 para
   sistema interno não blindado (B.4.4).
9. **Múltiplos sistemas internos** numa zona: `P_C = 1 − ∏(1 − P_Ci)` e
   `P_M = 1 − ∏(1 − P_Mi)`. A Etapa 1 aceita a lista de sistemas internos com
   seus U_W e blindagens.

## Arquitetura

Segue os padrões já estabelecidos no app (dados separados do motor, motor puro
separado da UI, painéis pequenos por assunto).

- **`src/data/spdaNBR5419.js`** — todas as tabelas normativas como listas de
  `{ id, label, valor }`, no formato de `ESQUEMAS`/`FORMAS_PARTIDA`: `LOCALIZACAO_CD`,
  `INSTALACAO_CI`, `TIPO_LINHA_CT`, `AMBIENTE_CE`, `MEDIDAS_PTA`, `SPDA_PB`,
  `DPS_PSPD`, `LINHA_CLD_CLI`, `FIACAO_KS3`, `MEDIDAS_PTU`, `DPS_PEB`,
  `PLD_POR_UW`, `PLI_POR_UW`, `TIPO_ESTRUTURA_LF`, `LO_POR_ESTRUTURA`,
  `PISO_RT`, `PROVIDENCIAS_RP`, `RISCO_RF`, `PERIGO_HZ`, `CONSTRUCAO_RS`,
  `RISCO_TOLERAVEL`. Trocar um valor de norma vira edição de dado.
- **`src/lib/spdaRisco.js`** — motor puro, sem React, exportando funções
  isoladas e testáveis: `areasExposicao`, `numeroEventos`, `probabilidades`,
  `perdasL1`, `perdasL3`, `componentes` e `avaliarRisco` (a de mais alto nível,
  que devolve componentes, R1, R3, comparação com R_T e componente dominante).
- **`src/components/SpdaTab.jsx`** — orquestra o estado da aba e persiste em
  `localStorage`, como faz `QuadroCargasTab`.
- **`src/components/spda/`** — painéis por assunto:
  - `EstruturaForm.jsx` — L, W, H, H_P opcional, N_G, C_D, tipo de construção
    (r_S), tipo de estrutura (L_F), piso (r_t), risco de incêndio (r_f),
    providências (r_p), perigo especial (h_z), pessoas (n_z, n_t, t_z) e as
    marcações de explosão/risco à vida e patrimônio cultural (esta última
    abrindo os campos c_z e c_t da equação C.7).
  - `LinhasForm.jsx` — linha de energia e linha de sinal: L_L, C_I, C_E, C_T,
    condição de blindagem/equipotencialização (C_LD/C_LI), R_S da blindagem,
    U_W do equipamento e a estrutura adjacente opcional (L_J, W_J, H_J, C_DJ).
  - `ProtecoesForm.jsx` — NP do SPDA (P_B), DPS coordenado (P_SPD), DPS classe
    I (P_EB), medidas contra toque e passo (P_TA, P_TU), fiação interna (K_S3),
    largura de malha (K_S1/K_S2) e U_W (K_S4).
  - `ResultadoRisco.jsx` — tabela das oito componentes com valor e participação
    percentual, R1 e R3 somados contra R_T, veredito e destaque da componente
    dominante.
- **`src/App.jsx`** — nova aba "SPDA" na barra.

## Testes (`src/lib/spdaRisco.test.js`)

- Áreas: A_D de estrutura retangular conferida à mão; A_D com saliência adota o
  maior; A_M, A_L e A_I pelas equações A.6, A.8 e A.10.
- Eventos: N_D, N_DJ, N_M, N_L e N_I com os fatores das Tabelas A.1 a A.4.
- Probabilidades: P_A = P_TA × P_B; P_C = P_SPD × C_LD; P_MS pelo produto ao
  quadrado com K_S1 a K_S4; P_U, P_V, P_W e P_Z pelas equações B.8 a B.11.
- Limites: K_S1/K_S2/K_S4 nunca acima de 1; P_MS = 0 com interface isolante;
  C_LD = 1 para sistema interno não blindado.
- Composição: `P_C = 1 − ∏(1 − P_Ci)` com três sistemas internos.
- Perdas: L_A, L_B e L_C pelas equações C.1 a C.4, incluindo r_S; L3 pela C.7.
- Regra da nota "a": sem marcação de explosão/risco à vida, R_C, R_M, R_W e R_Z
  são calculadas mas não somadas em R1; com a marcação, entram.
- Veredito: um cenário com R1 abaixo de 10⁻⁵ (dispensa proteção) e um acima
  (exige), com a componente dominante identificada corretamente.
- Caso completo: uma estrutura conferida passo a passo contra a norma.

## Entrega

Fluxo de sempre: branch, testes, verificação no navegador, merge `--no-ff` em
master, push, apagar a branch. Entrada nova no changelog: **1.19.0 —
"Gerenciamento de risco (SPDA)"**, tipo Novidade.
